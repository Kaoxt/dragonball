"""Verify Android exports, native title clearance and localized artwork masks."""
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from lxml import etree as E
from PIL import Image
from scipy.ndimage import distance_transform_edt,binary_dilation
import numpy as np
import subprocess,json,hashlib,sys,io,os
P=Path(__file__).resolve().parent;R=P.parents[2];W=R.parent/'android-completion-work';D=R/'tools/card-corrections/v3-android-101-125-promos';T=W/'verification';T.mkdir(exist_ok=True)
sys.path.insert(0,str(P/'scripts'));import title_fit_v3 as fit
S='http://www.w3.org/2000/svg';XL='{http://www.w3.org/1999/xlink}href'
def sh(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def atomic(p,data):
 tmp=p.with_name(p.name+'.tmp')
 with tmp.open('wb')as f:f.write(data);f.flush();os.fsync(f.fileno())
 os.replace(tmp,p)
def render(r,p,header=False):
 width=int(r.get('width'));height=int(r.get('height'))
 for e in r.xpath('//*[local-name()="image"]'):
  for k in ['href',XL]:
   v=e.get(k)
   if v and v.startswith('../assets/'):e.set(k,str(P/'assets'/v.rsplit('/',1)[-1]))
 sp=p.with_suffix('.svg');atomic(sp,E.tostring(r,xml_declaration=True));cmd=['inkscape',str(sp),'--export-width='+str(width*2),'--export-type=png','--export-filename=-']
 if header:cmd.append(f'--export-area=0:0:{width}:146')
 result=subprocess.run(cmd,check=True,capture_output=True)
 with Image.open(io.BytesIO(result.stdout))as source:im=source.convert('RGBA');im.load()
 b=io.BytesIO();im.save(b,format='PNG');atomic(p,b.getvalue());return np.array(im)
def blank(w,h):return E.Element('{'+S+'}svg',nsmap={None:S},width=str(w),height=str(h),viewBox=f'0 0 {w} {h}')
rows=json.loads((D/'audit.json').read_text());assert len(rows)==36
brushes={}
for land in [False,True]:
 row=next(r for r in rows if (r['family']in['LOCATION','BATTLEGROUND'])==land);tree=E.parse(str(R/row['native_source_path'])).getroot();w,h=map(int,[tree.get('width'),tree.get('height')]);r=blank(w,h);defs=deepcopy(tree.find('{'+S+'}defs'));r.append(defs)
 panel=r.xpath('//*[@id="shared-brushed-charcoal-panel"]')[0]
 for c in list(panel):panel.remove(c)
 shape=deepcopy(r.xpath('//*[@id="clean-native-brush-paint-contour"]/*')[0]);shape.set('fill','white');panel.append(shape)
 r.append(deepcopy(tree.xpath('//*[@id="shared-title-material"]')[0]));brush=render(r,T/f'brush-{land}.png',True)[:,:,3];brushes[land]=(brush,distance_transform_edt(brush==255)/2)
def one(row):
 n=row['number'];folder=T/str(n);folder.mkdir(exist_ok=True);tree=E.parse(str(R/row['native_source_path'])).getroot();w,h=map(int,[tree.get('width'),tree.get('height')]);land=w==1484
 cached=folder/'checks.json'
 if cached.exists():
  check=json.loads(cached.read_text())
  if check['native_source_sha256']==sh(R/row['native_source_path'])and all(sh(R/e['path'])==e['sha256']for e in check['exports'])and all(sh(R/a['path'])==a['sha256']for a in row['assets']):
   print(f'Unchanged verified source and exports {n}',flush=True);return check
 after=render(deepcopy(tree),folder/'native-final.png')[:,:,:3]
 r=blank(w,h);r.append(deepcopy(tree.xpath('//*[@id="card-title"]')[0]));mask=render(r,folder/'title.png',True)[:,:,3];brush,dist=brushes[land];pixels=mask>128;outside=int(np.count_nonzero(pixels&(brush<254)));clear=float(dist[pixels].min())
 if not land:
  original=E.tostring(tree);report=fit.apply(tree);assert E.tostring(tree)==original,(n,'title helper changed')
 checks={'number':n,'native_source_sha256':sh(R/row['native_source_path']),'title_pixels_outside_brush':outside,'minimum_brush_clearance':clear,'title_helper_idempotent':not land,'exports':[]}
 for ex in row['exports']:
  path=R/ex['path'];assert sh(path)==ex['after_sha256'];im=Image.open(path).convert('RGB');assert list(im.size)==ex['size'];expected=Image.fromarray(after);expected=expected.resize(im.size,Image.Resampling.LANCZOS)if im.size!=expected.size else expected
  assert np.array_equal(np.array(im),np.array(expected)),(n,'export pixels');checks['exports'].append({'path':ex['path'],'sha256':sh(path),'size':list(im.size),'decoded_pixels_match_render':True})
 for asset in row['assets']:assert sh(R/asset['path'])==asset['sha256']
 # Every local URL reference must resolve, including the landscape rarity fill.
 import re
 ids={e.get('id')for e in tree.iter()if e.get('id')}
 for e in tree.iter():
  for k,v in e.attrib.items():
   for ident in re.findall(r'url\(#([^)]*)\)',v):assert ident in ids,(n,ident)
   if k.endswith('href')and v.startswith('#'):assert v[1:]in ids,(n,v)
 if row['artwork']['localized_correction']:
  ident=f'localized-art-correction-{n}';unpatched=deepcopy(tree);patch=unpatched.xpath('//*[@id=$i]',i=ident)[0];patch.getparent().remove(patch);before=render(unpatched,folder/'unpatched.png')[:,:,:3]
  isolated=blank(w,h);isolated.append(deepcopy(tree.find('{'+S+'}defs')));layer=deepcopy(tree.xpath('//*[@id="retained-illustration"]')[0]);base=layer.xpath('.//*[@id="card-illustration"]')[0];base.getparent().remove(base);isolated.append(layer);alpha=render(isolated,folder/'patch-mask.png')[:,:,3];allowed=binary_dilation(alpha>0,iterations=3);delta=np.any(before!=after,axis=2);outside_patch=int(np.count_nonzero(delta&~allowed));assert outside_patch==0,(n,outside_patch)
  small_before=np.array(Image.fromarray(before).resize((w,h),Image.Resampling.LANCZOS));small_after=np.array(Image.open(R/row['exports'][0]['path']).convert('RGB'));small_allowed=binary_dilation(allowed.reshape(h,2,w,2).any(axis=(1,3)),iterations=4);small_out=int(np.count_nonzero(np.any(small_before!=small_after,axis=2)&~small_allowed));assert small_out==0
  checks['localized_patch']={'pixels_changed':int(delta.sum()),'pixels_changed_outside_mask':outside_patch,'display_pixels_changed_outside_mask':small_out,'original_raster_bytes_retained':True}
 assert outside==0 and clear>=1,(n,outside,clear)
 atomic(folder/'checks.json',(json.dumps(checks,indent=2)+'\n').encode());print(f'Verified {n}; title clearance {clear:.2f}',flush=True);return checks
def checked(row):
 try:return one(row)
 except Exception as e:print(f'FAILED {row["number"]}: {e!r}',flush=True);return {'number':row['number'],'error':repr(e)}
with ThreadPoolExecutor(max_workers=2)as pool:checks=list(pool.map(checked,rows))
errors=[x for x in checks if 'error'in x];assert not errors,errors
atomic(D/'render-verification.json',(json.dumps(checks,indent=2)+'\n').encode());print('All 36 verified')
