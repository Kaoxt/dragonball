"""Compose Trunks 156–200 and P1–P5 from retained native illustrations and current V3 components."""
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
OUT=P/'trunks-156-200-p1-p5'; EVID=ROOT/'tools/card-corrections/v3-trunks-156-200-p1-p5'
WORK=ROOT.parent/'trunks-156-200-p1-p5-work'
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

def embed_external(layer, source):
 for e in layer.iter():
  if e.tag!='{'+S+'}image':continue
  for key in ['href','{'+X+'}href']:
   v=e.get(key)
   if v and not v.startswith(('data:','#')):
    p=source.parent/v;e.set(key,'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode())

def raster(parent,path,ident,placement):
 g=elem('image',parent,id=ident,x=placement[0],y=placement[1],width=placement[2],height=placement[3],preserveAspectRatio='none')
 g.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode());return g

def repair(r,parent,n,placement,shapes):
 ident=f'original-fidelity-repair-{n}';defs=r.find('{'+S+'}defs')
 clip=elem('clipPath',defs,id=ident+'-clip',clipPathUnits='userSpaceOnUse')
 mask=elem('mask',defs,id=ident+'-mask',maskUnits='userSpaceOnUse',x='-100',y='-100',width='1800',height='1800')
 filt=elem('filter',defs,id=ident+'-feather',x='-10%',y='-10%',width='120%',height='120%');elem('feGaussianBlur',filt,stdDeviation='1')
 for tag,attrs in shapes:
  elem(tag,clip,**attrs);elem(tag,mask,**attrs,fill='white',filter=f'url(#{ident}-feather)')
 g=elem('g',parent,id=ident,clip_path=f'url(#{ident}-clip)',mask=f'url(#{ident}-mask)')
 raster(g,EVID/'artwork-corrections'/f'{n}-generated.png',ident+'-image',placement)
 return {'generated_illustration_only':True,'patch':str((EVID/'artwork-corrections'/f'{n}-generated.png').relative_to(ROOT)),'placement':placement,'native_mask_shapes':shapes,'retained_source_beneath':True}

def artwork(r,c,retained):
 n=c['number'];old=old_source(c);source=Path(c['retained_master'])
 ar={'source_native_sha256':digest(source),'additional_zoom':False,'artwork_bytes_retained':True}
 if c.get('high_tech'):
  layer=elem('g',id='retained-hi-tech-composition')
  for ident in ['full-bleed-artwork','hi-tech-background-portrait-removal','restored-enlarged-background-portrait']:
   found=old.xpath('//*[@id=$i]',i=ident)
   if found:
    part=deepcopy(found[0]);shared.dependencies(r,old,part);embed_external(part,source);layer.append(part)
  if n==195:raster(layer,ROOT/'tools/card-corrections/trunks-195-costume-2026-10-28/costume-patch.png','retained-195-approved-costume',(253,463,464,383));ar['approved_costume_patch_retained']=True
  shapes={
   191:[('path',{'d':'M 230,100 L 550,100 L 600,350 L 740,520 L 810,900 L 1060,960 L 1060,1484 L 0,1484 L 0,520 L 210,430 Z'})],
   196:[('path',{'d':'M 70,120 L 480,100 L 640,310 L 860,370 L 980,750 L 1060,1484 L 0,1484 L 0,500 Z'})],
   197:[('ellipse',{'cx':420,'cy':725,'rx':91,'ry':84})],
   199:[('path',{'d':'M 30,135 L 570,110 L 680,320 L 670,480 L 990,550 L 1030,1000 L 800,1484 L 0,1484 L 0,600 Z'})],
   200:[('ellipse',{'cx':464,'cy':593,'rx':45,'ry':36})]
  }
  if n in shapes:ar['localized_correction']=repair(r,layer,n,[0,0,1060,1484],shapes[n])
  frame=get(r,'background-brightness-trial-wrapper');frame.getparent().replace(frame,layer)
  for ident in ['retained-illustration','clean-native-artwork-rails']:
   part=get(r,ident);part.getparent().remove(part)
  r.set('data-artwork-treatment','retained-full-bleed-high-tech')
  ar.update(mode='approved full-art Hi-Tech composition with original-scene fidelity repair where recorded',background_gain=1,approved_full_art_exception=True,later_portrait_correction_retained=n in [193,194,196,197,198,199,200])
  return ar
 scale=1033/1027;tx=14-16*scale;ty=499-(145+712.8378378378378/2)*scale
 layer=elem('g',id='retained-illustration',clip_path='url(#new-art-window)')
 mapped=elem('g',layer,id='retained-source-illustration',transform=f'matrix({scale} 0 0 {scale} {tx} {ty})')
 art=deepcopy(get(old,'card-illustration'));embed_external(art,source);mapped.append(art)
 if n==159:
  patch=deepcopy(get(old,'anatomically-connected-hand-and-sleeve'));shared.dependencies(r,old,patch);embed_external(patch,source);mapped.append(patch);ar['approved_hand_wrist_cuff_patch_retained']=True
 if n in [156,165,172]:
  # Native mask coordinates here follow the original illustration pixel grid.
  x,y,w,h=[float(art.get(k)) for k in ['x','y','width','height']];aw,ah=1505,1045
  g=elem('g',mapped,id=f'original-fidelity-pixel-space-{n}',transform=f'translate({x} {y}) scale({w/aw} {h/ah})')
  shapes=[('ellipse',{'cx':464,'cy':185,'rx':45,'ry':52}),('ellipse',{'cx':566,'cy':170,'rx':45,'ry':50})] if n==156 else [('ellipse',{'cx':512,'cy':380,'rx':31,'ry':20})]
  if n==172:shapes=[('rect',{'x':60,'y':670,'width':107,'height':80}),('ellipse',{'cx':530,'cy':730,'rx':92,'ry':38}),('ellipse',{'cx':912,'cy':740,'rx':30,'ry':38})]
  ar['localized_correction']=repair(r,g,n,[0,0,aw,ah],shapes)
 if n in [185,186,189,202,203,204]:
  info=json.loads((EVID/'sky-masks.json').read_text())[str(n)];aw,ah=info['width'],info['height']
  x,y,w,h=[float(art.get(k)) for k in ['x','y','width','height']]
  g=elem('g',mapped,id=f'sky-correction-space-{n}',transform=f'translate({x} {y}) scale({w/aw} {h/ah})')
  mask=elem('mask',r.find('{'+S+'}defs'),id=f'original-sky-mask-{n}',maskUnits='userSpaceOnUse',x=0,y=0,width=aw,height=ah)
  raster(mask,EVID/info['mask_file'],f'sky-mask-image-{n}',[0,0,aw,ah])
  patch=elem('g',g,id=f'original-sky-correction-{n}',mask=f'url(#original-sky-mask-{n})')
  raster(patch,EVID/'artwork-corrections'/f'{n}-generated.png',f'sky-correction-image-{n}',[0,0,aw,ah])
  ar['sky_only_correction']={'native_mask':f'original-sky-mask-{n}','illustration_source_retained':True,'mask_file':info['mask_file']}
 replace(r,'retained-illustration',layer)
 ar.update(mode='retained approved illustration',horizontal_source_crop=0,mapping_matrix=[scale,0,0,scale,tx,ty],retained_approved_reframing=n==166)
 return ar

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
 r=mastery(c) if c['category']=='MASTERY' else parse(next((P/'trunks-006-055').glob('trunks-007-*.svg')) if c['style']=='Namekian' and not db else current(donor));r.set('data-template-version','3');r.set('data-card-number',c['printed_number']);r.set('data-card-family',c['category']);r.find('{'+S+'}title').text=c['name']
 for e in list(r):
  if e.get('id','').startswith('rules-line-') or e.get('id') in ['power-icon','attack-icon']:r.remove(e)
 get(r,'card-title').set('aria-label',c['name']);w=c.get('title_safe_width');fit=title_fit(r,529.5-w/2,529.5+w/2) if w else title_fit(r);assert title_fit(r)==fit
 get(r,'card-category').set('aria-label',c['category']);mid=middle_label(r);assert middle_label(r)==mid
 num,b=text(c['printed_number'],'Teko-SemiBold.ttf',53,877.15,1409.5,'card-number');replace(r,'card-number',num)
 rarity=deepcopy(get(parse(current(24)),'footer-rarity'));replace(r,'footer-rarity',rarity)

 if c['rarity_stars'] in [2,5,6]:two_star_rarity(r,c['rarity_stars'])
 elif c['rarity_stars']==4:replace(r,'footer-rarity',deepcopy(get(parse(current(170)),'footer-rarity')))
 else:shared.rarity(r,c['rarity_stars'])
 rarity=get(r,'footer-rarity')
 rarity.set('data-star-count',str(c['rarity_stars']));circle=rarity.find('{'+S+'}circle');assert abs(float(circle.get('r'))*2+float(circle.get('stroke-width'))-47.6)<1e-8
 ball_center=847.25-(12.2+b[0])/2;rarity.set('transform',f'translate({ball_center-882} -6.5)')
 old=old_source(c);emblem=trunks_emblem(r,old)
 ar=artwork(r,c,retained)
 # This archive stores stages top-to-bottom; the shared builder accepts bottom-to-top.
 if mp:personality_values(r,c,retained)
 personality_middle(r,high_tech=c.get('high_tech',False))
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
 row={'personality_values':{k:c[k] for k in ['level','pur','stages']} if mp else None,'number':n,'printed_number':c['printed_number'],'high_tech':c.get('high_tech',False),'id':c['id'],'name':c['name'],'family':c['category'],'native_source_path':str(svg.relative_to(ROOT)),'native_source_sha256':digest(svg),'assets':assets,'artwork':ar,'rules':reports,'native_geometry':{'native_outlined_text':True,'bounds':bounds,'icons':icons},'exports':exports,'tokui_waza_backing':{'applies':not(db or mp),'all_styles':not(db or mp),'report':tok},'current_preview_revision':{'title_fit':fit,'middle_label':mid,'background_gain':1 if c.get('high_tech') else 1.2,'footer_idempotent':True},'power_icon':c.get('power_icon'),'set_emblem':emblem}
 (EVID/'per-card'/f'{n}.json').write_text(json.dumps(row,indent=2)+'\n');print(f'Completed {n}: {c["name"]}',flush=True)
 return row

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--retained',type=Path,required=True);a.add_argument('numbers',type=int,nargs='*');args=a.parse_args()
 cs=json.loads((EVID/'cards.json').read_text())
 selected=[c for c in cs if not args.numbers or c['number']in args.numbers]
 with ProcessPoolExecutor(max_workers=3)as pool:list(pool.map(partial(compose,retained=args.retained.resolve()),selected))
 rows=[json.loads(p.read_text())for p in sorted((EVID/'per-card').glob('*.json'),key=lambda p:int(p.stem))];(EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
