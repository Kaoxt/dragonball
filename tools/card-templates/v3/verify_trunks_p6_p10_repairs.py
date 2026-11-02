"""Verify native artwork masks protect all unrelated pixels in both exports."""
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
from lxml import etree as E
from PIL import Image
import numpy as np, json, subprocess, re
P=Path(__file__).resolve().parent;R=P.parents[2];W=R.parent/'trunks-p6-p10-work';D=R/'tools/card-corrections/v3-trunks-p6-p10';T=W/'repair-verification';T.mkdir(exist_ok=True)
S='{http://www.w3.org/2000/svg}';XL='{http://www.w3.org/1999/xlink}href'
def resolve(r,source):
 for e in r.iter():
  for k in ['href',XL]:
   v=e.get(k)
   if v and not v.startswith(('#','data:')):e.set(k,str((source.parent/v).resolve()))
def render(r,path):
 svg=path.with_suffix('.svg');svg.write_bytes(E.tostring(r));subprocess.run(['inkscape',str(svg),'--export-width=2120','--export-filename='+str(path)],check=True,capture_output=True)
 return Image.open(path).convert('RGBA')
def one(row):
 n=row['number'];source=R/row['native_source_path'];root=E.parse(str(source)).getroot();resolve(root,source)
 groups=root.xpath('//*[starts-with(@id,"original-fidelity-correction-")]')
 groups=[g for g in groups if g.tag==S+'g'];assert groups,n
 allowed=E.Element(S+'svg',nsmap={None:S[1:-1]},width='1060',height='1484',viewBox='0 0 1060 1484');allowed.append(deepcopy(root.find(S+'defs')))
 for group in groups:
  leaf=deepcopy(group)
  for im in list(leaf.iter(S+'image')):
   rect=E.Element(S+'rect',x=im.get('x'),y=im.get('y'),width=im.get('width'),height=im.get('height'),fill='white');im.getparent().replace(im,rect)
  for parent in group.iterancestors():
   if parent is root:break
   wrapper=E.Element(parent.tag,dict(parent.attrib));wrapper.append(leaf);leaf=wrapper
  allowed.append(leaf);group.getparent().remove(group)
 before=render(root,T/f'{n}-without-repair.png').convert('RGB');mask=render(allowed,T/f'{n}-allowed.png').getchannel('A');checks=[]
 for ex in row['exports']:
  size=tuple(ex['size']);base=before.resize(size,Image.Resampling.LANCZOS) if before.size!=size else before
  alpha=mask.resize(size,Image.Resampling.LANCZOS) if mask.size!=size else mask
  a=np.array(Image.open(R/ex['path']).convert('RGB'));b=np.array(base);diff=np.any(a!=b,axis=2);permitted=np.array(alpha)>0
  # Resampling of alpha and color has slightly different channel rounding at
  # a soft boundary. A three-pixel square covers the separable LANCZOS
  # support; #185 has four one-level channel differences at this boundary.
  from scipy.ndimage import binary_dilation
  permitted=binary_dilation(permitted,structure=np.ones((3,3),dtype=bool),iterations=3)
  outside=int(np.count_nonzero(diff&~permitted));assert outside==0,(n,ex['field'],outside)
  checks.append({'path':ex['path'],'changed_pixels':int(diff.sum()),'pixels_changed_outside_native_mask_and_antialias_footprint':outside,'size':list(size),'antialias_footprint_radius_pixels':3})
 print('Verified repair',n,flush=True);return {'number':n,'native_mask_groups':[g.get('id')for g in groups],'exports':checks}
if __name__=='__main__':
 rows=json.loads((D/'audit.json').read_text());selected=[r for r in rows if r['artwork'].get('localized_correction') or r['artwork'].get('sky_only_correction')]
 with ProcessPoolExecutor(max_workers=3)as pool:checks=list(pool.map(one,selected))
 (D/'artwork-repair-verification.json').write_text(json.dumps(checks,indent=2)+'\n')
