"""Apply dark Villain paint and title clearance without rerendering full cards."""
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
import argparse, hashlib, json, subprocess, sys
import numpy as np
from PIL import Image
from lxml import etree as E

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE/'scripts'))
from title_fit_v3 import apply as fit_title
from personality_middle_v3 import RED
from footer_spacing import bounds
from patch_personality_labels import targets

REVISION = '2026-11-02-personality-dark-crimson-title-clearance'
OUT = ROOT/'tools/card-corrections/v3-personality-finish'
S = '{http://www.w3.org/2000/svg}'
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def paint(root): return root.xpath('//*[@id="shared-category-material"]')[0].find(S+'rect')
def normalized(root):
    root = deepcopy(root)
    title = root.xpath('//*[@id="card-title"]')[0]
    title.getparent().remove(title)
    paint(root).set('fill', 'NORMALIZED')
    return E.tostring(root, method='c14n')
def render(source, output, y, h):
    subprocess.run(['inkscape',str(source),f'--export-area=0:{y}:1060:{y+h}',
                    '--export-width=2120','--export-background-opacity=0',
                    '--export-filename='+str(output)],check=True,
                    stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return Image.open(output).convert('RGB')
def process(job):
    audit_path,row,folder = job
    work=Path(folder)/row['id'];work.mkdir(parents=True,exist_ok=True)
    source=ROOT/row['native_source_path']
    assert sha(source)==row['native_source_sha256']
    if row.get('personality_finish_revision',{}).get('revision')==REVISION:
        for e in row['exports']: assert sha(ROOT/e['path'])==e['after_sha256']
        return row['personality_finish_revision']
    if (work/'verification.json').exists():
        saved=json.loads((work/'verification.json').read_text())
        if saved['before_native_sha256']==sha(source):
            assert sha(work/'after.svg')==saved['after_native_sha256']
            for e in saved['exports']:
                assert sha(ROOT/e['path'])==e['before_sha256']
                assert sha(work/(e['field']+'.webp'))==e['after_sha256']
            return saved
    before=source.read_bytes();(work/'before.svg').write_bytes(before)
    old=E.fromstring(before);new=deepcopy(old)
    villain=old.xpath('//*[@id="card-category"]')[0].get('aria-label')=='VILLAIN'
    old_bounds=row['native_geometry']['bounds']['card-title']
    title_changed=old_bounds[2]>640.01
    if villain: paint(new).set('fill', RED)
    title_report=fit_title(new) if title_changed else None
    assert normalized(old)==normalized(new)
    assert E.tostring(old.xpath('//*[@id="card-category"]')[0])==E.tostring(new.xpath('//*[@id="card-category"]')[0])
    if not title_changed:
        assert E.tostring(old.xpath('//*[@id="card-title"]')[0])==E.tostring(new.xpath('//*[@id="card-title"]')[0])
    native=E.tostring(new,encoding='UTF-8',xml_declaration=True)
    twice=deepcopy(new)
    if villain: paint(twice).set('fill',RED)
    if title_changed: fit_title(twice)
    assert E.tostring(twice)==E.tostring(new)
    staged_source=source.with_name('.'+source.stem+'-finish.svg')
    try:
        staged_source.write_bytes(native)
        geometry=bounds(staged_source) if title_changed else row['native_geometry']['bounds']
        x,y,w,h=geometry['card-title']
        assert w<=640.01 and abs(x+w/2-529.5)<.01 and abs(y+h/2-79)<.01
        assert x>=209.49 and x+w<=849.51
        if title_changed:
            bx,by,bw,bh=geometry['v3-level-number']
            assert x-(bx+bw)>=40,(row['id'],x,bx+bw)
        strips=[]
        if title_changed:strips.append(('title',0,150))
        if villain:strips.append(('middle',848,122))
        renders=[(name,y,h,render(source,work/(name+'-old.png'),y,h),
                  render(staged_source,work/(name+'-new.png'),y,h)) for name,y,h in strips]
        check={'id':row['id'],'revision':REVISION,'audit_path':audit_path,
               'native_source_path':row['native_source_path'],
               'before_native_sha256':sha(source),'after_native_sha256':sha(staged_source),
               'villain_color_changed':villain,'villain_color':RED if villain else None,
               'title_changed':title_changed,'title_fit':title_report,
               'title_bounds_before':old_bounds,'title_bounds_after':geometry['card-title'],
               'unrelated_native_elements_unchanged':True,'category_paths_unchanged':True,
               'helper_idempotent':True,'exports':[]}
        for e in row['exports']:
            target=ROOT/e['path'];assert sha(target)==e['after_sha256']
            image=Image.open(target).convert('RGB');base=np.array(image);patched=base.copy()
            allowed=np.zeros(base.shape[:2],bool);scale=image.width/1060;assert scale in (1,2)
            reports=[]
            for name,y,h,old_render,new_render in renders:
                size=(image.width,round(h*scale));offset=round(y*scale)
                a,b=[np.array(im if scale==2 else im.resize(size,Image.Resampling.LANCZOS)).astype(np.int16) for im in (old_render,new_render)]
                affected=np.any(a!=b,axis=2)
                strip=base[offset:offset+size[1]].astype(np.int16)
                residual=int(np.abs(strip-a)[affected].max())
                # A prior lossless patch can retain a one-pixel, four-level
                # rounding residue at the artwork/brush antialias boundary.
                # Preserve that residue through the delta, never overwrite it.
                errors=np.abs(strip-a).max(axis=2)
                assert residual<=4 and int(((errors>3)&affected).sum())<=4,(row['id'],e['field'],name,residual)
                corrected=np.clip(strip+b-a,0,255).astype(np.uint8)
                patched[offset:offset+size[1]][affected]=corrected[affected]
                allowed[offset:offset+size[1]]|=affected
                reports.append({'region':name,'old_render_max_channel_difference':residual})
            changed=np.any(patched!=base,axis=2);assert changed.any() and not np.any(changed&~allowed)
            ys,xs=np.where(changed)
            out=work/(e['field']+'.webp');Image.fromarray(patched).save(out,'WEBP',lossless=True,method=4)
            assert np.array_equal(np.array(Image.open(out).convert('RGB')),patched)
            (work/(e['field']+'-before.webp')).write_bytes(target.read_bytes())
            check['exports'].append({'field':e['field'],'path':e['path'],'size':list(image.size),
                'before_sha256':sha(target),'after_sha256':sha(out),'changed_pixels':int(changed.sum()),
                'changed_pixel_bounds':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)],
                'pixels_changed_outside_edited_native_ink':0,'lossless_round_trip':True,'regions':reports})
        (work/'after.svg').write_bytes(native)
        (work/'verification.json').write_text(json.dumps(check,indent=2)+'\n')
        return check
    finally:staged_source.unlink(missing_ok=True)

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('work',type=Path)
    p.add_argument('--only');p.add_argument('--jobs',type=int,default=4);p.add_argument('--apply',action='store_true')
    args=p.parse_args();items=[]
    for f,r in targets():
        category=r['category_label_revision']['label']
        if category=='VILLAIN' or r['native_geometry']['bounds']['card-title'][2]>640.01 or r.get('personality_finish_revision'):
            items.append((str(f.relative_to(ROOT)),r,str(args.work.resolve())))
    if args.only:items=[i for i in items if i[1]['id']==args.only]
    assert items
    if all(r.get('personality_finish_revision') for _,r,_ in items):
        for item in items:process(item)
        print('All current sources and exports verified unchanged.');return
    with ProcessPoolExecutor(max_workers=args.jobs) as pool:
        checks=[]
        for c in pool.map(process,items):checks.append(c);print('Verified',c['id'],flush=True)
    if not args.apply:return
    assert not args.only
    catalog_path=ROOT/'public/cards/catalog.js';catalog=catalog_path.read_text()
    audits={path:json.loads((ROOT/path).read_text()) for path,_,_ in items}
    review_path=ROOT/'docs/card-type-audit-2026-10-25.json';reviews=json.loads(review_path.read_text())
    for c in checks:
        row=next(r for r in audits[c['audit_path']] if r['id']==c['id']);work=args.work/c['id']
        (ROOT/c['native_source_path']).write_bytes((work/'after.svg').read_bytes())
        row['native_source_sha256']=c['after_native_sha256'];row['personality_finish_revision']=c
        row['native_geometry']['bounds']['card-title']=c['title_bounds_after']
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
                        review['personality_finish_revision']={'previous_reviewed_image':before,'rules_pixels_changed':0,
                            'evidence':'tools/card-corrections/v3-personality-finish/pixel-checks.json'}
    for path,data in audits.items():(ROOT/path).write_text(json.dumps(data,indent=2)+'\n')
    catalog_path.write_text(catalog);review_path.write_text(json.dumps(reviews,indent=2)+'\n')
    OUT.mkdir(exist_ok=True)
    (OUT/'pixel-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
    (OUT/'release.json').write_text(json.dumps({'revision':REVISION,
        'baseline_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True,cwd=ROOT).strip(),
        'cards':len(checks),'villains':sum(c['villain_color_changed'] for c in checks),
        'titles':sum(c['title_changed'] for c in checks),'exports':2*len(checks),
        'pixels_changed_outside_edited_native_ink':0},indent=2)+'\n')
if __name__=='__main__':main()
