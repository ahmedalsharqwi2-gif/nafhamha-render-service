import os
"""Complete technical QA of retained speech and the entire new film, without publishing."""
import hashlib,json,math,re,subprocess,wave
from pathlib import Path
import numpy as np
from PIL import Image,ImageStat
root=Path.cwd();out=root/'render';episode=root/os.environ['NAFHAMHA_EPISODE_DIR'];props=json.loads((episode/'props.json').read_text());proof=json.loads((out/'render-proof.json').read_text());alignment=json.loads((episode/'alignment.json').read_text());duration=props['durationInFrames']/30
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(args,**kw):return subprocess.run(['ffmpeg','-y','-v','error',*map(str,args)],check=True,**kw)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
voice=root/'voice/narration.wav'
if sha(voice)!=props['original_voice_sha256'] or sha(episode/'script.json')!=props['story_sha256']:raise ValueError('Retained voice/story binding differs')
run(['-i',voice,'-af','highpass=f=60,lowpass=f=10000,loudnorm=I=-16:TP=-2:LRA=7,aresample=48000','-ac','1','-c:a','pcm_s16le',out/'voice-normalized.wav'])
rate=48000;n=math.ceil(duration*rate);score=np.zeros((n,2),dtype=np.float32);rng=np.random.default_rng(int(props['story_sha256'][:8],16));notes=[164.814,246.942,329.628,196.,293.665,220.]
for k,at in enumerate(np.arange(.4,duration-1,3.8)):
 length=.85;t=np.arange(int(length*rate))/rate;env=(1-np.exp(-t*75))*np.exp(-t*4.2);freq=notes[k%len(notes)];tone=(np.sin(2*np.pi*freq*t)+.25*np.sin(2*np.pi*freq*2*t)+.08*np.sin(2*np.pi*freq*3*t))*env*.025;start=int(at*rate);end=min(n,start+len(tone));pan=.5+.25*np.sin(k);score[start:end,0]+=tone[:end-start]*pan;score[start:end,1]+=tone[:end-start]*(1-pan)
events=json.loads((episode/'audio-events.json').read_text()) if (episode/'audio-events.json').exists() else []
for i,s in enumerate(props['scenes']):
 at=s['from']/30+.15
 event=next((e for e in events if e['scene']==i),None)
 if event:
  keyword=event['word'];anchors=[w['start'] for c in s['captions'] for w in c['words'] if keyword in w['text']]
  if anchors:at=s['from']/30+anchors[0]/30+event['offset_seconds']
 length=.18;t=np.arange(int(length*rate))/rate;env=np.sin(np.pi*t/length)**2*np.exp(-t*14);cue=(np.sin(2*np.pi*(480+160*i)*t)*.009+rng.normal(0,.0015,len(t)))*env;start=int(at*rate);end=min(n,start+len(cue));score[start:end,0]+=cue[:end-start];score[start:end,1]+=cue[:end-start]
score*=np.minimum(1,np.arange(n)/(rate*1.2))[:,None];score*=np.minimum(1,np.maximum(0,n-np.arange(n))/(rate*2))[:,None]
with wave.open(str(out/'score.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes((np.clip(score,-1,1)*32767).astype('<i2').tobytes())
run(['-i',out/'voice-normalized.wav','-i',out/'score.wav','-filter_complex','[0:a]asplit=2[voice][key];[1:a][key]sidechaincompress=threshold=0.025:ratio=8:attack=10:release=250[bed];[voice][bed]amix=inputs=2:duration=first:normalize=0[mix]','-map','[mix]','-ar','48000','-c:a','pcm_s16le',out/'mix.wav'])
movie=out/'nafhamha-final.mp4';run(['-i',out/'visuals.mp4','-i',out/'mix.wav','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',movie])
meta=probe(movie);v=next(s for s in meta['streams'] if s['codec_type']=='video');audio=next(s for s in meta['streams'] if s['codec_type']=='audio');actual=float(meta['format']['duration'])
if (v['width'],v['height'],v['r_frame_rate'])!=(720,1280,'30/1') or not 90<actual<180 or abs(actual-duration)>.07:raise ValueError('Full portrait film geometry/duration failed')
if movie.stat().st_size>24*1024*1024:raise ValueError('Approved media endpoint size limit exceeded')
subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(movie),'-f','null','-'],check=True)
def samples(p):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar','48000','-ac','1','-f','f32le','-']),dtype=np.float32)
ref=samples(out/'voice-normalized.wav');rendered=samples(movie);minimum=min(len(ref),len(rendered));start=int((duration-10)*48000);end=min(minimum,int((duration-.1)*48000));tail=float(np.corrcoef(ref[start:end],rendered[start:end])[0,1]);full=float(np.corrcoef(ref[:minimum:16],rendered[:minimum:16])[0,1]);
if not np.isfinite(tail) or tail<.97 or full<.97 or minimum<duration*48000-4000:raise ValueError('Original speech synchronization/tail verification failed')
log=subprocess.run(['ffmpeg','-hide_banner','-i',str(movie),'-af','volumedetect','-vf','blackdetect=d=0.10:pix_th=0.02','-f','null','-'],capture_output=True,text=True,check=True).stderr
peak=float(re.search(r'max_volume: ([\-\d.]+) dB',log).group(1));black=re.findall(r'black_start:([^\s]+).*?black_end:([^\s]+)',log)
if peak>-.2 or black:raise ValueError('Clipping or black interval detected')
stills=[]
for i,s in enumerate(props['scenes']):
 for kind,at in [('scene',min(actual-.1,s['from']/30+min(5,s['duration']/60))),('boundary',min(actual-.1,s['from']/30+.4))]:
  p=out/f'{kind}-{i+1}.jpg';run(['-ss',at,'-i',movie,'-frames:v','1','-q:v','2',p]);im=Image.open(p).convert('RGB');
  if max(ImageStat.Stat(im).stddev)<6:raise ValueError('Blank sampled scene')
  stills.append({'file':p.name,'at':at,'sha256':sha(p)})
p=out/'closing.jpg';run(['-ss',actual-.25,'-i',movie,'-frames:v','1','-q:v','2',p]);stills.append({'file':p.name,'at':actual-.25,'sha256':sha(p)})
qa={'status':'technically_verified_pending_visual_review','channel_id':'UCVYe5C8jhHFlKz7UPeVzFCg','movie_sha256':sha(movie),'bytes':movie.stat().st_size,'duration':actual,'frames':int(v['nb_frames']),'width':v['width'],'height':v['height'],'fps':30,'audio_codec':audio['codec_name'],'original_voice_sha256':sha(voice),'story_sha256':sha(episode/'script.json'),'render':proof,'alignment':alignment,'full_decode_passed':True,'full_speech_waveform_correlation':full,'last_speech_window_correlation':tail,'max_volume_db':peak,'black_intervals':black,'stills':stills,'visual_review_passed':False,'scheduled':False,'publication_calls':0,'score':{'original_composition':True,'third_party_music':False,'profile':json.loads((episode/'script.json').read_text()).get('music_profile','Original quiet score and subject cues'),'sha256':sha(out/'score.wav')}}
(out/'full-qa.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:qa[k] for k in ('status','duration','movie_sha256','bytes','full_speech_waveform_correlation','last_speech_window_correlation')}))
