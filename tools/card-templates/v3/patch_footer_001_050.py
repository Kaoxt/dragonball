"""Patch only moved footer ink in each published resolution; never rerender a card."""
from pathlib import Path
from lxml import etree as E
from PIL import Image, ImageFilter
from concurrent.futures import ProcessPoolExecutor
import copy, hashlib, json, subprocess, sys
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE / 'scripts'))
import footer_spacing
WORK = Path(sys.argv[1]).resolve()
WORK.mkdir(parents=True, exist_ok=True)
AUDIT_PATH = ROOT / 'tools/card-corrections/v3-saiyan-001-050/audit.json'
OUT = ROOT / 'tools/card-corrections/v3-saiyan-001-050-footer-centering'
Y = 1340
IDS = ['saga-emblem', 'footer-rarity', 'card-number']


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def render(source, output, alpha=False):
    subprocess.run(['inkscape', str(source), '--export-area=0:1340:1060:1484',
                    '--export-width=2120', '--export-background-opacity=0',
                    '--export-filename=' + str(output)], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return Image.open(output).convert('RGBA' if alpha else 'RGB')


def normalized(tree):
    root = copy.deepcopy(tree.getroot())
    for key in list(root.attrib):
        if key.startswith('data-footer-'):
            del root.attrib[key]
    for id in IDS:
        el = root.xpath('//*[@id=$id]', id=id)[0]
        for key in ['transform', 'data-visible-center']:
            el.attrib.pop(key, None)
    return E.tostring(root, method='c14n')


def alpha_render(tree, source, output, moved):
    root = copy.deepcopy(tree.getroot())
    for child in list(root):
        if E.QName(child).localname != 'defs' and child.get('id') not in moved:
            root.remove(child)
    E.ElementTree(root).write(str(source), encoding='utf-8', xml_declaration=True)
    return render(source, output, True).getchannel('A')


def process(row):
    source = ROOT / row['native_source_path']
    assert sha(source) == row['native_source_sha256']
    work = WORK / row['id']; work.mkdir(exist_ok=True)
    before = source.read_bytes(); (work/'before.svg').write_bytes(before)
    old_tree = E.fromstring(before).getroottree()
    new_source = source.with_name('.' + source.stem + '-footer-new.svg')
    alpha_source = source.with_name('.' + source.stem + '-footer-alpha.svg')
    try:
        old_image = render(source, work/'before-footer.png')
        treatment = footer_spacing.change(source, new_source)
        new_hash = sha(new_source)
        second = footer_spacing.change(new_source)
        assert not second['changed'] and sha(new_source) == new_hash
        new_tree = E.parse(str(new_source))
        assert normalized(old_tree) == normalized(new_tree)
        moved = ['footer-rarity', 'card-number']
        if treatment['logo_dx']:
            moved.append('saga-emblem')
        old_alpha = alpha_render(old_tree, alpha_source, work/'before-alpha.png', moved)
        new_alpha = alpha_render(new_tree, alpha_source, work/'after-alpha.png', moved)
        new_image = render(new_source, work/'after-footer.png')
        b = footer_spacing.bounds(new_source)
        ball, num, logo = (b[id] for id in ['footer-rarity', 'card-number', 'saga-emblem'])
        group_center = (min(ball[0], num[0]) + max(ball[0]+ball[2], num[0]+num[2])) / 2
        assert abs(group_center - 847.25) <= .002
        assert abs(logo[0] + logo[2]/2 - 211.75) <= .002
        for id in IDS:
            old = row['native_geometry']['bounds'][id]
            assert abs(b[id][1]-old[1]) <= .002 and abs(b[id][2]-old[2]) <= .002 and abs(b[id][3]-old[3]) <= .002
        result = {'id': row['id'], 'number': row['number'], 'before_native_sha256': sha(source),
                  'after_native_sha256': new_hash, 'native_source_path': row['native_source_path'],
                  'treatment': treatment, 'helper_idempotent': True,
                  'unrelated_native_elements_unchanged': True, 'right_group_center_x': group_center,
                  'saga_center_x': logo[0]+logo[2]/2, 'after_bounds': {id:b[id] for id in IDS}, 'exports': []}
        outputs = []
        for export in row['exports']:
            target = ROOT / export['path']
            assert sha(target) == export['after_sha256']
            baseline = Image.open(target).convert('RGB')
            scale = baseline.width / 1060
            assert scale in [1, 2]
            size = (baseline.width, round(144*scale)); offset = round(Y*scale)
            old = old_image if scale == 2 else old_image.resize(size, Image.Resampling.LANCZOS)
            new = new_image if scale == 2 else new_image.resize(size, Image.Resampling.LANCZOS)
            # Include the entire antialias/lanczos footprint, but copy only actual moved-ink differences.
            alphas = [im if scale == 2 else im.resize(size, Image.Resampling.LANCZOS) for im in [old_alpha, new_alpha]]
            mask_img = Image.fromarray(np.maximum(*[np.asarray(im) for im in alphas])).filter(ImageFilter.MaxFilter(7))
            footprint = np.asarray(mask_img) > 0
            old_a = np.asarray(old).astype(np.int16); new_a = np.asarray(new).astype(np.int16)
            affected = np.any(old_a != new_a, axis=2) & footprint
            base = np.asarray(baseline).copy(); patch = base[offset:offset+size[1]]
            old_difference = np.abs(patch.astype(np.int16) - old_a)
            max_old = int(old_difference[affected].max()) if affected.any() else 0
            assert max_old <= 3, (row['id'], export['field'], max_old)
            # Retain the existing export's tiny renderer-rounding residuals.
            corrected = np.clip(patch.astype(np.int16) + new_a - old_a, 0, 255).astype(np.uint8)
            patched = base.copy(); patched_strip = patched[offset:offset+size[1]]
            patched_strip[affected] = corrected[affected]
            difference = np.any(base != patched, axis=2)
            allowed = np.zeros(difference.shape, bool); allowed[offset:offset+size[1]] = footprint
            assert not np.any(difference & ~allowed)
            assert not np.any(difference[:offset])
            ys, xs = np.where(difference)
            staged = work / (export['field'] + '.webp')
            Image.fromarray(patched).save(staged, 'WEBP', lossless=True, method=4)
            assert np.array_equal(np.asarray(Image.open(staged).convert('RGB')), patched)
            (work/(export['field']+'-before.webp')).write_bytes(target.read_bytes())
            report = {'field': export['field'], 'path': export['path'], 'size': list(baseline.size),
                      'before_sha256': export['after_sha256'], 'after_sha256': sha(staged),
                      'changed_pixels': int(difference.sum()),
                      'changed_pixel_bounds': [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)],
                      'pixels_changed_outside_footer_ink_footprint': 0,
                      'pixels_changed_above_footer': 0, 'old_render_max_channel_difference': max_old,
                      'lossless_round_trip': True}
            result['exports'].append(report); outputs.append((staged,target))
        # Both resolutions must pass before this card's actual files are replaced.
        source.write_bytes(new_source.read_bytes())
        for staged, target in outputs:
            target.write_bytes(staged.read_bytes())
        (work/'verification.json').write_text(json.dumps(result, indent=2)+'\n')
        return result
    finally:
        new_source.unlink(missing_ok=True); alpha_source.unlink(missing_ok=True)


if __name__ == '__main__':
    audit = json.loads(AUDIT_PATH.read_text())
    if all(row.get('footer_spacing_revision', {}).get('treatment', {}).get('revision') == footer_spacing.REVISION for row in audit):
        for row in audit:
            assert sha(ROOT/row['native_source_path']) == row['native_source_sha256']
            for export in row['exports']:
                assert sha(ROOT/export['path']) == export['after_sha256']
        print('All 50 cards already have this footer revision; sources and exports unchanged.')
        raise SystemExit(0)
    original_catalog = (ROOT/'public/cards/catalog.js').read_text()
    before_commit = subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()
    with ProcessPoolExecutor(max_workers=4) as pool:
        results = []
        for result in pool.map(process, audit):
            results.append(result); print('Verified', result['number'], 'both resolutions', flush=True)
    assert len(results) == 50
    catalog = original_catalog
    for row, result in zip(audit, results):
        row['native_source_sha256'] = result['after_native_sha256']
        row['footer_spacing_revision'] = result
        row['native_geometry']['bounds'].update(result['after_bounds'])
        for export, check in zip(row['exports'], result['exports']):
            old_url = export['path'].removeprefix('public') + '?v=' + export['after_sha256'][:12]
            new_url = export['path'].removeprefix('public') + '?v=' + check['after_sha256'][:12]
            assert catalog.count('"'+old_url+'"') == 1
            catalog = catalog.replace('"'+old_url+'"', '"'+new_url+'"')
            export['after_sha256'] = check['after_sha256']
    OUT.mkdir(parents=True, exist_ok=True)
    AUDIT_PATH.write_text(json.dumps(audit, indent=2)+'\n')
    (ROOT/'public/cards/catalog.js').write_text(catalog)
    (OUT/'pixel-checks.json').write_text(json.dumps(results, indent=2)+'\n')
    (OUT/'release.json').write_text(json.dumps({'baseline_commit': before_commit,
        'scope': 'Saiyan Saga 001–050 only', 'cards': 50, 'independently_verified_exports': 100,
        'revision': footer_spacing.REVISION, 'saga_center_x': 211.75, 'right_group_center_x': 847.25,
        'pixels_changed_outside_footer_ink_footprint': 0, 'native_helper_idempotent_all_cards': True,
        'artwork_and_all_unrelated_pixels_preserved': True}, indent=2)+'\n')
