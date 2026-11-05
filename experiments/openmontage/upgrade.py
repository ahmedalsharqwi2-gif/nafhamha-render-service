import json, subprocess
from pathlib import Path
p=Path(__file__).parent
props=json.loads((p/'authoring/props.json').read_text())
if not (p/'authoring/props-v1.json').exists(): (p/'authoring/props-v1.json').write_text(json.dumps(props,ensure_ascii=False))
props=json.loads((p/'authoring/props-v1.json').read_text()); frame=0
for i,s in enumerate(props['scenes']):
 src=p/'authoring/public'/f'{i}.wav'; dst=p/'authoring/public'/f'v2-{i}.wav'
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(src),'-af','atempo=1.05',str(dst)],check=True)
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(dst)]))
 s.update(audio=f'v2-{i}.wav',from_=frame,duration=round(duration*30));s['from']=s.pop('from_'); frame+=s['duration']
props['durationInFrames']=frame
(p/'authoring/props.json').write_text(json.dumps(props,ensure_ascii=False,indent=2))
print(frame/30)
