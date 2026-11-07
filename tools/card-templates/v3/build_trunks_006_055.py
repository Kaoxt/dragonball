"""Compose Trunks 6–55 from retained native illustrations and current V3 components."""
from pathlib import Path
from copy import deepcopy
from lxml import etree as E
from PIL import Image, ImageChops
import argparse, base64, io, json, subprocess, sys
from concurrent.futures import ProcessPoolExecutor
from functools import partial
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
from build_batch_221_250_promos import rarity as two_star_rarity
import build_batch_101_150 as shared
from build_batch_101_150 import get, replace, parse, digest, save, save_image, elem, text

P=Path(__file__).resolve().parent; ROOT=P.parents[2]
sys.path.insert(0,str(P/'scripts'))
from title_fit_v3 import apply as title_fit
from middle_label_v3 import apply as middle_label
from tokui_backing import apply as tokui_backing
from scripts.namekian_symbol import make_symbol as make_namekian_symbol
from align_power_icon import align_power_icon
from footer_spacing import change as footer_spacing
from text_layout_v3 import validate as validate_text_layout
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
OUT=P/'trunks-006-055'; EVID=ROOT/'tools/card-corrections/v3-trunks-006-055'
WORK=ROOT.parent/'trunks-006-055-work'
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
 return ROOT.parent/'trunks-001-005-retained/original' if n<=10 else retained/('011-030' if n<=30 else '031-080')

def namekian_style(r,old):
 # Preserve the Namekian hue; use the 瑪 style icon confirmed by original Namekian Masteries.
 defs=r.find('{'+S+'}defs');defs.append(deepcopy(get(old,'namekian-frame-hue')))
 background=get(r,'background-brightness-trial-wrapper');children=list(background)
 for child in children:background.remove(child)
 hue=elem('g',background,id='namekian-background-hue',filter='url(#namekian-frame-hue)')
 for child in children:hue.append(child)
 symbol=make_namekian_symbol()
 replace(r,'tokui-waza-symbol',symbol)
 # Hue only the blue accent ink, leaving the common paper and charcoal intact.
 for node in get(r,'shared-rules-component').iter():
  if node.get('fill')=='#155485':node.set('filter','url(#namekian-frame-hue)')
 r.set('data-style','Namekian')

def artwork(r,c,retained):
 n=c['number'];src=source_dir(retained,n);old=parse(src/'masters'/(c['id']+'.svg'))
 if n==25:
  old=parse(ROOT.parent/'trunks-001-005-retained/porunga/masters'/(c['id']+'.svg'))
  wrapper=get(r,'background-brightness-trial-wrapper')
  wrapper.attrib.pop('filter',None) # Keep current Porunga colors and full-art scale.
  for child in list(wrapper):wrapper.remove(child)
  layer=elem('g',wrapper,id='retained-full-art-dragon-ball')
  layer.append(deepcopy(get(old,'porunga-full-art')))
  ap=ROOT.parent/'trunks-001-005-retained/porunga/source/Porunga-Front-Pose-Artwork.png'
  return {'mode':'approved current front-facing Porunga full art','source_sha256':digest(ap),'source_native_sha256':digest(ROOT.parent/'trunks-001-005-retained/porunga/masters'/(c['id']+'.svg')),'artwork_bytes_retained':True,'approved_artwork_exception':True,'additional_zoom':False,'mapping_matrix':[1,0,0,1,0,0],'background_gain':1}
 scale=1033/1027;tx=14-16*scale;ty=499-(145+712.8378378378378/2)*scale
 layer=elem('g',id='retained-illustration',clip_path='url(#new-art-window)')
 mapped=elem('g',layer,id='retained-source-illustration',transform=f'matrix({scale} 0 0 {scale} {tx} {ty})')
 mapped.append(deepcopy(get(old,'card-illustration')))
 if n==52:
  patch=next(x for x in json.loads((ROOT/'tools/card-corrections/expression-audit-2026-10-26/manifest.json').read_text())if x['id']==c['id'])['native_patch']
  img=elem('image',mapped,id='retained-original-expression-correction',x=patch['x'],y=patch['y'],width=patch['width'],height=patch['height'],preserveAspectRatio='none')
  img.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode((ROOT/'tools/card-corrections/expression-audit-2026-10-26'/patch['file']).read_bytes()).decode())
 replace(r,'retained-illustration',layer)
 return {'expression_patch_retained':n==52,'tien_crop_retained':n==40,'mode':'retained approved illustration','source_sha256':digest(src/'source'/c['artwork_file']),'source_native_sha256':digest(source_dir(retained,n)/'masters'/(c['id']+'.svg')),'horizontal_source_crop':0,'artwork_bytes_retained':True,'mapping_matrix':[scale,0,0,scale,tx,ty],'additional_zoom':False}

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
 n=c['number'];db=c['category']=='DRAGON BALL';donor=15 if db else {'Orange':49,'Red':6,'Blue':13,'Black':65,'Saiyan':18,'Freestyle':24,'Namekian':13}[c['style']]
 r=parse(current(donor));r.set('data-template-version','3');r.set('data-card-number',str(n));r.set('data-card-family',c['category']);r.find('{'+S+'}title').text=c['name']
 for e in list(r):
  if e.get('id','').startswith('rules-line-') or e.get('id') in ['power-icon','attack-icon']:r.remove(e)
 get(r,'card-title').set('aria-label',c['name']);w=c.get('title_safe_width');fit=title_fit(r,529.5-w/2,529.5+w/2) if w else title_fit(r);assert title_fit(r)==fit
 get(r,'card-category').set('aria-label',c['category']);mid=middle_label(r);assert middle_label(r)==mid
 num,b=text(str(n),'Teko-SemiBold.ttf',53,877.15,1409.5,'card-number');replace(r,'card-number',num)
 rarity=deepcopy(get(parse(current(24)),'footer-rarity'));replace(r,'footer-rarity',rarity)

 if c['rarity_stars']==2:two_star_rarity(r,2);rarity=get(r,'footer-rarity')
 rarity.set('data-star-count',str(c['rarity_stars']));circle=rarity.find('{'+S+'}circle');assert abs(float(circle.get('r'))*2+float(circle.get('stroke-width'))-47.6)<1e-8
 ball_center=847.25-(12.2+b[0])/2;rarity.set('transform',f'translate({ball_center-882} -6.5)')
 old=parse(source_dir(retained,n)/'masters'/(c['id']+'.svg'));emblem=trunks_emblem(r,old)
 if c['style']=='Namekian':namekian_style(r,old)
 ar=artwork(r,c,retained);tok=tokui_backing(r);reports,iconline=rules(r,c);assets=shared.assetize(r)
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
 render_dir=ROOT.parent/'renders';render_dir.mkdir(exist_ok=True);png=render_dir/(c['id']+'.png');tmp=png.with_suffix('.render.png')
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
  if len(a)==5 and (a[0] in ['card-title','card-category','footer-text-block','saga-emblem','footer-rarity','card-number','dragon-ball-left-emblem'] or a[0].startswith('rules-line-')):bounds[a[0]]=list(map(float,a[1:]))
 validate_text_layout(E.parse(str(svg)).getroot(),bounds)
 ball,num=bounds['footer-rarity'],bounds['card-number'];assert abs((min(ball[0],num[0])+max(ball[0]+ball[2],num[0]+num[2]))/2-847.25)<.002
 assert abs(num[0]-ball[0]-ball[2]-12.2)<.002
 sx,sy,sw,sh=bounds['saga-emblem'];assert abs(sx+sw/2-211.75)<.002 and abs(sy+sh/2-1409.5)<.002,(n,bounds['saga-emblem'])
 row={'number':n,'id':c['id'],'name':c['name'],'family':c['category'],'native_source_path':str(svg.relative_to(ROOT)),'native_source_sha256':digest(svg),'assets':assets,'artwork':ar,'rules':reports,'native_geometry':{'native_outlined_text':True,'bounds':bounds,'icons':icons},'exports':exports,'tokui_waza_backing':{'applies':not db,'all_styles':not db,'report':tok},'current_preview_revision':{'title_fit':fit,'middle_label':mid,'background_gain':1 if db else 1.2,'footer_idempotent':True},'power_icon':c.get('power_icon'),'set_emblem':emblem}
 (EVID/'per-card'/f'{n}.json').write_text(json.dumps(row,indent=2)+'\n');print(f'Completed {n}: {c["name"]}',flush=True)
 return row

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--retained',type=Path,required=True);a.add_argument('numbers',type=int,nargs='*');args=a.parse_args()
 cs=json.loads((EVID/'cards.json').read_text())
 selected=[c for c in cs if not args.numbers or c['number']in args.numbers]
 with ProcessPoolExecutor(max_workers=3)as pool:list(pool.map(partial(compose,retained=args.retained.resolve()),selected))
 rows=[json.loads(p.read_text())for p in sorted((EVID/'per-card').glob('*.json'),key=lambda p:int(p.stem))];(EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
