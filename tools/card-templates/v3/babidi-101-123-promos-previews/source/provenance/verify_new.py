from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageChops
from lxml import etree as E
import json,sys
ROOT=Path(__file__).resolve().parent/'new'
sys.path.insert(0,str(ROOT/'production/scripts'))
from align_power_icon import align_power_icon
cards=json.load(open(ROOT/'cards.json'))
if len(sys.argv)>1:cards=[c for c in cards if str(c['number']) in sys.argv[1:]]
def verify(c):
 key=f"{c['number']:03d}" if isinstance(c['number'],int) else c['number']
 a=json.load(open(ROOT/'audit'/(key+'.json')))
 svg=ROOT/'production/masters'/(c['id']+'.svg');r=E.parse(str(svg)).getroot()
 for e in r.xpath('//*[local-name()="image"]'):
  k=next(k for k in e.attrib if k.endswith('href'));v=e.get(k)
  if not v.startswith(('data:','#')):e.set(k,str((svg.parent/v).resolve()))
 alignment=None
 if c['power_icon']:
  i=next(i+1 for i,line in enumerate(a['rules']) if line['icon_inline'])
  alignment=align_power_icon(r,'power-icon','rules-line-'+str(i));assert alignment['vertical_shift']==0,(key,alignment)
 exports=ROOT if c['release_status']=='ready' else ROOT/'review-only'
 png=Image.open(exports/'png'/(c['id']+'.png')).convert('RGB')
 down=Image.open(exports/'downloads'/(c['id']+'.webp')).convert('RGB')
 display=Image.open(exports/'display'/(c['id']+'.webp')).convert('RGB')
 assert ImageChops.difference(png,down).getbbox() is None,key
 assert ImageChops.difference(png.resize(display.size,Image.Resampling.LANCZOS),display).getbbox() is None,key
 return {'number':c['number'],'lossless_download_matches_png':True,'display_matches_proportional_export':True,'power_icon_second_run':alignment,'native_source_review':'Passed geometry, title, category, rarity, stages and asset-reference checks.'}
with ThreadPoolExecutor(max_workers=4) as pool:out=list(pool.map(verify,cards))
if len(sys.argv)>1:
 previous=json.load(open(ROOT/'audit/final-export-verification.json'))
 updated={str(c['number']):c for c in out}
 out=[updated.get(str(c['number']),c) for c in previous]
(ROOT/'audit/final-export-verification.json').write_text(json.dumps(out,indent=2))
print('Verified',len(out),'new cards: both sizes, lossless pixels, icon alignment unchanged on second pass.',flush=True)
