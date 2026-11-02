"""Apply approved Hero blue/Villain crimson paint and isolate Hi-Tech bars.

Only the category material and its native contour backing may change. All
lettering, PUR, artwork, and the shared middle clip remain untouched.
"""
from copy import deepcopy
from lxml import etree as E
from personality_corners_v3 import apply as apply_corners

S = '{http://www.w3.org/2000/svg}'
RED = '#a61122'
HERO_BLUE_STOPS = ('#258bc9', '#15639d')
HERO_GRADIENT_ID = 'hero-reference-blue'
NEUTRAL_GRAIN = '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.46772 -1.57344 -.15884 0 2.08'


def apply_hero_color(root):
    """Reuse the November 2 approved native gradient; preserve grain and alpha."""
    defs = root.find(S+'defs')
    matches = root.xpath(f'//*[@id="{HERO_GRADIENT_ID}"]')
    gradient = matches[0] if matches else E.SubElement(defs, S+'linearGradient', id=HERO_GRADIENT_ID)
    expected = {'id': HERO_GRADIENT_ID, 'x1': '0', 'y1': '0',
                'x2': '0', 'y2': '100', 'gradientUnits': 'userSpaceOnUse'}
    gradient.attrib.clear()
    gradient.attrib.update(expected)
    for child in list(gradient):
        gradient.remove(child)
    for offset, color in zip(('0', '1'), HERO_BLUE_STOPS):
        E.SubElement(gradient, S+'stop', offset=offset, attrib={'stop-color': color})
    root.xpath('//*[@id="shared-category-material"]')[0].find(S+'rect').set(
        'fill', f'url(#{HERO_GRADIENT_ID})')


def apply(root, high_tech=False):
    category = root.xpath('//*[@id="card-category"]')[0].get('aria-label', '')
    if category not in ('HERO', 'VILLAIN') and 'PERSONALITY' not in category:
        return {'applies': False}
    villain = category.startswith('VILLAIN')
    apply_corners(root)
    if villain:
        root.xpath('//*[@id="shared-category-material"]')[0].find(S+'rect').set('fill', RED)
        root.xpath('//*[@id="worn-blue-material-shading"]/*')[0].set('values', NEUTRAL_GRAIN)
    else:
        apply_hero_color(root)
    if high_tech:
        for ident in ['middle-foil-isolation', 'middle-foil-isolation-soft-edge']:
            for old in root.xpath(f'//*[@id="{ident}"]'):
                old.getparent().remove(old)
        defs = root.find(S+'defs')
        filt = E.SubElement(defs, S+'filter', id='middle-foil-isolation-soft-edge',
                            x='-3%', y='-20%', width='106%', height='140%')
        E.SubElement(filt, S+'feGaussianBlur', stdDeviation='4')
        backing = E.Element(S+'g', id='middle-foil-isolation',
                            transform='translate(0 848) scale(1 1.17)',
                            filter='url(#middle-foil-isolation-soft-edge)')
        for contour in root.xpath('//*[@id="clean-native-brush-paint-contour"]/*'):
            shape = deepcopy(contour)
            shape.attrib.pop('id', None)
            for key, value in {'fill':'#11171b', 'stroke':'#11171b',
                               'stroke-width':'18', 'stroke-linejoin':'round'}.items():
                shape.set(key, value)
            backing.append(shape)
        # Inherit the existing y852–965 artwork-edge clip. The painted brush
        # retains its grain and distressed outline over a soft native silhouette.
        root.xpath('//*[@id="middle-paint-art-edge-wrapper"]')[0].insert(0, backing)
    return {'applies': True, 'villain_red': RED if villain else None,
            'hero_blue_stops': None if villain else list(HERO_BLUE_STOPS),
            'hi_tech_isolated': bool(high_tech), 'clip_y': [852, 965]}
