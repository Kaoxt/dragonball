"""Native SVG card composition: paths for every letter, border, stage and star.

Retained illustration and set-emblem pixels are intentionally raster. No AI call.
Run: python scripts/render.py --output /absolute/directory [--cards cards.json]
"""
from pathlib import Path
import argparse, base64, hashlib, html, io, json, math, os, subprocess
import xml.etree.ElementTree as ET
from PIL import Image, ImageChops, ImageStat
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT/'assets'
W,H = 1060,1484
BLACK_PATTERN = '<pattern id="black-diamonds" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#000000"/><path d="M7 0L14 7L7 14L0 7Z" fill="none" stroke="#101113" stroke-width="1"/></pattern>'
FONTS = {k:TTFont(ASSETS/'fonts'/v) for k,v in {
    'title':'Michroma-Regular.ttf','power':'BarlowCondensed-Bold.ttf',
    'footer':'BarlowCondensed-Regular.ttf','brand':'Rajdhani-SemiBold.ttf'}.items()}
NUMERALS = json.loads((ASSETS/'rounded-numerals.json').read_text())

def rounded_number(layers,metrics,ident,value,cx,cy,height,maxwidth=132):
    s=str(value)
    if not s.isdigit(): raise ValueError('Level/PUR must be a nonnegative integer.')
    paths=[]; bounds=[]; stroke=NUMERALS['stroke']
    for i,ch in enumerate(s):
        d=NUMERALS['paths'][ch]; dx=i*NUMERALS['advance']
        bp=BoundsPen(None); parse_path(d,TransformPen(bp,(1,0,0,1,dx,0)))
        bounds.append(bp.bounds)
        paths.append(f'<path transform="translate({dx} 0)" d="{d}"/>')
    b=(min(q[0] for q in bounds)-stroke/2,min(q[1] for q in bounds)-stroke/2,
       max(q[2] for q in bounds)+stroke/2,max(q[3] for q in bounds)+stroke/2)
    scale=min(height/(b[3]-b[1]),maxwidth/(b[2]-b[0]))
    tx=cx-(b[0]+b[2])*scale/2;ty=cy-(b[1]+b[3])*scale/2
    layers.append(f'<g id="{ident}" aria-label="{s}" fill="none" stroke="#fff" stroke-width="{stroke}" stroke-linejoin="round" stroke-linecap="round" transform="translate({tx:.8f} {ty:.8f}) scale({scale:.10f})">'+''.join(paths)+'</g>')
    metrics.append(dict(id=ident,text=s,font='rounded-native',size=height,
        bounds=[b[0]*scale+tx,b[1]*scale+ty,b[2]*scale+tx,b[3]*scale+ty]))

def digest(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def image(p, ident, x=0,y=0,w=W,h=H):
    data=base64.b64encode(Path(p).read_bytes()).decode()
    return f'<image id="{ident}" x="{x}" y="{y}" width="{w}" height="{h}" xlink:href="data:image/png;base64,{data}"/>'

def glyphrun(s,kind,size,tracking=0,sx=1):
    f=FONTS[kind];gs=f.getGlyphSet();cmap=f.getBestCmap()
    scale=size/f['head'].unitsPerEm;x=0;paths=[];bounds=[]
    for ch in s:
        name=cmap[ord(ch)];g=gs[name]
        pen=SVGPathPen(gs);g.draw(TransformPen(pen,(scale*sx,0,0,-scale,x,0)))
        bp=BoundsPen(gs);g.draw(bp)
        if bp.bounds:
            l,b,r,t=bp.bounds
            bounds.append((x+l*scale*sx,-t*scale,x+r*scale*sx,-b*scale))
            paths.append(f'<path d="{pen.getCommands()}"/>')
        x+=f['hmtx'][name][0]*scale*sx+tracking
    b=(min(q[0] for q in bounds),min(q[1] for q in bounds),max(q[2] for q in bounds),max(q[3] for q in bounds))
    return ''.join(paths),b

def text(layers,metrics,ident,s,kind,size,cx,cy,fill='#fff',tracking=0,sx=1,stroke=0,maxwidth=None):
    paths,b=glyphrun(s,kind,size,tracking,sx)
    while maxwidth is not None and b[2]-b[0]+stroke>maxwidth:
        size-=.25;paths,b=glyphrun(s,kind,size,tracking,sx)
    tx=cx-(b[0]+b[2])/2;ty=cy-(b[1]+b[3])/2
    layers.append(f'<g id="{ident}" aria-label="{html.escape(s)}" transform="translate({tx:.6f} {ty:.6f})" fill="{fill}" stroke="{fill if stroke else "none"}" stroke-width="{stroke}" stroke-linejoin="round" paint-order="stroke fill">{paths}</g>')
    metrics.append(dict(id=ident,text=s,font=kind,size=size,bounds=[b[0]+tx,b[1]+ty,b[2]+tx,b[3]+ty]))

def border(shape,fill='url(#dark-diamonds)',light=5.5,dark=10.5,ident='panel'):
    return f'<g id="{ident}"><{shape} fill="{fill}" stroke="#0a0a0a" stroke-width="{dark}" stroke-linejoin="miter"/><{shape} fill="none" stroke="#eee" stroke-width="{light}" stroke-linejoin="miter"/></g>'

def frame_parts(black_panels=False):
    root=ET.parse(ASSETS/'frame.svg').getroot()
    ET.register_namespace('','http://www.w3.org/2000/svg')
    defs=ET.tostring(next(x for x in root if x.tag.endswith('defs')),encoding='unicode')
    defs=defs.replace('fill="#101113"','fill="#17181a"').replace('fill="#17181a" stroke="#090a0b"','fill="none" stroke="#090a0b"')
    footer=''.join(ET.tostring(x,encoding='unicode') for x in root if x.get('id','').startswith('footer-'))
    if black_panels:
        defs=defs.replace('</defs>',BLACK_PATTERN+'</defs>')
        footer=footer.replace('url(#dark-diamonds)','url(#black-diamonds)')
    return defs,footer

def star(cx,cy,r=4.6):
    pts=[]
    for i in range(10):
        a=-math.pi/2+i*math.pi/5;rad=r if i%2==0 else r*.44565
        pts.append((rad*math.cos(a),rad*math.sin(a)))
    ox=(max(x for x,y in pts)+min(x for x,y in pts))/2
    oy=(max(y for x,y in pts)+min(y for x,y in pts))/2
    return ' '.join(f'{cx+x-ox:.5f},{cy+y-oy:.5f}' for x,y in pts)

STAR_POS={1:[(0,0)],2:[(-7,0),(7,0)],3:[(0,-7),(-7,6),(7,6)],
    4:[(-7,-7),(7,-7),(-7,7),(7,7)],5:[(0,0),(-9,-9),(9,-9),(-9,9),(9,9)],
    6:[(11*math.cos(-math.pi/2+i*math.pi/3),11*math.sin(-math.pi/2+i*math.pi/3)) for i in range(6)],
    7:[(0,0)]+[(13*math.cos(-math.pi/2+i*math.pi/3),13*math.sin(-math.pi/2+i*math.pi/3)) for i in range(6)]}

def stars(cx,cy,n,ident,scale=1):
    assert n in STAR_POS
    return f'<g id="{ident}" data-star-count="{n}">'+''.join(f'<polygon fill="#b91d0d" points="{star(cx+x*scale,cy+y*scale,4.3*scale)}"/>' for x,y in STAR_POS[n])+'</g>'

def cluster_stars(cx,cy,n):
    # Match the fuller, softly rounded red stars in the retained original emblem.
    # Keep this independent of the small footer rarity-star styling.
    positions={
        1:[(0,0)], 2:[(-9,0),(9,0)],
        3:[(-9,-7),(9,-7),(0,9)],
        4:[(-9,-9),(9,-9),(-9,9),(9,9)],
        5:[(0,0),(-11,-11),(11,-11),(-11,11),(11,11)],
        6:[(16*math.cos(-math.pi/2+i*math.pi/3),16*math.sin(-math.pi/2+i*math.pi/3)) for i in range(6)],
        7:[(0,0)]+[(16*math.cos(-math.pi/2+i*math.pi/3),16*math.sin(-math.pi/2+i*math.pi/3)) for i in range(6)]}
    pts=[]
    for i in range(10):
        a=-math.pi/2+i*math.pi/5; r=7.0 if i%2==0 else 3.95
        pts.append((r*math.cos(a),r*math.sin(a)))
    ox=(min(x for x,y in pts)+max(x for x,y in pts))/2
    oy=(min(y for x,y in pts)+max(y for x,y in pts))/2
    paths=[]
    for dx,dy in positions[n]:
        q=[(cx+dx+x-ox,cy+dy+y-oy) for x,y in pts]
        corners=[]
        for i,(x,y) in enumerate(q):
            prev=q[(i-1)%10];nxt=q[(i+1)%10]
            corners.append(((x+(prev[0]-x)*.15,y+(prev[1]-y)*.15),(x,y),(x+(nxt[0]-x)*.15,y+(nxt[1]-y)*.15)))
        d=f'M{corners[0][0][0]:.5f},{corners[0][0][1]:.5f}'
        for a,b,c in corners:
            d+=f' L{a[0]:.5f},{a[1]:.5f} Q{b[0]:.5f},{b[1]:.5f} {c[0]:.5f},{c[1]:.5f}'
        paths.append(f'<path d="{d}Z" fill="#d61107"/>')
    return f'<g id="cluster-stars-{n}" data-star-count="{n}">'+''.join(paths)+'</g>'

def cluster_ball(cx,cy,n,r):
    # All seven orbs and their 28 stars are geometric vector objects.
    return f'<g id="dragon-ball-{n}"><circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#orb)" stroke="#321600" stroke-width="3"/><circle cx="{cx}" cy="{cy}" r="{r-2}" fill="none" stroke="#ffd45a" stroke-width="1.8"/><ellipse cx="{cx-r*.32}" cy="{cy-r*.48}" rx="{r*.23}" ry="{r*.32}" transform="rotate(35 {cx-r*.32} {cy-r*.48})" fill="#fff9d8" opacity=".92"/>'+cluster_stars(cx,cy,n)+'</g>'

def footer(layers,metrics,number,rarity_stars,combat_match=False):
    _,paths=frame_parts(black_panels=combat_match)
    if combat_match:
        panel=ET.parse(ASSETS/'combat-footer-center.svg').getroot()
        layers.extend(ET.tostring(x,encoding='unicode') for x in panel)
    layers.append(f'<g id="shared-footer">{paths}</g>')
    layers.append(image(ASSETS/'saiyan-set-logo.png','saiyan-set-emblem',107,1365,84,66))
    text(layers,metrics,'footer-brand','DRAGON BALL Z','brand' if combat_match else 'footer',30 if combat_match else 29,530,1400,tracking=6 if combat_match else 4,fill='#f4f4f4')
    text(layers,metrics,'footer-disclaimer','Not endorsed by Toei Animation or Funimation','footer',25,530,1439,fill='#efefef')
    _,b=glyphrun(str(number),'title',42.5,.255,.78)
    nw=b[2]-b[0]+2.125;bw=60.8*.85;gap=15.3
    left=907-(bw+gap+nw)/2;cx=left+bw/2;nx=left+bw+gap+nw/2
    center_y=1397.5 if combat_match else 1401
    sphere=ASSETS/'rarity-ball-blank.png'
    with Image.open(sphere) as im: l,t,r,b=im.getchannel('A').getbbox()
    ox,oy=((l+r)/2,(t+b)/2) if combat_match else (31.5,32)
    layers.append(image(sphere,'rarity-orb-raster',cx-ox*.85,center_y-oy*.85,64*.85,64*.85))
    layers.append(stars(cx,center_y,rarity_stars,'rarity-stars'))
    text(layers,metrics,'card-number',str(number),'title',42.5,nx,center_y,tracking=.255,sx=.78,stroke=2.125)

def make_underlay(card,out):
    source=ASSETS/card['reference'];im=Image.open(source).convert('RGB')
    assert im.size==(W,H)
    # Preserve the complete reference pixels. Native panels cover old graphics;
    # optional background restoration is restricted to legacy lower footprints.
    p=out/(card['id']+'-underlay.png');im.save(p)
    return source,p

def earth(layers,metrics,c):
    if c['number']==16:
        encoded=base64.b64encode((ASSETS/'earth-two-original.png').read_bytes()).decode()
        layers.append('<defs><clipPath id="two-star-orb-clip"><ellipse cx="535" cy="770" rx="238" ry="220"/></clipPath></defs>')
        layers.append(f'<g id="retained-two-star-orb" clip-path="url(#two-star-orb-clip)"><image x="1" y="320" width="1060" height="1484" xlink:href="data:image/png;base64,{encoded}"/></g>')
        for k,cx in enumerate([462,607]):
            layers.append(f'<polygon id="large-star-{k+1}" data-star-count="1" fill="#d93209" points="{star(cx,759,55)}"/>')
    # Card-specific placement preserves the full-art approved composition.
    layers.append(border('rect x="68" y="67" width="924" height="83" rx="41.5"',ident='title-panel',fill='url(#black-diamonds)'))
    text(layers,metrics,'card-title',c['name'].upper(),'title',48,530,108.5,tracking=.9,sx=.84,stroke=2.5,maxwidth=858)
    layers.append(border('path d="M184 954 H976 A47 47 0 0 1 976 1048 H184Z"',light=5,dark=9.5,ident='category-panel',fill='url(#black-diamonds)'))
    layers.append('<rect id="rules-panel" x="25" y="1054" width="1010" height="286" rx="44" fill="url(#rules-white)" stroke="#0a0a0a" stroke-width="3"/>')
    text(layers,metrics,'card-category','DRAGON BALL','title',50,607,1001,tracking=4,sx=.84,stroke=2.5,maxwidth=700)
    lines=c['rules']
    assert 1 <= len(lines) <= 3, 'Dragon Ball rules require one to three lines; adjust the native layout for more.'
    centers=[1197+(i-(len(lines)-1)/2)*59 for i in range(len(lines))]
    for i,(line,cy) in enumerate(zip(lines,centers)):
        text(layers,metrics,f'rules-line-{i+1}',line,'power',49,530,cy,fill='#060606',maxwidth=900)
    for cx,cy,n,r in [(134,994,1,33),(78,1026,2,33),(188,1020,3,34),(136,1065,4,35),(73,1089,5,36),(143,1120,6,35),(204,1080,7,36)]:
        layers.append(cluster_ball(cx-11,cy-64,n,r))

def personality(layers,metrics,c):
    layers.append(border('rect x="34" y="51" width="990" height="102" rx="51"',ident='title-panel'))
    text(layers,metrics,'card-title',c['name'].upper(),'title',53,590,102,tracking=4,sx=.84,stroke=2.5,maxwidth=750)
    layers.append(border('path d="M51 48 H186 L206 70 V121 L186 141 H49 L31 122 V72Z"',ident='level-badge'))
    layers.append(border('rect x="36" y="143" width="162" height="31"',light=4,dark=8,ident='level-label-panel'))
    rounded_number(layers,metrics,'mp-level',c['level'],118,94,60)
    text(layers,metrics,'level-label','LEVEL','title',22,117,158.5,tracking=3,sx=.82,stroke=.7)
    # Native panels cover both historical placements, with a regular 62px pitch.
    for i,value in enumerate(c['stages']):
        y=185+i*62
        d=f'M780 {y} H1040 V{y+42} L1020 {y+60} H760 V{y+19}Z'
        layers.append(border(f'path d="{d}"',fill='url(#stage-blue)',light=4.8,dark=10,ident=f'power-stage-panel-{i}'))
        text(layers,metrics,f'power-stage-value-{i}',f'{value:,}','title',37,949,y+30,stroke=2.0,sx=.80,maxwidth=230)
    # One full-art MP layout; only the rounded panels themselves have backing.

    layers.append(border('rect x="64" y="917" width="961" height="115" rx="57.5"',ident='personality-panel'))
    layers.append('<rect id="rules-panel" x="28" y="1037" width="1004" height="303" rx="43" fill="url(#rules-white)" stroke="#0a0a0a" stroke-width="3"/>')
    text(layers,metrics,'mp-alignment',c['alignment'].upper(),'title',47,606,974.5,tracking=4,sx=.84,stroke=2.5,maxwidth=800)
    layers.append(border('circle cx="116" cy="972" r="87"',ident='pur-panel'))
    text(layers,metrics,'pur-label','PUR','title',29,116,931,tracking=3,sx=.82,stroke=.7)
    rounded_number(layers,metrics,'pur-value',c['pur'],116,994,65.36)
    rows=c['rules'];leading=62;center=1188.5
    for i,line in enumerate(rows):
        text(layers,metrics,f'rules-line-{i+1}',line,'power',49,530,center+(i-(len(rows)-1)/2)*leading,fill='#060606',maxwidth=920)

def render(card,out):
    out.mkdir(parents=True,exist_ok=True)
    source,underlay=make_underlay(card,out)
    defs,shared_footer=frame_parts(black_panels=card['kind']=='dragon-ball')
    defs=defs.replace('</defs>','''<radialGradient id="orb" cx=".31" cy=".26" r=".78"><stop stop-color="#fff2a6"/><stop offset=".28" stop-color="#ffc43f"/><stop offset=".68" stop-color="#ff9708"/><stop offset="1" stop-color="#df6100"/></radialGradient><linearGradient id="stage-blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0a2545"/><stop offset=".5" stop-color="#031422"/><stop offset="1" stop-color="#02070d"/></linearGradient></defs>''')
    layers=[defs,image(underlay,'retained-illustration')];metrics=[]
    if card['kind']=='main-personality' and card.get('lower_background'):
        # Replace only old lower graphic footprints; retain the original art
        # around their contours. Blend the footer backdrop outside those shapes.
        layers.append('<defs><linearGradient id="footer-art-fade" x1="0" y1="1310" x2="0" y2="1340" gradientUnits="userSpaceOnUse"><stop stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient><mask id="lower-art-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1060" height="1484"><rect width="1060" height="1484" fill="#000"/><rect x="0" y="1310" width="1060" height="174" fill="url(#footer-art-fade)"/><circle cx="116" cy="1012" r="93" fill="#fff"/><rect x="62" y="952" width="966" height="124" rx="62" fill="#fff"/><rect x="25" y="1071" width="1010" height="289" rx="46" fill="#fff"/></mask></defs>')
        layers.append('<g id="lower-art-restoration" mask="url(#lower-art-mask)">'+image(ASSETS/card['lower_background'],'lower-landscape')+'</g>')
    if card['kind']=='dragon-ball' and card.get('graphics_restoration'):
        # Restore only legacy category/orb footprints exposed by the new layout.
        old_orbs=[(134,994,33),(78,1026,33),(188,1020,34),(136,1065,35),(73,1089,36),(143,1120,35),(204,1080,36)]
        patches='<rect x="68" y="1009" width="956" height="101" rx="50.5"/>'+''.join(f'<circle cx="{x}" cy="{y}" r="{r+5}"/>' for x,y,r in old_orbs)
        layers.append('<defs><clipPath id="earth-legacy-graphics">'+patches+'</clipPath></defs>')
        layers.append('<g id="earth-graphics-restoration" clip-path="url(#earth-legacy-graphics)">'+image(ASSETS/card['graphics_restoration'],'earth-restored-art')+'</g>')
    if card['kind']=='dragon-ball':
        layers.append('<path id="solid-black-footer-gap" d="M32 1305 H1028 V1355 H826 L786 1398 H760 L739 1391 H321 L300 1398 H274 L234 1355 H32Z" fill="#000000"/>')
    footer(layers,metrics,card['number'],card['rarity_stars'],combat_match=card['kind']=='dragon-ball')
    if card['kind']=='main-personality':
        for i,layer in enumerate(layers):
            if 'id="footer-brand"' in layer or 'id="footer-disclaimer"' in layer:
                layers[i]=layer.replace('stroke="none" stroke-width="0"','stroke="#080808" stroke-width="3.5"')
    if card['kind']=='dragon-ball': earth(layers,metrics,card)
    elif card['kind']=='main-personality': personality(layers,metrics,card)
    else: raise ValueError('New card types require a native vector layout; never fall back to AI text/frames.')
    body=''.join(layers)
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1060" height="1484" viewBox="0 0 1060 1484"><title>{html.escape(card["name"])}</title><desc>Outlined font paths and native vector frame. Illustration, set emblem and rarity sphere retain raster pixels.</desc>{body}</svg>'
    path=out/(card['id']+'.svg');path.write_text(svg)
    png=out/(card['id']+'.png')
    subprocess.run(['inkscape',str(path),'--export-filename='+str(png),'--export-width=2120'],check=True,capture_output=True)
    hi=Image.open(png).convert('RGB');hi.load()
    # Publish complete PNG bytes atomically after the external renderer exits.
    data=io.BytesIO();hi.save(data,format='PNG')
    temp=png.with_suffix('.png.tmp')
    with temp.open('wb') as handle:
        handle.write(data.getvalue());handle.flush();os.fsync(handle.fileno())
    temp.replace(png)
    hi.save(out/(card['id']+'.webp'),lossless=True,method=6)
    preview=hi.resize((W,H),Image.Resampling.LANCZOS)
    preview.save(out/(card['id']+'-preview.png'))
    preview.save(out/(card['id']+'-preview.webp'),'WEBP',quality=92,method=6)
    protected=(250,200,700,520) if card['number']==16 else (250,200,700,850)
    art_difference=ImageStat.Stat(ImageChops.difference(preview.crop(protected),Image.open(source).convert('RGB').crop(protected))).mean
    assert max(art_difference)<5, f'Retained illustration missing or altered: {art_difference}'
    root=ET.fromstring(svg);ns={'s':'http://www.w3.org/2000/svg'}
    assert not root.findall('.//s:text',ns),'Type must be portable font outlines.'
    assert all(x['bounds'][0]>20 and x['bounds'][2]<1040 for x in metrics)
    assert Image.open(out/(card['id']+'.webp')).convert('RGB').tobytes()==hi.tobytes()
    if card['kind']=='dragon-ball':
        for n in range(1,8):
            grp=root.find(f'.//s:g[@id="cluster-stars-{n}"]',ns)
            assert len(grp)==n
    if card['kind']=='main-personality':
        assert len([m for m in metrics if m['id'].startswith('power-stage-value')])==len(card['stages'])
    return dict(id=card['id'],dimensions=[2120,2968],text_and_frame='native vector paths',
        source_sha256=digest(source),underlay_sha256=digest(underlay),footer_geometry_sha256=hashlib.sha256(shared_footer.replace("url(#black-diamonds)","url(#dark-diamonds)").encode()).hexdigest(),
        raster_components=['retained illustration','Saiyan Saga emblem','rarity sphere (stars are vector)']+(['restored lower landscape'] if card.get('lower_background') else [])+(['masked restoration of old category/orb footprints'] if card.get('graphics_restoration') else []),
        typography=metrics,artwork_render_mean_difference=art_difference,lossless_webp_verified=True,svg_sha256=digest(path))

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--cards',type=Path,default=ROOT/'references/cards.json');args=p.parse_args()
    cards=json.loads(args.cards.read_text())['cards']
    report=[render(c,args.output) for c in cards]
    assert len({x['footer_geometry_sha256'] for x in report})==1
    (args.output/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
    print(f'Rendered and verified {len(report)} cards: native type/frame, matching footer, lossless exports.')
if __name__=='__main__':main()
