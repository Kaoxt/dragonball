from pathlib import Path
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
from lxml import etree as E
from PIL import Image,ImageChops
from hashlib import sha256
import sys,json,base64,re,subprocess,shutil,io,argparse
P=Path(__file__).resolve().parent;ROOT=P.parent
sys.path.insert(0,str(P/'scripts'))
from native_helpers import *
from title_fit_v3 import apply as title_fit
from middle_label_v3 import label as middle_label
from tokui_backing import apply as tokui_backing
from align_power_icon import align_power_icon
from personality_middle_v3 import apply as personality_middle
from personality_levels import apply_level
from text_layout_v3 import validate as validate_text
import footer_spacing as footer
import title_width_v3
OUT=P/'masters';ASSETS=P/'assets'

def prune_defs(r):
 defs=r.find('{'+S+'}defs');owners={}
 for d in defs:
  for e in d.iter():
   if e.get('id'):owners[e.get('id')]=d
 def refs(el):
  found=set()
  for e in el.iter():
   for k,v in e.attrib.items():
    found.update(re.findall(r'url\(#([^)]*)\)',v))
    if k.endswith('href') and v.startswith('#'):found.add(v[1:])
  return found
 todo=set().union(*(refs(e)for e in r if e!=defs));used=set()
 while todo:
  ident=todo.pop();d=owners.get(ident)
  if d is not None and d not in used:used.add(d);todo.update(refs(d))
 for d in list(defs):
  if d not in used:defs.remove(d)

def assets(r):
 paths=[]
 for e in r.xpath('//*[local-name()="image"]'):
  key='{'+X+'}href' if e.get('{'+X+'}href')else'href';v=e.get(key)
  if v.startswith('#'):continue
  if v.startswith('data:'):
   data=base64.b64decode(v.split(',',1)[1]);ext='.png'if'image/png'in v[:50]else'.jpg';dest=ASSETS/(sha256(data).hexdigest()+ext)
   if not dest.exists():dest.write_bytes(data)
  else:
   source=Path(v) if Path(v).is_absolute() else ASSETS/Path(v).name
   assert source.exists(),str(source)
   if source.parent==ASSETS:dest=source
   else:
    dest=ASSETS/(digest(source)+source.suffix)
    if not dest.exists():shutil.copy2(source,dest)
  e.set(key,'../assets/'+dest.name);paths.append(dest.name)
 return paths

def logo(cx,cy):
 g=elem('g',id='saga-emblem',data_set='Babidi Saga',data_visible_center=f'{cx} {cy}')
 scale=70/1127
 el=elem('image',g,x=cx-626.5*scale,y=cy-612*scale,width=1254*scale,height=1254*scale)
 el.set('{'+X+'}href',str(ASSETS/'babidi-emblem.png'))
 return g

def compose(c):
 n=c['number'];card_key=f'{n:03d}' if isinstance(n,int) else n;land=c['category'] in ['BATTLEGROUND','LOCATION'];mp=c['category'] in ['HERO','VILLAIN'];cx=741.5 if land else 529.5;fy=985.5 if land else 1409.5
 if n==1:
  # The first card is the user's approved preview, byte-for-byte.
  stem='Babidi-001-Android-18-Iron-Defense';orig=P/'approved-card-001'
  svg=OUT/(c['id']+'.svg');shutil.copy2(orig/(stem+'.svg'),svg);r=parse(svg);asset_paths=assets(r);save(r,svg)
  im=Image.open(orig/(stem+'.png')).convert('RGB');report={'approved_preview_pixels_retained':True}
 else:
  if land:donor=P/'donors/landscape.svg'
  elif mp:donor=P/'donors'/('personality-'+c['category'].lower()+'.svg')
  elif c['style']=='Namekian':donor=P/'donors/namekian.svg'
  else:
   style_nums={'Red':6,'Blue':13,'Saiyan':18,'Freestyle':24,'Orange':49,'Black':65}
   donor=next((P/'donors').glob(f"saiyan-{style_nums[c['style']]:03d}-*.svg"))
  r=parse(donor);r.set('data-card-id',c['id']);r.set('data-card-number',str(n));r.set('aria-label',f"Babidi Saga {n}: {c['name']}");r.find('{'+S+'}title').text=c['name']
  for el in list(r.xpath('//*[starts-with(@id,"rules-line-")]'))+list(r.xpath('//*[@id="power-icon" or @id="attack-icon" or @id="block-icon" or @id="power-line-block"]')):el.getparent().remove(el)
  if land:
   title_el,b=text(c['name'],'Teko-SemiBold.ttf',86.0349127182045,cx,79,'card-title',vertical_ignore_punctuation=True)
   title_el,b=text(c['name'],'Teko-SemiBold.ttf',86.0349127182045*min(1,1184/b[0]),cx,79,'card-title',vertical_ignore_punctuation=True);replace(r,'card-title',title_el)
  else:get(r,'card-title').set('aria-label',c['name']);title_fit(r)
  mid,mid_report=middle_label(c['category'])
  if land:mid.set('transform','translate(212 -223.333333333333) '+mid.get('transform'))
  replace(r,'card-category',mid)
  num,_=text(str(n),'Teko-SemiBold.ttf',53,(1186.45 if land else 847.25)+29.9,fy,'card-number');replace(r,'card-number',num)
  ball_source=parse(next((P/'donors').glob('saiyan-024-*.svg')));ball=deepcopy(get(ball_source,'footer-rarity'));dependencies(r,ball_source,ball);replace(r,'footer-rarity',ball);rarity(r,c['rarity_stars']);get(r,'footer-rarity').set('transform',f'translate(0 {fy-1416})')
  replace(r,'saga-emblem',logo(296.55 if land else 211.75,fy))
  ax,ay,aw,ah=(16,145,1451,1451/3)if land else(14,146,1033,706)
  layer=elem('g',id='retained-illustration',clip_path='url(#artwork-window)'if land else'url(#new-art-window)')
  if c['release_status']=='artwork_pending':
   src=ROOT/c['original_scan'];sw,sh=Image.open(src).size
   v=elem('svg',layer,x=ax,y=ay,width=aw,height=ah,viewBox=f'{sw*.055} {sh*.125} {sw*.89} {sh*.42}',preserveAspectRatio='xMidYMid slice')
   a=elem('image',v,x=0,y=0,width=sw,height=sh);a.set('{'+X+'}href',str(src))
   elem('rect',layer,x=ax,y=ay+ah-65,width=aw,height=65,fill='#171717',opacity='.94')
   tag,_=text('SOURCE ART — REPLACEMENT NEEDED','BarlowCondensed-Bold.ttf',32,cx,ay+ah-32,'artwork-status',fill='#ffffff');layer.append(tag)
  else:
   src=ROOT/c['artwork_path'];sw,sh=Image.open(src).size
   assert abs(sw/sh-aw/ah)/(aw/ah)<.045,(n,'incorrect artwork aspect ratio',sw,sh)
   offset=c.get('artwork_offset_x',0)
   if offset:
    # Keep approved character pixels in the retained image. Only extend the exposed background.
    assert offset>0 and c.get('artwork_left_extension')
    elem('rect',layer,x=ax,y=ay,width=aw,height=ah,fill='#0b0707')
    bg=elem('image',layer,id='artwork-left-background-extension',x=ax,y=c['artwork_left_extension_y'],width=c.get('artwork_left_extension_width',aw),height=c['artwork_left_extension_height'],preserveAspectRatio='none')
    bg.set('{'+X+'}href',str(ROOT/c['artwork_left_extension']))
    d=elem('defs',layer)
    grad=elem('linearGradient',d,id='left-background-blend',gradientUnits='userSpaceOnUse',x1=ax+offset,y1=0,x2=ax+offset+20,y2=0)
    elem('stop',grad,offset=0,stop_color='#ffffff',stop_opacity=0)
    elem('stop',grad,offset=1,stop_color='#ffffff',stop_opacity=1)
    mask=elem('mask',d,id='retained-artwork-edge-blend',maskUnits='userSpaceOnUse',x=ax,y=ay,width=aw,height=ah)
    elem('rect',mask,x=ax,y=ay,width=aw,height=ah,fill='url(#left-background-blend)')
   a=elem('image',layer,id='card-illustration',x=ax+offset,y=ay,width=aw,height=ah,preserveAspectRatio=c.get('artwork_fit','xMidYMid slice'));a.set('{'+X+'}href',str(src))
   if offset:a.set('mask','url(#retained-artwork-edge-blend)')
  replace(r,'retained-illustration',layer)
  if mp:
   glyphs=json.load(open(P/'personality-levels.json'));old=elem('svg')
   for ident,value in [('level-value',c['level']),('circle-value',c['pur'])]:g=elem('g',old,id=ident);elem('path',g,d=glyphs[str(value)]['d'])
   personality_values(r,old,c);personality_middle(r,high_tech=False);apply_level(r,c['level'])
  if not(land or mp):tokui_backing(r)
  c['rule_lines']=wrap_rules(c);rr,iconline=rules(r,c,land)
  prune_defs(r);asset_paths=assets(r)
  if iconline:
   measure=deepcopy(r)
   for e in measure.xpath('//*[local-name()="image"]'):
    key='{'+X+'}href' if e.get('{'+X+'}href')else'href';e.set(key,str((OUT/e.get(key)).resolve()))
   align_power_icon(measure,'power-icon',f'rules-line-{iconline}');replace(r,'power-icon',deepcopy(get(measure,'power-icon')))
  svg=OUT/(c['id']+'.svg');save(r,svg)
  if not land:svg.write_bytes(title_width_v3.change(svg.read_bytes())[0])
  footer.SAGA_CENTER_X=296.55 if land else 211.75;footer.RIGHT_GROUP_CENTER_X=1186.45 if land else 847.25;footer.TOLERANCE=.02 if land else .002
  footer.change(svg,normalize_gap=True)
  # Inkscape query-all reports nested SVG image bounds in its local viewport.
  # Restore the alpha-bounded emblem's exact authored position after footer spacing.
  r=parse(svg);replace(r,'saga-emblem',logo(footer.SAGA_CENTER_X,fy));assets(r)
  r.set('data-card-family',c['category']);save(r,svg)
  b=footer.bounds(svg)
  b['saga-emblem']=[footer.SAGA_CENTER_X-35,fy-35*870/1127,70,70*870/1127]
  if not land:validate_text(r,b)
  for ident,target in [('card-category',(cx,685.166666666667 if land else 908.5)),('footer-text-block',(cx,fy)),('saga-emblem',(footer.SAGA_CENTER_X,fy))]:
   x,y,w,h=b[ident];assert abs(x+w/2-target[0])<.03 and abs(y+h/2-target[1])<.03,(n,ident,b[ident],target)
  assert not r.xpath('//*[local-name()="text"]')
  result=subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename=-','--export-width='+str(2968 if land else 2120)],capture_output=True,check=True)
  im=Image.open(io.BytesIO(result.stdout)).convert('RGB');report={'bounds':{k:v for k,v in b.items()if k in ['card-title','card-category','footer-rarity','card-number','saga-emblem']or k.startswith('rules-line-')},'rules':rr,'native_text_outlines':True}
 assert im.size==((2968,2120)if land else(2120,2968)),(n,im.size)
 results=[];export_root=ROOT/'review-only' if c['release_status']!='ready' else ROOT
 for folder,size in [('display',(1484,1060)if land else(1060,1484)),('downloads',im.size)]:
  dest=export_root/folder/(c['id']+'.webp');dest.parent.mkdir(parents=True,exist_ok=True);out=im.resize(size,Image.Resampling.LANCZOS)if size!=im.size else im
  out.save(dest,'WEBP',lossless=True,method=4);assert ImageChops.difference(out,Image.open(dest).convert('RGB')).getbbox()is None
  results.append(dict(path=str(dest.relative_to(ROOT)),size=list(size),sha256=digest(dest),lossless_verified=True))
 png=export_root/'png'/f'{c["id"]}.png';png.parent.mkdir(parents=True,exist_ok=True);im.save(png,optimize=False)
 report.update(number=n,id=c['id'],status=c['release_status'],exports=results,source_svg_sha256=digest(svg),assets=asset_paths,approved_logo_sha256=digest(ASSETS/'babidi-emblem.png'))
 (ROOT/'audit'/f'{card_key}.json').write_text(json.dumps(report,indent=2));print(f"Rendered {card_key}: {c['name']}",flush=True)
 return report

if __name__=='__main__':
 for d in [OUT,ROOT/'display',ROOT/'downloads',ROOT/'png',ROOT/'audit']:d.mkdir(exist_ok=True,parents=True)
 parser=argparse.ArgumentParser();parser.add_argument('numbers',nargs='*');args=parser.parse_args();cards=json.load(open(ROOT/'new-cards.json'));chosen=[c for c in cards if not args.numbers or str(c['number'])in args.numbers]
 with ProcessPoolExecutor(max_workers=3)as pool:list(pool.map(compose,chosen))
