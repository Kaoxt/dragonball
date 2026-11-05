"""Migrate Saiyan 221–250 and promos P1–P7 using retained artwork and the current V3 components.

The retained source archives are inputs; emitted SVGs use portable, hashed assets.
All fields are populated from the reviewed per-card data, never donor game data.
"""
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
from functools import partial
from hashlib import sha256
from lxml import etree as E
from PIL import Image, ImageChops
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
import argparse, base64, io, json, math, re, subprocess, sys
import build_batch_101_150 as shared
from build_batch_101_150 import get, replace, parse, digest, save, save_image, elem, text, dependencies, rules

P=Path(__file__).resolve().parent; ROOT=P.parents[2]
sys.path.insert(0,str(P/'scripts'))
from title_fit_v3 import apply as title_fit
from middle_label_v3 import apply as middle_label
from personality_middle_v3 import apply as personality_middle
from personality_levels import apply_level
from tokui_backing import apply as tokui_backing
from align_power_icon import align_power_icon
from footer_spacing import change as footer_spacing
from text_layout_v3 import validate as validate_text_layout
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
OUT=P/'saiyan-221-250-promos'; EVID=ROOT/'tools/card-corrections/v3-saiyan-221-250-promos'
shared.OUT=OUT; shared.EVID=EVID

def current(n):
 return next(P.glob(f'saiyan-*/saiyan-{n:03}-*.svg'))

def source_dir(retained,n):
 return retained/('Saiyan-Saga-Promos-P1-P7' if isinstance(n,str) else 'Saiyan-Saga-201-250')/'source'

def raster(parent,path,ident,x,y,w,h,**attrs):
 g=elem('image',parent,id=ident,x=x,y=y,width=w,height=h,preserveAspectRatio='none',**attrs)
 g.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode(Path(path).read_bytes()).decode())
 return g

def rarity(r,count):
 g=deepcopy(get(parse(current(24)),'footer-rarity'));star=deepcopy(g.find('{'+S+'}polygon'))
 for e in list(g):
  if e.tag=='{'+S+'}polygon':g.remove(e)
 positions={2:[(-7,-7),(7,7)],5:[(-8,-8),(8,-8),(0,0),(-8,8),(8,8)],6:[(-6,-10),(6,-10),(-12,0),(0,0),(12,0),(0,10)]}[count]
 for i,(x,y) in enumerate(positions):
  e=deepcopy(star);e.set('id',f'rarity-star-{i}');e.set('transform',f'translate({x} {y})');g.insert(i+1,e)
 g.set('data-star-count',str(count));replace(r,'footer-rarity',g)

def personality(r,c,retained):
 # Populate all eleven stage rows using the existing V3 right-edge/digit baseline.
 shared.personality(r,None,c)
 apply_level(r,c['level'])
 value=c['pur']
 if value<=3:
  source=get(parse(current({1:158,2:159,3:160}[value])), 'concept-pur-number')
  d=source.get('d')
 else:
  donor=parse(current(175))
  d=get(donor,'concept-pur-number').get('d')
 target=get(r,'concept-pur-number');target.set('d',d)
 b=BoundsPen(None);parse_path(d,b);x0,y0,x1,y1=b.bounds
 h,cx,cy=(65,110,908.5);sc=h/(y1-y0)
 target.set('transform',f'translate({cx-(x0+x1)*sc/2} {cy-(y0+y1)*sc/2}) scale({sc})')
 target.set('aria-label',str(value))

def localized_patch(r,parent,n,placement,shape):
 # Native masks limit the generated repair to the confirmed small mismatch.
 defs=r.find('{'+S+'}defs');ident=f'localized-correction-{n}'
 clip=elem('clipPath',defs,id=ident+'-clip',clipPathUnits='userSpaceOnUse')
 elem('ellipse',clip,cx=shape[0],cy=shape[1],rx=shape[2],ry=shape[3])
 filt=elem('filter',defs,id=ident+'-feather',x='-30%',y='-30%',width='160%',height='160%')
 elem('feGaussianBlur',filt,stdDeviation='1')
 mask=elem('mask',defs,id=ident+'-mask',maskUnits='userSpaceOnUse',x=shape[0]-shape[2],y=shape[1]-shape[3],width=shape[2]*2,height=shape[3]*2)
 elem('ellipse',mask,cx=shape[0],cy=shape[1],rx=shape[2]-3,ry=shape[3]-3,fill='white',filter=f'url(#{ident}-feather)')
 group=elem('g',parent,id=ident,clip_path=f'url(#{ident}-clip)',mask=f'url(#{ident}-mask)')
 raster(group,EVID/'localized-corrections'/f'{n}.png',ident+'-image',*placement)
 return {'patch':str((EVID/'localized-corrections'/f'{n}.png').relative_to(ROOT)), 'source_placement':placement,'source_mask_ellipse':shape,'unrelated_original_image_bytes_retained':True}

def artwork(r,c,retained):
 n=c['number'];src=source_dir(retained,n);ap=src/c['artwork_file']
 aw,ah=Image.open(ap).size;sc=1033/aw;h=ah*sc;y=499-h/2
 layer=elem('g',id='retained-illustration',clip_path='url(#new-art-window)')
 group=elem('g',layer,id='retained-source-illustration',transform=f'translate(14 {y}) scale({sc})')
 raster(group,ap,'card-illustration',0,0,aw,ah)
 ar={'mode':'retained modern illustration','horizontal_source_crop':0,'artwork_bytes_retained':True,'source_sha256':digest(ap),'source_dimensions':[aw,ah],'mapping_matrix':[sc,0,0,sc,14,y],'width_relative_scale_change':1033/1027,'additional_zoom':False}
 if n==233:
  records=json.loads((ROOT/'tools/card-corrections/expression-audit-2026-10-26/manifest.json').read_text());patch=next(x for x in records if x['id']==c['id'])['native_patch']
  old_scale=1027/aw;old_y=145-(ah*old_scale-712.8378378378378)/2
  raster(group,ROOT/'tools/card-corrections/expression-audit-2026-10-26'/patch['file'],'retained-233-original-eye-correction',(patch['x']-16)/old_scale,(patch['y']-old_y)/old_scale,patch['width']/old_scale,patch['height']/old_scale)
  ar['expression_patch_retained']=True
 replace(r,'retained-illustration',layer)
 return ar


def compose(c,retained):
 n=c['number'];mp='PERSONALITY' in c['category'];db=c['category']=='DRAGON BALL'
 (P/'references/version-3-standard.md').read_text()
 donor=158 if mp and c['category'].startswith('HERO') else 170 if mp else {'Saiyan':18,'Orange':49,'Red':6,'Blue':13,'Black':65,'Freestyle':24}[c['style']]
 r=parse(current(donor));r.set('data-template-version','3');r.set('data-card-number',str(n));r.set('data-card-family',c['category']);r.find('{'+S+'}title').text=c['name']
 for e in list(r):
  if e.get('id','').startswith('rules-line-') or e.get('id') in ['power-icon','attack-icon']:r.remove(e)
 get(r,'card-title').set('aria-label',c['name']);w=c.get('title_safe_width');fit=title_fit(r,529.5-w/2,529.5+w/2) if w else title_fit(r);assert title_fit(r)==fit
 get(r,'card-category').set('aria-label',c['category']);mid=middle_label(r);assert middle_label(r)==mid
 num,b=text(str(n),'Teko-SemiBold.ttf',53,0,1409.5,'card-number');num,b=text(str(n),'Teko-SemiBold.ttf',53,880+b[0]/2,1409.5,'card-number');replace(r,'card-number',num);rarity(r,c['rarity_stars'])
 ar=artwork(r,c,retained)
 if mp:personality(r,c,retained)
 personality_middle(r,high_tech=c.get("high_tech",False))
 tok=tokui_backing(r);reports,iconline=rules(r,c);assets=shared.assetize(r)
 measurement=deepcopy(r)
 for e in measurement.xpath('//*[local-name()="image"]'):
  key='{'+X+'}href' if e.get('{'+X+'}href') else 'href';ref=e.get(key)
  if not ref.startswith('#'):e.set(key,str((OUT/ref).resolve()))
 icons=[]
 if iconline:
  first=align_power_icon(measurement,'power-icon',f'rules-line-{iconline}');second=align_power_icon(measurement,'power-icon',f'rules-line-{iconline}');assert second['vertical_shift']==0
  replace(r,'power-icon',deepcopy(get(measurement,'power-icon')));icons=[first]
 ids=[e.get('id') for e in r.iter()if e.get('id')];assert len(ids)==len(set(ids)),n
 OUT.mkdir(exist_ok=True);svg=OUT/(c['id']+'.svg');save(r,svg);ft=footer_spacing(svg,normalize_gap=True);second=footer_spacing(svg,normalize_gap=True);assert not second['changed']
 render_dir=ROOT.parent/'renders';render_dir.mkdir(exist_ok=True);png=render_dir/(c['id']+'.png');tmp=png.with_suffix('.render.png')
 subprocess.run(['inkscape',str(svg),'--export-filename='+str(tmp),'--export-width=2120'],check=True,capture_output=True)
 im=Image.open(io.BytesIO(tmp.read_bytes())).convert('RGB');assert im.size==(2120,2968);save_image(im,png,'PNG');tmp.unlink()
 catalog=json.loads((ROOT.parent/'catalog-before.json').read_text());card=next(x for x in catalog if x['id']==c['id']);exports=[]
 for field,size in [('image',(1060,1484)),('downloadImage',(2120,2968))]:
  rel='public'+card[field].split('?')[0];dest=ROOT/rel;out=im.resize(size,Image.Resampling.LANCZOS)if size!=im.size else im
  dest.parent.mkdir(parents=True,exist_ok=True);save_image(out,dest,'WEBP',lossless=True,method=4);assert ImageChops.difference(out,Image.open(dest).convert('RGB')).getbbox() is None
  exports.append({'field':field,'path':rel,'before_url':card[field],'before_sha256':digest(ROOT.parent/'baseline'/rel),'after_sha256':digest(dest),'size':list(size),'lossless_round_trip':True})
 query=subprocess.run(['inkscape',str(svg),'--query-all'],check=True,capture_output=True,text=True);bounds={}
 for line in query.stdout.splitlines():
  a=line.split(',')
  if len(a)==5 and (a[0] in ['card-title','card-category','footer-text-block','saga-emblem','footer-rarity','card-number','v3-level-number','concept-pur-number'] or a[0].startswith(('rules-line-','power-stage-value-'))):bounds[a[0]]=list(map(float,a[1:]))
 validate_text_layout(E.parse(str(svg)).getroot(),bounds)
 row={'number':n,'id':c['id'],'name':c['name'],'family':c['category'],'high_tech':c.get('high_tech',False),'native_source_path':str(svg.relative_to(ROOT)),'native_source_sha256':digest(svg),'assets':assets,'artwork':ar,'rules':reports,'native_geometry':{'native_outlined_text':True,'bounds':bounds,'icons':icons},'exports':exports,'tokui_waza_backing':{'applies':not(mp or db),'all_styles':not(mp or db),'report':tok},'current_preview_revision':{'title_fit':fit,'middle_label':mid,'background_gain':1 if c.get('high_tech') else 1.2,'footer_idempotent':True},'power_icon':c.get('power_icon')}
 if c.get('power_icon')=='constant':row['power_icon_revision']='approved-bold-infinity-colon-v16'
 (EVID/'per-card'/f'{n}.json').write_text(json.dumps(row,indent=2)+'\n');print(f'Completed {n}: {c["name"]}',flush=True)
 return row

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--retained',type=Path,required=True);a.add_argument('numbers',type=str,nargs='*');args=a.parse_args()
 cs=json.loads((EVID/'cards.json').read_text());cs=[c for c in cs if not args.numbers or str(c['number']) in args.numbers]
 with ProcessPoolExecutor(max_workers=3)as pool:list(pool.map(partial(compose,retained=args.retained.resolve()),cs))
 rows=[json.loads(p.read_text())for p in sorted((EVID/'per-card').glob('*.json'))];(EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
