"""Rebuild Saiyan Saga #1–5 from native frame/type and retained raster artwork.

Run: python tools/card-templates/combat/native/render.py
Requires Python Pillow, NumPy, SciPy, fontTools, and the Inkscape CLI.
The SVGs are production masters; their text is outlined for portable rendering.
Card wording and line breaks are editable in cards-001-005.json.
"""
from pathlib import Path
import base64, hashlib, html, json, math, re, subprocess
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_dilation, convolve, distance_transform_edt
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
OUT = HERE / 'output'
OUT.mkdir(exist_ok=True)
DATA = json.loads((HERE / 'cards-001-005.json').read_text())
W,H = 1060,1484
FONTS = {k:TTFont(HERE/'fonts'/f) for k,f in {
    'title':'Michroma-Regular.ttf','power':'BarlowCondensed-Bold.ttf',
    'footer':'BarlowCondensed-Regular.ttf'}.items()}

def uri(path):
    return 'data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode()

def glyphrun(text,kind,size,tracking=0,sx=1):
    font=FONTS[kind];gs=font.getGlyphSet();cmap=font.getBestCmap()
    scale=size/font['head'].unitsPerEm;x=0;parts=[];bounds=[]
    for ch in text:
        name=cmap[ord(ch)];g=gs[name]
        pen=SVGPathPen(gs);g.draw(TransformPen(pen,(scale*sx,0,0,-scale,x,0)))
        bp=BoundsPen(gs);g.draw(bp)
        if bp.bounds:
            l,b,r,t=bp.bounds
            bounds.append((x+l*scale*sx,-t*scale,x+r*scale*sx,-b*scale))
            parts.append(f'<path d="{pen.getCommands()}"/>')
        x+=font['hmtx'][name][0]*scale*sx+tracking
    b=(min(q[0] for q in bounds),min(q[1] for q in bounds),max(q[2] for q in bounds),max(q[3] for q in bounds))
    return ''.join(parts),b

def width(text,kind,size,tracking=0,sx=1):
    _,b=glyphrun(text,kind,size,tracking,sx);return b[2]-b[0]

def textline(layers,metrics,id,text,kind,size,cx,cy=None,baseline=None,tracking=0,sx=1,stroke=0,fill='#fff'):
    paths,b=glyphrun(text,kind,size,tracking,sx)
    x=cx-(b[0]+b[2])/2;y=baseline if baseline is not None else cy-(b[1]+b[3])/2
    layers.append(f'<g id="{id}" aria-label="{html.escape(text)}" transform="translate({x:.6f},{y:.6f})" fill="{fill}" stroke="{fill if stroke else "none"}" stroke-width="{stroke}" stroke-linejoin="round" paint-order="stroke fill">{paths}</g>')
    metrics.append({'id':id,'text':text,'font':kind,'size':size,'tracking':tracking,'width_factor':sx,'baseline':y,'bounds':[b[0]+x,b[1]+y,b[2]+x,b[3]+y]})

def image_element(id,path,x,y,w,h):
    return f'<image id="{id}" x="{x}" y="{y}" width="{w}" height="{h}" xlink:href="{uri(path)}"/>'

def svg(body,title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1060" height="1484" viewBox="0 0 1060 1484"><title>{html.escape(title)}</title>{body}</svg>'

# Reuse the exact approved native geometry. The physical-combat bar gets the
# established amber palette while its texture spacing stays constant.
frame=(HERE/'assets/frame.svg').read_text()
frame=frame[frame.index('<defs>'):frame.rindex('</svg>')]
frame=frame.replace('fill="#101113"','fill="#17181a"').replace('fill="#17181a" stroke="#090a0b"','fill="none" stroke="#090a0b"')
frame=frame.replace('</defs>','''<pattern id="orange-diamonds" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#95631f"/><path d="M7 0L14 7L7 14L0 7Z" fill="none" stroke="#805119" stroke-width=".65"/></pattern></defs>''')
frame=frame.replace('<g fill="url(#dark-diamonds)"><path d="M184,954','<g fill="url(#orange-diamonds)"><path d="M184,954')

# KanjiVG's Orange glyph, no stroke numbers, centered by actual vector bounds.
# Attribution/Share-Alike are retained with the source and README.
root=ET.parse(HERE/'assets/orange-kanji-source.svg').getroot()
ns={'s':'http://www.w3.org/2000/svg'}
orange_paths=[p.get('d') for p in root.findall('.//s:path',ns)]
orange_symbol='<g id="orange-style-symbol" aria-label="Orange style: 橙" transform="translate(123,995.5) scale(1.17) translate(-53.5,-55.5)" fill="none" stroke="#fff" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round">'+''.join(f'<path d="{d}"/>' for d in orange_paths)+'</g>'

# Preserve the approved amber sphere lighting and edge; replace only old stars.
original=Image.open(HERE/'assets/rarity-ball-three-stars.png').convert('RGBA')
a=np.array(original).astype(float);rgb=a[:,:,:3]
yy,xx=np.indices(a.shape[:2]);central=(xx>10)&(xx<46)&(yy>13)&(yy<49)
red=(rgb[:,:,0]>rgb[:,:,1]*1.9)&(rgb[:,:,1]<130)&central
mask=binary_dilation(red,iterations=2)
indices=distance_transform_edt(mask,return_distances=False,return_indices=True)
fill=rgb[tuple(indices)].copy()
kernel=np.array([[0,1,0],[1,0,1],[0,1,0]],float)/4
for _ in range(450):
    sm=np.stack([convolve(fill[:,:,c],kernel,mode='nearest') for c in range(3)],axis=2)
    fill[mask]=sm[mask]
a[:,:,:3][mask]=fill[mask]
Image.fromarray(np.uint8(np.clip(a,0,255))).save(HERE/'assets/rarity-ball-blank.png')

def ball(cx,cy):
    # Same .85 scaling as the user's final approved smaller ball, ~51px visible.
    parts=[image_element('common-rarity-sphere',HERE/'assets/rarity-ball-blank.png',cx-31.5*.85,cy-32*.85,64*.85,64*.85)]
    # Five-point star centered by its visible bounding box, not its circumcircle.
    pts=[]
    for i in range(10):
        ang=-math.pi/2+i*math.pi/5;r=4.6 if i%2==0 else 2.05
        pts.append((r*math.cos(ang),r*math.sin(ang)))
    ox=(min(p[0] for p in pts)+max(p[0] for p in pts))/2
    oy=(min(p[1] for p in pts)+max(p[1] for p in pts))/2
    points=' '.join(f'{cx+x-ox:.4f},{cy+y-oy:.4f}' for x,y in pts)
    parts.append(f'<polygon id="common-rarity-one-star" fill="#b91d0d" points="{points}"/>')
    return ''.join(parts)

def swords(cx,cy):
    # A matched pair of native swords, actual silhouette centered at the origin.
    blade='M-4,-29 L0,-35 L4,-29 L4,9 L10,9 L10,14 L3,14 L3,27 L5,29 L5,34 L-5,34 L-5,29 L-3,27 L-3,14 L-10,14 L-10,9 L-4,9Z'
    return f'<g id="physical-attack-icon" transform="translate({cx},{cy})" fill="#060606"><path d="{blade}" transform="rotate(45)"/><path d="{blade}" transform="rotate(-45)"/></g>'

report=[]
for card in DATA['cards']:
    n=card['number'];slug=f'saiyan-{n:03}-'+card['name'].lower().replace(' ','-')
    layers=[];metrics=[]
    # The final SVG is self-contained: retained illustration plus vector panels,
    # border rails, glyph outlines, symbols, and the precisely placed footer.
    layers.append(image_element('orange-texture',HERE/'assets/orange-base.png',0,0,W,H))
    layers.append(image_element('retained-artwork',HERE/'artwork'/f'saiyan-{n:03}.png',0,156,1060,794))
    layers.append(frame);layers.append(orange_symbol)
    layers.append(image_element('saiyan-set-emblem',HERE/'assets/saiyan-set-logo.png',107,1365,84,66))
    title=card['name'].upper();size=50
    while width(title,'title',size,.9,.84)>900:size-=.5
    textline(layers,metrics,'card-title',title,'title',size,530,76.5,tracking=.9,sx=.84,stroke=2.5)
    textline(layers,metrics,'card-category','PHYSICAL COMBAT','title',50,607,1001,tracking=.9,sx=.84,stroke=2.5)
    power_size=49;leading=59
    rows=card['rules']
    # Two centered baselines; outline bounds and icon share the first-line center.
    baselines=[(1182 if len(rows)==2 else 1156)+i*leading for i in range(len(rows))]
    for i,(line,baseline) in enumerate(zip(rows,baselines)):
        w=width(line,'power',power_size);cx=530
        if i==0:
            fullw=w+62+15;left=530-fullw/2
            cx=left+62+15+w/2
            _,b=glyphrun(line,'power',power_size)
            layers.append(swords(left+31,baseline+(b[1]+b[3])/2))
            assert left>=60 and left+fullw<=1000,(n,'power overflow',fullw)
        textline(layers,metrics,f'card-power-line-{i+1}',line,'power',power_size,cx,baseline=baseline,fill='#060606')
    textline(layers,metrics,'footer-brand','DRAGON BALL Z','footer',29,530,1400,tracking=4,fill='#f4f4f4')
    textline(layers,metrics,'footer-disclaimer','Not endorsed by Toei Animation or Funimation','footer',25,530,1439,fill='#efefef')
    numberw=width(str(n),'title',42.5,.255,.78)+2.125
    ballw=60.8*.85;gap=15.3
    left=907-(ballw+gap+numberw)/2
    ballcx=left+ballw/2;numcx=left+ballw+gap+numberw/2
    layers.append(ball(ballcx,1401))
    textline(layers,metrics,'card-number',str(n),'title',42.5,numcx,1401,tracking=.255,sx=.78,stroke=2.125)
    path=OUT/(slug+'.svg');path.write_text(svg(''.join(layers),card['name']))
    # Render true vector type/frame at 2x; illustration remains retained raster.
    png=OUT/(slug+'.png')
    subprocess.run(['inkscape',str(path),'--export-filename='+str(png),'--export-width=2120'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    high=Image.open(png).convert('RGB')
    highpath=REPO/'public/assets/cards/downloads'/(slug+'.webp');highpath.parent.mkdir(parents=True,exist_ok=True)
    high.save(highpath,'WEBP',lossless=True,method=6)
    display=high.resize((W,H),Image.Resampling.LANCZOS)
    displaypath=REPO/'public/assets/cards'/(slug+'.webp')
    display.save(displaypath,'WEBP',quality=96,method=6)
    # Native text & geometry checks before publishing, recorded with each card.
    assert all(m['bounds'][0]>=50 and m['bounds'][2]<=1010 for m in metrics if m['id'].startswith('card-power'))
    assert abs((left+(left+ballw+gap+numberw))/2-907)<1e-8
    entry={'id':slug,'number':n,'title':card['name'],'rules':' '.join(rows),'rarity':'Common','stars':1,'display':[W,H],'download':[2120,2968],'footer_group_center':[907,1401],'ball_center':[ballcx,1401],'typography':metrics,'files':{}}
    for label,p in [('display',displaypath),('download',highpath)]:
        b=p.read_bytes();entry['files'][label]={'path':p.relative_to(REPO).as_posix(),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}
    report.append(entry)
    print(n,card['name'],size,entry['files']['display']['bytes'],flush=True)

(OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
# Update only the first five asset URLs. Card IDs, gameplay data and other cards
# remain untouched; version tokens cover both on-screen and download assets.
catalogpath=REPO/'public/cards/catalog.js';catalog=catalogpath.read_text()
for entry in report:
    for label in ('display','download'):
        f=entry['files'][label];url='/'+f['path'].removeprefix('public/')
        catalog,count=re.subn(re.escape(url)+r'\?v=[a-zA-Z0-9]+',url+'?v='+f['sha256'][:10],catalog)
        assert count==1,(url,count)
catalogpath.write_text(catalog)
contact=Image.new('RGB',(2120,1280),'#1c1c1c')
for i,entry in enumerate(report):
    im=Image.open(REPO/entry['files']['display']['path']).resize((424,594),Image.Resampling.LANCZOS)
    contact.paste(im,(i*424,0))
    detail=Image.open(REPO/entry['files']['display']['path']).crop((0,950,1060,1484)).resize((424,214),Image.Resampling.LANCZOS)
    contact.paste(detail,(i*424,630))
contact.crop((0,0,2120,844)).save(OUT/'saiyan-first-five-preview.jpg',quality=96)
print('Rendered and validated five cards; catalog cache tokens updated.')
