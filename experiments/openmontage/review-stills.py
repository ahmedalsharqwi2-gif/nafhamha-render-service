import subprocess,json,os
from pathlib import Path
root=Path(__file__).resolve().parents[2];p=Path(__file__).resolve().parent;props=json.loads((p/'authoring/props.json').read_text());out=p/'artifacts/review-v3';out.mkdir(exist_ok=True)
for i in [0,1,3,4,5,6,7]:
 s=props['scenes'][i];frame=s['from']+min(s['duration']-20,210)
 cmd=['npx','remotion','still','projects/sky-colors/index.tsx','Sky',str(out/f'scene-{i}.png'),'--props='+str(p/'authoring/props.json'),'--public-dir='+str(p/'authoring/public'),'--frame='+str(frame)]
 r=subprocess.run(cmd,cwd=root/'remotion-composer',env={**os.environ,'NODE_OPTIONS':'--require='+str(root/'runtime-fix.cjs')},capture_output=True,text=True)
 if r.returncode:print(r.stdout+r.stderr,flush=True);raise RuntimeError('still failed')
 print({'scene':i,'frame':frame},flush=True)
