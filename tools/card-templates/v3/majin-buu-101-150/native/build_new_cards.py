from pathlib import Path
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
from lxml import etree as E
from PIL import Image,ImageChops
from hashlib import sha256
import sys,json,base64,re,subprocess,shutil,io,argparse,os
os.environ["OMP_NUM_THREADS"]="1"
P=Path(__file__).resolve().parent
ROOT=P.parent
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
 g=deepcopy(parse(P/'buu-footer-logo.svg'))
 g.set('transform',f'translate({cx-211.75} {cy-1409.5})')
 g.set('data-set','Majin Buu Saga')
 return g

def mastery_style(r,c):
 style=c['style']
 if style=='Red':return
 nums={'Blue':13,'Saiyan':18,'Freestyle':24,'Orange':49,'Black':65}
 source=P/'donors/namekian.svg' if style=='Namekian' else next((P/'donors').glob(f'saiyan-{nums[style]:03d}-*.svg'))
 sr=parse(source);sb=footer.bounds(source);x,y,w,h=sb['tokui-waza-symbol'];sc=200.922/h
 group=elem('g',id='mastery-style-emblem',transform=f'translate({152.1423-sc*(x+w/2)} {839.868-sc*(y+h/2)}) scale({sc})',data_style=style)
 for ident in ['tokui-waza-smoky-backing','tokui-waza-symbol']:
  part=deepcopy(get(sr,ident));dependencies(r,sr,part);group.append(part)
 replace(r,'red-tokui-waza-symbol',group)
 defs=r.find('{'+S+'}defs');f=elem('filter',defs,id='mastery-style-palette',color_interpolation_filters='sRGB')
 if style in ['Black','Freestyle']:elem('feColorMatrix',f,type='saturate',values=0)
 else:elem('feColorMatrix',f,type='hueRotate',values={'Blue':210,'Saiyan':105,'Orange':27,'Namekian':160}[style])
 for ident in ['original-site-frame','mastery-unified-shenron-surround','mastery-pointed-artwork-rails','shared-rules-component']:
  get(r,ident).set('filter','url(#mastery-style-palette)')


def compose(c):
 n=c['number'];card_key=f'{n:03d}' if isinstance(n,int) else n;land=c['category'] in ['BATTLEGROUND','LOCATION'];mp=c['category'] in ['HERO','VILLAIN'];cx=741.5 if land else 529.5;fy=985.5 if land else 1409.5
 mastery=c['category']=='MASTERY';sensei=c['category']=='SENSEI'
 if c['category']=='DRAGON BALL':donor=P/'donors/dragon-ball.svg'
 elif mastery:donor=P/'donors/mastery.svg'
 elif sensei:donor=P/'donors/sensei.svg'
 elif land:donor=P/'donors/landscape.svg'
 elif mp:donor=P/'donors'/('personality-'+c['category'].lower()+'.svg')
 elif c['style']=='Namekian':donor=P/'donors/namekian.svg'
 else:
  style_nums={'Red':6,'Blue':13,'Saiyan':18,'Freestyle':24,'Orange':49,'Black':65}
  donor=next((P/'donors').glob(f"saiyan-{style_nums[c['style']]:03d}-*.svg"))
 r=parse(donor);r.set('data-card-id',c['id']);r.set('data-card-number',str(n));r.set('aria-label',f"Majin Buu Saga {n}: {c['name']}");r.find('{'+S+'}title').text=c['name']
 for el in list(r.xpath('//*[starts-with(@id,"rules-line-")]'))+list(r.xpath('//*[@id="power-icon" or @id="attack-icon" or @id="block-icon" or @id="power-line-block"]')):el.getparent().remove(el)
 if land:
  title_el,b=text(c['name'],'Teko-SemiBold.ttf',86.0349127182045,cx,79,'card-title',vertical_ignore_punctuation=True)
  title_el,b=text(c['name'],'Teko-SemiBold.ttf',86.0349127182045*min(1,1184/b[0]),cx,79,'card-title',vertical_ignore_punctuation=True);replace(r,'card-title',title_el)
 else:get(r,'card-title').set('aria-label',c['name']);title_fit(r)
 mid,mid_report=middle_label(c['category'])
 if land:mid.set('transform','translate(212 -223.333333333333) '+mid.get('transform'))
 if sensei:mid.set('transform','translate(-94.838689895214 0) '+mid.get('transform'))
 replace(r,'card-category',mid)
 num,_=text(str(n),'Teko-SemiBold.ttf',53,(1186.45 if land else 847.25)+29.9,fy,'card-number');replace(r,'card-number',num)
 ball_source=parse(next((P/'donors').glob('saiyan-024-*.svg')));ball=deepcopy(get(ball_source,'footer-rarity'));dependencies(r,ball_source,ball);replace(r,'footer-rarity',ball);rarity(r,c['rarity_stars']);get(r,'footer-rarity').set('transform',f'translate(0 {fy-1416})')
 replace(r,'saga-emblem',logo(296.55 if land else 211.75,fy))
 if c['category']=='DRAGON BALL':
  art=get(r,'dende-full-art')
  if c.get('artwork_path'):
   src=ROOT/c['artwork_path'];sw,sh=Image.open(src).size
   art.set('{'+X+'}href',str(src))
   if c.get('approved_artwork_path'):
    art.set('x','0');art.set('y','-145.99074074074076');art.set('width','1060');art.set('height',str(sh*1060/sw));art.set('preserveAspectRatio','xMidYMid meet')
    r.set('data-artwork-revision','2026-11-26-alternate-dende-summoning')
  from dragon_ball_v3 import star
  stars=get(r,'dragon-ball-emblem-stars')
  for el in list(stars):stars.remove(el)
  count=c['dragon_ball_number']
  positions={1:[(0,0)],2:[(-.3,-.3),(.3,.3)],3:[(0,-.38),(-.38,.3),(.38,.3)],4:[(-.40,-.22),(.20,-.22),(-.14,.22),(.46,.22)],5:[(-.4,-.4),(.4,-.4),(0,0),(-.4,.4),(.4,.4)],6:[(-.3,-.4),(.3,-.4),(-.5,.08),(0,.08),(.5,.08),(0,.52)],7:[(-.3,-.4),(.3,-.4),(-.55,0),(0,0),(.55,0),(-.3,.4),(.3,.4)]}[count]
  for i,(dx,dy) in enumerate(positions):elem('polygon',stars,id=f'dragon-ball-emblem-star-{i+1}',points=star(130+dx*118,887+dy*118,118*(.32 if count==1 else .25 if count==2 else .21)),fill='#d93209')
  stars.set('data-star-count',str(count));get(r,'dragon-ball-left-emblem').set('data-star-count',str(count));r.set('data-dragon-ball-number',str(count))
 else:
  ax,ay,aw,ah=(16,145,1451,1451/3)if land else(16,145,1027,770.25)if mastery else(0,146,1060,706.6666666667)if sensei else(14,146,1033,706)
  art_id='mastery-retained-illustration' if mastery else 'retained-illustration'
  layer=elem('g',id=art_id,clip_path='url(#artwork-window)'if land else'url(#v2-artwork-window)'if mastery else'url(#sensei-portrait-clip)'if sensei else'url(#new-art-window)')
  if c['release_status']=='artwork_pending':
   src=ROOT/c['original_scan'];sw,sh=Image.open(src).size
   v=elem('svg',layer,x=ax,y=ay,width=aw,height=ah,viewBox=f'{sw*.055} {sh*.125} {sw*.89} {sh*.42}',preserveAspectRatio='xMidYMid slice')
   a=elem('image',v,x=0,y=0,width=sw,height=sh);a.set('{'+X+'}href',str(src))
   tag_y=ay+ah*.50 if mastery else ay+ah-65
   elem('rect',layer,x=ax,y=tag_y,width=aw,height=65,fill='#171717',opacity='.94')
   tag,_=text('SOURCE ART — REPLACEMENT NEEDED','BarlowCondensed-Bold.ttf',32,cx,tag_y+32,'artwork-status',fill='#ffffff');layer.append(tag)
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
   native_shift=c.get('artwork_native_shift_x',0)
   if native_shift:
    # Position the personality inside the area left of the stage column.
    # Reuse only the source's empty left background in the newly exposed strip.
    d=elem('defs',layer);clip=elem('clipPath',d,id='native-shift-background',clipPathUnits='userSpaceOnUse')
    elem('rect',clip,x=ax,y=ay,width=native_shift,height=ah)
    bg=elem('image',layer,x=ax,y=ay,width=aw,height=ah,preserveAspectRatio='xMidYMid slice',clip_path='url(#native-shift-background)');bg.set('{'+X+'}href',str(src))
   a=elem('image',layer,id='card-illustration',x=ax+offset+native_shift,y=ay,width=aw,height=ah,preserveAspectRatio=c.get('artwork_fit','xMidYMid slice'));a.set('{'+X+'}href',str(src))
   if offset:a.set('mask','url(#retained-artwork-edge-blend)')
  replace(r,art_id,layer)

 if mastery:mastery_style(r,c)
 if sensei:
  from sensei_details_v3 import capacity_number
  replace(r,'sensei-deck-capacity',capacity_number(str(c['sensei_deck_capacity'])))
 if mp:
  glyphs=json.load(open(P/'personality-levels.json'));old=elem('svg')
  for ident,value in [('level-value',c['level']),('circle-value',c['pur'])]:g=elem('g',old,id=ident);elem('path',g,d=glyphs[str(value)]['d'])
  personality_values(r,old,c);personality_middle(r,high_tech=False);apply_level(r,c['level'])
 if not(land or mp or mastery or sensei or c['category']=='DRAGON BALL'):tokui_backing(r)
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
 r=parse(svg);r.set('data-card-family',c['category']);save(r,svg)
 b=footer.bounds(svg)
 if not(land or sensei):validate_text(r,b)
 if sensei:
  assert not c['modern_rules'] and not r.xpath('//*[starts-with(@id,"rules-line-")]'), 'Elder Kai has no printed power'
  assert get(r,'sensei-deck-capacity').get('aria-label')=='21'
 for ident,target in [('card-category',(434.661310104786 if sensei else cx,685.166666666667 if land else 908.5)),('footer-text-block',(cx,fy)),('saga-emblem',(footer.SAGA_CENTER_X,fy))]:
  x,y,w,h=b[ident];assert abs(x+w/2-target[0])<.03 and abs(y+h/2-target[1])<.03,(n,ident,b[ident],target)
 assert not r.xpath('//*[local-name()="text"]')
 result=subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename=-','--export-width='+str(2968 if land else 2120)],capture_output=True,check=True)
 im=Image.open(io.BytesIO(result.stdout)).convert('RGB');report={'bounds':{k:v for k,v in b.items()if k in ['card-title','card-category','footer-rarity','card-number','saga-emblem']or k.startswith('rules-line-')},'rules':rr,'native_text_outlines':True,'review_status':'awaiting_final_visual_review'}
 assert im.size==((2968,2120)if land else(2120,2968)),(n,im.size)
 results=[];export_root=ROOT/'review-only' if c['release_status']!='ready' else ROOT
 for folder,size in [('display',(1484,1060)if land else(1060,1484)),('downloads',im.size)]:
  dest=export_root/folder/(c['id']+'.webp');dest.parent.mkdir(parents=True,exist_ok=True);out=Image.open(io.BytesIO(subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename=-','--export-width='+str(size[0])],capture_output=True,check=True).stdout)).convert('RGB') if size!=im.size else im
  out.save(dest,'WEBP',lossless=True,method=4);assert ImageChops.difference(out,Image.open(dest).convert('RGB')).getbbox()is None
  results.append(dict(path=str(dest.relative_to(ROOT)),size=list(size),sha256=digest(dest),lossless_verified=True))
 png=export_root/'png'/f'{c["id"]}.png';png.parent.mkdir(parents=True,exist_ok=True);im.save(png,optimize=False)
 report.update(number=n,id=c['id'],status=c['release_status'],exports=results,source_svg_sha256=digest(svg),assets=asset_paths,native_buu_emblem=True)
 (ROOT/'audit'/f'{card_key}.json').write_text(json.dumps(report,indent=2));print(f"Rendered {card_key}: {c['name']}",flush=True)
 return report

if __name__=='__main__':
 for d in [OUT,ROOT/'display',ROOT/'downloads',ROOT/'png',ROOT/'audit']:d.mkdir(exist_ok=True,parents=True)
 parser=argparse.ArgumentParser();parser.add_argument('numbers',nargs='*');args=parser.parse_args();cards=json.load(open(ROOT/'new-cards.json'));chosen=[c for c in cards if not args.numbers or str(c['number'])in args.numbers]
 with ProcessPoolExecutor(max_workers=2)as pool:list(pool.map(compose,chosen))
