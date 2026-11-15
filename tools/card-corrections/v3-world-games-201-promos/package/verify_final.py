from pathlib import Path
import hashlib,json
from PIL import Image
from lxml import etree as E
P=Path(__file__).resolve().parent
hashes=json.loads((P/'SHA256SUMS.json').read_text())
for rel,h in hashes.items():assert hashlib.sha256((P/rel).read_bytes()).hexdigest()==h,rel
cards=json.loads((P/'catalog-additions.json').read_text());assert len(cards)==18 and len({c['id']for c in cards})==18
assert {c['number']for c in cards}=={'201',*[f'P{i}'for i in range(1,11)],*[f'PR{i}'for i in range(1,8)]}
charts=json.loads((P/'power-chart-additions.json').read_text())
for c in cards:
 s=P/'files/tools/card-templates/v3/world-games-201-promos'/f"{c['id']}.svg";r=E.parse(str(s));ids=r.xpath('//@id');assert len(ids)==len(set(ids))
 assert not r.xpath('//*[local-name()="text"]')
 assert ' '.join(r.xpath('//*[starts-with(@id,"rules-line-")]/@aria-label'))==c['rules']
 for name,mult in [('image',1),('downloadImage',2)]:
  f=P/'files/public'/c[name].split('?')[0].lstrip('/');im=Image.open(f);im.load();assert im.size==(c['width']*mult,c['height']*mult)
 if c['id'] in charts:assert charts[c['id']]==list(reversed(c['powerStages']))
assert charts['world-games-pr6-supreme-kai']==[0]+['Z']*11
print(f'Verified {len(hashes)} checksums, 18 native cards, 36 image files and four personality charts.')
