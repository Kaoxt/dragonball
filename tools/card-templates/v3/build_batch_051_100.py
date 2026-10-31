"""Compose Saiyan 051–100 from retained native art and approved V3 components.

Run with --retained pointing to the recovered source archives, then card numbers.
Illustrations and decorative grain remain raster; structural layers and type are SVG.
"""
from pathlib import Path
from copy import deepcopy
from hashlib import sha256
from concurrent.futures import ProcessPoolExecutor
from functools import partial
from lxml import etree as E
from PIL import Image,ImageChops
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
import argparse,base64,io,json,math,re,subprocess,sys,os

P=Path(__file__).resolve().parent;ROOT=P.parents[2]
sys.path.insert(0,str(P/'scripts'))
from text_v3 import text,elem
from power_icons import icon,width_at_height
from align_power_icon import align_power_icon
S='http://www.w3.org/2000/svg';X='http://www.w3.org/1999/xlink'
OUT=P/'saiyan-051-100';ASSETS=P/'assets';EVID=ROOT/'tools/card-corrections/v3-saiyan-051-100'
FONT=TTFont(P/'fonts/BarlowCondensed-Bold.ttf');GS=FONT.getGlyphSet();CM=FONT.getBestCmap();SC=49/FONT['head'].unitsPerEm
def get(r,i):
 a=r.xpath('//*[@id=$i]',i=i);assert len(a)==1,(i,len(a));return a[0]
def replace(r,i,n):
 e=get(r,i);e.getparent().replace(e,n)
def parse(p):return E.parse(str(p)).getroot()
def digest(p):return sha256(Path(p).read_bytes()).hexdigest()
def atomic_bytes(p,data):
 p=Path(p);tmp=p.with_name(p.name+'.tmp')
 with tmp.open('wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
 os.replace(tmp,p)
def save(r,p):atomic_bytes(p,E.tostring(r,encoding='utf-8',xml_declaration=True))
def save_image(im,p,fmt,**kwargs):
 b=io.BytesIO();im.save(b,format=fmt,**kwargs);raw=b.getvalue()
 with Image.open(io.BytesIO(raw)) as check:check.load();assert check.size==im.size
 atomic_bytes(p,raw)
def word(t):
 x=0;paths=[];boxes=[]
 for c in t:
  g=GS[CM[ord(c)]];pen=SVGPathPen(GS);b=BoundsPen(GS);m=(SC,0,0,-SC,x,0);g.draw(TransformPen(pen,m));g.draw(TransformPen(b,m))
  if b.bounds:paths.append(pen.getCommands());boxes.append(b.bounds)
  x+=g.width*SC
 return paths,(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)),x
def rules(r,c):
 wording=c['modern_rules'];kind=c.get('power_icon');iw=width_at_height(kind,34.3) if kind else 0
 m=re.match(r'^(?:\(Limit \d+ per deck\.\)|Saiyan Heritage only\.)\s*',wording)
 prefix=wording[:m.end()].strip() if m else '';body=wording[m.end():] if m else wording
 tokens=prefix.split()+(['@ICON@'] if kind else [])+body.split()
 def arrange(ts):
  xx=0;parts=[]
  for i,t in enumerate(ts):
   if i:xx+=12 if t=='@ICON@' or ts[i-1]=='@ICON@' else 9.8
   parts.append((t,xx));xx+=iw if t=='@ICON@' else word(t)[2]
  return xx,parts
 lines=[];line=[];i=0
 while i<len(tokens):
  unit=tokens[i:i+2] if tokens[i]=='@ICON@' else tokens[i:i+1]
  if line and arrange(line+unit)[0]>890:lines.append(line);line=unit
  else:line+=unit
  i+=len(unit)
 if line:lines.append(line)
 assert len(lines)<=5,(c['number'],lines)
 reports=[];iconline=None
 for i,ts in enumerate(lines):
  width,parts=arrange(ts);ink=[(x,x+iw) if t=='@ICON@' else (x+word(t)[1][0],x+word(t)[1][2]) for t,x in parts]
  xx=529.5-(min(v[0] for v in ink)+max(v[1] for v in ink))/2;baseline=1049.3+i*59
  label=' '.join(t for t in ts if t!='@ICON@');g=elem('g',r,id=f'rules-line-{i+1}',aria_label=label,fill='#060606',transform=f'translate({xx} {baseline})',data_font_size=49,data_word_spacing='normal')
  for t,x in parts:
   if t=='@ICON@':
    ic,_=icon(kind,xx+x,baseline-34.3,34.3,'power-icon');r.append(E.fromstring(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(ic)));iconline=i+1
   else:
    for d in word(t)[0]:elem('path',g,d=d,transform=f'translate({x} 0)')
  reports.append({'text':label,'baseline':baseline,'width':width,'icon_inline':'@ICON@' in ts})
 return reports,iconline
def assetize(r):
 records={}
 for e in r.xpath('//*[local-name()="image"]'):
  key='{'+X+'}href' if e.get('{'+X+'}href') else 'href';ref=e.get(key)
  if ref.startswith('data:'):
   raw=base64.b64decode(ref.split(',',1)[1]);ext='png' if 'image/png' in ref[:40] else 'jpg' if 'jpeg' in ref[:40] else 'webp';h=sha256(raw).hexdigest();dest=ASSETS/(h+'.'+ext)
   if not dest.exists():dest.write_bytes(raw)
   e.set(key,'../assets/'+dest.name)
  else:
   dest=(OUT/ref).resolve();h=digest(dest)
  records[str(dest.relative_to(ROOT))]={'path':str(dest.relative_to(ROOT)),'sha256':h}
 return list(records.values())
def dependencies(dest,source,layer):
 known={x.get('id') for x in dest.iter()};queue=[layer]
 while queue:
  node=queue.pop()
  refs=set()
  for e in node.iter():
   for k,v in e.attrib.items():
    refs.update(re.findall(r'url\(#([^)]*)\)',v))
    if k.endswith('href') and v.startswith('#'):refs.add(v[1:])
  for ref in refs-known:
   n=deepcopy(get(source,ref));dest.find('{'+S+'}defs').append(n);known.add(ref);queue.append(n)
def artwork(r,old,c,retained):
 correction=json.loads((EVID/'art-corrections.json').read_text()).get(str(c['number']))
 if correction and correction.get('composite_svg'):
  source=parse(ROOT/correction['composite_svg']);mapped=elem('g',id='retained-illustration',clip_path='url(#new-art-window)');vx,vy,vw,vh=map(float,source.get('viewBox').split());inner=elem('g',mapped,transform=f'translate(14 146) scale({1033/vw} {706/vh}) translate({-vx} {-vy})')
  for child in source:
   if child.tag=='{'+S+'}defs':
    for d in child:r.find('{'+S+'}defs').append(deepcopy(d))
   else:inner.append(deepcopy(child))
  replace(r,'retained-illustration',mapped)
  return {'horizontal_source_crop':0,'artwork_bytes_retained':True,'localized_correction':correction,'source_native_sha256':digest(retained),'retained_full_artwork':True,'expression_patch_retained':c['number']==84}
 group=deepcopy(get(old,'card-illustration').getparent());group.set('clip-path','url(#new-art-window)');group.set('id','retained-source-illustration')
 # Same width-relative scale and camera center as the latest retained art window.
 scale=1033/1027;tx=14-16*scale;ty=499-(145+712.8378378378378/2)*scale
 mapped=elem('g',id='retained-illustration',clip_path='url(#new-art-window)');inner=elem('g',mapped,transform=f'matrix({scale} 0 0 {scale} {tx} {ty})')
 group.attrib.pop('clip-path',None);inner.append(group);dependencies(r,old,group)
 if c.get('v3_art_top_fraction') is not None:
  art=get(group,'card-illustration');h=float(art.get('height'));desired=146-(h*scale-706)*c['v3_art_top_fraction'];ty=desired-float(art.get('y'))*scale
  inner.set('transform',f'matrix({scale} 0 0 {scale} {tx} {ty})')
 if c['number']==84:
  entries=json.loads((ROOT/'tools/card-corrections/expression-audit-2026-10-26/manifest.json').read_text());entry=next(x for x in entries if x['id']==c['id']);a=entry['native_patch'];p=ROOT/'tools/card-corrections/expression-audit-2026-10-26'/a['file']
  q=elem('image',inner,id=c['id']+'-original-expression-patch',**{k:a[k] for k in ['x','y','width','height']});q.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode());q.set('preserveAspectRatio','none')
 correction=json.loads((EVID/'art-corrections.json').read_text()).get(str(c['number']))
 if correction:
  art=get(group,'card-illustration');sw,sh=correction['source_dimensions']
  patchgroup=elem('g',inner,id=f"localized-art-correction-{c['number']}",transform=f"translate({art.get('x')} {art.get('y')}) scale({float(art.get('width'))/sw} {float(art.get('height'))/sh})")
  clipid=f"source-correction-clip-{c['number']}";clip=elem('clipPath',r.find('{'+S+'}defs'),id=clipid);elem('path',clip,d=correction['clip'])
  patch=elem('image',patchgroup,id=f"source-correction-patch-{c['number']}",x=correction['placement'][0],y=correction['placement'][1],width=correction['placement'][2],height=correction['placement'][3],preserveAspectRatio='none',clip_path=f'url(#{clipid})')
  patch.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode((EVID/correction['patch']).read_bytes()).decode())
 replace(r,'retained-illustration',mapped)
 return {'horizontal_source_crop':0,'artwork_bytes_retained':True,'mapping_matrix':[scale,0,0,scale,tx,ty],'source_native_sha256':digest(retained),'localized_correction':correction,'expression_patch_retained':c['number']==84,'tien_placement_retained':c['number']==83}
def rarity(r,count):
 g=get(r,'footer-rarity');orig=deepcopy(g.find('{'+S+'}polygon'))
 for x in list(g):
  if x.tag=='{'+S+'}polygon':g.remove(x)
 centers={1:[(0,0)],3:[(0,-7),(-7,6),(7,6)]}[count]
 for i,(dx,dy) in enumerate(centers):
  x=deepcopy(orig);x.set('id',f'rarity-star-{i}');x.set('transform',f'translate({dx} {dy})');g.insert(1+i,x)
 g.set('data-star-count',str(count))
def personality(r,old,c):
 for ident in ['v3-level-number','v3-level-number-soft-shadow','concept-pur-number']:
  target=get(r,ident);source=get(old,'level-value' if 'level' in ident else 'circle-value');path=next(x for x in source.iter() if x.tag=='{'+S+'}path')
  # Approved reference-shaped outline, positioned in the current floating/PUR geometry.
  target.set('d',path.get('d'))
  p=BoundsPen(None);from fontTools.svgLib.path import parse_path;parse_path(path.get('d'),p);x0,y0,x1,y1=p.bounds
  height=106 if 'level' in ident else 65;cx=100 if 'level' in ident else 110;cy=71 if 'level' in ident else 908.5;sc=height/(y1-y0)
  target.set('transform',f'translate({cx-(x0+x1)*sc/2} {cy-(y0+y1)*sc/2}) scale({sc})');target.set('aria-label',str(c['level'] if 'level' in ident else c['pur']))
 stages=get(r,'power-stages-v3');values=list(reversed(c['stages']));assert len(values)==len(stages)
 for i,(row,val) in enumerate(zip(stages,values)):
  g,b=text(f'{val:,}','Teko-SemiBold.ttf',49,0,0,f'power-stage-value-{i}');g.set('transform',f'translate({244-16-b[0]} 42.582) scale(.049 -.049)')
  # Font bounds use x-min as well as advance; explicit right edge is 1031 globally.
  # Reuse text() horizontal centering to get an exact right edge, then cap-only baseline.
  g,b=text(f'{val:,}','Teko-SemiBold.ttf',49,220-b[0]/2,0,f'power-stage-value-{i}')
  m=re.match(r'translate\(([^ ]+) ([^)]+)\)(.*)',g.get('transform'));g.set('transform',f'translate({m.group(1)} 42.582){m.group(3)}');g.set('data-digit-center-y','27')
  replace(r,f'power-stage-value-{i}',g)
 # Gaps show this card's art through a restrained shared tint, never another card's scene.
 gaps=get(r,'power-stage-gap-overlays')
 for x in list(gaps):gaps.remove(x)
 gaps.set('data-treatment','Native translucent tint over current card artwork')
 for i in range(len(values)-1):
  y=204.9318181818182+i*64.6818181818182
  elem('rect',gaps,x=813.75,y=y,width=233.25,height=6,fill='#112932',opacity='.4')
 # Remove unused donor-scene images and their old clips from definitions.
 for e in list(r.find('{'+S+'}defs')):
  if e.get('id')=='earlier-stage-gap-source' or e.get('id','').startswith('restored-gap-window-'):e.getparent().remove(e)
def compose(c,retained):
 n=c['number'];mp='PERSONALITY' in c['category'];db=c['category']=='DRAGON BALL'
 source=retained/('personality/native' if mp else 'base-051-100/Saiyan-Saga-051-100/masters')/(c['id']+'.svg');old=parse(source)
 examples={'Orange':'049-orange-wrist-flex-takedown','Red':'006-red-lunge-punch','Blue':'013-blue-round-throw','Saiyan':'018-saiyan-arm-throw','Freestyle':'024-gokus-surprise-attack','Black':'049-orange-wrist-flex-takedown'}
 template=P/'masters'/('Personality-Master-V3.svg' if mp else 'Dragon-Ball-Master-V3.svg') if mp or db else P/'saiyan-001-050'/('saiyan-'+examples[c['style']]+'.svg')
 r=parse(template);r.set('data-template-version','3');r.set('data-card-number',str(n));r.set('data-card-family',c['category']);r.find('{'+S+'}title').text=c['name']
 for e in list(r):
  if e.get('id','').startswith('rules-line-') or e.get('id') in ['power-icon','attack-icon']:r.remove(e)
 title,_=text(c['name'],'Teko-SemiBold.ttf',86.0349127182045,529.5,79,'card-title',maxwidth=700 if mp else 920);replace(r,'card-title',title)
 category,_=text(c['category'],'Michroma-Regular.ttf',38.4,529.5,908.5,'card-category',stroke=4.21875);category.set('transform','translate(529.5 0) scale(.956 1) translate(-529.5 0) '+category.get('transform'));replace(r,'card-category',category)
 number,b=text(str(n),'Teko-SemiBold.ttf',53,0,1409.5,'card-number');number,b=text(str(n),'Teko-SemiBold.ttf',53,880+b[0]/2,1409.5,'card-number');replace(r,'card-number',number);rarity(r,c['rarity_stars'])
 if db:
  # Reuse the approved V3 full-art layout and the current ball's native star geometry.
  latest=parse(retained/'dragon-balls-smooth-amber/masters'/(c['id']+'.svg'));stars=deepcopy(get(latest,'left-orb-stars'));stars.set('id','large-orb-stars');replace(r,'large-orb-stars',stars)
  ar={'mode':'approved V3 full-art Shenron','approved_full_art_redesign':True,'horizontal_source_crop':0,'artwork_bytes_retained':True,'dragon_ball_number':c['dragon_ball_number'],'star_geometry_source':str(source),'source_native_sha256':digest(source)}
 else:
  ar=artwork(r,old,c,source)
  if mp:personality(r,old,c)
  if c['style']=='Black':
   filt=get(r,'style-outer-background-filter');get(r,'style-outer-background-filter')[0].set('values','.17 0 0 0 0 .19 0 0 0 0 .22 0 0 0 0 0 0 0 1 0')
   for el in get(r,'shared-rules-component').iter():
    for k,v in list(el.attrib.items()):
     if v=='#a66417':el.set(k,'#4b525c')
     if v=='#56300e':el.set(k,'#262d37')
   original=deepcopy(get(old,'black-style-symbol'));original.set('id','black-tokui-waza-outline');outline=deepcopy(original);outline.set('stroke','#080b0d');outline.set('stroke-width','13');original.set('id','black-tokui-waza-paint')
   group=elem('g',id='tokui-waza-symbol',data_style='Black',transform='translate(100 908.5) scale(1.35) translate(-100 -1006)');group.append(outline);group.append(original);replace(r,'tokui-waza-symbol',group)
 reports,iconline=rules(r,c);assets=assetize(r);OUT.mkdir(exist_ok=True)
 # Measurement must resolve shared raster dependencies even from the helper's temp directory.
 measurement=deepcopy(r)
 for e in measurement.xpath('//*[local-name()="image"]'):
  key='{'+X+'}href' if e.get('{'+X+'}href') else 'href';e.set(key,str((OUT/e.get(key)).resolve()))
 ir=[]
 if iconline:
  first=align_power_icon(measurement,'power-icon',f'rules-line-{iconline}');second=align_power_icon(measurement,'power-icon',f'rules-line-{iconline}');assert second['vertical_shift']==0
  replace(r,'power-icon',deepcopy(get(measurement,'power-icon')));ir=[first]
 ids=[e.get('id') for e in r.iter() if e.get('id')];assert len(ids)==len(set(ids)),n
 svg=OUT/(c['id']+'.svg');save(r,svg)
 work=ROOT.parent/'next50-renders';work.mkdir(exist_ok=True);png=work/(c['id']+'.png')
 render=png.with_name(png.stem+'.render.png')
 subprocess.run(['inkscape',str(svg),'--export-filename='+str(render),'--export-width=2120'],check=True,capture_output=True)
 im=Image.open(io.BytesIO(render.read_bytes())).convert('RGB');assert im.size==(2120,2968)
 save_image(im,png,'PNG');render.unlink()
 exports=[]
 cat=json.loads((ROOT/'public/cards/catalog.js').read_text().split('=',1)[1].strip().rstrip(';'));current=next(x for x in cat if x['id']==c['id'])
 for field,size in [('image',(1060,1484)),('downloadImage',(2120,2968))]:
  path=ROOT/('public'+current[field].split('?',1)[0]);before=sha256(subprocess.check_output(['git','show','HEAD:'+str(path.relative_to(ROOT))],cwd=ROOT)).hexdigest();outim=im.resize(size,Image.Resampling.LANCZOS) if size!=im.size else im
  path.parent.mkdir(exist_ok=True,parents=True);save_image(outim,path,'WEBP',lossless=True,method=4);assert ImageChops.difference(outim,Image.open(path).convert('RGB')).getbbox() is None
  exports.append({'field':field,'path':str(path.relative_to(ROOT)),'before_url':current[field],'before_sha256':before,'after_sha256':digest(path),'size':list(size),'lossless_round_trip':True})
 query=subprocess.run(['inkscape',str(svg),'--query-all'],check=True,capture_output=True,text=True);bounds={}
 for line in query.stdout.splitlines():
  a=line.split(',')
  if len(a)==5 and (a[0] in ['card-title','card-category','footer-text-block','saga-emblem','footer-rarity','card-number'] or a[0].startswith(('rules-line-','power-stage-value-'))):bounds[a[0]]=list(map(float,a[1:]))
 row={'number':n,'id':c['id'],'name':c['name'],'native_source_path':str(svg.relative_to(ROOT)),'native_source_sha256':digest(svg),'assets':assets,'artwork':ar,'rules':reports,'native_geometry':{'native_outlined_text':True,'bounds':bounds,'icons':ir},'exports':exports}
 (EVID/'per-card').mkdir(exist_ok=True);(EVID/'per-card'/f'{n:03}.json').write_text(json.dumps(row,indent=2)+'\n');print(f'Completed {n:03} {c["name"]}',flush=True)
 return row
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--retained',type=Path,required=True);a.add_argument('numbers',type=int,nargs='*');args=a.parse_args()
 cards=json.loads((EVID/'cards.json').read_text());cards=[c for c in cards if not args.numbers or c['number'] in args.numbers]
 with ProcessPoolExecutor(max_workers=3) as ex:list(ex.map(partial(compose,retained=args.retained.resolve()),cards))
 rows=[json.loads(p.read_text()) for p in sorted((EVID/'per-card').glob('*.json'))];(EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
