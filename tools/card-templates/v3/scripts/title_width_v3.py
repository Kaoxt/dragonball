"""Widen only the title paint and center title ink without punctuation bias."""
from pathlib import Path
from xml.parsers import expat
from lxml import etree as E
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
import re,math

IDS = ('shared-title-material', 'shared-footer-material', 'card-title')

def spans(data):
    parser=expat.ParserCreate();stack=[];found={}
    def start(name,attrs):
        pos=parser.CurrentByteIndex
        stack.append((attrs.get('id'),pos,data.index(b'>',pos)+1))
    def end(name):
        id,start,inner=stack.pop();end=parser.CurrentByteIndex
        if id in IDS:found[id]=(start,inner,end,data.index(b'>',end)+1)
    parser.StartElementHandler=start;parser.EndElementHandler=end;parser.Parse(data,True)
    assert all(id in found for id in IDS),found.keys()
    return found

def center_title(root):
    el=root.xpath('//*[@id="card-title"]')[0];label=el.get('aria-label')
    chars=[c for c in label if not c.isspace()]
    paths=list(el)
    assert len(chars)==len(paths),(label,len(chars),len(paths))
    all_bounds=[];letter_bounds=[]
    for char,path in zip(chars,paths):
        assert E.QName(path).localname=='path'
        pen=BoundsPen(None);parse_path(path.get('d'),pen);b=pen.bounds
        assert b is not None
        m=re.fullmatch(r'translate\(([-+\d.eE]+)(?:[ ,]+([-+\d.eE]+))?\)',path.get('transform',''))
        assert m,(label,path.get('transform'))
        dx=float(m[1]);dy=float(m[2] or 0);x0,y0,x1,y1=b
        b=(x0+dx,y0+dy,x1+dx,y1+dy);all_bounds.append(b)
        if char.isalnum():letter_bounds.append(b)
    assert letter_bounds
    transform=el.get('transform');m=re.fullmatch(r'translate\(([-+\d.eE]+)[ ,]+([-+\d.eE]+)\) scale\(([-+\d.eE]+)[ ,]+([-+\d.eE]+)\)',transform)
    assert m,(label,transform)
    x,y,sx,sy=map(float,m.groups());assert sx>0 and sy<0
    width=float(root.get('viewBox').split()[2]);cx=(width-1)/2;cy=79
    mx=(min(b[0] for b in all_bounds)+max(b[2] for b in all_bounds))/2
    my=(min(b[1] for b in letter_bounds)+max(b[3] for b in letter_bounds))/2
    nx=cx-mx*sx;ny=cy-my*sy
    dx=nx-x;dy=ny-y
    # Preserve the original source bytes when rounding is the only difference.
    if abs(dx)<1e-7:nx=x;dx=0
    if abs(dy)<1e-7:ny=y;dy=0
    replacement=f'translate({nx:.12f} {ny:.12f}) scale({m[3]} {m[4]})'
    return transform,replacement,{'horizontal_center':cx,'letter_vertical_center':cy,'dx':dx,'dy':dy,'punctuation_excluded_from_vertical_measurement':True,'label':label}

def change(data):
    pos=spans(data);root=E.fromstring(data);old,new,report=center_title(root)
    ts,ti,te,tx=pos['shared-title-material'];fs,fi,fe,fx=pos['shared-footer-material'];cs,ci,ce,cx=pos['card-title']
    title=data[ts:ti]+data[fi:fe]+data[te:tx]
    text=data[cs:cx]
    if report['dx'] or report['dy']:
        text=text.replace(('transform="'+old+'"').encode(),('transform="'+new+'"').encode(),1)
        # A retained visible-center label describes full-ink horizontal and letter-band vertical centers.
        text=re.sub(rb' data-visible-center="[^"]*"', b' data-visible-center="'+f"{report['horizontal_center']} 79".encode()+b'"', text, count=1)
    text=text.replace(b'data-title-vertical-alignment="complete-visible-ink-bounds"',b'data-title-vertical-alignment="letters-and-digits-visible-ink-bounds"')
    edits=[(ts,tx,title),(cs,cx,text)]
    result=data
    for a,b,s in sorted(edits,reverse=True):result=result[:a]+s+result[b:]
    return result,report

def revert_segments(before,after):
    a=spans(before);b=spans(after)
    return [{'id':id,'before':before[a[id][0]:a[id][3]].decode(),'after':after[b[id][0]:b[id][3]].decode()} for id in ['shared-title-material','card-title'] if before[a[id][0]:a[id][3]]!=after[b[id][0]:b[id][3]]]
