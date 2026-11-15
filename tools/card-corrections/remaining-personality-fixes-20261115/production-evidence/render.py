from pathlib import Path
from lxml import etree as E
from PIL import Image,ImageFilter
import numpy as np
import json,copy,os,hashlib,concurrent.futures,sys
from prepare import B,BASE,CACHE,NS,XL,render
OUT=B/'corrected';OUT.mkdir(exist_ok=True)
PAY=B/'handoff/payload';PAY.mkdir(parents=True,exist_ok=True)
ASSET=PAY/'tools/card-templates/v3/assets/remaining-personality-fixes-20261115';ASSET.mkdir(parents=True,exist_ok=True)
SCALE={'world-games-172-goku-the-proud':1.25,'world-games-185-maraikoh':1.2,'cell-176-android-16':1.2,'world-games-153-arqua-the-water-champion':1.18}
W={'saiyan-166-gohan':60,'saiyan-175-vegeta':35,'saiyan-0P2-piccolo-silver-variant':110,'world-games-153-arqua-the-water-champion':18,'cell-154-vegeta-ascendant':20,'cell-164-gohan-the-champion':35,'cell-165-gohan-the-swift':60,'cell-173-trunks-the-swift':70}
def el(p,t,**kw):return E.SubElement(p,f'{{{NS}}}{t}',{k.replace('_','-'):str(v) for k,v in kw.items()})
def im(p,path,**kw):
 e=el(p,'image',x=0,y=0,width=1060,height=1484,preserveAspectRatio='none',**kw);e.set(XL,str(path));return e
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def root():return E.Element(f'{{{NS}}}svg',nsmap={None:NS,'xlink':'http://www.w3.org/1999/xlink'},width='1060',height='1484',viewBox='0 0 1060 1484')
def transform(row):
 return {'world-games-172-goku-the-proud':'translate(-247.25 -42.5) scale(1.25)','world-games-185-maraikoh':'translate(0 -29.2) scale(1.2)','cell-176-android-16':'translate(0 -29.2) scale(1.2)','world-games-153-arqua-the-water-champion':'translate(0 -90) scale(1.18)'}.get(row['card']['id'],f'translate({row["horizontal_shift"]} 0)')
def body(g,sprite,row,edge):
 dx=row['horizontal_shift'];im(g,sprite,transform=transform(row))
 if dx>0 and row['card']['id'] not in SCALE:
  e=el(g,'image',x=14,y=0,width=dx+W.get(row['card']['id'],90),height=1484,preserveAspectRatio='none');e.set(XL,str(edge))
def edge_image(row,scale,sprite):
 cid=row['card']['id'];dx=row['horizontal_shift'];w=W.get(cid,90);total=dx+w
 target=ASSET/f'{cid}-background-edge-{scale}x.png'
 if target.exists():return target
 r=root();r.set('width',str(total));r.set('viewBox',f'0 0 {total} 1484');d=el(r,'defs')
 for k in range(24):
  x1=round(total*k/24);x2=round(total*(k+1)/24)
  def u(x):
   t=x/total;return x*w/total if w<dx/2 else x-dx*(3*t*t-2*t*t*t)
  a=u(x1);b=u(x2)
  if cid=='saiyan-166-gohan':a=16+x1*(w-16)/total;b=16+x2*(w-16)/total
  factor=(x2-x1)/(b-a)
  cp=el(d,'clipPath',id=f'edge-{k}');el(cp,'rect',x=x1,y=145,width=x2-x1,height=708)
  g=el(r,'g',clip_path=f'url(#edge-{k})');e=el(g,'image',x=x1-(14+a)*factor,y=0,width=1060*factor,height=1484,preserveAspectRatio='none');e.set(XL,str(sprite))
 p=CACHE/f'{cid}-edge-{scale}x.svg';E.ElementTree(r).write(str(p));render(p,target,round(total*scale))
 return target
def one(arg):
 row,scale=arg;c=row['card'];cid=c['id'];dx=row['horizontal_shift']
 if dx==0:return None
 sprite=CACHE/f'{cid}-art-{scale}x.png'
 if (CACHE/f'{cid}-cleaned-art-{scale}x.png').exists():sprite=CACHE/f'{cid}-cleaned-art-{scale}x.png'
 target=ASSET/f'{cid}-retained-art-{scale}x.png'
 if not target.exists():target.write_bytes(sprite.read_bytes())
 edge=edge_image(row,scale,sprite) if dx>0 and cid not in SCALE else None
 base=BASE/('public'+c['image' if scale==1 else 'downloadImage'].split('?')[0]);raster=CACHE/f'{cid}-published-{scale}x.png'
 if not raster.exists():Image.open(base).save(raster)
 alpha=Image.open(CACHE/f'{cid}-ui-1x.png').getchannel('A').point(lambda a:255 if a else 0).filter(ImageFilter.MaxFilter(3))
 if scale==2:alpha=alpha.resize((2120,2968),Image.Resampling.NEAREST)
 fixed=np.array(alpha)>0;allow=np.zeros(fixed.shape,dtype=np.uint8);allow[146*scale:852*scale,14*scale:814*scale]=255;allow[fixed]=0
 mask=ASSET/f'{cid}-art-mask-{scale}x.png';Image.fromarray(allow).convert('RGB').save(mask)
 r=root();defs=el(r,'defs');m=el(defs,'mask',id='fixed-ui-protection',maskUnits='userSpaceOnUse',x=0,y=0,width=1060,height=1484);im(m,mask)
 im(r,raster);g=el(r,'g',mask='url(#fixed-ui-protection)');body(g,sprite,row,edge)
 svg=CACHE/f'{cid}-export-{scale}x.svg';E.ElementTree(r).write(str(svg),encoding='UTF-8',xml_declaration=True)
 png=OUT/f'{cid}-{scale}x.png';render(svg,png,1060*scale)
 a=np.array(Image.open(png).convert('RGBA'));b=np.array(Image.open(raster).convert('RGBA'));changed=np.any(a!=b,axis=2)
 outside=int(np.count_nonzero(changed&(allow==0)));assert outside==0,(cid,scale,outside)
 maxdiff=None
 if cid not in SCALE:
  art=np.array(Image.open(sprite).convert('RGBA'));sx=np.arange(a.shape[1])-dx*scale;valid=(sx>=0)&(sx<a.shape[1]);shifted=np.zeros_like(a);shifted[:,valid]=art[:,sx[valid]]
  region=(allow==255)&(shifted[:,:,3]==255);region[:180*scale]=False;region[844*scale:]=False;region[:,:max(20,14+dx+W.get(cid,90)+4 if dx>0 else 20)*scale]=False;region[:,805*scale:]=False
  diff=np.max(np.abs(a[:,:,:3].astype(int)-shifted[:,:,:3].astype(int)),axis=2);maxdiff=int(diff[region].max());assert maxdiff==0,(cid,scale,maxdiff)
 final=PAY/('public'+c['image' if scale==1 else 'downloadImage'].split('?')[0]);final.parent.mkdir(parents=True,exist_ok=True)
 if not final.exists():Image.open(png).save(final,'WEBP',lossless=True,method=4)
 assert np.array_equal(a,np.array(Image.open(final).convert('RGBA'))),(cid,'lossless')
 t=E.parse(str(BASE/row['native']));rt=t.getroot();ag=next(e for e in rt if e.get('id')==row['art_group']);d=next(e for e in rt if e.tag.endswith('defs'))
 cp=el(d,'clipPath',id='remaining-personality-centering-window',clipPathUnits='userSpaceOnUse');el(cp,'rect',x=14,y=146,width=799.75,height=706)
 g=E.Element(f'{{{NS}}}g',id='remaining-personality-centering-20261115');g.set('clip-path','url(#remaining-personality-centering-window)');g.set('data-retained-art-transform',transform(row));body(g,target,row,edge);rt.insert(list(rt).index(ag)+1,g)
 npth=PAY/row['native']
 if scale==1:npth=npth.with_name(npth.stem+'-web-1x.svg')
 npth.parent.mkdir(parents=True,exist_ok=True)
 for e in g.iter():
  if e.get(XL):e.set(XL,os.path.relpath(e.get(XL),npth.parent))
 rt.set('data-centering-release','remaining-2026-11-15');rt.set('data-export-scale',str(scale));t.write(str(npth),encoding='UTF-8',xml_declaration=True)
 result={'scale':scale,'size':[1060*scale,1484*scale],'path':str(final.relative_to(PAY)),'sha256':sha(final),'baseline_sha256':sha(base),'protected_pixels_changed':outside,'translated_retained_art_max_difference':maxdiff,'uniform_scale':SCALE.get(cid,1),'lossless_roundtrip':True,'native':str(npth.relative_to(PAY))}
 (OUT/f'{cid}-{scale}x.json').write_text(json.dumps(result,indent=2));print(cid,scale,flush=True);return result
if __name__=='__main__':
 rows=json.loads((B/'prepared.json').read_text())['rows'];scales=[int(x) for x in sys.argv[1:]] or [1,2]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(one,[(r,s) for r in rows for s in scales]))
