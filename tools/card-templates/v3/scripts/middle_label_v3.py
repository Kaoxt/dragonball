"""Original Michroma V3 middle labels with V2's four-unit letter spacing."""
from pathlib import Path
import json
from copy import deepcopy
from lxml import etree as E
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from text_v3 import text

FONT = Path(__file__).resolve().parent.parent/'fonts/Michroma-Regular.ttf'
SIZE, WIDTH_FACTOR, STROKE, TRACKING = 38.4, .956, 4.21875, 4.0
CX, CY = 529.5, 908.5

def _outline_label(value):
    value = value.upper()
    f = TTFont(FONT)
    gs, cmap = f.getGlyphSet(), f.getBestCmap()
    sy = SIZE/f['head'].unitsPerEm
    sx = sy*WIDTH_FACTOR
    group, _ = text(value, str(FONT), SIZE, CX, CY, 'card-category', stroke=STROKE)
    paths, advance, bounds = iter(group), 0, []
    for i, ch in enumerate(value):
        glyph = gs[cmap[ord(ch)]]
        pen = BoundsPen(gs); glyph.draw(pen)
        x = advance + i*TRACKING/sx
        if pen.bounds:
            x0,y0,x1,y1 = pen.bounds
            next(paths).set('transform', f'translate({x:.12f})')
            bounds.append((x+x0,y0,x+x1,y1))
        advance += glyph.width
    x0=min(b[0] for b in bounds); x1=max(b[2] for b in bounds)
    y0=min(b[1] for b in bounds); y1=max(b[3] for b in bounds)
    group.set('transform',f'translate({CX-(x0+x1)*sx/2:.12f} {CY+(y0+y1)*sy/2:.12f}) scale({sx:.12f} {-sy:.12f})')
    for k,v in {'data-font-family':'Michroma','data-font-size':SIZE,
                'data-width-factor':WIDTH_FACTOR,'data-letter-spacing':TRACKING,
                'data-typography-revision':'2026-10-31-original-font-v2-spacing'}.items():
        group.set(k,str(v))
    width=(x1-x0)*sx+STROKE*WIDTH_FACTOR
    height=(y1-y0)*sy+STROKE
    assert CX-width/2 >= 195 and CX+width/2 <= 864, (value,width)
    f.close()
    return group, {'label':value,'font':'Michroma','font_size':SIZE,'tracking':TRACKING,
                   'width_factor':WIDTH_FACTOR,'stroke':STROKE,
                   'visible_center':[CX,CY],'visible_size':[width,height]}

def label(value):
    """Reuse the retained native text component at its fixed V3 coordinates."""
    value = value.upper()
    value = {'HERO PERSONALITY': 'HERO', 'VILLAIN PERSONALITY': 'VILLAIN'}.get(value, value)
    folder = Path(__file__).resolve().parent.parent / 'assets/text/categories'
    manifest = json.loads((folder / 'manifest.json').read_text())
    if value not in manifest:
        raise ValueError(f'Create and review a fixed V3 text SVG for {value!r} first')
    spec = manifest[value]
    root = E.parse(str(folder / spec['file'])).getroot()
    group = root.xpath('//*[@id="card-category"]')[0]
    return deepcopy(group), dict(spec['geometry'])


def apply(root):
    old = root.xpath('//*[@id="card-category"]')[0]
    new,report = label(old.get('aria-label'))
    old.getparent().replace(old,new)
    return report
