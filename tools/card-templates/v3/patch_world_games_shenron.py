"""Apply the approved World Games Shenron without changing native card UI."""
from copy import deepcopy
from pathlib import Path
import hashlib
import io
import json
import subprocess
import sys

from lxml import etree as E
from PIL import Image
import numpy as np

P = Path(__file__).resolve().parent
ROOT = P.parents[2]
sys.path.insert(0, str(P / 'scripts'))
from world_games_dragon_ball import ASSET

EVID = ROOT / 'tools/card-corrections/v3-world-games-shenron'
WORK = ROOT.parent / 'shenron-update-work'
XLINK = '{http://www.w3.org/1999/xlink}href'
hash_bytes = lambda b: hashlib.sha256(b).hexdigest()
digest = lambda p: hash_bytes(p.read_bytes())


def render(data, name):
    """Resolve portable image references without modifying the stored source."""
    root = E.fromstring(data)
    for im in root.xpath('//*[local-name()="image"]'):
        ref = im.get(XLINK) or im.get('href')
        if not ref.startswith('data:'):
            target = (P / 'world-games-001-050' / ref).resolve()
            assert target.is_file(), target
            im.set(XLINK, str(target))
    src = WORK / (name + '.svg')
    src.write_bytes(E.tostring(root))
    proc = subprocess.run(['inkscape', str(src), '--export-type=png',
                           '--export-filename=-', '--export-width=2120'],
                          check=True, capture_output=True)
    im = Image.open(io.BytesIO(proc.stdout)).convert('RGBA')
    assert im.size == (2120, 2968)
    im.save(WORK / (name + '.png'))
    return im


def main():
    EVID.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    release_path = EVID / 'release.json'
    if release_path.exists():
        release = json.loads(release_path.read_text())
        for row in release['cards']:
            for entry in [row['source'], *row['exports']]:
                assert digest(ROOT / entry['path']) == entry['after_sha256'], entry['path']
        assert digest(ASSET) == release['artwork']['sha256']
        print('Current approved Shenron source and both exports verified; no changes.')
        return
    catalog_path = ROOT / 'public/cards/catalog.js'
    catalog_before = catalog_path.read_bytes()
    catalog = json.loads(catalog_before.decode().split('=', 1)[1].strip().removesuffix(';'))
    selected = [c for c in catalog if c['set'] == 'World Games Saga' and c['type'] == 'Dragon Ball']
    assert selected and all(c['name'].startswith('Earth Dragon Ball ') for c in selected)
    rows = []
    for card in selected:
        source = P / 'world-games-001-050' / (card['id'] + '.svg')
        before = source.read_bytes()
        tree = E.fromstring(before)
        layer, = tree.xpath('//*[@id="retained-shenron-full-art"]')
        old_ref = layer.get(XLINK)
        new_ref = '../assets/' + ASSET.name
        assert before.count(old_ref.encode()) == 1
        after = before.replace(old_ref.encode(), new_ref.encode())
        assert after.replace(new_ref.encode(), old_ref.encode()) == before
        old = render(before, 'before').convert('RGB')
        new = render(after, 'after').convert('RGB')
        # A transparent render of the unchanged UI independently marks pixels
        # which are fully covered by title, lettering, panels, orb or footer.
        overlay = deepcopy(tree)
        bg, = overlay.xpath('//*[@id="background-brightness-trial-wrapper"]')
        bg.getparent().remove(bg)
        ui = render(E.tostring(overlay), 'protected-ui')
        exports = []
        for field, size in [('image', (1060, 1484)), ('downloadImage', (2120, 2968))]:
            path = ROOT / ('public' + card[field].split('?')[0])
            baseline_bytes = path.read_bytes()
            baseline = np.asarray(Image.open(path).convert('RGB')).copy()
            old_a = np.asarray(old.resize(size, Image.Resampling.LANCZOS))
            new_a = np.asarray(new.resize(size, Image.Resampling.LANCZOS))
            native_delta = np.any(old_a != new_a, axis=2)
            opaque = np.asarray(ui.resize(size, Image.Resampling.LANCZOS))[:, :, 3] == 255
            # Keep already-published opaque UI pixels verbatim. Renderer and
            # resampling precision can otherwise change a few orb/text pixels.
            delta = native_delta & ~opaque
            out = baseline.copy()
            out[delta] = new_a[delta]
            protected_changes = int(np.count_nonzero(np.any(out != baseline, axis=2) & opaque))
            assert protected_changes == 0, (field, protected_changes)
            assert not np.any(out[~delta] != baseline[~delta])
            Image.fromarray(out).save(path, format='WEBP', lossless=True, method=6)
            assert np.array_equal(np.asarray(Image.open(path).convert('RGB')), out)
            Image.fromarray(out).save(WORK / (field + '.png'))
            checksum = digest(path)
            exports.append({'field': field, 'path': str(path.relative_to(ROOT)),
                'before_sha256': hash_bytes(baseline_bytes), 'after_sha256': checksum,
                'size': list(size), 'lossless_round_trip': True,
                'baseline_render_mismatched_pixels': int(np.count_nonzero(np.any(old_a != baseline, axis=2))),
                'changed_pixels': int(np.count_nonzero(delta)),
                'opaque_ui_rounding_pixels_retained': int(np.count_nonzero(native_delta & opaque)),
                'pixels_changed_outside_artwork_delta': 0,
                'opaque_ui_pixels_checked': int(np.count_nonzero(opaque)),
                'pixels_changed_in_opaque_ui': protected_changes})
            card[field] = '/' + str(path.relative_to(ROOT / 'public')) + '?v=' + checksum[:12]
        source.write_bytes(after)
        rows.append({'id': card['id'], 'number': int(card['number']), 'name': card['name'],
            'source': {'path': str(source.relative_to(ROOT)), 'before_sha256': hash_bytes(before),
                'after_sha256': hash_bytes(after), 'reversible_edits': [{'before': old_ref, 'after': new_ref}]},
            'exports': exports, 'native_change': 'Only the Shenron image href; all other native bytes unchanged.'})
    catalog_path.write_text('export const catalog = ' + json.dumps(catalog, indent=2, ensure_ascii=False) + ';\n')
    # Require a byte-local cache-key update rather than catalog reformatting.
    expected_catalog = catalog_before
    for row in rows:
        for ex in row['exports']:
            expected_catalog = expected_catalog.replace(ex['before_sha256'][:12].encode(), ex['after_sha256'][:12].encode())
    assert catalog_path.read_bytes() == expected_catalog
    release = {'schema': 1, 'date': '2026-11-11', 'set': 'World Games Saga',
        'scope': 'All currently prepared World Games Dragon Balls; this set-specific artwork is the default for future Earth Dragon Balls.',
        'artwork': {'path': str(ASSET.relative_to(ROOT)), 'sha256': digest(ASSET),
            'size': [1060, 1484], 'approved_reference': 'User-approved downward right-facing Shenron with arched neck and slightly open mouth, November 11, 2026',
            'native_mapping': [0, 0, 1060, 1484], 'additional_crop_or_zoom': False,
            'brightness': 'Existing single 1.20 native background gain retained.'},
        'baseline_catalog_sha256': hash_bytes(catalog_before), 'catalog_sha256': digest(catalog_path),
        'cards': rows}
    release_path.write_text(json.dumps(release, indent=2) + '\n')
    print(json.dumps(release, indent=2))


if __name__ == '__main__':
    main()
