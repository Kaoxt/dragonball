"""Compose Trunks 106–155 from retained native illustrations and current V3 components."""
from pathlib import Path
from copy import deepcopy
from lxml import etree as E
from PIL import Image, ImageChops
import argparse, base64, io, json, subprocess, sys, re, colorsys
from concurrent.futures import ProcessPoolExecutor
from functools import partial
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
from build_batch_221_250_promos import personality, rarity as two_star_rarity
import build_batch_101_150 as shared
from build_batch_101_150 import get, replace, parse, digest, save, save_image, elem, text

P=Path(__file__).resolve().parent; ROOT=P.parents[2]
sys.path.insert(0,str(P/'scripts'))
from title_fit_v3 import apply as title_fit
from middle_label_v3 import apply as middle_label
from personality_middle_v3 import apply as personality_middle
from tokui_backing import apply as tokui_backing
from align_power_icon import align_power_icon
from footer_spacing import change as footer_spacing
from text_layout_v3 import validate as validate_text_layout
from mastery_source_v3 import load as load_mastery_source, APPROVED_SHA256 as MASTERY_SHA256
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
OUT=P/'trunks-106-155'; EVID=ROOT/'tools/card-corrections/v3-trunks-106-155'
WORK=ROOT.parent/'trunks-106-155-work'
shared.OUT=OUT; shared.EVID=EVID

def current(n):
 return next(P.glob(f'saiyan-*/saiyan-{n:03}-*.svg'))

def trunks_emblem(r,old):
 # Preserve the 54-unit native emblem. Its open right edge means its visible
 # center is not the original circle center; footer_spacing measures the ink.
 g=deepcopy(get(old,'trunks-set-emblem'));g.set('id','saga-emblem');g.set('data-set','Trunks Saga')
 g.set('transform','translate(211.86390646977245 1409.5)')
 replace(r,'saga-emblem',g)
 return {'native_vector':True,'retained_shape_and_size':True,'target_center':[211.75,1409.5]}

def source_dir(retained,n):
 c=next(c for c in json.loads((EVID/'cards.json').read_text()) if c['number']==n)
 return Path(c['retained_source_root'])

def old_source(c):return parse(Path(c['retained_master']))

def artwork(r,c,retained):
 n=c['number'];old=old_source(c);src=Path(c['retained_source_root'])
 if c['category']=='DRAGON BALL':
  wrapper=get(r,'background-brightness-trial-wrapper');wrapper.attrib.pop('filter',None)
  for child in list(wrapper):wrapper.remove(child)
  layer=elem('g',wrapper,id='retained-full-art-dragon-ball');layer.append(deepcopy(get(old,'porunga-full-art')))
  return {'mode':'approved current front-facing Porunga full art','source_native_sha256':digest(Path(c['retained_master'])),'artwork_bytes_retained':True,'approved_artwork_exception':True,'additional_zoom':False,'mapping_matrix':[1,0,0,1,0,0],'background_gain':1}
 if c['category']=='MASTERY':
  if n!=144:
   image=deepcopy(get(old,'card-illustration'));image.set('id','v2-card-illustration');replace(r,'v2-card-illustration',image)
  if n==149:
   patch=elem('image',get(r,'mastery-retained-illustration'),id='retained-149-approved-mouth',x=652,y=477,width=158,height=111,preserveAspectRatio='none')
   patch.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode((EVID/'retained-corrections/trunks-149-approved-mouth.png').read_bytes()).decode())
  return {'expression_patch_retained':n==149,'mode':'approved Mastery illustration, original image placement','source_native_sha256':digest(Path(c['retained_master'])),'artwork_bytes_retained':True,'additional_zoom':False,'mapping_matrix':[1,0,0,1,0,0],'mastery_approved_source_sha256':MASTERY_SHA256}
 scale=1033/1027;tx=14-16*scale;ty=499-(145+712.8378378378378/2)*scale
 layer=elem('g',id='retained-illustration',clip_path='url(#new-art-window)')
 mapped=elem('g',layer,id='retained-source-illustration',transform=f'matrix({scale} 0 0 {scale} {tx} {ty})');mapped.append(deepcopy(get(old,'card-illustration')))
 replace(r,'retained-illustration',layer)
 return {'mode':'retained approved illustration','source_sha256':digest(src/'source'/c['artwork_file']),'source_native_sha256':digest(Path(c['retained_master'])),'horizontal_source_crop':0,'artwork_bytes_retained':True,'mapping_matrix':[scale,0,0,scale,tx,ty],'additional_zoom':False}

def mastery(c):
 r=E.fromstring(load_mastery_source())
 # The approved source includes an unused legacy pattern with a dangling reference.
 # Removing this unreferenced definition leaves all rendered geometry unchanged.
 unused=get(r,'v2-matched-exposed-frame-texture');unused.getparent().remove(unused)
 r.set('data-approved-mastery-source-sha256',MASTERY_SHA256);r.set('data-style',c['style'])
 if c['style']=='Red':return r
 donor_path=next((P/'trunks-006-055').glob('trunks-007-*.svg')) if c['style']=='Namekian' else current({'Black':65,'Orange':49,'Saiyan':18,'Blue':13}[c['style']])
 donor=parse(donor_path);defs=r.find('{'+S+'}defs')
 # Retain the approved full-card texture; style filters come from current V3.
 for ident in ['style-outer-background-filter','background-brightness-trial','namekian-frame-hue']:
  nodes=donor.xpath('//*[@id=$i]',i=ident)
  if nodes:defs.append(deepcopy(nodes[0]))
 frame=deepcopy(get(donor,'background-brightness-trial-wrapper'));replace(r,'original-site-frame',frame)
 hue,saturation={'Black':(.61,.12),'Orange':(.075,.85),'Namekian':(.48,.7),'Saiyan':(.29,.72),'Blue':(.61,.73)}[c['style']]
 def tint(color):
  rr,gg,bb=[int(color[i:i+2],16)/255 for i in (1,3,5)];h,l,s=colorsys.rgb_to_hls(rr,gg,bb)
  return '#'+''.join(f'{round(v*255):02x}' for v in colorsys.hls_to_rgb(hue,l,min(s,saturation)))
 for e in r.iter():
  if not any('mastery' in a.get('id','') for a in [e,*e.iterancestors()]):continue
  for k,v in list(e.attrib.items()):
   if k in ['fill','stroke','stop-color'] and re.fullmatch('#[0-9a-fA-F]{6}',v):
    rr,gg,bb=[int(v[i:i+2],16) for i in (1,3,5)]
    if rr>gg*1.2 and rr>bb*1.1:e.set(k,tint(v))
 matrix=get(r,'v2-mastery-retained-shenron-red-ink').find('{'+S+'}feColorMatrix');rgb=colorsys.hls_to_rgb(hue,.53,saturation)
 matrix.set('values',f'0 0 0 0 {rgb[0]} 0 0 0 0 {rgb[1]} 0 0 0 0 {rgb[2]} 0.2126 0.7152 0.0722 0 0')
 # The rules paper remains shared; corners use the native style palette.
 replace(r,'shared-rules-component',deepcopy(get(donor,'shared-rules-component')))
 query=subprocess.run(['inkscape',str(donor_path),'--query-id=tokui-waza-symbol','--query-x','--query-y','--query-width','--query-height'],check=True,capture_output=True,text=True)
 x,y,w,h=map(float,query.stdout.split());scale=200.922/h
 symbol=deepcopy(get(donor,'tokui-waza-symbol'));symbol.set('id','mastery-native-style-symbol')
 g=elem('g',id='tokui-waza-symbol',data_style=c['style'],transform=f'translate(152.1423 839.868) scale({scale}) translate({-x-w/2} {-y-h/2})');g.append(symbol);replace(r,'red-tokui-waza-symbol',g)
 return r

def personality_values(r,c,retained):
 personality(r,{**c,'stages':list(reversed(c['stages']))},retained)
 for ident in ['v3-level-number','v3-level-number-soft-shadow','concept-pur-number']:
  value=c['level'] if 'level' in ident else c['pur']
  if value<4:continue
  source=get(old_source(c),'level-value' if 'level' in ident else 'circle-value')
  d=source.find('{'+S+'}path').get('d');target=get(r,ident);target.set('d',d)
  b=BoundsPen(None);parse_path(d,b);x0,y0,x1,y1=b.bounds
  height,cx,cy=(106,100,71) if 'level' in ident else (65,110,908.5);sc=height/(y1-y0)
  target.set('transform',f'translate({cx-(x0+x1)*sc/2} {cy-(y0+y1)*sc/2}) scale({sc})');target.set('aria-label',str(value))

def rules(r,c):
 # Retain deliberate sentence/phrase breaks, rather than leaving a lone word
 # such as "cards." on a separate line. All glyphs use the shared native font.
 kind=c.get('power_icon');iw=shared.width_at_height(kind,34.3) if kind else 0
 assert ' '.join(c['rule_lines']).replace('@ICON@ ','')==c['modern_rules']
 assert len(c['rule_lines'])<=5
 reports=[];iconline=None
 for i,line in enumerate(c['rule_lines']):
  parts=[];xx=0;tokens=line.split()
  for j,t in enumerate(tokens):
   if j:xx+=12 if t=='@ICON@' or tokens[j-1]=='@ICON@' else 9.8
   parts.append((t,xx));xx+=iw if t=='@ICON@' else shared.word(t)[2]
  assert xx<=890,(c['number'],line,xx)
  ink=[(x,x+iw) if t=='@ICON@' else (x+shared.word(t)[1][0],x+shared.word(t)[1][2]) for t,x in parts]
  dx=529.5-(min(v[0] for v in ink)+max(v[1] for v in ink))/2;baseline=1049.3+i*59
  label=' '.join(t for t in tokens if t!='@ICON@');g=elem('g',r,id=f'rules-line-{i+1}',aria_label=label,fill='#060606',transform=f'translate({dx} {baseline})',data_font_size=49,data_word_spacing='normal')
  for t,x in parts:
   if t=='@ICON@':
    ic,_=shared.icon(kind,dx+x,baseline-34.3,34.3,'power-icon');r.append(E.fromstring(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(ic)));iconline=i+1
   else:
    for d in shared.word(t)[0]:elem('path',g,d=d,transform=f'translate({x} 0)')
  reports.append({'text':label,'baseline':baseline,'width':xx,'icon_inline':'@ICON@' in tokens})
 return reports,iconline

def compose(c,retained):
 (P/'references/version-3-standard.md').read_text()
 n=c['number'];db=c['category']=='DRAGON BALL';mp='PERSONALITY' in c['category']
 donor={113:186,114:187,136:77}.get(n) if db else (158 if c['category'].startswith('HERO') else 170) if mp else {'Orange':49,'Red':6,'Blue':13,'Black':65,'Saiyan':18,'Freestyle':24,'Namekian':13}[c['style']]
 r=mastery(c) if c['category']=='MASTERY' else parse(next((P/'trunks-006-055').glob('trunks-007-*.svg')) if c['style']=='Namekian' and not db else current(donor));r.set('data-template-version','3');r.set('data-card-number',str(n));r.set('data-card-family',c['category']);r.find('{'+S+'}title').text=c['name']
 for e in list(r):
  if e.get('id','').startswith('rules-line-') or e.get('id') in ['power-icon','attack-icon']:r.remove(e)
 get(r,'card-title').set('aria-label',c['name']);w=c.get('title_safe_width');fit=title_fit(r,529.5-w/2,529.5+w/2) if w else title_fit(r);assert title_fit(r)==fit
 get(r,'card-category').set('aria-label',c['category']);mid=middle_label(r);assert middle_label(r)==mid
 num,b=text(str(n),'Teko-SemiBold.ttf',53,877.15,1409.5,'card-number');replace(r,'card-number',num)
 rarity=deepcopy(get(parse(current(24)),'footer-rarity'));replace(r,'footer-rarity',rarity)

 if c['rarity_stars']==2:two_star_rarity(r,2)
 else:shared.rarity(r,c['rarity_stars'])
 rarity=get(r,'footer-rarity')
 rarity.set('data-star-count',str(c['rarity_stars']));circle=rarity.find('{'+S+'}circle');assert abs(float(circle.get('r'))*2+float(circle.get('stroke-width'))-47.6)<1e-8
 ball_center=847.25-(12.2+b[0])/2;rarity.set('transform',f'translate({ball_center-882} -6.5)')
 old=old_source(c);emblem=trunks_emblem(r,old)
 ar=artwork(r,c,retained)
 # This archive stores stages top-to-bottom; the shared builder accepts bottom-to-top.
 if mp:personality_values(r,c,retained)
 personality_middle(r,high_tech=False)
 tok=tokui_backing(r) if c['category']!='MASTERY' else False;reports,iconline=rules(r,c);assets=shared.assetize(r)
 measurement=deepcopy(r)
 for e in measurement.xpath('//*[local-name()="image"]'):
  key='{'+X+'}href' if e.get('{'+X+'}href') else 'href';ref=e.get(key)
  if not ref.startswith('#'):e.set(key,str((OUT/ref).resolve()))
 icons=[]
 if iconline:
  first=align_power_icon(measurement,'power-icon',f'rules-line-{iconline}');second=align_power_icon(measurement,'power-icon',f'rules-line-{iconline}');assert second['vertical_shift']==0
  replace(r,'power-icon',deepcopy(get(measurement,'power-icon')));icons=[first]
 ids=[e.get('id') for e in r.iter()if e.get('id')];assert len(ids)==len(set(ids)),n
 OUT.mkdir(exist_ok=True);svg=OUT/(c['id']+'.svg');save(r,svg);footer_spacing(svg,normalize_gap=True);second=footer_spacing(svg,normalize_gap=True);assert not second['changed']
 render_dir=WORK/'renders';render_dir.mkdir(exist_ok=True);png=render_dir/(c['id']+'.png');tmp=png.with_suffix('.render.png')
 subprocess.run(['inkscape',str(svg),'--export-filename='+str(tmp),'--export-width=2120'],check=True,capture_output=True)
 im=Image.open(io.BytesIO(tmp.read_bytes())).convert('RGB');assert im.size==(2120,2968);save_image(im,png,'PNG');tmp.unlink()
 card=next(x for x in json.loads((WORK/'catalog-before.json').read_text())if x['id']==c['id']);exports=[]
 for field,size in [('image',(1060,1484)),('downloadImage',(2120,2968))]:
  rel='public'+card[field].split('?')[0];dest=ROOT/rel;out=im.resize(size,Image.Resampling.LANCZOS)if size!=im.size else im
  dest.parent.mkdir(parents=True,exist_ok=True);save_image(out,dest,'WEBP',lossless=True,method=4);assert ImageChops.difference(out,Image.open(dest).convert('RGB')).getbbox() is None
  exports.append({'field':field,'path':rel,'before_url':card[field],'before_sha256':digest(WORK/'baseline'/rel),'after_sha256':digest(dest),'size':list(size),'lossless_round_trip':True})
 query=subprocess.run(['inkscape',str(svg),'--query-all'],check=True,capture_output=True,text=True);bounds={}
 for line in query.stdout.splitlines():
  a=line.split(',')
  if len(a)==5 and (a[0] in ['card-title','card-category','footer-text-block','saga-emblem','footer-rarity','card-number','dragon-ball-left-emblem','v3-level-number','concept-pur-number'] or a[0].startswith(('rules-line-','power-stage-value-'))):bounds[a[0]]=list(map(float,a[1:]))
 validate_text_layout(E.parse(str(svg)).getroot(),bounds)
 ball,num=bounds['footer-rarity'],bounds['card-number'];assert abs((min(ball[0],num[0])+max(ball[0]+ball[2],num[0]+num[2]))/2-847.25)<.002
 assert abs(num[0]-ball[0]-ball[2]-12.2)<.002
 sx,sy,sw,sh=bounds['saga-emblem'];assert abs(sx+sw/2-211.75)<.002 and abs(sy+sh/2-1409.5)<.002,(n,bounds['saga-emblem'])
 row={'personality_values':{k:c[k] for k in ['level','pur','stages']} if mp else None,'number':n,'id':c['id'],'name':c['name'],'family':c['category'],'native_source_path':str(svg.relative_to(ROOT)),'native_source_sha256':digest(svg),'assets':assets,'artwork':ar,'rules':reports,'native_geometry':{'native_outlined_text':True,'bounds':bounds,'icons':icons},'exports':exports,'tokui_waza_backing':{'applies':not(db or mp),'all_styles':not(db or mp),'report':tok},'current_preview_revision':{'title_fit':fit,'middle_label':mid,'background_gain':1 if db else 1.2,'footer_idempotent':True},'power_icon':c.get('power_icon'),'set_emblem':emblem}
 (EVID/'per-card'/f'{n}.json').write_text(json.dumps(row,indent=2)+'\n');print(f'Completed {n}: {c["name"]}',flush=True)
 return row

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--retained',type=Path,required=True);a.add_argument('numbers',type=int,nargs='*');args=a.parse_args()
 cs=json.loads((EVID/'cards.json').read_text())
 selected=[c for c in cs if not args.numbers or c['number']in args.numbers]
 with ProcessPoolExecutor(max_workers=3)as pool:list(pool.map(partial(compose,retained=args.retained.resolve()),selected))
 rows=[json.loads(p.read_text())for p in sorted((EVID/'per-card').glob('*.json'),key=lambda p:int(p.stem))];(EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
