from pathlib import Path
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from lxml import etree as E
from PIL import Image,ImageChops
import numpy as np
import os,subprocess,json,io,hashlib
P=Path(__file__).resolve().parent;ROOT=P.parent
os.environ['OMP_NUM_THREADS']='1'
NS='http://www.w3.org/2000/svg'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def raster(p,width):
 return Image.open(io.BytesIO(subprocess.run(['inkscape',str(p),'--export-type=png','--export-filename=-','--export-width='+str(width)],capture_output=True,check=True).stdout)).convert('RGBA')
def verify(c):
 svg=P/'masters'/(c['id']+'.svg')
 if not svg.exists():return {'number':c['number'],'missing':True}
 r=E.parse(str(svg)).getroot();m=E.Element('{'+NS+'}svg',nsmap={None:NS})
 for k in ['width','height','viewBox']:m.set(k,r.get(k))
 for ident in ['card-title','card-category','footer-text-block','card-number']:
  m.append(deepcopy(r.xpath('//*[@id=$i]',i=ident)[0]))
 for g in r.xpath('//*[starts-with(@id,"rules-line-")]'):m.append(deepcopy(g))
 folder=ROOT/'audit/ink-masks';folder.mkdir(exist_ok=True,parents=True);mask=folder/(c['id']+'.svg');mask.write_bytes(E.tostring(m))
 info=json.loads((ROOT/'audit'/f"{c['number']:03}.json").read_text());checks=[]
 for export in info['exports']:
  dest=ROOT/export['path'];width=export['size'][0];expected=np.asarray(raster(mask,width));solid=expected[:,:,3]>=254
  expected_rgb=expected[:,:,:3].astype(int);initial=None
  for attempt in range(4):
   actual=np.asarray(Image.open(dest).convert('RGB')).astype(int)
   bad=solid&(np.max(abs(actual-expected_rgb),axis=2)>36);count=int(bad.sum());total=int(solid.sum())
   if initial is None:initial=count
   # At most a small subpixel boundary mismatch; solid letter interiors must survive.
   if count/max(total,1)<.002:break
   if attempt==3:raise ValueError((c['number'],dest.name,'missing ink',count,total))
   fixed=raster(svg,width).convert('RGB');fixed.save(dest,'WEBP',lossless=True,method=4)
   assert ImageChops.difference(fixed,Image.open(dest).convert('RGB')).getbbox() is None
   if export['path'].startswith('downloads/') or export['path'].startswith('review-only/downloads/'):
    png=dest.parent.parent/'png'/(c['id']+'.png');fixed.save(png)
  export['sha256']=sha(dest);checks.append({'path':export['path'],'solid_ink_pixels':total,'initial_mismatch_pixels':initial,'final_mismatch_pixels':count,'rerenders':attempt})
 info['raster_text_verification']=checks;(ROOT/'audit'/f"{c['number']:03}.json").write_text(json.dumps(info,indent=2))
 return {'number':c['number'],'checks':checks}
if __name__=='__main__':
 cards=json.loads((ROOT/'new-cards.json').read_text())
 with ThreadPoolExecutor(max_workers=2) as pool:
  results=[]
  for result in pool.map(verify,cards):results.append(result);print(json.dumps(result),flush=True)
 (ROOT/'audit/raster-text-verification.json').write_text(json.dumps(results,indent=2))
