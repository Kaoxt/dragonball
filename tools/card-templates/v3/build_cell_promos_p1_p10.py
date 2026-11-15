"""Compose ten Cell Saga promos from reviewed data and original-scan-inspired artwork."""
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
from lxml import etree as E
from PIL import Image, ImageChops
import base64, io, json, subprocess, sys
import build_batch_101_150 as shared
from build_batch_101_150 import get, replace, parse, digest, save, save_image, elem, text, rules
from build_android_101_125_promos import inline_external
from build_batch_221_250_promos import rarity
P=Path(__file__).resolve().parent; ROOT=P.parents[2]
sys.path.insert(0,str(P/'scripts'))
from title_fit_v3 import apply as title_fit
from middle_label_v3 import apply as middle_label
from freestyle_symbol_weight import apply as freestyle_weight
from align_power_icon import align_power_icon
from text_layout_v3 import validate as validate_layout
import footer_spacing as footer
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
OUT=P/'cell-promos-p1-p10'; EVID=ROOT/'tools/card-corrections/v3-cell-promos-p1-p10'
shared.OUT=OUT;shared.EVID=EVID
DONOR=P/'cell-051-100/cell-068-heroes-discovery.svg'

def compose(c):
 r=parse(DONOR);inline_external(r,DONOR.parent)
 r.set('data-card-number',c['number']);r.set('data-card-family',c['category']);r.set('data-template-version','3')
 r.find('{'+S+'}title').text=c['name']
 for d in r.findall('{'+S+'}desc'):d.text='Cell Saga promo; modern original-scan-inspired illustration and current native V3 components.'
 for el in list(r.xpath('//*[starts-with(@id,"rules-line-")]')):el.getparent().remove(el)
 for ident in ['power-icon','attack-icon','power-line-block']:
  for el in r.xpath('//*[@id=$i]',i=ident):el.getparent().remove(el)
 get(r,'card-title').set('aria-label',c['name']);fit=title_fit(r)
 get(r,'card-category').set('aria-label',c['category']);middle_label(r)
 num,b=text(c['number'],'Teko-SemiBold.ttf',53,877.15,1409.5,'card-number');replace(r,'card-number',num)
 rarity(r,2);freestyle_weight(r)
 art=EVID/'artwork'/c['artwork_file'];aw,ah=Image.open(art).size
 # Width fit with equal X/Y scale. No horizontal crop, stretching or added zoom.
 scale=1033/aw;h=ah*scale;art_y=146 if c['number']=='P3' else 499-h/2
 layer=elem('g',id='retained-illustration',clip_path='url(#new-art-window)')
 extension=None
 if c['number']=='P3':
  # The selected artwork is retained byte-for-byte. Only a short generated
  # lower-edge continuation is visible beneath it. A short blend affects only
  # the bottom clothing/scenery edge, far below either approved face.
  ext=EVID/'artwork/P03-bottom-extension.png';ew,eh=Image.open(ext).size
  bottom=art_y+h;remaining=852-bottom;fade_start=bottom-30
  defs=r.find('{'+S+'}defs')
  grad=elem('linearGradient',defs,id='p3-bottom-edge-fade',gradientUnits='userSpaceOnUse',x1=0,y1=fade_start,x2=0,y2=bottom)
  elem('stop',grad,offset=0,stop_color='white');elem('stop',grad,offset=1,stop_color='black')
  mask=elem('mask',defs,id='p3-retained-art-mask',maskUnits='userSpaceOnUse',x=14,y=art_y,width=1033,height=h)
  elem('rect',mask,x=14,y=art_y,width=1033,height=h-30,fill='white')
  elem('rect',mask,x=14,y=fade_start,width=1033,height=30,fill='url(#p3-bottom-edge-fade)')
  strip=elem('g',layer,id='bottom-art-extension')
  extension_image=elem('image',strip,id='bottom-art-extension-image',x=14,y=art_y+600*scale,width=1033,height=eh*1033/ew,preserveAspectRatio='xMidYMid meet')
  extension_image.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode(ext.read_bytes()).decode())
  extension={'path':str(ext.relative_to(ROOT)),'sha256':digest(ext),'uniform_scale':1033/ew,'visible_destination':[14,fade_start,1033,remaining+30],'edge_blend_height':30,'scope':'Lower clothing/scenery continuation with a short edge blend; both approved faces and overlap are outside the blend.'}
 image=elem('image',layer,id='card-illustration',x=14,y=art_y,width=1033,height=h,preserveAspectRatio='xMidYMid meet')
 if extension:image.set('mask','url(#p3-retained-art-mask)')
 image.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode(art.read_bytes()).decode())
 replace(r,'retained-illustration',layer)
 reports,iconline=rules(r,c);assets=shared.assetize(r)
 measured=deepcopy(r)
 for el in measured.xpath('//*[local-name()="image"]'):
  k='{'+X+'}href' if el.get('{'+X+'}href') else 'href';v=el.get(k)
  if not v.startswith('#'):el.set(k,str((OUT/v).resolve()))
 icons=[]
 if iconline:
  result=align_power_icon(measured,'power-icon',f'rules-line-{iconline}')
  assert align_power_icon(measured,'power-icon',f'rules-line-{iconline}')['vertical_shift']==0
  replace(r,'power-icon',deepcopy(get(measured,'power-icon')));icons=[result]
 ids=[e.get('id') for e in r.iter() if e.get('id')];assert len(ids)==len(set(ids))
 OUT.mkdir(exist_ok=True);svg=OUT/(c['id']+'.svg');save(r,svg)
 footer.change(svg,normalize_gap=True);assert not footer.change(svg,normalize_gap=True)['changed']
 raw=subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename=-','--export-width=2120'],capture_output=True,check=True).stdout
 im=Image.open(io.BytesIO(raw)).convert('RGB');assert im.size==(2120,2968)
 exports=[]
 for field,size,sub in [('image',(1060,1484),''),('downloadImage',(2120,2968),'downloads')]:
  dest=ROOT/'public/assets/cards'/sub/(c['id']+'.webp');dest.parent.mkdir(parents=True,exist_ok=True)
  out=im.resize(size,Image.Resampling.LANCZOS) if im.size!=size else im
  save_image(out,dest,'WEBP',lossless=True,method=4)
  assert ImageChops.difference(out,Image.open(dest).convert('RGB')).getbbox() is None
  exports.append(dict(field=field,path=str(dest.relative_to(ROOT)),size=list(size),sha256=digest(dest),lossless_round_trip=True))
 bounds=footer.bounds(svg);bounds={k:v for k,v in bounds.items() if k in ['card-title','card-category','footer-text-block','saga-emblem','footer-rarity','card-number','power-icon'] or k.startswith('rules-line-')}
 validation=validate_layout(parse(svg),bounds)
 x,y,w,h=bounds['saga-emblem'];assert abs(x+w/2-211.75)<.02 and abs(y+h/2-1409.5)<.02
 ball,num=bounds['footer-rarity'],bounds['card-number'];assert abs((min(ball[0],num[0])+max(ball[0]+ball[2],num[0]+num[2]))/2-847.25)<.02
 assert abs(num[0]-ball[0]-ball[2]-12.2)<.02
 artwork={'mode':'user-selected direct restoration' if c['number']=='P3' else 'new modern illustration based on original scan','source_dimensions':[aw,ah],'source_sha256':digest(art),'mapping_matrix':[scale,0,0,scale,14,art_y],'horizontal_crop':0,'vertical_template_clip':max(0,(ah*scale-706)/2),'additional_zoom':False}
 if extension:artwork['bottom_extension']=extension
 row=dict(number=c['number'],id=c['id'],name=c['name'],native_source_path=str(svg.relative_to(ROOT)),native_source_sha256=digest(svg),assets=assets,rules=reports,exports=exports,native_geometry={'bounds':bounds,'icons':icons,'validation':validation},title_fit=fit,rarity_stars=2,artwork=artwork)
 (EVID/'per-card').mkdir(exist_ok=True);(EVID/'per-card'/(c['number']+'.json')).write_text(json.dumps(row,indent=2)+'\n')
 print('Rendered '+c['number']+' '+c['name'],flush=True);return row

if __name__=='__main__':
 cards=json.loads((EVID/'cards.json').read_text());selected=[c for c in cards if len(sys.argv)==1 or c['number'] in sys.argv[1:]]
 with ProcessPoolExecutor(max_workers=3) as pool:list(pool.map(compose,selected))
 rows=[json.loads((EVID/'per-card'/(c['number']+'.json')).read_text()) for c in cards]
 (EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
 entries=[]
 for c,a in zip(cards,rows):
  entry={k:c[k] for k in ['id','name','number','type','style','source']}
  entry.update(set='Cell Saga',status='Ready',width=1060,height=1484,rarity='Promo',rules=c['modern_rules'],templateVersion=3)
  for exp in a['exports']:entry[exp['field']]=exp['path'].removeprefix('public')+'?v='+exp['sha256'][:12]
  entries.append(entry)
 (EVID/'catalog-additions.json').write_text(json.dumps(entries,indent=2)+'\n')
