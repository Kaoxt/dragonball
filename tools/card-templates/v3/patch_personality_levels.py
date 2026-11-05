"""Update only incorrect Personality Level ink, preserving both published resolutions."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

from lxml import etree as ET
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / 'scripts'))
from personality_levels import apply_level, validate_level

ROOT = HERE.parents[2]
CATALOG = ROOT / 'public/cards/catalog.js'
FOIL = ROOT / 'public/ultra-rare-profiles.js'
WORDING = ROOT / 'docs/card-type-audit-2026-10-25.json'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def render(source, png):
    subprocess.run(['inkscape', str(source), '--export-area=0:0:220:172',
                    '--export-width=440', '--export-background-opacity=0',
                    '--export-filename=' + str(png)], check=True, stdout=subprocess.DEVNULL)
    with Image.open(png) as image:
        return image.convert('RGB')


def repair_export(entry, before, after):
    path = ROOT / entry['path']
    before_hash = digest(path)
    assert before_hash == entry['after_sha256'], path
    original = Image.open(path).convert('RGB')
    scale = original.width // 1060
    assert scale in (1, 2) and original.size == (1060 * scale, 1484 * scale)
    region = (0, 0, 220 * scale, 172 * scale)
    a, b = [np.asarray(im.resize(region[2:], Image.Resampling.LANCZOS), dtype=np.int16)
            for im in (before, after)]
    changed = np.any(a != b, axis=2)
    ys, xs = np.where(changed)
    box = [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)]
    assert box[0] >= 40*scale and box[1] >= 10*scale and box[2] < 165*scale and box[3] < 132*scale
    actual = np.asarray(original.crop(region), dtype=np.int16)
    residual = int(np.abs(actual-a)[changed].max())
    assert residual <= 4, (path, residual)
    corrected = np.where(changed[:, :, None], np.clip(actual+b-a, 0, 255), actual).astype(np.uint8)
    pixels = np.array(original)
    pixels[:region[3], :region[2]] = corrected
    result = Image.fromarray(pixels)
    with TemporaryDirectory(dir=path.parent) as tmp:
        output = Path(tmp) / 'new.webp'
        result.save(output, format='WEBP', lossless=True, method=4)
        with Image.open(output) as decoded:
            assert np.array_equal(np.asarray(decoded.convert('RGB')), pixels), path
        assert int(np.any(pixels != np.asarray(original), axis=2).sum()) == int(changed.sum())
        output.replace(path)
    entry['after_sha256'] = digest(path)
    return dict(field=entry['field'], path=entry['path'], size=list(original.size),
                before_sha256=before_hash, after_sha256=entry['after_sha256'],
                changed_pixels=int(changed.sum()), changed_pixel_bounds=box,
                old_render_max_channel_difference=residual, pixels_changed_outside_level_ink=0,
                lossless_round_trip=True)


def repair(row, root, level):
    source = ROOT / row['native_source_path']
    original = digest(source)
    assert original == row['native_source_sha256'], source
    apply_level(root, level)
    validate_level(root)
    with TemporaryDirectory(dir=source.parent) as tmp:
        tmp = Path(tmp)
        # Keep the two source files in the same directory so their relative assets resolve.
        new = source.with_name('.' + source.stem + '-level-repair.svg')
        try:
            new.write_bytes(ET.tostring(root, xml_declaration=True, encoding='utf-8'))
            a, b = render(source, tmp/'old.png'), render(new, tmp/'new.png')
            exports = [repair_export(e, a, b) for e in row['exports']]
            values = subprocess.check_output(['inkscape', str(new), '--query-id=v3-level-number',
                '--query-x', '--query-y', '--query-width', '--query-height'], text=True)
            bounds = [float(n) for n in values.split()]
            assert len(bounds) == 4
            row['native_geometry']['bounds']['v3-level-number'] = bounds
            new.replace(source)
        finally:
            new.unlink(missing_ok=True)
    row['native_source_sha256'] = digest(source)
    row['level_numeral_revision'] = dict(before_native_sha256=original,
            after_native_sha256=row['native_source_sha256'], exports=exports)
    return exports


def main():
    catalog = CATALOG.read_text()
    cards = {c['id']: c for c in json.loads(catalog.split('=',1)[1].strip().removesuffix(';'))
             if 'Personality' in c['type'] and c.get('templateVersion') == 3}
    foil = FOIL.read_text()
    wording = json.loads(WORDING.read_text())
    wording_rows = {r['id']: r for r in wording['missing_rules_image_reviewed']}
    reviewed, repaired = set(), []
    for path in sorted((ROOT/'tools/card-corrections').glob('v3-*/audit.json')):
        rows = json.loads(path.read_text())
        if not isinstance(rows,list):
            continue
        dirty = False
        records = {r.get('id'):r for r in json.loads(path.with_name('cards.json').read_text())} if path.with_name('cards.json').exists() and any(isinstance(r,dict) and r.get('native_source_path') and r.get('id') in cards for r in rows) else {}
        for row in rows:
            if not isinstance(row,dict) or not row.get('native_source_path') or row.get('id') not in cards:
                continue
            ident = row['id']
            assert ident not in reviewed
            reviewed.add(ident)
            card, record = cards[ident], records[ident]
            source = ROOT / row['native_source_path']
            root = ET.parse(str(source)).getroot()
            for element, value in [('card-number',card['number']),('v3-level-number',record['level']),
                                   ('v3-level-number-soft-shadow',record['level']),('concept-pur-number',record['pur'])]:
                assert root.xpath('//*[@id=$i]/@aria-label', i=element) == [str(value)], (ident, element)
            assert str(row['number']).upper() == str(record['number']).upper() == str(card['number']).upper()
            try:
                validate_level(root)
            except ValueError:
                assert 'level_numeral_revision' not in row, ident
                exports = repair(row, root, record['level'])
                for e in exports:
                    prefix = e['path'].removeprefix('public')+'?v='
                    old, new = [prefix+e[k][:12] for k in ('before_sha256','after_sha256')]
                    assert card[e['field']] == old and catalog.count('"'+old+'"') == 1
                    catalog = catalog.replace('"'+old+'"','"'+new+'"')
                    foil = foil.replace('"'+old+'"','"'+new+'"')
                    if e['field']=='image' and ident in wording_rows:
                        assert wording_rows[ident]['image'] == old
                        wording_rows[ident]['image'] = new
                repaired.append(ident)
                dirty = True
                print('Verified both exports:', ident, flush=True)
            else:
                rev = row.get('level_numeral_revision')
                if rev:
                    assert digest(source) == rev['after_native_sha256']
                    for e in rev['exports']:
                        assert digest(ROOT/e['path']) == e['after_sha256']
        if dirty:
            save(path,rows)
    assert reviewed == set(cards)
    if repaired:
        CATALOG.write_text(catalog)
        FOIL.write_text(foil)
        save(WORDING,wording)
    print(f'Checked {len(reviewed)} Personality cards. Repaired {len(repaired)}.')
    return repaired


if __name__ == '__main__':
    os.environ.setdefault('OMP_NUM_THREADS','1')
    main()
