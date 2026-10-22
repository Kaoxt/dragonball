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
INFINITY = ('M4 18 C4 8 11 2 20 2 C35 2 49 34 67 34 '
            'C78 34 86 28 86 18 C86 8 78 2 67 2 '
            'C49 2 35 34 20 34 C11 34 4 28 4 18 Z')

PANINI_INFINITY = 'M356 297C308 340 303 344 284 358C248 386 201 404 165 404C88 404 25 341 25 264C25 187 88 124 165 124C202 124 247 142 284 170C303 184 308 188 356 231C405 188 410 184 429 170C465 142 511 124 548 124C625 124 688 187 688 264C688 341 625 404 548 404C512 404 465 386 429 358C410 344 405 340 356 297ZM392 264C450 321 505 352 547 352C596 352 636 312 636 264C636 215 596 175 547 175C505 175 449 207 392 264ZM321 264C264 208 208 176 166 176C117 176 77 216 77 264C77 312 117 352 166 352C208 352 264 321 321 264Z'

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
    elif kind == 'constant':
        # Printed-card reference: compact flat infinity followed by a colon.
        # Normalize to a 32-unit capital-height alignment box.
        ET.SubElement(group, f'{{{NS}}}path', {'d': PANINI_INFINITY,
            'transform': 'translate(0 27) scale(0.0588235294117647 -0.0642857142857143) translate(-25 -124)'})
        for y in (9, 25):
            ET.SubElement(group, f'{{{NS}}}rect', {'x':'45', 'y':str(y), 'width':'5', 'height':'6'})
        return group, (0, 0, 50, 32)
    else:
        raise ValueError(kind)
    return group, pen.bounds

def icon(kind, left, top, height, ident):
    content, bounds = shape(kind)
    l, t, r, b = bounds
    scale = height / (b-t)
    group = ET.Element(f'{{{NS}}}g', {
        'id': ident, 'aria-label': {'attack':'Attack','block':'Stop attack','constant':'Constant power'}[kind],
        'transform': f'translate({left:.6f} {top:.6f}) scale({scale:.9f}) translate({-l:.9f} {-t:.9f})'})
    group.append(content)
    return group, (r-l)*scale

def width_at_height(kind, height):
    _, (l,t,r,b) = shape(kind)
    return (r-l)*height/(b-t)
