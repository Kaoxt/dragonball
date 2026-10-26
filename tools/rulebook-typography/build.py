"""Build the rulebook's display/numeral fonts from retained native outlines."""
from pathlib import Path
import json
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.basePen import BasePen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path(__file__).with_name('glyphs.json')

def bounds(path):
    pen=BoundsPen(None);parse_path(path,pen);return pen.bounds

class OutlinePen(BasePen):
    """Sample the actual ink, rather than the unskewed SVG bounding box."""
    def __init__(self):
        super().__init__(None);self.contours=[];self.points=[]
    def _moveTo(self,p):self.points=[p]
    def _lineTo(self,p):self.points.append(p)
    def _curveToOne(self,p1,p2,p3):
        p0=self.points[-1]
        for step in range(1,33):
            t=step/32;s=1-t
            self.points.append(tuple(s*s*s*p0[i]+3*s*s*t*p1[i]+3*s*t*t*p2[i]+t*t*t*p3[i] for i in (0,1)))
    def _closePath(self):
        self.contours.append(self.points+[self.points[0]]);self.points=[]
    def _endPath(self):self._closePath()

def simplify_line(points,tolerance=5):
    """Remove subpixel tracing stair steps without rounding deliberate corners."""
    if len(points)<3:return points
    (ax,ay),(bx,by)=points[0],points[-1]
    dx,dy=bx-ax,by-ay;length=dx*dx+dy*dy
    distances=[]
    for x,y in points[1:-1]:
        t=max(0,min(1,((x-ax)*dx+(y-ay)*dy)/length)) if length else 0
        distances.append(((x-ax-t*dx)**2+(y-ay-t*dy)**2)**.5)
    distance=max(distances);split=distances.index(distance)+1
    if distance<=tolerance:return [points[0],points[-1]]
    return simplify_line(points[:split+1],tolerance)[:-1]+simplify_line(points[split:],tolerance)

def navigation_contours(path):
    pen=OutlinePen();parse_path(path,TransformPen(pen,(4,0,-2.2,-4,430,760)))
    contours=[]
    for contour in pen.contours:
        start=contour[0]
        split=max(range(1,len(contour)-1),key=lambda i:(contour[i][0]-start[0])**2+(contour[i][1]-start[1])**2)
        contour=simplify_line(contour[:split+1])[:-1]+simplify_line(contour[split:])
        contours.append(contour)
    left=min(x for contour in contours for x,y in contour)
    # Include italic overhangs inside the advance, so spaces and line endings
    # represent the actual ink bounds rather than the unslanted source width.
    return [[(x-left+35,y) for x,y in contour] for contour in contours]

def ink_profile(contours):
    profile={}
    for y in range(10,760,10):
        crossings=[]
        for contour in contours:
            for (x1,y1),(x2,y2) in zip(contour,contour[1:]):
                if min(y1,y2)<=y<max(y1,y2):
                    crossings.append(x1+(y-y1)*(x2-x1)/(y2-y1))
        if crossings:profile[y]=(min(crossings),max(crossings))
    return profile

def add_navigation_kerning(font,contours,cmap,metrics):
    # Keep a consistent small gap between slanted contours. In particular,
    # R's long lower leg must not create a false word break before Y or D.
    profiles={c:ink_profile(p) for c,p in contours.items()}
    rules=[]
    for left,a in profiles.items():
        for right,b in profiles.items():
            advance=metrics[cmap[ord(left)]][0]
            gaps=[advance+b[y][0]-a[y][1] for y in a.keys()&b.keys()]
            if not gaps:continue
            target=65 if right in '.,' else 90
            adjustment=round(target-min(gaps))
            if abs(adjustment)>=5:
                first,second=cmap[ord(left)],cmap[ord(right)]
                # Punctuation can tuck below an italic overhang, but the next
                # word must still start beyond the preceding letter's ink.
                compensation=max(0,-adjustment-metrics[second][0])
                if compensation:
                    rules.append(f'pos {first} <0 0 {adjustment} 0> {second} <0 0 {compensation} 0>;')
                else:rules.append(f'pos {first} {second} {adjustment};')
    addOpenTypeFeaturesFromString(font,'feature kern {\n'+'\n'.join(rules)+'\n} kern;')

def build(data,kind,family,filename):
    paths=data[kind];upm=1000
    fb=FontBuilder(upm,isTTF=True)
    order=['.notdef','space']+[f'g{ord(c):04x}' for c in paths]
    fb.setupGlyphOrder(order)
    cmap={ord(c):f'g{ord(c):04x}' for c in paths}
    if kind=='navigation':cmap.update({ord(c.lower()):f'g{ord(c):04x}' for c in paths if c.isalpha()})
    cmap[32]='space';fb.setupCharacterMap(cmap)
    glyphs={};metrics={};nav_contours={}
    for char,path in paths.items():
        name=cmap[ord(char)];pen=TTGlyphPen(None)
        x0,y0,x1,y1=bounds(path)
        if kind=='navigation':
            contours=navigation_contours(path);nav_contours[char]=contours
            for contour in contours:
                pen.moveTo(contour[0])
                for point in contour[1:-1]:pen.lineTo(point)
                pen.closePath()
            advance=round(max(x for contour in contours for x,y in contour)+35)
        else:
            scale=760/(y1-y0);transform=(scale,0,0,-scale,35-x0*scale,760+y0*scale)
            advance=round((x1-x0)*scale+70)
            parse_path(path,TransformPen(Cu2QuPen(pen,1.0,reverse_direction=False),transform))
        glyph=pen.glyph();glyphs[name]=glyph
        glyph.recalcBounds(None);metrics[name]=(advance,glyph.xMin)
    for name in ['.notdef','space']:
        glyphs[name]=TTGlyphPen(None).glyph();metrics[name]=(280,0)
    fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=820,descent=-180,lineGap=0)
    fb.setupNameTable({'familyName':family,'styleName':'Regular','uniqueFontIdentifier':family+'-20261025','fullName':family,'psName':family.replace(' ',''),'version':'Version 1.000','copyright':'Dragon Ball OCG custom vector lettering. Derived from retained site and card-template outlines.'})
    fb.setupOS2(sTypoAscender=820,sTypoDescender=-180,sTypoLineGap=0,usWinAscent=850,usWinDescent=180,sxHeight=760,sCapHeight=760,usWeightClass=400,fsType=0)
    fb.setupPost();fb.setupMaxp()
    if kind=='navigation':add_navigation_kerning(fb.font,nav_contours,cmap,metrics)
    fb.font.recalcTimestamp=False
    fb.font['head'].created=fb.font['head'].modified=3875817600
    dest=ROOT/'public/assets/fonts'/filename;fb.save(dest);print(dest.name,dest.stat().st_size)

if __name__=='__main__':
    data=json.loads(SOURCE.read_text())
    build(data,'navigation','DB OCG Navigation','db-ocg-navigation.ttf')
    build(data,'numerals','DB OCG Personality Numbers','db-ocg-personality-numbers.ttf')
