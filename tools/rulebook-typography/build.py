"""Build the rulebook's display/numeral fonts from retained native outlines."""
from pathlib import Path
import json
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from fontTools.pens.boundsPen import BoundsPen

ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path(__file__).with_name('glyphs.json')

def bounds(path):
    pen=BoundsPen(None);parse_path(path,pen);return pen.bounds

def build(data,kind,family,filename):
    paths=data[kind];upm=1000
    fb=FontBuilder(upm,isTTF=True)
    order=['.notdef','space']+[f'g{ord(c):04x}' for c in paths]
    fb.setupGlyphOrder(order)
    cmap={ord(c):f'g{ord(c):04x}' for c in paths}
    if kind=='navigation':cmap.update({ord(c.lower()):f'g{ord(c):04x}' for c in paths if c.isalpha()})
    cmap[32]='space';fb.setupCharacterMap(cmap)
    glyphs={};metrics={}
    for char,path in paths.items():
        name=cmap[ord(char)];pen=TTGlyphPen(None)
        x0,y0,x1,y1=bounds(path)
        if kind=='navigation':
            scale=4;transform=(scale,0,-.55*scale,-scale,430,760)
            advance=round((x1-x0+10)*scale)
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
    fb.setupPost();fb.setupMaxp();fb.font.recalcTimestamp=False
    fb.font['head'].created=fb.font['head'].modified=3875817600
    dest=ROOT/'public/assets/fonts'/filename;fb.save(dest);print(dest.name,dest.stat().st_size)

if __name__=='__main__':
    data=json.loads(SOURCE.read_text())
    build(data,'navigation','DB OCG Navigation','db-ocg-navigation.ttf')
    build(data,'numerals','DB OCG Personality Numbers','db-ocg-personality-numbers.ttf')
