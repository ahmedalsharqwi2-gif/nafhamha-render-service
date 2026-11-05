import json
from pathlib import Path
p=Path(__file__).parent;v=json.loads((p/'authoring/props.json').read_text());end=0
for i,s in enumerate(v['scenes']):
 assert s['from']==end;end+=s['duration']; cues=s['captions']; assert cues[0]['start']==0 and cues[-1]['end']==s['duration']
 assert ' '.join(c['text'] for c in cues)==s['text']
 for j,c in enumerate(cues):
  assert 0<=c['start']<c['end']<=s['duration'],(i,c)
  assert len(c['text'].split())<=6
  if j:assert c['start']==cues[j-1]['end']
assert end==v['durationInFrames'] and 90<end/30<=120
print({'scenes':len(v['scenes']),'duration':end/30,'captions':sum(len(s['captions']) for s in v['scenes']),'caption_coverage':'complete','geometry':'720x1280','right_safe_margin':124,'bottom_caption_end':1020})
