import json,re,difflib
from pathlib import Path
from faster_whisper import WhisperModel
import numpy as np,subprocess
p=Path(__file__).parent; props=json.loads((p/'authoring/props.json').read_text())
model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=6)
def norm(t):
 return re.sub(r'[^\u0621-\u063a\u0641-\u064a0-9]','',t.replace('أ','ا').replace('إ','ا').replace('آ','ا').replace('ى','ي').replace('ة','ه'))
reports=[]
for i,s in enumerate(props['scenes']):
 cache=p/'artifacts'/f'transcript-v2-{i}.json'
 if cache.exists(): observed=json.loads(cache.read_text())
 else:
  pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(p/'authoring/public'/s['audio']),'-f','f32le','-ar','16000','-ac','1','pipe:1'])
  segments,info=model.transcribe(np.frombuffer(pcm,dtype=np.float32),language='ar',word_timestamps=True,beam_size=5,initial_prompt=None,condition_on_previous_text=False)
  observed=[{'text':w.word.strip(),'start':w.start,'end':w.end} for seg in segments for w in (seg.words or [])]
  cache.write_text(json.dumps(observed,ensure_ascii=False,indent=2))
 words=s['text'].split(); a=[norm(w) for w in words];b=[norm(w['text']) for w in observed]
 matcher=difflib.SequenceMatcher(None,a,b,autojunk=False);anchors={}
 for match in matcher.get_matching_blocks():
  for k in range(match.size): anchors[match.a+k]=observed[match.b+k]['start']*30
 # Interpolate only unmatched script tokens between recognized anchors; preserve original spelling.
 positions=sorted(anchors)
 if not positions: raise RuntimeError('No alignment anchors')
 starts=[]
 for j in range(len(words)):
  if j in anchors:t=anchors[j]
  else:
   left=max([x for x in positions if x<j],default=-1);right=min([x for x in positions if x>j],default=len(words))
   lt=anchors.get(left,0);rt=anchors.get(right,s['duration']-1)
   t=lt+(rt-lt)*(j-left)/(right-left)
  starts.append(round(t))
 captions=[];j=0
 while j<len(words):
  end=min(j+6,len(words))
  for n in range(j+3,end):
   if re.search('[،.؛؟!]',words[n-1]): end=n;break
  captions.append({'text':' '.join(words[j:end]),'start':0 if j==0 else starts[j],'end':starts[end] if end<len(words) else s['duration']})
  j=end
 s['captions']=captions
 reports.append({'scene':i,'script_words':len(words),'matched_anchors':len(anchors),'match_ratio':round(len(anchors)/len(words),3),'caption_count':len(captions),'method':'Whisper small word timestamps; exact normalized token anchors; interpolated unmatched tokens'})
 (p/'authoring/props.json').write_text(json.dumps(props,ensure_ascii=False,indent=2))
 print(reports[-1],flush=True)
(p/'artifacts/caption-alignment-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
