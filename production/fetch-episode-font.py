from pathlib import Path
from urllib.request import urlopen
import hashlib
p=Path('episodes/2026-11-10-swift/public');p.mkdir(parents=True,exist_ok=True)
u='https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/'
f=p/'Cairo.ttf';expected='667c987182391c91f4e57a2f455b1794fb5e3ee6ca4ef3383e86bb690fa9c964'
if not f.exists():
 data=urlopen(u+'Cairo%5Bslnt,wght%5D.ttf',timeout=40).read()
 if hashlib.sha256(data).hexdigest()!=expected:raise RuntimeError('Upstream font changed; review version before updating expected hash')
 f.write_bytes(data)
assert hashlib.sha256(f.read_bytes()).hexdigest()==expected
license_path=p/'Cairo-OFL.txt'
if not license_path.exists():license_path.write_bytes(urlopen(u+'OFL.txt',timeout=40).read())
print('Cairo font verified; SIL Open Font License retained')
