import json,re,difflib,subprocess,wave,math
from pathlib import Path
import numpy as np
p=Path(__file__).parent; public=p/'authoring/public'; base=p/'authoring/props-v2.json'
if not base.exists():base.write_text((p/'authoring/props.json').read_text())
props=json.loads(base.read_text());fps=30
# Human semantic review of ASR mistakes in scene 6: split merged recognition tokens
# at their observed interval; never replace original Arabic spelling.
manual6=[0,.22,.58,.72,.94,1.38,1.56,1.79,2.12,2.36,2.86,3.16,3.46,3.66,3.90,4.02,4.32,4.46,5.14,5.62,6.12,6.46,6.52,6.80,7.10,7.44,7.72,8.08,8.56,8.88,9.42,9.64,9.98,10.10,10.42,10.68,10.98,11.08,11.32,11.68,12.10,12.36,12.46,12.68]
report=[]
for i,s in enumerate(props['scenes']):
 src=public/s['audio'];dst=public/f'v3-{i}.wav'
 # Same cached Charon performance; gentle level control, no voice/model change.
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(src),'-af','highpass=f=70,lowpass=f=14500,loudnorm=I=-17:TP=-2:LRA=7','-ar','48000',str(dst)],check=True)
 s['audio']=dst.name; words=s['text'].split();observed=json.loads((p/'artifacts'/f'transcript-v2-{i}.json').read_text())
 def norm(t):return re.sub(r'[^\u0621-\u063a\u0641-\u064a0-9]','',t.replace('أ','ا').replace('إ','ا').replace('آ','ا').replace('ى','ي').replace('ة','ه'))
 anchors={}
 matcher=difflib.SequenceMatcher(None,[norm(w) for w in words],[norm(w['text']) for w in observed],autojunk=False)
 for a,b,n in matcher.get_matching_blocks():
  for k in range(n):anchors[a+k]=observed[b+k]['start']*fps
 starts=[]
 for j in range(len(words)):
  if i==6:t=manual6[j]*fps
  elif j in anchors:t=anchors[j]
  else:
   left=max((x for x in anchors if x<j),default=-1);right=min((x for x in anchors if x>j),default=len(words));lt=anchors.get(left,0);rt=anchors.get(right,s['duration']-1);t=lt+(rt-lt)*(j-left)/(right-left)
  starts.append(max(0,min(s['duration']-1,round(t))))
 # Tight phrase breaks: at punctuation or five words; avoid one-word orphan cues.
 groups=[];clause_start=0
 for k,w in enumerate(words):
  if re.search('[،.؛؟!]',w) or k==len(words)-1:
   clause_end=k+1;length=clause_end-clause_start;chunks=math.ceil(length/5);base=length//chunks;extra=length%chunks;cursor=clause_start
   for g in range(chunks):
    size=base+(g<extra);groups.append((cursor,cursor+size));cursor+=size
   clause_start=clause_end
 # Merge very short isolated cues where doing so preserves a readable phrase.
 for g in range(len(groups)-1,0,-1):
  a,b=groups[g]
  if b-a==1 and b-groups[g-1][0]<=6:
   groups[g-1]=(groups[g-1][0],b);groups.pop(g)
 for g in range(len(groups)-1,-1,-1):
  if g>=len(groups):continue
  a,b=groups[g];duration=(starts[b] if b<len(words) else s['duration'])-(starts[a] if a else 0)
  if duration<21:
   if g and b-groups[g-1][0]<=6:
    groups[g-1]=(groups[g-1][0],b);groups.pop(g)
   elif g+1<len(groups) and groups[g+1][1]-a<=6:
    groups[g]=(a,groups[g+1][1]);groups.pop(g+1)
 captions=[]
 for a,b in groups:
  captions.append({'text':' '.join(words[a:b]),'start':0 if a==0 else starts[a],'end':starts[b] if b<len(words) else s['duration'],'words':[{'text':words[k],'start':starts[k],'end':starts[k+1] if k+1<len(words) else s['duration']} for k in range(a,b)]})
 s['captions']=captions;s['words']=[w for c in captions for w in c['words']]
 report.append({'scene':i,'words':len(words),'exact_ASR_anchors':len(anchors),'timing':'scene 6 reviewed and corrected against ASR word intervals' if i==6 else 'ASR exact anchors with interpolation only for unmatched tokens','cues':len(captions)})
props['soundtrack']='sound-design-v3.wav';(p/'authoring/props.json').write_text(json.dumps(props,ensure_ascii=False,indent=2))
(p/'artifacts/alignment-v3.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
# Original procedural stereo sound design, deterministic and rights-free. No downloads.
sr=48000;n=round(props['durationInFrames']/fps*sr);fx=np.zeros((n,2),dtype=np.float32);rng=np.random.default_rng(709)
voice=np.zeros(n,dtype=np.float32)
for s in props['scenes']:
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(public/s['audio']),'-f','f32le','-ar',str(sr),'-ac','1','pipe:1']);data=np.frombuffer(raw,dtype=np.float32);a=round(s['from']/fps*sr);l=min(len(data),n-a);voice[a:a+l]=data[:l]
def event(frame,d=.65,kind='sweep',pitch=440):
 a=max(0,round(frame/fps*sr));m=min(round(d*sr),n-a);t=np.arange(m)/sr;env=np.sin(np.pi*np.clip(t/d,0,1))**2
 if kind=='sweep':
  noise=rng.normal(0,1,m);noise=np.convolve(noise,np.ones(18)/18,mode='same');y=.018*noise*env+.004*np.sin(2*np.pi*(180*t+240*t*t))*env
 else:y=.009*(np.sin(2*np.pi*pitch*t)+.22*np.sin(2*np.pi*pitch*2*t))*np.exp(-t*7)*np.minimum(t/.025,1)
 pan=np.linspace(-.55,.55,m);fx[a:a+m,0]+=y*np.sqrt((1-pan)/2);fx[a:a+m,1]+=y*np.sqrt((1+pan)/2)
for i,s in enumerate(props['scenes']):
 if i:event(s['from']-5, .85)
 for loc,pitch in [(60,330),(min(s['duration']-50,180),440)]:event(s['from']+loc,.45,'tone',pitch)
for k in range(3):event(3010+k*18,.5,'tone',[330,440,550][k])
# Duck sound effects beneath speech using 20ms RMS bins, smoothly interpolated.
step=960;centers=np.arange(0,n,step);rms=np.array([np.sqrt(np.mean(voice[a:a+step]**2)) for a in centers]);duck=np.interp(np.arange(n),centers,np.clip(.035/(rms+.018),.22,1));fx*=duck[:,None]*2.5
# leave final tail silent to avoid abrupt cut; all events are intentionally much softer than narration
with wave.open(str(public/props['soundtrack']),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(fx,-1,1)*32767).astype('<i2').tobytes())
print({'duration':n/sr,'captions':sum(len(s['captions']) for s in props['scenes']),'sfx_peak_db':20*np.log10(np.max(np.abs(fx))),'voice_peak_db':20*np.log10(np.max(np.abs(voice)))})
