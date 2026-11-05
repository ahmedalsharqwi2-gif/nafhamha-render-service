import json,subprocess
from pathlib import Path
import numpy as np
p=Path(__file__).parent;v=json.loads((p/'authoring/props.json').read_text());report={'duration_frames':v['durationInFrames'],'fps':30,'scenes':[]};end=0;count=0
for i,s in enumerate(v['scenes']):
 assert s['from']==end;end+=s['duration'];assert s['captions'][0]['start']==0 and s['captions'][-1]['end']==s['duration']
 assert ' '.join(c['text'] for c in s['captions'])==s['text']
 for j,c in enumerate(s['captions']):
  assert len(c['text'].split())<=6
  assert c['end']-c['start']>=15,(i,c)
  if j:assert c['start']==s['captions'][j-1]['end']
  for w in c['words']:assert w['start']<=w['end']
  count+=1
 d=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(p/'authoring/public'/s['audio'])]))
 assert abs(d-s['duration']/30)<1/30
 report['scenes'].append({'index':i,'audio_seconds':d,'frames':s['duration'],'captions':len(s['captions'])})
assert end==v['durationInFrames'];assert 90<end/30<=120
report.update(duration_seconds=end/30,caption_count=count,script_words=sum(len(s['words']) for s in v['scenes']),safe_caption_region={'left':52,'right':124,'top':948,'maximum_expected_bottom':1080},status='pass')
(p/'artifacts/validation-v3.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
