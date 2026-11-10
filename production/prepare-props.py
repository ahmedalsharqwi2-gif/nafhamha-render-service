"""Bind exact original script captions to measured ASR anchors, explicitly marking estimates."""
import argparse,difflib,hashlib,json,math,re,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--root',default='.');a=p.parse_args();root=Path(a.root)
story_path=root/'episodes/2026-11-10-swift/script.json';voice=root/'voice/narration.wav';asr_path=root/'render/asr.json';story=json.loads(story_path.read_text());asr=json.loads(asr_path.read_text());meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(voice)]));duration=float(meta['format']['duration']);fps=30;frames=math.ceil(duration*fps)
def norm(x):return re.sub(r'[^ء-ي0-9]','',x.replace('أ','ا').replace('إ','ا').replace('آ','ا').replace('ى','ي').replace('ة','ه'))
original=[];scene_counts=[]
for scene in story['scenes']:
 words=scene['narration'].split();scene_counts.append(len(words));original.extend(words)
recognized=[w for s in asr['segments'] for w in s['words'] if norm(w['word'])]
matcher=difflib.SequenceMatcher(None,[norm(w) for w in original],[norm(w['word']) for w in recognized],autojunk=False);anchors={}
for block in matcher.get_matching_blocks():
 for i in range(block.size):anchors[block.a+i]=recognized[block.b+i]
coverage=len(anchors)/len(original)
if coverage<.80:raise ValueError(f'Original transcript/independent ASR coverage insufficient: {coverage:.3f}')
words=[]
for i,text in enumerate(original):
 if i in anchors:start,end=float(anchors[i]['start']),float(anchors[i]['end']);confidence=anchors[i]['probability'];estimated=False
 else:
  before=max((k for k in anchors if k<i),default=-1);after=min((k for k in anchors if k>i),default=len(original));left=anchors[before]['end'] if before>=0 else 0;right=anchors[after]['start'] if after<len(original) else duration
  if right<=left:left=anchors[before]['start'] if before>=0 else 0;right=anchors[after]['end'] if after<len(original) else duration
  step=max(.02,(right-left)/(after-before-1));start=left+(i-before-1)*step;end=start+step;confidence=None;estimated=True
 start=max(0,min(duration-.04,start));end=max(start+.02,min(duration,end));words.append({'text':text,'startMs':round(start*1000),'endMs':round(end*1000),'timestampMs':None if estimated else round((start+end)*500),'confidence':confidence,'estimated':estimated})
# Preserve every original word while preventing nonmonotonic interpolation from entering scene cuts.
for i in range(1,len(words)):words[i]['startMs']=max(words[i]['startMs'],words[i-1]['startMs']+1);words[i]['endMs']=max(words[i]['endMs'],words[i]['startMs']+1)
starts=[];cursor=0
for count in scene_counts:starts.append(cursor);cursor+=count
scene_from=[0]+[max(1,round(words[start]['startMs']/1000*fps)-2) for start in starts[1:]]
scene_to=scene_from[1:]+[frames];scenes=[];all_caps=[]
for si,(scene,count,start,begin,end) in enumerate(zip(story['scenes'],scene_counts,starts,scene_from,scene_to)):
 if end-begin<fps*6:raise ValueError('A scene lacks enough measured narration')
 subset=words[start:start+count];groups=[];group=[]
 for w in subset:
  group.append(w)
  if len(group)>=5 or (len(group)>=3 and group[-1]['text'].endswith(('.','؟','!'))):groups.append(group);group=[]
 if group:
  if len(group)<3 and groups:groups[-1]+=group
  else:groups.append(group)
 captions=[]
 for group in groups:
  first=max(begin,round(group[0]['startMs']/1000*fps));last=min(end,round(group[-1]['endMs']/1000*fps));caption={'text':' '.join(w['text'] for w in group),'start':first-begin,'end':max(first-begin+1,last-begin),'words':[{'text':w['text'],'start':max(0,round(w['startMs']/1000*fps)-begin),'end':max(1,round(w['endMs']/1000*fps)-begin)} for w in group]}
  captions.append(caption);all_caps.append({'scene':si,**caption})
 # Avoid tiny isolated cues without dropping a word.
 for ci in range(len(captions)-1,-1,-1):
  c=captions[ci]
  if c['end']-c['start']<15 and ci>0:
   prev=captions[ci-1];prev.update(text=prev['text']+' '+c['text'],end=c['end'],words=prev['words']+c['words']);del captions[ci]
 scenes.append({'id':scene['id'],'title':scene['title'],'from':begin,'duration':end-begin,'captions':captions})
if sum(len(c['words']) for s in scenes for c in s['captions'])!=len(original):raise ValueError('Original words lost in caption preparation')
props={'scenes':scenes,'durationInFrames':frames,'fps':fps,'original_voice_sha256':hashlib.sha256(voice.read_bytes()).hexdigest(),'story_sha256':hashlib.sha256(story_path.read_bytes()).hexdigest()};proof={'original_word_count':len(original),'asr_word_count':len(recognized),'matched_original_words':len(anchors),'anchor_coverage':coverage,'estimated_word_count':len(words)-len(anchors),'alignment_claim':'Matched ASR anchors with explicitly estimated unmatched words; not phoneme-perfect timing.','duration':duration,'captions':sum(len(s['captions']) for s in scenes),'all_original_words_retained':True,'original_voice_sha256':props['original_voice_sha256'],'story_sha256':props['story_sha256'],'last_asr_text':asr['segments'][-1]['text'],'last_original_words':original[-15:]}
(root/'render/props.json').write_text(json.dumps(props,ensure_ascii=False,indent=2)+'\n');(root/'render/word-captions.json').write_text(json.dumps(words,ensure_ascii=False,indent=2)+'\n');(root/'render/alignment.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n');print(json.dumps(proof,ensure_ascii=False))
