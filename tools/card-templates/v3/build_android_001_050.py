"""Compose Android 1–50 with V3 portrait and landscape components.

Inputs are the retained editable archive and complete landscape master archive.
All emitted SVGs resolve their raster dependencies through ../assets/.
"""
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
from functools import partial
from lxml import etree as E
from PIL import Image, ImageChops
import argparse, base64, io, json, subprocess, sys
import build_batch_101_150 as shared
from build_batch_101_150 import get, replace, parse, digest, save, save_image, elem, text

P=Path(__file__).resolve().parent; ROOT=P.parents[2]
sys.path.insert(0,str(P/'scripts'))
from title_fit_v3 import apply as title_fit
from middle_label_v3 import apply as middle_label
from tokui_backing import apply as tokui_backing
from align_power_icon import align_power_icon
import footer_spacing as footer
from text_layout_v3 import validate as validate_text_layout
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
OUT=P/'android-001-050'; EVID=ROOT/'tools/card-corrections/v3-android-001-050'
WORK=ROOT.parent/'android-001-050-work'
shared.OUT=OUT; shared.EVID=EVID

def current(n):return next(P.glob(f'saiyan-*/saiyan-{n:03}-*.svg'))

def inline_external(root,base):
 for e in root.xpath('//*[local-name()="image"]'):
  key='{'+X+'}href' if e.get('{'+X+'}href') else 'href';ref=e.get(key)
  if not ref.startswith(('data:','#')):
   f=(base/ref).resolve();mime='png' if f.suffix=='.png' else 'jpeg' if f.suffix in ['.jpg','.jpeg'] else 'webp'
   e.set(key,'data:image/'+mime+';base64,'+base64.b64encode(f.read_bytes()).decode())

def shift(e,x,y):e.set('transform',f'translate({x} {y}) '+e.get('transform',''))

def rules(r,c,land):
 kind=c.get('power_icon');iw=shared.width_at_height(kind,34.3) if kind else 0
 assert ' '.join(c['rule_lines']).replace('@ICON@ ','')==c['modern_rules']
 reports=[];iconline=None;cx=741.5 if land else 529.5
 # Center the landscape block in its shorter 173 1/3-unit paper panel.
 first=828.333333333333+17.15-(len(c['rule_lines'])-1)*59/2 if land else 1049.3
 for i,line in enumerate(c['rule_lines']):
  parts=[];xx=0;tokens=line.split()
  for j,t in enumerate(tokens):
   if j:xx+=12 if t=='@ICON@' or tokens[j-1]=='@ICON@' else 9.8
   parts.append((t,xx));xx+=iw if t=='@ICON@' else shared.word(t)[2]
  assert xx <= (1310 if land else 890),(c['number'],line,xx)
  ink=[(x,x+iw) if t=='@ICON@' else (x+shared.word(t)[1][0],x+shared.word(t)[1][2]) for t,x in parts]
  dx=cx-(min(a[0]for a in ink)+max(a[1]for a in ink))/2;baseline=first+i*59
  label=' '.join(t for t in tokens if t!='@ICON@');g=elem('g',r,id=f'rules-line-{i+1}',aria_label=label,fill='#060606',transform=f'translate({dx} {baseline})',data_font_size=49,data_word_spacing='normal')
  for t,x in parts:
   if t=='@ICON@':
    ic,_=shared.icon(kind,dx+x,baseline-34.3,34.3,'power-icon');r.append(E.fromstring(__import__('xml.etree.ElementTree',fromlist=['tostring']).tostring(ic)));iconline=i+1
   else:
    for d in shared.word(t)[0]:elem('path',g,d=d,transform=f'translate({x} 0)')
  reports.append({'text':label,'baseline':baseline,'width':xx,'icon_inline':'@ICON@' in tokens})
 return reports,iconline

def artwork(r,old,c,land):
 n=c['number'];art=deepcopy(get(old,'card-illustration'))
 if n==38:
  correction=parse(ROOT/'tools/card-corrections/android-038-reference-fidelity/android-038-android-17s-haymaker.svg')
  art=deepcopy(get(correction,'card-illustration'))
 layer=elem('g',id='retained-illustration',clip_path='url(#artwork-window)' if land else 'url(#new-art-window)')
 sc=1 if land else 1033/1027;tx=0 if land else 14-16*sc;ty=0 if land else 499-(145+712.8378378378378/2)*sc
 mapped=elem('g',layer,id='retained-source-illustration',transform=f'matrix({sc} 0 0 {sc} {tx} {ty})');mapped.append(art)
 patch=json.loads((EVID/'art-corrections.json').read_text()).get(str(n))
 if patch:
  aw,ah=patch['source_dimensions'];group=elem('g',mapped,id=f'localized-art-correction-{n}',transform=f"translate({art.get('x')} {art.get('y')}) scale({float(art.get('width'))/aw} {float(art.get('height'))/ah})")
  if n==20:
   elem('path',group,d='M982 435 Q1013 456 1045 435 L1045 469 Q1014 451 981 468 Z',fill='#cf1530')
   d=get(old,'r-letter-18').get('d')
   for i,x in enumerate([988,1025]):elem('path',group,id=f'art-rr-letter-{i}',d=d,transform=f'translate({x} 444) scale(.48)',fill='white',fill_rule='evenodd',stroke='#7e1720',stroke_width='.6')
  else:
   cid=f'art-correction-{n}-clip';clip=elem('clipPath',r.find('{'+S+'}defs'),id=cid);elem('path',clip,d=patch['clip'])
   # The image is clipped natively: original face/body pixels outside this
   # explicitly reviewed contour remain in the underlying retained image.
   im=elem('image',group,id=f'art-correction-{n}-image',x=0,y=0,width=aw,height=ah,preserveAspectRatio='none',clip_path=f'url(#{cid})')
   im.set('{'+X+'}href','data:image/png;base64,'+base64.b64encode((EVID/patch['patch']).read_bytes()).decode())
 if land:shared.dependencies(r,old,layer)
 replace(r,'retained-city-artwork' if land else 'retained-illustration',layer)
 return {'mode':'retained illustration with documented localized corrections','artwork_bytes_retained':True,'mapping_matrix':[sc,0,0,sc,tx,ty],'additional_zoom':False,'horizontal_source_crop':0,'android_38_approved_correction_retained':n==38,'localized_correction':patch}

def compose(c,retained,landscape):
 (P/'references/version-3-standard.md').read_text()
 n=c['number'];land=c['category'] in ['LOCATION','BATTLEGROUND'];cx=741.5 if land else 529.5;fy=985.5 if land else 1409.5
 source=retained/'masters'/(c['id']+'.svg');old=parse(source)
 donor=(landscape/'masters'/f"{c['category'].title()}-Master-V3.svg") if land else next(P.glob('trunks-*/trunks-007-*.svg')) if c['style']=='Namekian' else current({'Orange':49,'Red':6,'Blue':13,'Black':65,'Saiyan':18,'Freestyle':24}[c['style']])
 r=parse(donor);inline_external(r,donor.parent);r.set('data-template-version','3');r.set('data-card-number',str(n));r.set('data-card-family',c['category']);r.find('{'+S+'}title').text=c['name']
 for desc in r.findall('{'+S+'}desc'):desc.text='Android Saga V3 card. Original mechanics, native components and retained raster illustration; localized corrections are recorded in the per-card audit.'
 for e in list(r):
  if e.get('id','').startswith('rules-line-') or e.get('id') in ['power-icon','attack-icon','power-line-block']:r.remove(e)
 if land:
  g,b=text(c['name'],'Teko-SemiBold.ttf',86.0349127182045,cx,79,'card-title');size=86.0349127182045*min(1,1184/b[0]);g,b=text(c['name'],'Teko-SemiBold.ttf',size,cx,79,'card-title');g.set('data-font-size',str(size));g.set('data-title-fit','uniform-font-size');g.set('data-safe-region','149.5 1333.5');replace(r,'card-title',g);fit={'font_size':size,'max_width':1184,'visible_center':[cx,79]};mid={'retained_fixed_landscape_component':True}
 else:
  get(r,'card-title').set('aria-label',c['name']);fit=title_fit(r,159.5,899.5)if n in[19,20,21,48]else title_fit(r);assert title_fit(r)==fit
  get(r,'card-category').set('aria-label',c['category']);mid=middle_label(r);assert middle_label(r)==mid
 num,b=text(str(n),'Teko-SemiBold.ttf',53,(1186.45 if land else 847.25)+29.9,fy,'card-number');replace(r,'card-number',num)
 ballsource=parse(current(24));ball=deepcopy(get(ballsource,'footer-rarity'));shared.dependencies(r,ballsource,ball);replace(r,'footer-rarity',ball);shared.rarity(r,c['rarity_stars']);ball.set('transform',f'translate({(1186.45 if land else 847.25)-(12.2+b[0])/2-882} {fy-1416})')
 logo=deepcopy(get(old,'android-set-emblem'));logo.set('id','saga-emblem');logo.set('data-set','Android Saga');logo.set('transform',f'translate({(296.55 if land else 211.75)-46.5975} {fy-38.83125}) scale(.776625)');replace(r,'saga-emblem',logo)
 ar=artwork(r,old,c,land);ar['source_native_sha256']=digest(source)
 tok=None if land else tokui_backing(r);reports,iconline=rules(r,c,land);assets=shared.assetize(r)
 measurement=deepcopy(r)
 for e in measurement.xpath('//*[local-name()="image"]'):
  key='{'+X+'}href' if e.get('{'+X+'}href') else 'href';e.set(key,str((OUT/e.get(key)).resolve()))
 icons=[]
 if iconline:
  a=align_power_icon(measurement,'power-icon',f'rules-line-{iconline}');assert align_power_icon(measurement,'power-icon',f'rules-line-{iconline}')['vertical_shift']==0;replace(r,'power-icon',deepcopy(get(measurement,'power-icon')));icons=[a]
 ids=[e.get('id')for e in r.iter()if e.get('id')];assert len(ids)==len(set(ids)),(n,'duplicate IDs')
 assert not r.xpath('//*[local-name()="text"]')
 OUT.mkdir(exist_ok=True);svg=OUT/(c['id']+'.svg');save(r,svg)
 footer.TOLERANCE=.02 if land else .002;footer.SAGA_CENTER_X=296.55 if land else 211.75;footer.RIGHT_GROUP_CENTER_X=1186.45 if land else 847.25;footer.REVISION='landscape-mirrored-side-group-centers-v1' if land else 'mirrored-side-group-centers-v1'
 footer.change(svg,normalize_gap=True);assert not footer.change(svg,normalize_gap=True)['changed']
 render=WORK/'renders';render.mkdir(exist_ok=True);png=render/(c['id']+'.png')
 result=subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename=-','--export-width='+str(2968 if land else 2120)],check=True,capture_output=True)
 im=Image.open(io.BytesIO(result.stdout)).convert('RGB');assert im.size==((2968,2120)if land else(2120,2968))
 save_image(im,png,'PNG')
 card=next(x for x in json.loads((WORK/'catalog-before.json').read_text())if x['id']==c['id']);exports=[]
 for field,size in [('image',(1484,1060)if land else(1060,1484)),('downloadImage',im.size)]:
  rel='public'+card[field].split('?')[0];dest=ROOT/rel;out=im.resize(size,Image.Resampling.LANCZOS)if size!=im.size else im
  dest.parent.mkdir(parents=True,exist_ok=True);save_image(out,dest,'WEBP',lossless=True,method=4);assert ImageChops.difference(out,Image.open(dest).convert('RGB')).getbbox() is None
  exports.append({'field':field,'path':rel,'before_url':card[field],'before_sha256':digest(WORK/'baseline'/rel),'after_sha256':digest(dest),'size':list(size),'lossless_round_trip':True})
 b=footer.bounds(svg);bounds={k:v for k,v in b.items()if k in ['card-title','card-category','footer-text-block','saga-emblem','footer-rarity','card-number','power-icon'] or k.startswith('rules-line-')}
 if not land:validate_text_layout(parse(svg),bounds)
 for ident,xy in {'card-title':(cx,79),'card-category':(cx,685.166666667 if land else 908.5),'footer-text-block':(cx,fy),'saga-emblem':(footer.SAGA_CENTER_X,fy)}.items():
  x,y,w,h=bounds[ident];assert abs(x+w/2-xy[0])<.02 and abs(y+h/2-xy[1])<.02,(n,ident,bounds[ident])
 ball,num=bounds['footer-rarity'],bounds['card-number'];assert abs((min(ball[0],num[0])+max(ball[0]+ball[2],num[0]+num[2]))/2-footer.RIGHT_GROUP_CENTER_X)<.02;assert abs(num[0]-ball[0]-ball[2]-12.2)<.02
 row={'number':n,'id':c['id'],'name':c['name'],'family':c['category'],'native_source_path':str(svg.relative_to(ROOT)),'native_source_sha256':digest(svg),'assets':assets,'artwork':ar,'rules':reports,'native_geometry':{'native_outlined_text':True,'bounds':bounds,'icons':icons},'exports':exports,'tokui_waza_backing':{'applies':not land,'report':tok},'current_preview_revision':{'title_fit':fit,'middle_label':mid,'footer_idempotent':True},'power_icon':c.get('power_icon'),'rarity_stars':c['rarity_stars'],'set_emblem':{'native_vector':True,'retained_shape_and_size':True,'target_center':[footer.SAGA_CENTER_X,fy]}}
 (EVID/'per-card'/f'{n}.json').write_text(json.dumps(row,indent=2)+'\n');print(f'Completed {n}: {c["name"]}',flush=True);return row

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--retained',type=Path,required=True);a.add_argument('--landscape',type=Path,required=True);a.add_argument('numbers',type=int,nargs='*');args=a.parse_args()
 cs=json.loads((EVID/'cards.json').read_text());selected=[c for c in cs if not args.numbers or c['number']in args.numbers]
 (EVID/'per-card').mkdir(exist_ok=True);OUT.mkdir(exist_ok=True)
 with ProcessPoolExecutor(max_workers=3)as pool:list(pool.map(partial(compose,retained=args.retained.resolve(),landscape=args.landscape.resolve()),selected))
 rows=[json.loads(p.read_text())for p in sorted((EVID/'per-card').glob('*.json'),key=lambda p:int(p.stem))];(EVID/'audit.json').write_text(json.dumps(rows,indent=2)+'\n')
