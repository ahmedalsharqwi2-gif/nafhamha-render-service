import json
from pathlib import Path
p=Path(__file__).parent;v=json.loads((p/'authoring/props.json').read_text());out=[]
def ts(frame):
 ms=round(frame/30*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000);return f'{h:02}:{m:02}:{s:02},{ms:03}'
for s in v['scenes']:
 for c in s['captions']:out.append(f"{len(out)+1}\n{ts(s['from']+c['start'])} --> {ts(s['from']+c['end'])}\n{c['text']}\n")
(p/'assets/captions-ar.srt').write_text('\n'.join(out))
(p/'artifacts/youtube-metadata-v3.json').write_text(json.dumps({'title':'ليه السما زرقا والغروب أحمر؟ | نفهمها','description':'تعالى نمشي مع رحلة الضوء ونفهم بالمصري إزاي تشتّت الضوء في الغلاف الجوي بيغيّر اللي عيننا بتشوفه بين النهار والغروب. الرسومات نماذج توضيحية مبسّطة، والأحجام والمسافات غير مقيّسة.\n\nمصادر: https://spaceplace.nasa.gov/blue-sky/en/\nhttps://www.weather.gov/fgz/SkyBlue\nhttps://gml.noaa.gov/grad/about/redsky/\n\n#نفهمها #علوم #الضوء #Shorts','publication_status':'not_published_experimental_branch_only'},ensure_ascii=False,indent=2))
print({'subtitles':len(out),'duration':v['durationInFrames']/30})
