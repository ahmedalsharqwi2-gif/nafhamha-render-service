import json
from pathlib import Path
from tools.video.video_compose import VideoCompose
root=Path.cwd(); project=root/'projects/sky-colors';props=json.loads((project/'authoring/props.json').read_text())
ed={'version':'1.0','render_runtime':'remotion','composition_mode':'atelier','renderer_family':'bespoke','cuts':[{'id':str(i),'source':s['audio'],'in_seconds':s['from']/30,'out_seconds':(s['from']+s['duration'])/30} for i,s in enumerate(props['scenes'])], 'bespoke':{'entry':str(project/'authoring/index.tsx'),'composition_id':'Sky','props_path':str(project/'authoring/props.json'),'public_dir':str(project/'authoring/public'),'crf':20,'concurrency':1,'art_direction':str(project/'artifacts/art-direction.md')}}
(project/'artifacts/edit_decisions.json').write_text(json.dumps(ed,ensure_ascii=False,indent=2))
result=VideoCompose().execute({'operation':'render','edit_decisions':ed,'asset_manifest':{'assets':[]},'proposal_packet':{'production_plan':{'render_runtime':'remotion'}},'output_path':str(project/'renders/nafhamha-sky-visual-v2.mp4')})
report={'success':result.success,'error':result.error,'data':result.data};(project/'artifacts/render_report-v2.json').write_text(json.dumps(report,ensure_ascii=False,indent=2,default=str));print(json.dumps(report,ensure_ascii=False,default=str))
