"""Correct every Namekian symbol with reversible native and lossless pixel edits."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
from hashlib import sha256
from lxml import etree as E
from PIL import Image
import argparse, json, os, shutil, subprocess
import numpy as np
from scripts.namekian_symbol import change, REVISION, ASSET

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT/'tools/card-corrections/v3-namekian-reference-symbols'
ROI = (0, 650, 360, 1050)

def digest(p): return sha256(Path(p).read_bytes()).hexdigest()
def save(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
def catalog():
    return json.loads((ROOT/'public/cards/catalog.js').read_text().split('=',1)[1].strip().removesuffix(';'))
def sources(cards):
    result = {}
    for p in (ROOT/'tools/card-corrections').glob('v3-*/audit.json'):
        rows = json.loads(p.read_text())
        if not isinstance(rows,list): continue
        for row in rows:
            if isinstance(row,dict) and row.get('id') in cards and row.get('native_source_path'):
                assert row['id'] not in result
                result[row['id']] = row['native_source_path']
    assert set(result) == set(cards)
    return result
def render(raw, source, work, name):
    root = E.fromstring(raw.encode())
    for e in root.xpath('//*[local-name()="image"]'):
        key = '{http://www.w3.org/1999/xlink}href' if e.get('{http://www.w3.org/1999/xlink}href') else 'href'
        ref = e.get(key)
        if ref and not ref.startswith(('data:','#')):
            p = (source.parent/ref).resolve()
            assert p.exists(), p
            e.set(key,str(p))
    svg, png = work/(name+'.svg'), work/(name+'.png')
    svg.write_bytes(E.tostring(root))
    subprocess.run(['inkscape',str(svg),'--export-area='+':'.join(map(str,ROI)),
        '--export-width='+str((ROI[2]-ROI[0])*2),'--export-filename='+str(png)],
        check=True, capture_output=True, timeout=180,
        env={**os.environ,'OMP_NUM_THREADS':'1','INKSCAPE_PROFILE_DIR':str(work/'inkscape-profile')})
    return Image.open(png).convert('RGB')
def process(task):
    card, path, work = task
    source = ROOT/path
    work = Path(work)/card['id']; work.mkdir(parents=True,exist_ok=True)
    old = source.read_text(); new, edits = change(old)
    assert len(edits) in (1,2)
    (work/'before-source.svg').write_text(old)
    (work/'after-source.svg').write_text(new)
    a,b = [render(raw,source,work,name) for raw,name in [(old,'before'),(new,'after')]]
    context = Image.open(ROOT/('public'+card['downloadImage'].split('?')[0])).convert('RGB')
    exports = []
    for field in ['image','downloadImage']:
        path = 'public'+card[field].split('?')[0]
        target = ROOT/path
        before = Image.open(target).convert('RGB');scale = before.width//1060
        assert scale in (1,2) and before.size == (1060*scale,1484*scale)
        box = tuple(v*scale for v in ROI)
        rendered = []
        for im in (a,b):
            if scale == 1:
                full = context.copy();full.paste(im,(ROI[0]*2,ROI[1]*2))
                im = full.resize(before.size,Image.Resampling.LANCZOS).crop(box)
            rendered.append(np.array(im,dtype=np.int16))
        oa,na = rendered
        affected = np.any(oa!=na,axis=2)
        assert not affected[:8].any() and not affected[-8:].any() and not affected[:,-8:].any()
        actual = np.array(before.crop(box),dtype=np.int16)
        residual = int(np.abs(actual-oa)[affected].max())
        p99 = float(np.percentile(np.abs(actual-oa)[affected],99))
        assert residual <= 4, (card['id'],field,'Native baseline mismatch',residual,p99)
        patch = actual.copy();patch[affected] = np.clip(actual[affected]+na[affected]-oa[affected],0,255)
        pixels = np.array(before);pixels[box[1]:box[3],box[0]:box[2]] = patch.astype(np.uint8)
        allowed = np.zeros(pixels.shape[:2],dtype=bool);allowed[box[1]:box[3],box[0]:box[2]] = affected
        changed = np.any(pixels!=np.array(before),axis=2)
        assert not np.any(changed & ~allowed)
        staged = work/(field+'.webp')
        Image.fromarray(pixels).save(staged,format='WEBP',lossless=True,method=4,exact=True)
        assert np.array_equal(np.array(Image.open(staged).convert('RGB')),pixels)
        ys,xs = np.where(changed)
        exports.append({'field':field,'path':path,'before_sha256':digest(target),'after_sha256':digest(staged),
            'size':list(before.size),'changed_pixels':int(changed.sum()),
            'changed_bounds':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)],
            'pixels_changed_outside_symbol_delta':0,'old_native_max_channel_error':residual,
            'old_native_p99_channel_error':p99,'lossless_round_trip':True})
    row = {'id':card['id'],'set':card['set'],'type':card['type'],
        'source':{'path':str(source.relative_to(ROOT)),'before_sha256':digest(source),
            'after_sha256':digest(work/'after-source.svg'),'reversible_edits':edits},
        'exports':exports,'helper_idempotent':True}
    save(work/'verification.json',row)
    return row
def verify(release):
    cards = {c['id']:c for c in catalog() if c.get('style')=='Namekian'}
    assert set(cards) == {r['id'] for r in release['cards']}
    for r in release['cards']:
        for e in [r['source'],*r['exports']]: assert digest(ROOT/e['path']) == e['after_sha256'], e['path']
        assert change((ROOT/r['source']['path']).read_text())[1] == []
        for e in r['exports']:
            assert cards[r['id']][e['field']] == e['path'].removeprefix('public')+'?v='+e['after_sha256'][:12]
    print(f'Verified {len(cards)} corrected Namekian cards and {len(cards)*2} exports; unchanged on repeat.',flush=True)
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('work',type=Path);p.add_argument('--ids',nargs='*');p.add_argument('--workers',type=int,default=4);p.add_argument('--apply',action='store_true');p.add_argument('--assemble',action='store_true');args=p.parse_args()
    if (OUT/'release.json').exists(): return verify(json.loads((OUT/'release.json').read_text()))
    all_cards = {c['id']:c for c in catalog() if c.get('style')=='Namekian'}
    paths = sources(all_cards);cards = [c for c in all_cards.values() if not args.ids or c['id'] in args.ids]
    work = args.work.resolve();work.mkdir(parents=True,exist_ok=True)
    if args.assemble:
        rows=[json.loads((work/c['id']/'verification.json').read_text()) for c in cards]
    else:
        rows=[]
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            jobs=[pool.submit(process,(c,paths[c['id']],str(work))) for c in cards]
            for f in as_completed(jobs):
                row=f.result();rows.append(row);print(f'Verified {len(rows)}/{len(cards)}: '+row['id'],flush=True)
    rows.sort(key=lambda r:r['id'])
    if not args.apply: return
    assert not args.ids and len(rows)==len(all_cards)==59
    raw=(ROOT/'public/cards/catalog.js').read_text()
    for row in rows:
        for e in [row['source'],*row['exports']]:assert digest(ROOT/e['path'])==e['before_sha256']
        for e in row['exports']:
            staged=work/row['id']/(e['field']+'.webp');assert digest(staged)==e['after_sha256']
            old=e['path'].removeprefix('public')+'?v='+e['before_sha256'][:12]
            new=e['path'].removeprefix('public')+'?v='+e['after_sha256'][:12]
            assert raw.count(old)==1;raw=raw.replace(old,new)
        assert digest(work/row['id']/'after-source.svg')==row['source']['after_sha256']
    for row in rows:
        shutil.copyfile(work/row['id']/'after-source.svg',ROOT/row['source']['path'])
        for e in row['exports']:shutil.copyfile(work/row['id']/(e['field']+'.webp'),ROOT/e['path'])
    (ROOT/'public/cards/catalog.js').write_text(raw)
    release={'revision':REVISION,'source_base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
        'corrected_card_count':len(rows),'export_count':len(rows)*2,'glyph_before':'龍','glyph_after':'瑪',
        'symbol_asset':str(ASSET.relative_to(ROOT)),'symbol_asset_sha256':digest(ASSET),
        'historical_audits_preserved':True,'all_unrelated_pixels_unchanged':True,'cards':rows}
    save(OUT/'release.json',release);verify(release)
if __name__=='__main__':
    os.environ.setdefault('OMP_NUM_THREADS','1');main()
