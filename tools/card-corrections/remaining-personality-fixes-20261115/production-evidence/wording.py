from prepare import *
from render import PAY,OUT,ASSET,sha,root,el,im
from PIL import Image
import numpy as np
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
cid='saiyan-184-vegeta-lvl-1-ht'
row=next(r for r in INV['rows'] if r['card']['id']==cid);c=row['card']
t=E.parse(str(BASE/row['native']));rt=t.getroot()
old=next(e for e in rt.iter() if e.get('id')=='rules-line-1');icon=next(e for e in rt.iter() if e.get('id')=='power-icon')
font=TTFont('/home/agent/.codex/skills/remote-skills/skill-6ae4afa3119c81918140546a48a53476/assets/production/fonts/BarlowCondensed-Bold.ttf');gs=font.getGlyphSet();cmap=font.getBestCmap();unit=49/font['head'].unitsPerEm
paths=[];bounds=[];adv=0
for ch in 'Stops an energy attack.':
 glyph=gs[cmap[ord(ch)]];p=SVGPathPen(gs);glyph.draw(p);b=BoundsPen(gs);glyph.draw(b)
 if b.bounds:
  paths.append((adv,p.getCommands()));bounds.append((adv+b.bounds[0],b.bounds[1],adv+b.bounds[2],b.bounds[3]))
 adv+=glyph.width
x0=min(b[0] for b in bounds);x1=max(b[2] for b in bounds);width=(x1-x0)*unit
iconw=37.36894736842105;start=529.5-(iconw+12+width)/2
new=E.Element(f'{{{NS}}}g',id='rules-line-1',fill='#060606',transform=f'translate({start+iconw+12-x0*unit} 1049.3) scale({unit} {-unit})')
new.set('aria-label','Stops an energy attack.');new.set('data-font-size','49');new.set('data-word-spacing','normal')
for x,d in paths:el(new,'path',d=d,transform=f'translate({x} 0)')
old.getparent().replace(old,new);icon.set('transform',f'translate({start} 1015) scale(0.902631579) translate(0 0)')
for scale in [1,2]:
 npth=PAY/row['native']
 if scale==1:npth=npth.with_name(npth.stem+'-web-1x.svg')
 npth.parent.mkdir(parents=True,exist_ok=True);t.write(str(npth),encoding='UTF-8',xml_declaration=True)
 tr=copy.deepcopy(t)
 for e in tr.getroot().iter():
  for key in [XL,'href']:
   h=e.get(key)
   if h and not h.startswith(('#','data:')):e.set(key,str(((BASE/row['native']).parent/h).resolve()))
 svg=CACHE/f'{cid}-new.svg';tr.write(str(svg));source=CACHE/f'{cid}-new-{scale}x.png';render(svg,source,1060*scale)
 original=BASE/('public'+c['image' if scale==1 else 'downloadImage'].split('?')[0]);base=Image.open(original).convert('RGBA')
 raster=CACHE/f'{cid}-published-{scale}x.png';base.save(raster)
 # Only the rule sentence and its icon are allowed to change.
 mask=np.zeros((1484*scale,1060*scale),dtype=np.uint8);mask[1006*scale:1063*scale,250*scale:810*scale]=255
 mp=ASSET/f'{cid}-wording-mask-{scale}x.png';Image.fromarray(mask).convert('RGB').save(mp)
 r=root();defs=el(r,'defs');m=el(defs,'mask',id='wording-only',maskUnits='userSpaceOnUse',x=0,y=0,width=1060,height=1484);im(m,mp);im(r,raster);g=el(r,'g',mask='url(#wording-only)');im(g,source)
 ep=CACHE/f'{cid}-export-{scale}x.svg';E.ElementTree(r).write(str(ep));png=OUT/f'{cid}-{scale}x.png';render(ep,png,1060*scale)
 a=np.array(Image.open(png).convert('RGBA'));b=np.array(base);outside=int(np.count_nonzero(np.any(a!=b,axis=2)&(mask==0)));assert outside==0
 final=PAY/('public'+c['image' if scale==1 else 'downloadImage'].split('?')[0]);final.parent.mkdir(parents=True,exist_ok=True);Image.open(png).save(final,'WEBP',lossless=True,method=4)
 assert np.array_equal(a,np.array(Image.open(final).convert('RGBA')))
 result={'scale':scale,'size':[1060*scale,1484*scale],'path':str(final.relative_to(PAY)),'sha256':sha(final),'baseline_sha256':sha(original),'protected_pixels_changed':outside,'lossless_roundtrip':True,'native':str(npth.relative_to(PAY)),'wording':'Stops an energy attack.'}
 (OUT/f'{cid}-{scale}x.json').write_text(json.dumps(result,indent=2));print(cid,scale,flush=True)
