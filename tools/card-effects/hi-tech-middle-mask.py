"""Match Hi-Tech middle-bar/PUR foil exclusions to the current native paint.

Keep the existing title, stages, rules, footer and subject attenuation intact.
--check verifies every catalog Hi-Tech and all three shared viewer masks.
"""
from copy import deepcopy
from importlib import import_module
import argparse
import xml.etree.ElementTree as ET

native = import_module('hi-tech-title-mask')
ROOT, SVG, XLINK = native.ROOT, native.SVG, native.XLINK
get, signature = native.get, native.signature
NAMES = native.NAMES
OLD_BAR = 'M175 878H1030V958H172Z'


def obsolete(node):
    return node.get('d') == OLD_BAR or (
        node.tag == f'{{{SVG}}}circle' and
        all(node.get(k) == v for k, v in {'cx': '101', 'cy': '911', 'r': '79'}.items()))


def components():
    cards, roots = native.native_roots()
    ref = roots[0]
    shared = ('clean-native-brush-paint-contour', 'middle-artwork-edge-clip',
              'middle-foil-isolation', 'middle-foil-isolation-soft-edge',
              'pur-full-blue-bar-height', 'clean-native-pur-paint-contour')
    for root in roots:
        for ident in shared:
            assert signature(get(root, ident)) == signature(get(ref, ident)), ident
        assert get(root, 'shared-category-material').attrib == get(ref, 'shared-category-material').attrib
        assert signature(get(root, 'pur-brushstroke-horizontal')[0]) == signature(get(ref, 'pur-brushstroke-horizontal')[0])

    # The color paint and its existing soft backing share the actual brush edge.
    # In particular, protect y852 onward, rather than the former y878 rectangle.
    middle = ET.Element(f'{{{SVG}}}g', {
        'id': 'hi-tech-middle-protection',
        'clip-path': get(ref, 'middle-paint-art-edge-wrapper').get('clip-path')
    })
    isolation = deepcopy(get(ref, 'middle-foil-isolation'))
    isolation.set('id', 'hi-tech-middle-soft-edge')
    shape = isolation[0]
    shape.tag = f'{{{SVG}}}use'
    shape.attrib.pop('d')
    shape.set(f'{{{XLINK}}}href', '#hi-tech-title-contour')
    shape.set('fill', 'black')
    shape.set('stroke', 'black')
    middle.append(isolation)
    paint = ET.SubElement(middle, f'{{{SVG}}}g', {
        'transform': get(ref, 'shared-category-material').get('transform')
    })
    ET.SubElement(paint, f'{{{SVG}}}use', {
        f'{{{XLINK}}}href': '#hi-tech-title-contour', 'fill': 'black'
    })

    # PUR is now a horizontal brush, not the old circular badge. Use its native
    # contour and mapping so the foil never draws an arc above/below the bar.
    pur_native = get(ref, 'pur-brushstroke-horizontal')[0]
    pur = ET.Element(f'{{{SVG}}}g', {
        'id': 'hi-tech-pur-protection', 'clip-path': pur_native.get('clip-path')
    })
    ET.SubElement(pur, f'{{{SVG}}}use', {
        f'{{{XLINK}}}href': '#hi-tech-pur-contour',
        'transform': pur_native[0].get('transform'), 'fill': 'black'
    })
    contour = deepcopy(get(ref, 'clean-native-pur-paint-contour')[0])
    contour.set('id', 'hi-tech-pur-contour')
    contour.set('fill', 'black')
    definitions = [deepcopy(get(ref, ident)) for ident in (
        'middle-artwork-edge-clip', 'middle-foil-isolation-soft-edge', 'pur-full-blue-bar-height')]
    return cards, [*definitions, contour], [middle, pur]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    cards, definitions, protections = components()
    ids = {e.get('id') for e in [*definitions, *protections]}
    for name in NAMES:
        path = ROOT / 'public/card-effects' / name
        root = ET.parse(path).getroot()
        area = get(root, 'area')
        if args.check:
            for expected in [*definitions, *protections]:
                assert signature(get(root, expected.get('id'))) == signature(expected), name
            assert not any(obsolete(e) for e in area), name
            continue
        defs = root.find(f'{{{SVG}}}defs')
        for parent in (defs, area):
            for child in list(parent):
                if child.get('id') in ids or obsolete(child):
                    parent.remove(child)
        for definition in definitions:
            defs.insert(list(defs).index(area), deepcopy(definition))
        for index, protection in enumerate(protections, 3):
            area.insert(index, deepcopy(protection))
        root.insert(0, ET.Comment(' Native V3 middle brush and horizontal PUR exclusions. '))
        path.write_bytes(ET.tostring(root, encoding='utf-8') + b'\n')
    print(f'{len(cards)} Hi-Tech native middle bars verified; {len(NAMES)} shared masks ' + ('match.' if args.check else 'rebuilt.'))


if __name__ == '__main__':
    main()
