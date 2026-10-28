#!/usr/bin/env python3
"""Apply the October 28 smaller, visibly centered title; preserve unrelated SVG bytes."""
import argparse,hashlib,json,re
from pathlib import Path
from lxml import etree as E
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

NS='http://www.w3.org/2000/svg'
SIZE=77.43142144638405
FONT_SHA='c6e312589232623060ab3d55b86d2b2978c5f5af958e96781acaf0f7043bc9b3'

def title_group(text,width,personality,font_path):
    font_path=Path(font_path)
    if hashlib.sha256(font_path.read_bytes()).hexdigest()!=FONT_SHA:raise ValueError('Use retained Teko SemiBold')
    font=TTFont(font_path);glyphs=font.getGlyphSet();cmap=font.getBestCmap()
    group=E.Element('{'+NS+'}g',id='card-title',fill='#ffffff',**{'aria-label':text,'data-font-source':'Teko-SemiBold.ttf','data-font-size':str(SIZE),'data-title-standard':'2026-10-28-smaller-visible-center'})
    paths=[];b=BoundsPen(glyphs);x=0
    for ch in text:
        if ord(ch) not in cmap:raise ValueError(f'Unsupported title character: {ch}')
        name=cmap[ord(ch)];glyph=glyphs[name];pen=SVGPathPen(glyphs)
        glyph.draw(TransformPen(pen,(1,0,0,-1,x,0)));glyph.draw(TransformPen(b,(1,0,0,-1,x,0)))
        if pen.getCommands():paths.append(pen.getCommands())
        x+=font['hmtx'][name][0]
    box=b.bounds
    if not box:raise ValueError('Empty title')
    sy=SIZE/1000;center=529.5 if personality else (526 if width==1060 else 738)
    safe=2*(center-201.75) if personality else (920 if width==1060 else 1344)
    sx=sy*min(1,safe/((box[2]-box[0])*sy))
    tx=center-sx*(box[0]+box[2])/2;ty=72-sy*(box[1]+box[3])/2
    group.set('transform',f'translate({tx:.9f} {ty:.9f}) scale({sx:.12f} {sy:.12f})')
    group.set('data-title-center-x',str(center));group.set('data-title-center-y','72');group.set('data-horizontal-fit',str(sx/sy))
    for d in paths:E.SubElement(group,'{'+NS+'}path',d=d)
    return group,{'font_size':SIZE,'center_x':center,'center_y':72,'horizontal_fit':sx/sy,'bounds':[tx+sx*box[0],ty+sy*box[1],tx+sx*box[2],ty+sy*box[3]],'level_clearance':tx+sx*box[0]-177.75 if personality else None}

def span(text):
    matches=list(re.finditer(r'<(?P<tag>(?:[\w.-]+:)?g)\b[^>]*\bid=["\']card-title["\'][^>]*>',text))
    if len(matches)!=1:raise ValueError('Expected one card-title group')
    m=matches[0];depth=1
    for t in re.finditer(r'</?'+re.escape(m['tag'])+r'\b[^>]*>',text[m.end():]):
        raw=t.group();depth+=-1 if raw.startswith('</') else (0 if raw.endswith('/>') else 1)
        if depth==0:return m.start(),m.end()+t.end()
    raise ValueError('Unclosed title group')

def apply(source,output=None,font=None,check=False):
    source=Path(source);raw=source.read_text();root=E.fromstring(raw.encode())
    view=[float(v) for v in root.get('viewBox','').split()]
    if view not in ([0,0,1060,1484],[0,0,1484,1060]):raise ValueError('Review unfamiliar canvas')
    old=root.xpath('//*[@id="card-title"]')[0]
    if old.getparent() is not root:raise ValueError('Review inherited title transforms')
    personality=bool(root.xpath('//*[@id="level-panel-vector"]')) or old.get('data-title-center-x')=='529.5'
    group,metrics=title_group(old.get('aria-label'),int(view[2]),personality,font or Path(__file__).with_name('Teko-SemiBold.ttf'))
    a,b=span(raw);replacement=E.tostring(group,encoding='unicode');edited=raw[:a]+replacement+raw[b:]
    changed=edited!=raw
    if not check:Path(output or source).write_text(edited)
    return {'changed':changed,'unrelated_svg_bytes_unchanged':True,**metrics}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('input',type=Path);p.add_argument('output',type=Path,nargs='?');p.add_argument('--font',type=Path);p.add_argument('--check',action='store_true');a=p.parse_args()
    result=apply(a.input,a.output,a.font,a.check);print(json.dumps(result,indent=2))
    if a.check and result['changed']:raise SystemExit(1)
