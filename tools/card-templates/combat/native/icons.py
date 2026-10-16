"""Native combat symbols matched to the supplied printed-card references.

Size by visible capital-letter height, not the font's em size. Attack handles
point upward; blades point downward. The block symbol is one solid shield.
"""
import math
import xml.etree.ElementTree as ET
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

NS = 'http://www.w3.org/2000/svg'
SWORD = ('M-2.1-31.2 C-5.5-32.8-4.9-37.6-1.4-38.2 '
         'C2.6-39.1 5.1-34.6 2.1-31.2 L2.1-17.8 '
         'Q6.8-17.8 9.2-22.7 L12-21.6 '
         'Q10.2-14.1 4.7-12.6 L4.7 25.8 L0 34 '
         'L-4.7 25.8 L-4.7-12.6 Q-10.2-14.1-12-21.6 '
         'L-9.2-22.7 Q-6.8-17.8-2.1-17.8 Z')
SHIELD = ('M0 0 C7.1 3.9 14.7 3.8 20.7 0 '
          'C26.7 3.8 34.3 3.9 41.4 0 '
          'C40.1 16.5 32.3 29.8 20.7 38 '
          'C9.1 29.8 1.3 16.5 0 0 Z')

def shape(kind):
    group = ET.Element(f'{{{NS}}}g', {'fill': '#060606'})
    pen = BoundsPen(None)
    if kind == 'attack':
        for deg in [-48, 48]:
            rad = math.radians(deg)
            matrix = (math.cos(rad), math.sin(rad), -math.sin(rad), math.cos(rad), 0, 0)
            parse_path(SWORD, TransformPen(pen, matrix))
            ET.SubElement(group, f'{{{NS}}}path', {'d': SWORD, 'transform': f'rotate({deg})'})
    elif kind == 'block':
        parse_path(SHIELD, pen)
        ET.SubElement(group, f'{{{NS}}}path', {'d': SHIELD})
    else:
        raise ValueError(kind)
    return group, pen.bounds

def icon(kind, left, top, height, ident):
    content, bounds = shape(kind)
    l, t, r, b = bounds
    scale = height / (b-t)
    group = ET.Element(f'{{{NS}}}g', {
        'id': ident, 'aria-label': 'Attack' if kind == 'attack' else 'Stop attack',
        'transform': f'translate({left:.6f} {top:.6f}) scale({scale:.9f}) translate({-l:.9f} {-t:.9f})'})
    group.append(content)
    return group, (r-l)*scale

def width_at_height(kind, height):
    _, (l,t,r,b) = shape(kind)
    return (r-l)*height/(b-t)
