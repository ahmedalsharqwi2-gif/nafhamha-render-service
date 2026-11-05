import json,base64,subprocess,re,sys
from pathlib import Path
p=Path(__file__).parent;v=json.loads((p/'authoring/props.json').read_text());cues=[c['text'] for s in v['scenes'] for c in s['captions']]
font=base64.b64encode((p/'authoring/public/Cairo.ttf').read_bytes()).decode()
html='''<html><meta charset="utf-8"><style>@font-face{font-family:Cairo;src:url(data:font/ttf;base64,FONT);font-weight:100 900} .cue{position:absolute;top:948px;left:52px;width:544px;min-height:92px;padding:15px 20px;box-sizing:border-box;font-family:Cairo;font-weight:650;line-height:1.55;text-align:center;direction:rtl}</style><body><script>const cues=CUES; cues.forEach((t,i)=>{let d=document.createElement('div');d.className='cue';d.textContent=t;d.style.fontSize=t.length>43?'28px':'31px';document.body.append(d)});document.fonts.ready.then(()=>{const a=[...document.querySelectorAll('.cue')].map((x,i)=>({index:i,text:cues[i],bottom:x.getBoundingClientRect().bottom,height:x.getBoundingClientRect().height}));document.body.innerHTML='<pre id="result">'+JSON.stringify({maxBottom:Math.max(...a.map(x=>x.bottom)),maxHeight:Math.max(...a.map(x=>x.height)),overflow:a.filter(x=>x.bottom>1090)})+'</pre>';});</script></body></html>'''.replace('FONT',font).replace('CUES',json.dumps(cues,ensure_ascii=False))
f=p/'artifacts/review-v3/caption-measure.html';f.write_text(html)
if '--prepare-only' in sys.argv:sys.exit(0)
chrome='/workspace/scratch/fb22708531cd/wifi-short/node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell'
r=subprocess.run([chrome,'--no-sandbox','--headless','--disable-gpu','--dump-dom','--virtual-time-budget=5000','--window-size=720,1280',f.resolve().as_uri()],capture_output=True,text=True,timeout=30)
m=re.search(r'<pre id="result">(.*?)</pre>',r.stdout,re.S)
if not m:raise RuntimeError('Measurement failed '+r.stderr[-300:])
report=json.loads(m[1]);assert not report['overflow'],report;(p/'artifacts/caption-layout-v3.json').write_text(json.dumps(report,ensure_ascii=False));print(report)
