"""Replace only V3 Personality category ink in each existing lossless export."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from copy import deepcopy
import argparse, hashlib, json, subprocess, sys
import numpy as np
from lxml import etree as E
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE / 'scripts'))
from middle_label_v3 import apply
from footer_spacing import bounds

REVISION = '2026-11-02-hero-villain-short-labels'
Y, HEIGHT = 876, 66
OUT = ROOT / 'tools/card-corrections/v3-personality-short-labels'

def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def update_wording_reviews(checks):
    path = ROOT/'docs/card-type-audit-2026-10-25.json'
    original = path.read_text()
    data = json.loads(original)
    by_id = {check['id']: check for check in checks}
    for row in data['missing_rules_image_reviewed']:
        if row['id'] not in by_id:
            continue
        check = by_id[row['id']]
        export = next(e for e in check['exports'] if e['field'] == 'image')
        assert export['pixels_changed_outside_category_ink_footprint'] == 0
        assert export['changed_pixel_bounds'][3] < 965
        base = export['path'].removeprefix('public')+'?v='
        before, after = [base+export[key][:12] for key in ['before_sha256','after_sha256']]
        assert row['image'] in [before,after], row['id']
        row['image'] = after
        row['category_label_revision'] = {
            'previous_reviewed_image': before,
            'evidence': 'tools/card-corrections/v3-personality-short-labels/independent-verification.json',
            'rules_pixels_changed': 0
        }
    updated = json.dumps(data,indent=2)+'\n'
    if updated != original:
        path.write_text(updated)

def targets():
    # Older Saiyan audits do not have a family field. The current catalog is
    # authoritative for which published cards belong to this revision.
    current_ids = set(json.loads(subprocess.check_output([
        'node', '--input-type=module', '-e',
        "import {catalog} from './public/cards/catalog.js';"
        "console.log(JSON.stringify(catalog.filter(c=>c.templateVersion===3"
        "&&c.type.includes('Personality')).map(c=>c.id)))"
    ], cwd=ROOT, text=True)))
    result = []
    for path in sorted((ROOT/'tools/card-corrections').glob('v3-*/audit.json')):
        data = json.loads(path.read_text())
        if not isinstance(data, list):
            continue
        for row in data:
            if row.get('native_source_path') and row.get('id') in current_ids:
                result.append((path, row))
    assert {row['id'] for _, row in result} == current_ids, 'Missing current Personality audits'
    return result

def render(source, output):
    subprocess.run(['inkscape',str(source),f'--export-area=0:{Y}:1060:{Y+HEIGHT}',
                    '--export-width=2120','--export-background-opacity=0',
                    '--export-filename='+str(output)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    with Image.open(output) as im:
        return im.convert('RGBA')

def unrelated(root):
    root = deepcopy(root)
    group = root.xpath('//*[@id="card-category"]')[0]
    group.getparent().remove(group)
    return E.tostring(root, method='c14n')

def alpha(root, source, output):
    root = deepcopy(root)
    group = root.xpath('//*[@id="card-category"]')[0]
    assert group.getparent() is root
    for child in list(root):
        if E.QName(child).localname != 'defs' and child is not group:
            root.remove(child)
    E.ElementTree(root).write(str(source),encoding='UTF-8',xml_declaration=True)
    return render(source,output).getchannel('A')

def process(job):
    row,workdir = job
    work = Path(workdir)/row['id'];work.mkdir(parents=True,exist_ok=True)
    source = ROOT/row['native_source_path']
    assert sha(source)==row['native_source_sha256'],row['id']
    if row.get('category_label_revision',{}).get('revision')==REVISION:
        for e in row['exports']:
            assert sha(ROOT/e['path'])==e['after_sha256']
        return row['category_label_revision']
    if (work/'verification.json').exists():
        saved=json.loads((work/'verification.json').read_text())
        if saved['before_native_sha256']==sha(source) and sha(work/'after.svg')==saved['after_native_sha256']:
            for e in saved['exports']:
                assert sha(ROOT/e['path'])==e['before_sha256']
                assert sha(work/(e['field']+'.webp'))==e['after_sha256']
            return saved
    before=source.read_bytes();(work/'before.svg').write_bytes(before)
    old=E.fromstring(before);new=deepcopy(old)
    old_label=old.xpath('//*[@id="card-category"]')[0].get('aria-label')
    treatment=apply(new)
    assert treatment['label']==old_label.replace(' PERSONALITY','')
    assert unrelated(old)==unrelated(new)
    new_source=source.with_name('.'+source.stem+'-category-new.svg')
    alpha_source=source.with_name('.'+source.stem+'-category-alpha.svg')
    try:
        E.ElementTree(new).write(str(new_source),encoding='UTF-8',xml_declaration=True)
        new_hash=sha(new_source)
        second=deepcopy(new);apply(second)
        assert E.tostring(second)==E.tostring(new)
        old_image=render(source,work/'old-strip.png').convert('RGB')
        new_image=render(new_source,work/'new-strip.png').convert('RGB')
        old_alpha=alpha(old,alpha_source,work/'old-alpha.png')
        new_alpha=alpha(new,alpha_source,work/'new-alpha.png')
        measured=bounds(new_source)['card-category']
        assert abs(measured[0]+measured[2]/2-529.5)<.002
        assert abs(measured[1]+measured[3]/2-908.5)<.002
        result={'id':row['id'],'number':row['number'],'revision':REVISION,
                'native_source_path':row['native_source_path'],
                'before_native_sha256':sha(source),'after_native_sha256':new_hash,
                'before_label':old_label,'label':treatment['label'],'typography':treatment,
                'after_bounds':measured,'helper_idempotent':True,
                'unrelated_native_elements_unchanged':True,'exports':[]}
        for export in row['exports']:
            target=ROOT/export['path'];assert sha(target)==export['after_sha256']
            baseline=Image.open(target).convert('RGB');scale=baseline.width/1060
            assert scale in [1,2]
            size=(baseline.width,round(HEIGHT*scale));offset=round(Y*scale)
            old_i=old_image if scale==2 else old_image.resize(size,Image.Resampling.LANCZOS)
            new_i=new_image if scale==2 else new_image.resize(size,Image.Resampling.LANCZOS)
            alphas=[im if scale==2 else im.resize(size,Image.Resampling.LANCZOS) for im in [old_alpha,new_alpha]]
            footprint=np.asarray(Image.fromarray(np.maximum(*[np.asarray(im) for im in alphas])).filter(ImageFilter.MaxFilter(7)))>0
            a=np.asarray(old_i).astype(np.int16);b=np.asarray(new_i).astype(np.int16)
            affected=np.any(a!=b,axis=2)&footprint
            base=np.asarray(baseline).copy();strip=base[offset:offset+size[1]]
            residual=np.abs(strip.astype(np.int16)-a)
            max_old=int(residual[affected].max())
            assert max_old<=3,(row['id'],export['field'],max_old)
            corrected=np.clip(strip.astype(np.int16)+b-a,0,255).astype(np.uint8)
            patched=base.copy();patched[offset:offset+size[1]][affected]=corrected[affected]
            changed=np.any(base!=patched,axis=2)
            allowed=np.zeros(changed.shape,bool);allowed[offset:offset+size[1]]=footprint
            assert not np.any(changed&~allowed)
            ys,xs=np.where(changed);assert len(ys)>0
            staged=work/(export['field']+'.webp')
            Image.fromarray(patched).save(staged,'WEBP',lossless=True,method=4)
            assert np.array_equal(np.asarray(Image.open(staged).convert('RGB')),patched)
            (work/(export['field']+'-before.webp')).write_bytes(target.read_bytes())
            result['exports'].append({'field':export['field'],'path':export['path'],
                'size':list(baseline.size),'before_sha256':sha(target),'after_sha256':sha(staged),
                'changed_pixels':int(changed.sum()),
                'changed_pixel_bounds':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)],
                'pixels_changed_outside_category_ink_footprint':0,
                'old_render_max_channel_difference':max_old,'lossless_round_trip':True})
        (work/'after.svg').write_bytes(new_source.read_bytes())
        (work/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
        return result
    finally:
        new_source.unlink(missing_ok=True);alpha_source.unlink(missing_ok=True)

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('work',type=Path)
    p.add_argument('--limit',type=int);p.add_argument('--jobs',type=int,default=4)
    p.add_argument('--apply',action='store_true');args=p.parse_args()
    rows=targets();assert len({r['id'] for _,r in rows})==len(rows)
    if args.limit:rows=rows[:args.limit]
    if all(r.get('category_label_revision',{}).get('revision')==REVISION for _,r in rows):
        for _,r in rows:process((r,args.work.resolve()))
        if args.apply:update_wording_reviews([r['category_label_revision'] for _,r in rows])
        print(f'All {len(rows)} cards already current; all sources and exports byte-identical.');return
    with ProcessPoolExecutor(max_workers=args.jobs) as pool:
        results=[]
        for result in pool.map(process,[(r,args.work.resolve()) for _,r in rows]):
            results.append(result);print('Verified',result['id'],'both resolutions',flush=True)
    if not args.apply:return
    assert not args.limit,'Apply the complete reviewed set together'
    batches={f:json.loads(f.read_text()) for f,_ in rows}
    original=(ROOT/'public/cards/catalog.js').read_text();catalog=original
    for (f,_),check in zip(rows,results):
        row=next(r for r in batches[f] if r['id']==check['id']);work=args.work/row['id']
        check['audit_path']=str(f.relative_to(ROOT))
        (ROOT/row['native_source_path']).write_bytes((work/'after.svg').read_bytes())
        row['native_source_sha256']=check['after_native_sha256'];row['category_label_revision']=check
        row['native_geometry']['bounds']['card-category']=check['after_bounds']
        for export,verified in zip(row['exports'],check['exports']):
            assert export['path']==verified['path']
            (ROOT/export['path']).write_bytes((work/(export['field']+'.webp')).read_bytes())
            before=export['path'].removeprefix('public')+'?v='+export['after_sha256'][:12]
            after=export['path'].removeprefix('public')+'?v='+verified['after_sha256'][:12]
            assert catalog.count('"'+before+'"')==1
            catalog=catalog.replace('"'+before+'"','"'+after+'"')
            export['after_sha256']=verified['after_sha256']
    for f,data in batches.items():f.write_text(json.dumps(data,indent=2)+'\n')
    (ROOT/'public/cards/catalog.js').write_text(catalog)
    update_wording_reviews(results)
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'pixel-checks.json').write_text(json.dumps(results,indent=2)+'\n')
    (OUT/'release.json').write_text(json.dumps({'revision':REVISION,
        'baseline_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
        'cards':len(rows),'independently_verified_exports':2*len(rows),
        'pixels_changed_outside_category_ink_footprint':0,
        'unrelated_native_elements_unchanged':True,'helper_idempotent_all_cards':True},indent=2)+'\n')

if __name__=='__main__':main()
