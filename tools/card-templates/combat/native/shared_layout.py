"""Shared native panel geometry and typography for DB OCG master cards."""
from pathlib import Path
from copy import deepcopy
import re
import xml.etree.ElementTree as E
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

NS='http://www.w3.org/2000/svg'
E.register_namespace('',NS)
E.register_namespace('xlink','http://www.w3.org/1999/xlink')

def node(root,ident):
    return next((n for n in root.iter() if n.get('id')==ident),None)

def text(fontfile,ident,label,size,cx,cy,tracking=0,sx=1,stroke=0,fill='#fff',maxwidth=None):
    font=TTFont(fontfile);gs=font.getGlyphSet();cmap=font.getBestCmap()
    while True:
        scale=size/font['head'].unitsPerEm;x=0;paths=[];bounds=[]
        for ch in label:
            name=cmap[ord(ch)];g=gs[name]
            pen=SVGPathPen(gs);g.draw(TransformPen(pen,(scale*sx,0,0,-scale,x,0)))
            bp=BoundsPen(gs);g.draw(bp)
            if bp.bounds:
                l,b,r,t=bp.bounds;bounds.append((x+l*scale*sx,-t*scale,x+r*scale*sx,-b*scale))
                paths.append(pen.getCommands())
            x+=font['hmtx'][name][0]*scale*sx+tracking
        b=(min(q[0] for q in bounds),min(q[1] for q in bounds),max(q[2] for q in bounds),max(q[3] for q in bounds))
        if maxwidth is None or b[2]-b[0]<=maxwidth:break
        size-=.5
    font.close()
    out=E.Element('{'+NS+'}g',{'id':ident,'aria-label':label,
        'transform':f'translate({cx-(b[0]+b[2])/2:.6f} {cy-(b[1]+b[3])/2:.6f})',
        'fill':fill,'stroke':fill if stroke else 'none','stroke-width':str(stroke),
        'stroke-linejoin':'round','paint-order':'stroke fill','data-font-size':str(size),
        'data-tracking':str(tracking),'data-width-factor':str(sx)})
    for d in paths:E.SubElement(out,'{'+NS+'}path',d=d)
    return out

def replace(root,old,new):
    old=[n for n in old if n is not None]
    assert old,'Missing expected panel'
    parents={n:p for p in root.iter() for n in p}
    first=old[0];parent=parents[first];index=list(parent).index(first)
    for n in old:parents[n].remove(n)
    for i,n in enumerate(new):parent.insert(index+i,n)

def apply_layout(svg,kind,font_dir,parts_path):
    root=E.fromstring(svg) if isinstance(svg,(str,bytes)) else deepcopy(svg)
    parts=E.parse(parts_path).getroot();font_dir=Path(font_dir)
    oldcat=node(root,'mp-alignment')
    if oldcat is None:oldcat=node(root,'card-category')
    assert oldcat is not None
    category=oldcat.get('aria-label')
    oldtitle=node(root,'card-title');label=oldtitle.get('aria-label')
    replace(root,[node(root,'title-panel'),node(root,'title-border')],[deepcopy(node(parts,'title-panel'))])
    categorypanel=node(root,'personality-panel')
    if categorypanel is None:categorypanel=node(root,'category-panel')
    if categorypanel is None:
        categorypanel=next(n for n in root if any(re.sub(r'\s|,','',c.get('d','')).startswith('M184954H976A47') for c in n))
    fill=categorypanel.get('fill') or next(c.get('fill') for c in categorypanel if c.get('fill') not in (None,'none'))
    if fill=='url(#dark-diamonds)' and kind=='combat':fill='url(#style-diamonds)'
    canonical=deepcopy(node(parts,'category-panel'))
    canonical[0].set('fill',fill)
    replace(root,[categorypanel,node(root,'combat-border')],[canonical])
    rulepanel=node(root,'rules-panel')
    if rulepanel is None:rulepanel=node(root,'rules-panel-outline')
    replace(root,[rulepanel],[deepcopy(node(parts,'rules-panel'))])

    # Retain type-specific artwork while using one exact lower frame.
    footer_ids={'solid-black-footer-gap','black-footer-inset','shared-footer','charcoal-footer-center',
                'footer-panels','footer-center-bridge','footer-upper-left','footer-upper-right',
                'footer-lower-left','footer-lower-right'}
    oldfooter=[n for n in root if n.get('id') in footer_ids]
    for parent in root.iter():
        for child in list(parent):
            if child.get('id')=='charcoal-center-fill':parent.remove(child)
    replace(root,oldfooter,[deepcopy(node(parts,'solid-black-footer-gap')),deepcopy(node(parts,'shared-footer'))])
    replace(root,[node(root,'saiyan-set-emblem')],[deepcopy(node(parts,'saiyan-set-emblem'))])
    for ident,size,cy,tracking,font,fill in [
        ('footer-brand',30,1400,6,'Rajdhani-SemiBold.ttf','#f4f4f4'),
        ('footer-disclaimer',25,1439,0,'BarlowCondensed-Regular.ttf','#efefef')]:
        old=node(root,ident)
        replace(root,[old],[text(font_dir/font,ident,old.get('aria-label'),size,530,cy,tracking,fill=fill)])

    replace(root,[oldcat],[text(font_dir/'Michroma-Regular.ttf','card-category',category,50,607,1001,4,.84,2.5)])
    titlecx=590 if kind=='personality' else 530
    titlelimit=750 if kind=='personality' else 900
    replace(root,[oldtitle],[text(font_dir/'Michroma-Regular.ttf','card-title',label,50,titlecx,76.5,4,.84,2.5,maxwidth=titlelimit)])
    group=node(root,'footer-rarity-number')
    if group is None:
        items=[n for n in root if n.get('id') in {'rarity-orb-raster','common-rarity-sphere','rarity-stars','card-number'} or n.get('id','').startswith('rarity-star-')]
        assert len(items)>=3
        group=E.Element('{'+NS+'}g',id='footer-rarity-number')
        first=list(root).index(items[0])
        for item in items:root.remove(item);group.append(item)
        root.insert(first,group)
    group.set('transform','translate(907 1397.5) scale(0.81) translate(-907 -1397.5)')
    group.set('data-scale','0.81');group.set('data-anchor','907 1397.5')
    root.set('data-shared-layout','2026-10-18-unified')
    # Patterns have identical definitions across all three source masters.
    for ident in ['black-diamonds','rules-white']:
        existing=node(root,ident);replacement=node(parts,ident)
        if existing is not None:replace(root,[existing],[deepcopy(replacement)])
        else:root.insert(0,deepcopy(replacement))
    return E.tostring(root,encoding='unicode')
