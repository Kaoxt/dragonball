from pathlib import Path
from collections import Counter
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
from hashlib import sha256
import json,sys,subprocess,io
from lxml import etree as E
from PIL import Image,ImageChops
P=Path(__file__).resolve().parent;R=P.parent
sys.path.insert(0,str(P/'scripts'))
import footer_spacing as footer
from align_power_icon import align_power_icon
def check(c):
 s=P/'masters'/(c['id']+'.svg');r=E.parse(str(s)).getroot()
 ids=[x.get('id')for x in r.iter()if x.get('id')]
 assert len(ids)==len(set(ids)),(c['number'],'duplicate IDs')
 assert not r.xpath('//*[local-name()="text"]')
 for e in r.xpath('//*[local-name()="image"]'):
  key='{http://www.w3.org/1999/xlink}href' if e.get('{http://www.w3.org/1999/xlink}href')else'href';v=e.get(key)
  assert not v.startswith('http')
  if not v.startswith(('data:','#')):
   p=(s.parent/v).resolve();assert p.exists(),p;e.set(key,str(p))
 land=c['category']in['LOCATION','BATTLEGROUND']
 footer.SAGA_CENTER_X=296.55 if land else 211.75;footer.RIGHT_GROUP_CENTER_X=1186.45 if land else 847.25;footer.TOLERANCE=.02 if land else .002
 fr=footer.change(s,normalize_gap=True);assert not fr['changed'],(c['number'],fr)
 audit=json.load(open(R/'audit'/f"{c['number']:03d}.json"))
 ir=None
 if c['power_icon']:
  line=next(i+1 for i,row in enumerate(audit['rules'])if row['icon_inline'])
  ir=align_power_icon(r,'power-icon',f'rules-line-{line}');assert ir['vertical_shift']==0,(c['number'],ir)
 for folder,size in [('display',(1484,1060)if land else(1060,1484)),('downloads',(2968,2120)if land else(2120,2968))]:
  path=R/folder/(c['id']+'.webp');im=Image.open(path).convert('RGB');assert im.size==size
  saved=next(x for x in audit['exports']if x['path']==str(path.relative_to(R)));assert saved['sha256']==sha256(path.read_bytes()).hexdigest()
  if folder=='downloads':
   png=R/'png'/(c['id']+'.png')
   if png.exists():reference=Image.open(png).convert('RGB')
   else:
    rendered=subprocess.run(['inkscape',str(s),'--export-type=png','--export-filename=-','--export-width='+str(size[0])],capture_output=True,check=True)
    reference=Image.open(io.BytesIO(rendered.stdout)).convert('RGB')
   assert ImageChops.difference(im,reference).getbbox()is None
 assert audit['source_svg_sha256']==sha256(s.read_bytes()).hexdigest()
 return dict(number=c['number'],passed=True,footer_second_pass=fr,power_second_pass=ir,assets_resolved=True,duplicate_ids=False,live_svg_text=False,png_webp_pixel_equality=True)
if __name__=='__main__':
 cards=json.load(open(R/'new-cards.json'));assert [c['number']for c in cards]==list(range(51,101))
 assert all(c['release_status']=='ready'for c in cards)
 with ProcessPoolExecutor(max_workers=3)as pool:reports=list(pool.map(check,cards))
 (R/'audit'/'technical-validation.json').write_text(json.dumps(reports,indent=2))
 print(f'{len(reports)}/50 cards passed native layout, asset, dimension, hash, and lossless-pixel checks.')
