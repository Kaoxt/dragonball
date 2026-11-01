from pathlib import Path
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from lxml import etree as E
from PIL import Image
from scipy.ndimage import distance_transform_edt, binary_dilation
import numpy as np
import subprocess, json, hashlib, sys, io
P=Path(__file__).resolve().parent;R=P.parents[2];W=R.parent;D=R/'tools/card-corrections/v3-saiyan-171-220';T=W/'verification';T.mkdir(exist_ok=True)
sys.path.insert(0,str(P/'scripts'));import title_fit_v3 as fit
S='http://www.w3.org/2000/svg';XL='{http://www.w3.org/1999/xlink}href'
def sh(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def render(r,p,width=2120,header=False):
 for e in r.xpath('//*[local-name()="image"]'):
  for k in ['href',XL]:
   v=e.get(k)
   if v and v.startswith('../assets/'):e.set(k,str(P/'assets'/v.rsplit('/',1)[-1]))
 sp=p.with_suffix('.svg');sp.write_bytes(E.tostring(r,xml_declaration=True))
 cmd=['inkscape',str(sp),'--export-width='+str(width),'--export-filename='+str(p)]
 if header:cmd.append('--export-area=0:0:1060:146')
 subprocess.run(cmd,check=True,capture_output=True)
 with Image.open(p)as im:im.verify()
 return np.array(Image.open(p).convert('RGBA'))
def blank():return E.Element('{'+S+'}svg',nsmap={None:S},width='1060',height='1484',viewBox='0 0 1060 1484')
rows=[json.loads(p.read_text()) for p in sorted((D/'per-card').glob('*.json'))];assert len(rows)==50
first=E.parse(str(R/rows[0]['native_source_path']));r=blank();g=E.SubElement(r,'{'+S+'}g',transform=first.xpath('//*[@id="shared-title-material"]')[0].get('transform'));shape=deepcopy(first.xpath('//*[@id="clean-native-brush-paint-contour"]/*')[0]);shape.set('fill','white');g.append(shape)
brush=render(r,T/'brush.png',header=True)[:,:,3];dist=distance_transform_edt(brush==255)/2

def one(row):
 n=row['number'];folder=T/str(n);folder.mkdir(exist_ok=True);tree=E.parse(str(R/row['native_source_path']));r=blank();r.append(deepcopy(tree.xpath('//*[@id="card-title"]')[0]));mask=render(r,folder/'title.png',header=True)[:,:,3]
 pixels=mask>128;outside=int(np.count_nonzero(pixels&(brush<254)));clear=float(dist[pixels].min())
 original=E.tostring(tree);report=fit.apply(tree);assert E.tostring(tree)==original,(n,'title helper changed');assert report==row['current_preview_revision']['title_fit']
 checks={'number':n,'native_source_sha256':sh(R/row['native_source_path']),'title_pixels_outside_brush':outside,'minimum_brush_clearance':clear,'title_helper_idempotent':True,'exports':[]}
 for ex in row['exports']:
  path=R/ex['path'];assert sh(path)==ex['after_sha256'];im=Image.open(path);im.load();assert list(im.size)==ex['size']
  expected=Image.open(W/'renders'/(row['id']+'.png')).convert('RGB');expected=expected.resize(im.size,Image.Resampling.LANCZOS) if im.size!=expected.size else expected
  assert np.array_equal(np.array(im.convert('RGB')),np.array(expected)),(n,'export differs')
  checks['exports'].append({'path':ex['path'],'sha256':sh(path),'size':list(im.size),'decoded_pixels_match_render':True})
 for asset in row['assets']:assert sh(R/asset['path'])==asset['sha256']
 if row['artwork'].get('source_sha256'):assert row['artwork']['source_sha256'] in [a['sha256'] for a in row['assets']]
 if n in [197,209]:
  unpatched=E.parse(str(R/row['native_source_path']));patch=unpatched.xpath(f'//*[@id="localized-correction-{n}"]')[0];patch.getparent().remove(patch)
  before=render(unpatched,folder/'unpatched.png')[:,:,:3];after=np.array(Image.open(W/'renders'/(row['id']+'.png')).convert('RGB'))
  ell=row['artwork']['localized_correction']['source_mask_ellipse'];sc,_,_,_,tx,ty=row['artwork']['mapping_matrix'];cx=(ell[0]*sc+tx)*2;cy=(ell[1]*sc+ty)*2;rx=ell[2]*sc*2;ry=ell[3]*sc*2
  yy,xx=np.indices(before.shape[:2]);allowed=((xx+.5-cx)/rx)**2+((yy+.5-cy)/ry)**2<=1;allowed=binary_dilation(allowed,iterations=3)
  delta=np.any(before!=after,axis=2);outside_patch=int(np.count_nonzero(delta&~allowed));assert outside_patch==0,(n,outside_patch)
  checks['localized_patch']={'pixels_changed':int(delta.sum()),'pixels_changed_outside_mask':outside_patch,'original_raster_bytes_retained':True}
  small_before=np.array(Image.fromarray(before).resize((1060,1484),Image.Resampling.LANCZOS));small_after=np.array(Image.open(R/row['exports'][0]['path']).convert('RGB'))
  small_allowed=allowed.reshape(1484,2,1060,2).any(axis=(1,3));small_allowed=binary_dilation(small_allowed,iterations=4)
  checks['localized_patch']['display_pixels_changed_outside_mask']=int(np.count_nonzero(np.any(small_before!=small_after,axis=2)&~small_allowed));assert checks['localized_patch']['display_pixels_changed_outside_mask']==0
 return checks
with ThreadPoolExecutor(max_workers=3)as pool:checks=list(pool.map(one,rows))
(D/'render-verification.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps({'checked':len(checks),'clearance_failures':[(c['number'],c['minimum_brush_clearance'],c['title_pixels_outside_brush'])for c in checks if c['minimum_brush_clearance']<1],'patches':[c for c in checks if 'localized_patch'in c]},indent=2))
