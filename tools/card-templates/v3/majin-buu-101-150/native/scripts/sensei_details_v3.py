"""Approved Sensei V3 number geometry and category anchor; no legacy badge styles."""
from pathlib import Path
from lxml import etree as E
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
import json
ROOT=Path(__file__).resolve().parent.parent
S='http://www.w3.org/2000/svg'
CATEGORY_ANCHOR=(434.661310104786,908.5)

def elem(tag,parent=None,**attrs):
    n=E.Element('{'+S+'}'+tag)
    for k,v in attrs.items():n.set(k.replace('_','-'),str(v))
    if parent is not None:parent.append(n)
    return n

def capacity_number(value='13',cx=110,cy=908.5,height=68):
    glyphs=json.loads((ROOT/'reference/reference-numerals.json').read_text())['glyphs']
    g=elem('g',id='sensei-deck-capacity',aria_label=value,fill='#f4f4f2',
           data_numeral_treatment='reference-squared-italic-2026-10-25',
           data_visible_center=f'{cx} {cy}',data_visible_height=height)
    x=0;all_bounds=[]
    for i,digit in enumerate(value):
        d=glyphs[digit];pen=BoundsPen(None);parse_path(d,pen);x0,y0,x1,y1=pen.bounds
        offset=x-x0
        elem('path',g,d=d,transform=f'translate({offset} 0)',id=f'sensei-capacity-digit-{i}')
        all_bounds.append((x,y0,x+x1-x0,y1));x+=x1-x0+1.1
    x0=min(b[0] for b in all_bounds);y0=min(b[1] for b in all_bounds);x1=max(b[2] for b in all_bounds);y1=max(b[3] for b in all_bounds)
    s=height/(y1-y0)
    g.set('transform',f'translate({cx-s*(x0+x1)/2:.12f} {cy-s*(y0+y1)/2:.12f}) scale({s:.12f})')
    g.set('data-digit-ink-gap',f'{1.1*s:.12f}')
    return g
