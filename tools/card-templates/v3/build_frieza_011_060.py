"""Migrate Frieza Saga 011–060 using retained artwork and the current V3 components.

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
from build_batch_221_250_promos import personality
from build_batch_101_150 import get, replace, parse, digest, save, save_image, elem, text, dependencies, rules

P=Path(__file__).resolve().parent; ROOT=P.parents[2]
sys.path.insert(0,str(P/'scripts'))
from title_fit_v3 import apply as title_fit
from middle_label_v3 import apply as middle_label
from personality_middle_v3 import apply as personality_middle
from tokui_backing import apply as tokui_backing
from align_power_icon import align_power_icon
from footer_spacing import change as footer_spacing
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
OUT=P/'frieza-011-060'; EVID=ROOT/'tools/card-corrections/v3-frieza-011-060'
shared.OUT=OUT; shared.EVID=EVID

def current(n):
 return next(P.glob(f'saiyan-*/saiyan-{n:03}-*.svg'))

def source_dir(retained,n):
 return retained/('011-040' if n<=40 else '041-080')/'source'

def raster(parent,path,ident,x,y,w,h,**attrs):
 g=elem('image',parent,id=ident,x=x,y=y,width=w,height=h,preserveAspectRatio='none',**attrs)
 g.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode(Path(path).read_bytes()).decode())
 return g

def rarity(r,count):
 g=deepcopy(get(parse(current(24)),'footer-rarity'));replace(r,'footer-rarity',g)
 shared.rarity(r,count)


def frieza_emblem(r):
 # Measure the actual stroked ink, rather than the padded symbol viewport.
 svg=parse(P/'assets/frieza-set-icon.svg');svg.set('width','100');svg.set('height','101')
 import tempfile
 with tempfile.NamedTemporaryFile(suffix='.svg') as temp:
  save(svg,Path(temp.name))
  out=subprocess.check_output(['inkscape',temp.name,'--query-all'],text=True,stderr=subprocess.DEVNULL)
 b=next(list(map(float,line.split(',')[1:])) for line in out.splitlines() if line.startswith('frieza-saga-symbol,'))
 x,y,w,h=b;scale=53.7814/w;cx=211.75;cy=1409.5
 g=elem('g',id='saga-emblem',data_set='Frieza Saga',data_visible_center=f'{cx} {cy}',transform=f'translate({cx-(x+w/2)*scale} {cy-(y+h/2)*scale}) scale({scale})')
 g.append(deepcopy(get(svg,'frieza-saga-symbol')));replace(r,'saga-emblem',g)
 return {'source_visible_bounds':b,'target_center':[cx,cy],'target_width':53.7814,'uniform_scale':scale,'native_vector':True}

def artwork(r,c,retained):
 n=c['number'];src=source_dir(retained,n);old=parse(src.parent/'masters'/(c['id']+'.svg'))
 scale=1033/1027;tx=14-16*scale;ty=499-(145+712.8378378378378/2)*scale
 layer=elem('g',id='retained-illustration',clip_path='url(#new-art-window)')
 mapped=elem('g',layer,id='retained-source-illustration',transform=f'matrix({scale} 0 0 {scale} {tx} {ty})')
 ap=src/c['artwork_file']
 mapped.append(deepcopy(get(old,'card-illustration')))
 ar={'mode':'retained approved illustration','horizontal_source_crop':0,'artwork_bytes_retained':True,'source_sha256':digest(ap),'mapping_matrix':[scale,0,0,scale,tx,ty],'width_relative_scale_change':scale,'additional_zoom':False}
 if n==45:
  records=json.loads((ROOT/'tools/card-corrections/expression-audit-2026-10-26/manifest.json').read_text());patch=next(x for x in records if x['id']==c['id'])['native_patch']
  raster(mapped,ROOT/'tools/card-corrections/expression-audit-2026-10-26'/patch['file'],'retained-original-expression-correction',patch['x'],patch['y'],patch['width'],patch['height'])
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
 emblem=frieza_emblem(r)
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
 OUT.mkdir(exist_ok=True);svg=OUT/(c['id']+'.svg');save(r,svg);ft=footer_spacing(svg);assert not ft['logo_dx'] and not ft['ball_and_number_dx'];second=footer_spacing(svg);assert not any(second.values())
 render_dir=ROOT.parent/'renders';render_dir.mkdir(exist_ok=True);png=render_dir/(c['id']+'.png');tmp=png.with_suffix('.render.png')
 subprocess.run(['inkscape',str(svg),'--export-filename='+str(tmp),'--export-width=2120'],check=True,capture_output=True)
 im=Image.open(io.BytesIO(tmp.read_bytes())).convert('RGB');assert im.size==(2120,2968);save_image(im,png,'PNG');tmp.unlink()
 catalog=json.loads((ROOT.parent/'catalog-before-50.json').read_text());card=next(x for x in catalog if x['id']==c['id']);exports=[]
 for field,size in [('image',(1060,1484)),('downloadImage',(2120,2968))]:
  rel='public'+card[field].split('?')[0];dest=ROOT/rel;out=im.resize(size,Image.Resampling.LANCZOS)if size!=im.size else im
  dest.parent.mkdir(parents=True,exist_ok=True);save_image(out,dest,'WEBP',lossless=True,method=4);assert ImageChops.difference(out,Image.open(dest).convert('RGB')).getbbox() is None
  exports.append({'field':field,'path':rel,'before_url':card[field],'before_sha256':digest(ROOT.parent/'baseline-50'/rel),'after_sha256':digest(dest),'size':list(size),'lossless_round_trip':True})
 query=subprocess.run(['inkscape',str(svg),'--query-all'],check=True,capture_output=True,text=True);bounds={}
 for line in query.stdout.splitlines():
  a=line.split(',')
  if len(a)==5 and (a[0] in ['card-title','card-category','footer-text-block','saga-emblem','footer-rarity','card-number','v3-level-number','concept-pur-number'] or a[0].startswith(('rules-line-','power-stage-value-'))):bounds[a[0]]=list(map(float,a[1:]))
 row={'personality_values':{k:c[k] for k in ['level','pur','stages']} if mp else None,'number':n,'id':c['id'],'name':c['name'],'family':c['category'],'high_tech':c.get('high_tech',False),'native_source_path':str(svg.relative_to(ROOT)),'native_source_sha256':digest(svg),'assets':assets,'artwork':ar,'rules':reports,'native_geometry':{'native_outlined_text':True,'bounds':bounds,'icons':icons},'exports':exports,'tokui_waza_backing':{'applies':not(mp or db),'all_styles':not(mp or db),'report':tok},'current_preview_revision':{'title_fit':fit,'middle_label':mid,'background_gain':1 if c.get('high_tech') else 1.2,'footer_idempotent':True},'power_icon':c.get('power_icon'),'set_emblem':emblem}
 if c.get('power_icon')=='constant':row['power_icon_revision']='approved-bold-infinity-colon-v16'
 (EVID/'per-card'/f'{n}.json').write_text(json.dumps(row,indent=2)+'\n');print(f'Completed {n}: {c["name"]}',flush=True)
 return row

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--retained',type=Path,required=True);a.add_argument('numbers',type=str,nargs='*');args=a.parse_args()
 cs=json.loads((EVID/'cards.json').read_text());cs=[c for c in cs if not args.numbers or str(c['number']) in args.numbers]
 with ProcessPoolExecutor(max_workers=3)as pool:list(pool.map(partial(compose,retained=args.retained.resolve()),cs))
 rows=[json.loads(p.read_text())for p in sorted((EVID/'per-card').glob('*.json'))];(EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
