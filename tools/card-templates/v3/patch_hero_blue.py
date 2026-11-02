"""Patch approved Hero middle paint in existing exports without rerendering cards."""
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
import argparse
import hashlib
import json
import subprocess
import sys
import numpy as np
from PIL import Image
from lxml import etree as E

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE/'scripts'))
from personality_middle_v3 import apply_hero_color, HERO_BLUE_STOPS, HERO_GRADIENT_ID

S = '{http://www.w3.org/2000/svg}'
REVISION = '2026-11-02-hero-reference-blue'
OUT = ROOT/'tools/card-corrections/v3-hero-reference-blue'
Y, HEIGHT = 848, 122

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def targets():
    checks = json.loads((ROOT/'tools/card-corrections/v3-personality-short-labels/pixel-checks.json').read_text())
    result=[]
    for c in checks:
        if c['label'] != 'HERO':
            continue
        row=next(r for r in json.loads((ROOT/c['audit_path']).read_text()) if r['id']==c['id'])
        result.append((c['audit_path'],row))
    assert len(result)==73 and len({r['id'] for _,r in result})==73
    return result

def normalized(root):
    root=deepcopy(root)
    for gradient in root.xpath(f'//*[@id="{HERO_GRADIENT_ID}"]'):
        gradient.getparent().remove(gradient)
    root.xpath('//*[@id="shared-category-material"]')[0].find(S+'rect').set('fill','NORMALIZED')
    return E.tostring(root,method='c14n')

def render(source,out):
    subprocess.run(['inkscape',str(source),f'--export-area=0:{Y}:1060:{Y+HEIGHT}',
                    '--export-width=2120','--export-background-opacity=0',
                    '--export-filename='+str(out)],check=True,
                   stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return Image.open(out).convert('RGB')

def process(job):
    audit_path,row,folder=job
    source=ROOT/row['native_source_path']
    assert sha(source)==row['native_source_sha256'],row['id']
    if row.get('hero_blue_revision',{}).get('revision')==REVISION:
        for e in row['exports']:
            assert sha(ROOT/e['path'])==e['after_sha256']
        return row['hero_blue_revision']
    work=Path(folder)/row['id'];work.mkdir(parents=True,exist_ok=True)
    if (work/'verification.json').exists():
        saved=json.loads((work/'verification.json').read_text())
        if saved['before_native_sha256']==sha(source):
            assert sha(work/'after.svg')==saved['after_native_sha256']
            for e in saved['exports']:
                assert sha(ROOT/e['path'])==e['before_sha256']
                assert sha(work/(e['field']+'.webp'))==e['after_sha256']
            return saved
    for asset in row['assets']:
        assert sha(ROOT/asset['path'])==asset['sha256'],asset['path']
    old=E.fromstring(source.read_bytes());new=deepcopy(old)
    assert old.xpath('//*[@id="card-category"]')[0].get('aria-label')=='HERO'
    apply_hero_color(new)
    assert normalized(old)==normalized(new)
    twice=deepcopy(new);apply_hero_color(twice)
    assert E.tostring(twice)==E.tostring(new)
    staged=source.with_name('.'+source.stem+'-hero-blue.svg')
    try:
        native=E.tostring(new,encoding='UTF-8',xml_declaration=True)
        staged.write_bytes(native)
        a_full=render(source,work/'middle-before.png')
        b_full=render(staged,work/'middle-after.png')
        check={'id':row['id'],'revision':REVISION,'audit_path':audit_path,
               'native_source_path':row['native_source_path'],
               'before_native_sha256':sha(source),'after_native_sha256':sha(staged),
               'hero_blue_stops':list(HERO_BLUE_STOPS),
               'unrelated_native_elements_unchanged':True,'helper_idempotent':True,
               'assets_unchanged':True,'exports':[]}
        for e in row['exports']:
            target=ROOT/e['path'];assert sha(target)==e['after_sha256']
            original=Image.open(target).convert('RGB');base=np.array(original);patched=base.copy()
            scale=original.width/1060;assert scale in (1,2)
            size=(original.width,round(HEIGHT*scale));offset=round(Y*scale)
            a,b=[np.array(im if scale==2 else im.resize(size,Image.Resampling.LANCZOS)).astype(np.int16) for im in (a_full,b_full)]
            affected=np.any(a!=b,axis=2)
            strip=base[offset:offset+size[1]].astype(np.int16)
            errors=np.abs(strip-a).max(axis=2)
            residual=int(errors[affected].max())
            # Trunks #169 retains six four-level antialias residues at native
            # y849, x786–795 from its approved export. Preserve those baseline
            # residues through the paint delta instead of replacing the strip.
            over_three=int(((errors>3)&affected).sum())
            assert residual<=4 and over_three<=8,(row['id'],e['field'],residual,over_three)
            corrected=np.clip(strip+b-a,0,255).astype(np.uint8)
            patched[offset:offset+size[1]][affected]=corrected[affected]
            allowed=np.zeros(base.shape[:2],bool);allowed[offset:offset+size[1]]=affected
            changed=np.any(patched!=base,axis=2)
            assert changed.any() and not np.any(changed&~allowed)
            ys,xs=np.where(changed)
            out=work/(e['field']+'.webp')
            Image.fromarray(patched).save(out,'WEBP',lossless=True,method=4)
            assert np.array_equal(np.array(Image.open(out).convert('RGB')),patched)
            (work/(e['field']+'-before.webp')).write_bytes(target.read_bytes())
            check['exports'].append({'field':e['field'],'path':e['path'],'size':list(original.size),
                'before_sha256':sha(target),'after_sha256':sha(out),
                'changed_pixels':int(changed.sum()),
                'changed_pixel_bounds':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)],
                'pixels_changed_outside_middle_paint':0,'lossless_round_trip':True,
                'old_render_max_channel_difference':residual,'old_render_pixels_over_3':over_three})
        (work/'before.svg').write_bytes(source.read_bytes())
        (work/'after.svg').write_bytes(native)
        (work/'verification.json').write_text(json.dumps(check,indent=2)+'\n')
        return check
    finally:
        staged.unlink(missing_ok=True)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('work',type=Path);p.add_argument('--only')
    p.add_argument('--jobs',type=int,default=4);p.add_argument('--apply',action='store_true')
    args=p.parse_args();items=[(f,r,str(args.work.resolve())) for f,r in targets()]
    if args.only:items=[i for i in items if i[1]['id']==args.only]
    assert items
    if all(r.get('hero_blue_revision') for _,r,_ in items):
        for item in items:process(item)
        print('All current Hero sources and exports verified unchanged.');return
    checks=[]
    with ProcessPoolExecutor(max_workers=args.jobs) as pool:
        for c in pool.map(process,items):
            checks.append(c);print('Verified',c['id'],flush=True)
    if not args.apply:return
    assert not args.only
    catalog_path=ROOT/'public/cards/catalog.js';catalog=catalog_path.read_text()
    audits={path:json.loads((ROOT/path).read_text()) for path,_,_ in items}
    review_path=ROOT/'docs/card-type-audit-2026-10-25.json';reviews=json.loads(review_path.read_text())
    for c in checks:
        row=next(r for r in audits[c['audit_path']] if r['id']==c['id']);work=args.work/c['id']
        (ROOT/c['native_source_path']).write_bytes((work/'after.svg').read_bytes())
        row['native_source_sha256']=c['after_native_sha256'];row['hero_blue_revision']=c
        for e in c['exports']:
            current=next(x for x in row['exports'] if x['path']==e['path'])
            (ROOT/e['path']).write_bytes((work/(e['field']+'.webp')).read_bytes())
            prefix=e['path'].removeprefix('public')+'?v='
            before,after=prefix+e['before_sha256'][:12],prefix+e['after_sha256'][:12]
            assert catalog.count('"'+before+'"')==1
            catalog=catalog.replace('"'+before+'"','"'+after+'"');current['after_sha256']=e['after_sha256']
            if e['field']=='image':
                for review in reviews['missing_rules_image_reviewed']:
                    if review['id']==c['id']:
                        assert review['image']==before;review['image']=after
                        review['hero_blue_revision']={'previous_reviewed_image':before,'rules_pixels_changed':0,
                            'evidence':'tools/card-corrections/v3-hero-reference-blue/pixel-checks.json'}
    for path,data in audits.items():(ROOT/path).write_text(json.dumps(data,indent=2)+'\n')
    catalog_path.write_text(catalog);review_path.write_text(json.dumps(reviews,indent=2)+'\n')
    OUT.mkdir(exist_ok=True)
    (OUT/'pixel-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
    (OUT/'release.json').write_text(json.dumps({'revision':REVISION,
        'baseline_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True,cwd=ROOT).strip(),
        'cards':len(checks),'exports':2*len(checks),'hero_blue_stops':list(HERO_BLUE_STOPS),
        'pixels_changed_outside_middle_paint':0},indent=2)+'\n')

if __name__=='__main__':
    main()
