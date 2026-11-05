"""Validate the fixed V3 SVG text components and visible-ink anchors."""
from pathlib import Path
from lxml import etree as E
import hashlib, json
from middle_label_v3 import label
from personality_levels import validate_level

REVISION = '2026-11-01-fixed-native-text-components'
ANCHORS = {'card-title': (529.5, 79), 'card-category': (529.5, 908.5),
           'footer-text-block': (529.5, 1409.5)}


def geometry(element):
    """Ignore documentation and namespace serialization; retain all painted geometry."""
    attrs = tuple(sorted((k, v) for k, v in element.attrib.items()
                         if not k.startswith('data-')))
    return E.QName(element).localname, attrs, tuple(geometry(c) for c in element)


def validate(root, bounds):
    validate_level(root)
    if root.xpath('//*[local-name()="text"]'):
        raise ValueError('V3 type must use retained native outlined paths')
    category = root.xpath('//*[@id="card-category"]')[0]
    expected, _ = label(category.get('aria-label'))
    if geometry(category) != geometry(expected):
        raise ValueError('Category differs from the fixed native V3 text SVG')
    for ident, (cx, cy) in ANCHORS.items():
        x, y, w, h = bounds[ident]
        if abs(x + w / 2 - cx) > .02 or abs(y + h / 2 - cy) > .02:
            raise ValueError(f'{ident}: incorrect visible-ink center')
    for ident in ['footer-rarity', 'card-number']:
        x, y, w, h = bounds[ident]
        if abs(y + h / 2 - 1409.5) > .02:
            raise ValueError(f'{ident}: incorrect footer vertical center')
    lines = {k: v for k, v in bounds.items() if k.startswith('rules-line-')}
    if not lines or len(lines) > 5:
        raise ValueError('Rules require one to five native text rows')
    for ident, (x, y, w, h) in lines.items():
        if x < 50 or x + w > 1010 or y < 1000 or y + h > 1310:
            raise ValueError(f'{ident}: rules text extends beyond the approved safe area')
    return {'revision': REVISION, 'native_outlined_text': True,
            'fixed_category_svg_matches': True, 'visible_ink_anchors_verified': True,
            'rules_rows': len(lines)}


if __name__ == '__main__':
    import argparse
    from footer_spacing import bounds
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source', type=Path)
    a = p.parse_args()
    print(json.dumps(validate(E.parse(str(a.source)).getroot(), bounds(a.source))))
