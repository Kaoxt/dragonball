"""Verify each Hero middle overlay retains alpha and clear background pixels."""
from concurrent.futures import ProcessPoolExecutor
from copy import deepcopy
from pathlib import Path
import argparse
import json
import subprocess
import numpy as np
from PIL import Image, ImageFilter
from lxml import etree as E
from patch_hero_blue import ROOT, OUT, Y, HEIGHT, sha

def verify(job):
    c,workdir=job;work=Path(workdir)/c['id'];source=ROOT/c['native_source_path']
    staged=source.with_name('.'+source.stem+'-alpha-qa.svg')
    layers=[]
    try:
        for name in ['before','after']:
            root=E.fromstring((work/(name+'.svg')).read_bytes())
            material=root.xpath('//*[@id="shared-category-material"]')[0]
            wrapper=material
            while wrapper.getparent() is not root:wrapper=wrapper.getparent()
            for child in list(root):
                if E.QName(child).localname!='defs' and child is not wrapper:root.remove(child)
            staged.write_bytes(E.tostring(root,encoding='UTF-8',xml_declaration=True))
            out=work/(name+'-overlay.png')
            subprocess.run(['inkscape',str(staged),f'--export-area=0:{Y}:1060:{Y+HEIGHT}',
                            '--export-width=2120','--export-background-opacity=0',
                            '--export-filename='+str(out)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            layers.append(Image.open(out).convert('RGBA').getchannel('A'))
        assert np.array_equal(np.array(layers[0]),np.array(layers[1])),c['id']
        exports=[]
        for e in c['exports']:
            before=Image.open(work/(e['field']+'-before.webp')).convert('RGB')
            after=Image.open(ROOT/e['path']).convert('RGB')
            assert sha(ROOT/e['path'])==e['after_sha256']
            scale=after.width/1060;size=(after.width,round(HEIGHT*scale));y=round(Y*scale)
            alpha=layers[0] if scale==2 else layers[0].resize(size,Image.Resampling.LANCZOS)
            # Downsampling uses Lanczos, whose signed lobes can round the
            # 8-bit alpha to zero while still contributing RGB paint color.
            # Exclude its three-display-pixel support when testing background.
            footprint=alpha if scale==2 else alpha.filter(ImageFilter.MaxFilter(7))
            clear=np.array(footprint)==0
            a=np.array(before)[y:y+size[1]];b=np.array(after)[y:y+size[1]]
            changed=int(np.any(a!=b,axis=2)[clear].sum());assert changed==0
            exports.append({'path':e['path'],'sha256':e['after_sha256'],
                            'fully_clear_pixels':int(clear.sum()),'changed_clear_pixels':changed,
                            'lanczos_support_pixels':0 if scale==2 else 3})
        return {'id':c['id'],'alpha_identical':True,'exports':exports}
    finally:staged.unlink(missing_ok=True)

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('work',type=Path);p.add_argument('--jobs',type=int,default=4);a=p.parse_args()
    checks=json.loads((OUT/'pixel-checks.json').read_text());results=[]
    with ProcessPoolExecutor(max_workers=a.jobs) as pool:
        for result in pool.map(verify,[(c,str(a.work.resolve())) for c in checks]):
            results.append(result);print('Alpha verified',result['id'],flush=True)
    (OUT/'transparency-verification.json').write_text(json.dumps(results,indent=2)+'\n')
    print('All Hero overlays and fully transparent background pixels verified unchanged.')

if __name__=='__main__':main()
