"""Patch each published Villain export independently, preserving unrelated pixels."""
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ProcessPoolExecutor
from lxml import etree as E
from PIL import Image, ImageFilter
import argparse, hashlib, json, subprocess, sys
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE / 'scripts'))
import personality_corners_v3 as corners
P = argparse.ArgumentParser(description=__doc__)
P.add_argument('work', type=Path)
args = P.parse_args()
WORK = args.work.resolve()
WORK.mkdir(parents=True, exist_ok=True)
OUT = ROOT / 'tools/card-corrections/v3-villain-red-corners'
Y, HEIGHT = 956, 390


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def render(source, target, alpha=False):
    subprocess.run(['inkscape', str(source), '--export-area=0:956:1060:1346',
                    '--export-width=2120', '--export-background-opacity=0',
                    '--export-filename=' + str(target)], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return Image.open(target).convert('RGBA' if alpha else 'RGB')


def normalized(tree):
    root = deepcopy(tree.getroot())
    panel = root.xpath('//*[@id="shared-rules-component"]')[0]
    for attr, (blue, red) in corners.COLORS.items():
        for el in panel.xpath('.//*[@' + attr + '=$color]', color=red):
            el.set(attr, blue)
    return E.tostring(root, method='c14n')


def corner_alpha(tree, source, target):
    root = deepcopy(tree.getroot())
    for child in list(root):
        if E.QName(child).localname != 'defs' and child.get('id') != 'shared-rules-component':
            root.remove(child)
    panel = root.xpath('//*[@id="shared-rules-component"]')[0]
    selected = set()
    for attr, pair in corners.COLORS.items():
        selected.update(panel.xpath('.//*[@' + attr + '=$a or @' + attr + '=$b]', a=pair[0], b=pair[1]))
    keep = {panel}
    for el in selected:
        keep.add(el)
        keep.update(el.iterancestors())
    for el in list(panel.iter())[::-1]:
        if el not in keep:
            el.getparent().remove(el)
    E.ElementTree(root).write(str(source), encoding='utf-8', xml_declaration=True)
    return render(source, target, True).getchannel('A')


def process(item):
    audit_path, row = item
    source = ROOT / row['native_source_path']
    assert sha(source) == row['native_source_sha256']
    work = WORK / row['id']
    work.mkdir(exist_ok=True)
    before = source.read_bytes()
    (work / 'before.svg').write_bytes(before)
    old_tree = E.fromstring(before).getroottree()
    new_tree = E.fromstring(before).getroottree()
    treatment = corners.apply(new_tree.getroot())
    assert treatment['applies'] and treatment['changed']
    assert normalized(old_tree) == normalized(new_tree)
    native_after = E.tostring(new_tree, encoding='utf-8', xml_declaration=True)
    assert not corners.apply(new_tree.getroot())['changed']
    assert E.tostring(new_tree, encoding='utf-8', xml_declaration=True) == native_after
    new_source = source.with_name('.' + source.stem + '-corners-new.svg')
    alpha_source = source.with_name('.' + source.stem + '-corners-alpha.svg')
    try:
        new_source.write_bytes(native_after)
        old = render(source, work / 'before-panel.png')
        new = render(new_source, work / 'after-panel.png')
        alpha = corner_alpha(old_tree, alpha_source, work / 'corner-alpha.png')
        result = {'id': row['id'], 'number': row['number'], 'audit_path': audit_path,
                  'native_source_path': row['native_source_path'],
                  'before_native_sha256': sha(source), 'after_native_sha256': sha(new_source),
                  'treatment': treatment, 'helper_idempotent': True,
                  'unrelated_native_elements_unchanged': True,
                  'all_text_and_artwork_unchanged': True, 'exports': []}
        outputs = []
        for export in row['exports']:
            target = ROOT / export['path']
            assert sha(target) == export['after_sha256']
            base_image = Image.open(target).convert('RGB')
            scale = base_image.width / 1060
            assert scale in [1, 2]
            size = (base_image.width, round(HEIGHT * scale))
            offset = round(Y * scale)
            before_render, after_render = [im if scale == 2 else im.resize(size, Image.Resampling.LANCZOS) for im in [old, new]]
            mask = alpha if scale == 2 else alpha.resize(size, Image.Resampling.LANCZOS)
            footprint = np.asarray(mask.filter(ImageFilter.MaxFilter(7))) > 0
            a, b = [np.asarray(im).astype(np.int16) for im in [before_render, after_render]]
            affected = np.any(a != b, axis=2)
            assert not np.any(affected & ~footprint)
            base = np.asarray(base_image).copy()
            strip = base[offset:offset + size[1]]
            max_old = int(np.abs(strip.astype(np.int16) - a)[affected].max())
            assert max_old <= 3, (row['id'], export['field'], max_old)
            corrected = np.clip(strip.astype(np.int16) + b - a, 0, 255).astype(np.uint8)
            patched = base.copy()
            patched[offset:offset + size[1]][affected] = corrected[affected]
            diff = np.any(base != patched, axis=2)
            allowed = np.zeros(diff.shape, bool)
            allowed[offset:offset + size[1]] = footprint
            assert diff.any() and not np.any(diff & ~allowed)
            ys, xs = np.where(diff)
            staged = work / (export['field'] + '.webp')
            Image.fromarray(patched).save(staged, 'WEBP', lossless=True, method=4)
            assert np.array_equal(np.asarray(Image.open(staged).convert('RGB')), patched)
            (work / (export['field'] + '-before.webp')).write_bytes(target.read_bytes())
            result['exports'].append({'field': export['field'], 'path': export['path'],
                'size': list(base_image.size), 'before_sha256': export['after_sha256'],
                'after_sha256': sha(staged), 'changed_pixels': int(diff.sum()),
                'changed_pixel_bounds': [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)],
                'pixels_changed_outside_corner_footprint': 0,
                'old_render_max_channel_difference': max_old, 'lossless_round_trip': True})
            outputs.append((staged, target))
        source.write_bytes(native_after)
        for staged, target in outputs:
            target.write_bytes(staged.read_bytes())
        (work / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
        return result
    finally:
        new_source.unlink(missing_ok=True)
        alpha_source.unlink(missing_ok=True)


if __name__ == '__main__':
    audits, items = {}, []
    for path in sorted((ROOT / 'tools/card-corrections').glob('v3-*/audit.json')):
        rows = json.loads(path.read_text())
        if not isinstance(rows, list):
            continue
        rel = str(path.relative_to(ROOT))
        audits[rel] = rows
        for row in rows:
            source = row.get('native_source_path')
            if not source:
                continue
            root = E.parse(str(ROOT / source)).getroot()
            if root.xpath('//*[@id="card-category" and @aria-label="VILLAIN PERSONALITY"]'):
                items.append((rel, row))
    assert len(items) == 24 and len({r['id'] for _, r in items}) == 24
    if all(r.get('villain_corner_revision') for _, r in items):
        for _, row in items:
            assert sha(ROOT / row['native_source_path']) == row['native_source_sha256']
            for export in row['exports']:
                assert sha(ROOT / export['path']) == export['after_sha256']
        print('All 24 Villains already current; sources and exports unchanged.')
        raise SystemExit(0)
    baseline = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    with ProcessPoolExecutor(max_workers=4) as pool:
        results = []
        for result in pool.map(process, items):
            results.append(result)
            print('Verified', result['id'], 'both resolutions', flush=True)
    catalog_path = ROOT / 'public/cards/catalog.js'
    catalog = catalog_path.read_text()
    for result in results:
        row = next(r for r in audits[result['audit_path']] if r['id'] == result['id'])
        row['native_source_sha256'] = result['after_native_sha256']
        row['villain_corner_revision'] = result
        for export, check in zip(row['exports'], result['exports']):
            url = export['path'].removeprefix('public') + '?v='
            old, new = url + export['after_sha256'][:12], url + check['after_sha256'][:12]
            assert catalog.count('"' + old + '"') == 1
            catalog = catalog.replace('"' + old + '"', '"' + new + '"')
            export['after_sha256'] = check['after_sha256']
    for audit_path in {r['audit_path'] for r in results}:
        (ROOT / audit_path).write_text(json.dumps(audits[audit_path], indent=2) + '\n')
    catalog_path.write_text(catalog)
    OUT.mkdir(exist_ok=True)
    (OUT / 'pixel-checks.json').write_text(json.dumps(results, indent=2) + '\n')
    (OUT / 'release.json').write_text(json.dumps({'baseline_commit': baseline,
        'revision': corners.REVISION, 'cards': 24, 'independently_verified_exports': 48,
        'pixels_changed_outside_corner_footprint': 0,
        'all_text_and_artwork_unchanged': True, 'native_helper_idempotent_all_cards': True}, indent=2) + '\n')
