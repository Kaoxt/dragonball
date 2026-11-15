"""Rebuild Hi-Tech title exclusions from the current native V3 brush geometry.

Only the title/LEVEL exclusion changes. Other panel and subject masks are
retained. --check verifies every catalog Hi-Tech before checking the outputs.
"""
from copy import deepcopy
from pathlib import Path
import argparse
import json
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SVG = 'http://www.w3.org/2000/svg'
XLINK = 'http://www.w3.org/1999/xlink'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', XLINK)
NAMES = ('hi-tech-mask.svg', 'hi-tech-background.svg', 'vegeta-background.svg')
CLIPS = ('footer-left-clip', 'footer-body-clip', 'footer-right-clip')


def get(root, ident):
    return next(e for e in root.iter() if e.get('id') == ident)


def signature(node):
    return (node.tag, tuple(sorted(node.attrib.items())),
            tuple(signature(child) for child in node))


def native_roots():
    cards = json.loads(subprocess.check_output([
        'node', '--input-type=module', '-e',
        "import {catalog} from './public/cards/catalog.js';"
        "console.log(JSON.stringify(catalog.filter(c=>"
        "/hi[\\s-]?tech/i.test(c.rarity||'')||/(?:^|-)ht(?:-|$)/i.test(c.id||''))))"
    ], cwd=ROOT, text=True))
    paths = list((ROOT / 'tools/card-templates/v3').glob('*/*.svg'))
    roots = []
    for card in cards:
        matches = [p for p in paths if p.stem == card['id']]
        assert len(matches) == 1, (card['id'], matches)
        assert card['templateVersion'] == 3, card['id']
        roots.append(ET.parse(matches[0]).getroot())
    assert roots, 'No Hi-Tech native sources'
    return cards, roots


def components():
    cards, roots = native_roots()
    ref = roots[0]
    # Check every card, not merely a representative from each set.
    for root in roots:
        for ident in ('shared-title-material', 'clean-native-brush-paint-contour', *CLIPS):
            assert signature(get(root, ident)) == signature(get(ref, ident)), ident

    contour = deepcopy(get(ref, 'clean-native-brush-paint-contour')[0])
    contour.set('id', 'hi-tech-title-contour')
    contour.set('fill', 'black')
    title = deepcopy(get(ref, 'shared-title-material'))
    title.set('id', 'hi-tech-title-protection')
    for use in title.iter(f'{{{SVG}}}use'):
        use.set(f'{{{XLINK}}}href', '#hi-tech-title-contour')
    level = ET.Element(f'{{{SVG}}}g', {
        'id': 'hi-tech-level-protection',
        'transform': get(ref, 'level-badge-v3').get('transform')
    })
    label = deepcopy(get(ref, 'v3-level-label'))
    label.attrib.pop('id')
    label.set('fill', 'black')
    level.append(label)
    numerals = set()
    for root in roots:
        assert get(root, 'level-badge-v3').get('transform') == level.get('transform')
        assert signature(get(root, 'v3-level-label')) == signature(get(ref, 'v3-level-label'))
        number = deepcopy(get(root, 'v3-level-number'))
        number.attrib.pop('id')
        number.attrib.pop('aria-label', None)
        number.set('fill', 'black')
        sig = signature(number)
        if sig not in numerals:
            numerals.add(sig)
            level.append(number)
    return cards, [contour, *(deepcopy(get(ref, ident)) for ident in CLIPS)], title, level


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    cards, definitions, title, level = components()
    for name in NAMES:
        path = ROOT / 'public/card-effects' / name
        root = ET.parse(path).getroot()
        if args.check:
            for expected in [*definitions, title, level]:
                assert signature(get(root, expected.get('id'))) == signature(expected), name
            assert not any(e.get('d', '').startswith('M24 40 42 21H998') for e in root.iter()), name
            continue
        defs = root.find(f'{{{SVG}}}defs')
        area = get(root, 'area')
        for parent in (defs, area):
            for child in list(parent):
                if child.get('id') in {e.get('id') for e in [*definitions, title, level]} or child.get('d', '').startswith('M24 40 42 21H998'):
                    parent.remove(child)
        for index, definition in enumerate(definitions):
            defs.insert(index, deepcopy(definition))
        area.insert(1, deepcopy(title))
        area.insert(2, deepcopy(level))
        root.insert(0, ET.Comment(' Current V3 title silhouette; native brush contour and November 6 title/footer width mapping. '))
        path.write_bytes(ET.tostring(root, encoding='utf-8') + b'\n')
    print(f'{len(cards)} Hi-Tech native headers verified; {len(NAMES)} shared masks ' + ('match.' if args.check else 'rebuilt.'))


if __name__ == '__main__':
    main()
