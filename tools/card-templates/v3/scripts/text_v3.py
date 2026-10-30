from pathlib import Path
from lxml import etree as E
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
S="http://www.w3.org/2000/svg"
FONTS=Path(__file__).resolve().parent.parent/"fonts"
def elem(tag,parent=None,**kw):
    e=E.Element("{"+S+"}"+tag,{k.replace("_","-"):str(v) for k,v in kw.items()})
    if parent is not None:parent.append(e)
    return e

fontcache={}
def text(text,font,size,cx,cy,id,fill='#ffffff',stroke=0,maxwidth=None):
    key=str(FONTS/font)
    if key not in fontcache: fontcache[key]=TTFont(key)
    f=fontcache[key]; gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm
    paths=[];bounds=[];advance=0
    for c in text:
        name=cmap[ord(c)];g=gs[name];p=SVGPathPen(gs);g.draw(p);b=BoundsPen(gs);g.draw(b)
        if b.bounds:
            x0,y0,x1,y1=b.bounds;bounds.append((advance+x0,y0,advance+x1,y1));paths.append((advance,p.getCommands()))
        advance+=g.width
    x0=min(b[0] for b in bounds);x1=max(b[2] for b in bounds);y0=min(b[1] for b in bounds);y1=max(b[3] for b in bounds)
    sy=size/upm;sx=sy
    if maxwidth: sx=min(sx,(maxwidth-2*stroke)/(x1-x0))
    g=elem('g',id=id,fill=fill,transform=f'translate({cx-(x0+x1)*sx/2:.12f} {cy+(y0+y1)*sy/2:.12f}) scale({sx:.12f} {-sy:.12f})',aria_label=text)
    if stroke:
        g.set('stroke',fill);g.set('stroke-width',str(stroke/sy));g.set('stroke-linejoin','round');g.set('paint-order','stroke fill')
    for x,d in paths:elem('path',g,d=d,transform=f'translate({x})')
    g.set('data-visible-center',f'{cx} {cy}')
    return g,((x1-x0)*sx+stroke,(y1-y0)*sy+stroke)

