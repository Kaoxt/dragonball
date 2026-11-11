"""World Games punctuation-aware title measurement; shared geometry stays fixed."""
import re
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
from text_layout_v3 import validate as shared_validate

def title_vertical_center(root):
    title = root.xpath('//*[@id="card-title"]')[0]
    label = title.get('aria-label', '')
    chars = [c for c in label if not c.isspace()]
    paths = list(title)
    if len(chars) != len(paths):
        raise ValueError('Title glyph count differs from its label')
    ys = []
    for char, path in zip(chars, paths):
        if char.isalnum():
            pen = BoundsPen(None); parse_path(path.get('d'), pen)
            ys.extend([pen.bounds[1], pen.bounds[3]])
    match = re.fullmatch(r'translate\(([-.0-9]+) ([-.0-9]+)\) scale\(([-.0-9]+) ([-.0-9]+)\)', title.get('transform'))
    if not match or not ys:
        raise ValueError('Unsupported native title transform')
    return float(match[2]) + (min(ys)+max(ys))/2 * float(match[4])

def validate(root, bounds):
    measured=dict(bounds)
    x,y,w,h=measured["card-title"]
    measured["card-title"]=[x,title_vertical_center(root)-h/2,w,h]
    return shared_validate(root,measured)
