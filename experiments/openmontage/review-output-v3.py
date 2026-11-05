import json,subprocess,re,difflib
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel
p=Path(__file__).parent;v=json.loads((p/'authoring/props.json').read_text());video=p/'renders/nafhamha-sky-final.mp4'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]));vs=next(s for s in probe['streams'] if s['codec_type']=='video');au=next(s for s in probe['streams'] if s['codec_type']=='audio');assert vs['width']==720 and vs['height']==1280 and vs['width']<vs['height'];assert abs(float(probe['format']['duration'])-117.6)<.1
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(video),'-f','f32le','-ar','16000','-ac','1','pipe:1']);pcm=np.frombuffer(raw,dtype=np.float32)
correlations=[]
for i,s in enumerate(v['scenes']):
 ref=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p/'authoring/public'/s['audio']),'-f','f32le','-ar','16000','-ac','1','pipe:1']),dtype=np.float32)
 start=round(s['from']/30*16000);offset=1600;length=min(len(ref)-offset-1600,round(s['duration']/30*16000)-offset-1600);x=ref[offset:offset+length:4].astype(float)
 best=-1
 for lag in range(-20,21):
  y=pcm[start+offset+lag:start+offset+length+lag:4].astype(float)
  score=np.dot(x,y)/(np.linalg.norm(x)*np.linalg.norm(y)+1e-12);best=max(best,score)
 correlations.append({'scene':i,'reference_audio_correlation':round(best,5)})
 assert best>.95,(i,best)
print({'audio_match':correlations},flush=True)
model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=6)
segments,info=model.transcribe(pcm,language='ar',word_timestamps=True,beam_size=5,condition_on_previous_text=False)
transcript=[{'text':seg.text,'start':seg.start,'end':seg.end,'words':[{'word':w.word,'start':w.start,'end':w.end} for w in (seg.words or [])]} for seg in segments]
(p/'artifacts/final-transcript-v3.json').write_text(json.dumps(transcript,ensure_ascii=False,indent=2))
words=[w['word'] for seg in transcript for w in seg['words']];script=[w for s in v['scenes'] for w in s['text'].split()]
assert len(words)>=.8*len(script),(len(words),len(script))
report={'video':{'width':vs['width'],'height':vs['height'],'fps':vs['r_frame_rate'],'codec':vs['codec_name'],'duration':float(probe['format']['duration']),'bytes':int(probe['format']['size'])},'audio':{'codec':au['codec_name'],'channels':au['channels'],'speech_reference_match':correlations,'transcribed_words':len(words),'script_words':len(script),'last_transcribed_words':words[-12:]},'caption_layout':json.loads((p/'artifacts/caption-layout-v3.json').read_text()),'validation':json.loads((p/'artifacts/validation-v3.json').read_text()),'notes':['Exact same cached Charon performance, normalized; correlation verifies every rendered scene preserves its source speech','ASR is an independent intelligibility/completeness check, not proof of perfect pronunciation','Original spelling captions, exact ASR anchors plus interpolated unmatched words; semantic split review for scene6; no phoneme-perfect alignment claim','Original procedural effects only; no stock music or asset generation services'], 'status':'pass'}
(p/'artifacts/final-qa-v3.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False),flush=True)
