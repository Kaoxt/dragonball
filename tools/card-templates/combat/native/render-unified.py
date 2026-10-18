"""Rebuild Saiyan Saga #1–10 from native frame/type and retained raster artwork.

Run from a copied production directory: python render.py
Requires Python Pillow, NumPy, SciPy, fontTools, and the Inkscape CLI.
The SVGs are production masters; their text is outlined for portable rendering.
Card wording and line breaks are editable in cards-001-010.json.
"""
from pathlib import Path
import argparse, base64, hashlib, html, io, json, math, os, re, subprocess
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_dilation, convolve, distance_transform_edt
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from icons_unified import icon, width_at_height
from shared_layout import apply_layout

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
parser = argparse.ArgumentParser()
parser.add_argument('--cards', type=Path, default=HERE/'cards-001-010.json')
parser.add_argument('--output', type=Path, default=HERE/'output')
parser.add_argument('--only', help='Comma-separated card numbers to render')
args = parser.parse_args()
OUT = args.output.resolve()
OUT.mkdir(parents=True, exist_ok=True)
DATA = json.loads(args.cards.read_text())
if args.only:
    wanted = {int(n) for n in args.only.split(',')}
    DATA['cards'] = [c for c in DATA['cards'] if c['number'] in wanted]
    assert {c['number'] for c in DATA['cards']} == wanted, 'Requested number absent from card data'
if not DATA['cards']: raise ValueError('No cards to render')
W,H = 1060,1484
TITLE_TRACKING = 4.0
CATEGORY_TRACKING = 4.0
# Center the visible rarity sphere and numeral between the footer silver rails.
FOOTER_SIDE_CENTER_Y = (1355.0 + 1440.0) / 2
SYMBOL_STANDARD = json.loads((HERE / "assets/style-symbol-standard.json").read_text())
FONTS = {k:TTFont(HERE/'fonts'/f) for k,f in {
    'title':'Michroma-Regular.ttf','power':'BarlowCondensed-Bold.ttf',
    'footer':'BarlowCondensed-Regular.ttf','brand':'Rajdhani-SemiBold.ttf'}.items()}

def uri(path):
    # Inkscape does not reliably decode embedded WebP. Keep the compact
    # lossless source on disk, but embed its exact decoded pixels as PNG.
    data=path.read_bytes()
    if path.suffix.lower()=='.webp':
        encoded=io.BytesIO()
        with Image.open(path) as im: im.save(encoded,format='PNG')
        data=encoded.getvalue()
    return 'data:image/png;base64,'+base64.b64encode(data).decode()

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

def set_emblem(path):
    if path.suffix.lower() != '.svg':
        return image_element('saiyan-set-emblem',path,107,1365,84,66)
    root=ET.parse(path).getroot()
    for element in root.iter('{http://www.w3.org/2000/svg}image'):
        key='{http://www.w3.org/1999/xlink}href'
        href=element.get(key)
        if href and not href.startswith('data:'):
            element.set(key,uri(path.parent/href))
    return '<g id="saiyan-set-emblem" transform="translate(107,1365)">'+''.join(ET.tostring(e,encoding='unicode') for e in root)+'</g>'

def power_rows(card):
    rows=list(card['rules'])
    icons=list(card.get('rule_icons',[None]*len(rows)))
    if len(icons)!=len(rows): raise ValueError('One rule_icons entry is required per rules row')
    for i,line in enumerate(rows):
        if re.match(r'^Constant(?: Combat)? Power\s*:',line,re.I):
            rows[i]=re.sub(r'^Constant(?: Combat)? Power\s*:\s*','',line,flags=re.I)
            icons[i]='constant'
    if card.get('constant_power'):
        icons[0]='constant'
    if card.get('limit_per_deck') is not None:
        limit=card['limit_per_deck']
        assert isinstance(limit,int) and limit>=0
        rows.insert(0,f'(Limit {limit} per deck.)');icons.insert(0,'none')
    return rows,icons

def svg(body,title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1060" height="1484" viewBox="0 0 1060 1484"><title>{html.escape(title)}</title>{body}</svg>'

def ball(cx,cy,stars=1):
    # Same .85 scaling as the user's final approved smaller ball, ~51px visible.
    sphere=HERE/'assets/rarity-ball-blank.png'
    with Image.open(sphere) as source:
        l,t,r,b=source.getchannel('A').getbbox()
    # Center visible pixels rather than the padded raster canvas.
    parts=[image_element('common-rarity-sphere',sphere,cx-(l+r)/2*.85,cy-(t+b)/2*.85,64*.85,64*.85)]
    # Five-point star centered by its visible bounding box, not its circumcircle.
    pts=[]
    for i in range(10):
        ang=-math.pi/2+i*math.pi/5;r=4.6 if i%2==0 else 2.05
        pts.append((r*math.cos(ang),r*math.sin(ang)))
    ox=(min(p[0] for p in pts)+max(p[0] for p in pts))/2
    oy=(min(p[1] for p in pts)+max(p[1] for p in pts))/2
    assert isinstance(stars,int) and 1 <= stars <= 7, 'Supply a verified rarity star count from 1 to 7'
    offsets=[(0,0)] if stars==1 else [(-7,0),(7,0)] if stars==2 else [(0,-7),(-7,6),(7,6)] if stars==3 else [(11*math.cos(-math.pi/2+2*math.pi*k/stars),11*math.sin(-math.pi/2+2*math.pi*k/stars)) for k in range(stars)]
    for index,(dx,dy) in enumerate(offsets):
        points=' '.join(f'{cx+dx+x-ox:.4f},{cy+dy+y-oy:.4f}' for x,y in pts)
        parts.append(f'<polygon id="rarity-star-{index+1}" fill="#b91d0d" points="{points}"/>')
    return ''.join(parts)

def effect_icon(line, override=None):
    if override is not None:
        if override not in ('attack', 'block', 'constant', 'none'):
            raise ValueError('rule_icons must use attack, block, constant or none')
        return None if override == 'none' else override
    # Recognize only unambiguous effect wording; never infer from the title.
    if re.match(r"^Stops?\s+(?:(?:a|an|any|all|the)\s+)?(?:(?:physical|energy)(?:\s+or\s+(?:physical|energy))?\s+)?attacks?\b", line, re.I):
        return 'block'
    if re.match(r"^(?:Physical|Energy)\s+attack\b", line, re.I):
        return 'attack'
    return None

def card_effect_icons(rows, overrides):
    """One power icon per card; an attack takes priority over a block."""
    if len(overrides) != len(rows):
        raise ValueError('One rule_icons entry is required per rules row')
    candidates = [effect_icon(line, override) for line, override in zip(rows, overrides)]
    selected = next((i for i, kind in enumerate(candidates) if kind == 'attack'), None)
    if selected is None:
        selected = next((i for i, kind in enumerate(candidates) if kind), None)
    return [kind if i == selected else None for i, kind in enumerate(candidates)]

# Native production uses one geometry definition per style. No generative pass
# touches the artwork, text, or panel borders during batch rendering.
def native_frame(style):
    frame=(HERE/'assets/frame.svg').read_text()
    frame=frame[frame.index('<defs>'):frame.rindex('</svg>')]
    frame=frame.replace('fill="#101113"','fill="#17181a"').replace('fill="#17181a" stroke="#090a0b"','fill="none" stroke="#090a0b"')
    fill,stroke={'Orange':('#9d3e12','#7b300f'),'Red':('#9c070c','#76070b'),'Blue':('#0a426f','#072d4c'),'Saiyan':('#075039','#043526'),'Freestyle':('#454a51','#30343a')}[style]
    pattern=f'<pattern id="style-diamonds" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="{fill}"/><path d="M7 0L14 7L7 14L0 7Z" fill="none" stroke="{stroke}" stroke-width=".65"/></pattern>'
    frame=frame.replace('</defs>',pattern+'</defs>')
    panel=ET.parse(HERE/'assets/footer-center.svg').getroot()
    panel_markup=''.join(ET.tostring(e,encoding='unicode') for e in panel)
    frame=frame.replace('<g id="footer-panels">',panel_markup+'<g id="footer-panels">')
    return frame.replace('<g fill="url(#dark-diamonds)"><path d="M184,954','<g fill="url(#style-diamonds)"><path d="M184,954')

def background(style):
    if style in ('Orange','Red'):
        return image_element('approved-soft-background',HERE/'assets'/f'{style.lower()}-approved-base.png',0,0,W,H)
    # Exact retained texture under a native SVG color filter, never artwork.
    rgb={'Blue':(.15,.48,.80),'Saiyan':(.07,.56,.34),'Freestyle':(.56,.59,.62)}[style]
    matrix=f'{rgb[0]} 0 0 0 0 {rgb[1]} 0 0 0 0 {rgb[2]} 0 0 0 0 0 0 0 1 0'
    return f'<defs><filter id="style-color" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="{matrix}"/></filter></defs><g filter="url(#style-color)">'+image_element('approved-soft-background',HERE/'assets/red-approved-base.png',0,0,W,H)+'</g>'

def artwork(card):
    # The cleaned, user-approved Red Lunge Punch master is retained intact.
    # A native clip exposes only its illustration window; all type/frame layers
    # are rebuilt below, exactly like the other nine cards.
    if card.get('artwork_file'):
        return image_element('retained-artwork',HERE/card['artwork_file'],0,156,1060,794)
    reference=card.get('artwork_reference')
    if reference:
        return ('<defs><clipPath id="artwork-window"><rect x="0" y="156" width="1060" height="794"/></clipPath></defs>'
                '<g clip-path="url(#artwork-window)">'+image_element('retained-artwork',HERE/reference,0,0,W,H)+'</g>')
    return image_element('retained-artwork',HERE/'artwork'/f'saiyan-{card["number"]:03}.png',0,156,1060,794)

def style_symbol(style,category='Physical Combat'):
    if category=='Setup':
        # A neutral native card-stack emblem distinguishes Setups from attacks.
        # It occupies the shared badge; it is not an effect icon.
        return ('<g id="setup-category-emblem" fill="#24282d" stroke="#aeb4bc" '
                'stroke-width="6" stroke-linejoin="round">'
                '<rect x="83" y="947" width="63" height="82" rx="5"/>'
                '<rect x="93" y="957" width="63" height="82" rx="5"/>'
                '<rect x="103" y="967" width="63" height="82" rx="5"/>'
                '<path d="M116 986H153M116 998H153M116 1010H142" fill="none" stroke-width="4"/>'
                '</g>')
    if style=='Red':
        return image_element('red-style-symbol',HERE/'assets/red-style-symbol.png',61,928,124,138)
    if style=='Freestyle':
        symbol,_=icon('attack',79,955,81,'freestyle-physical-icon')
        for element in symbol.iter():
            if element.get('fill') and element.get('fill')!='none': element.set('fill','#aeb4bc')
        symbol.set('fill','#aeb4bc')
        return ET.tostring(symbol,encoding='unicode')
    asset,color={'Orange':('orange-kanji-source.svg','#f29216'),'Blue':('blue-kanji-source.svg','#3b9cde'),'Saiyan':('saiyan-kanji-source.svg','#30b477')}[style]
    root=ET.parse(HERE/'assets'/asset).getroot()
    paths=[p.get('d') for p in root.findall('.//{http://www.w3.org/2000/svg}path')]
    scale=1.17;stroke_width=SYMBOL_STANDARD['nominal_stroke_width']/scale
    return f'<g id="{style.lower()}-style-symbol" transform="translate(123,995.5) scale({scale}) translate(-53.5,-55.5)" fill="none" stroke="{color}" stroke-width="{stroke_width:.8f}" stroke-linecap="round" stroke-linejoin="round">'+''.join(f'<path d="{d}"/>' for d in paths)+'</g>'

report=[]
for card in DATA['cards']:
    n=card['number'];style=card['style'];slug=card.get('id') or f'saiyan-{n:03}-'+card['name'].lower().replace(' ','-')
    if style not in ('Orange','Red','Blue','Saiyan','Freestyle'):
        raise ValueError('Supply an approved template variant for style '+style)
    category=card.get('category',DATA.get('category','Physical Combat'))
    if category not in ('Physical Combat','Energy Combat','Setup'):
        raise ValueError('Supply a matching native category template for '+category)
    if category=='Setup' and style!='Freestyle':
        raise ValueError('The shared Setup adaptation currently supports Freestyle only')
    set_name=card.get('set',DATA.get('set'))
    emblem=card.get('set_emblem',DATA.get('set_emblem'))
    if not emblem:
        if set_name!='Saiyan Saga': raise ValueError('Supply set_emblem for '+str(set_name))
        emblem='assets/saiyan-set-logo-flat.svg'
    rarity=card.get('rarity',DATA.get('rarity'))
    stars=card.get('rarity_stars',DATA.get('rarity_stars'))
    if not rarity or not isinstance(stars,int): raise ValueError('Supply verified rarity and rarity_stars')
    layers=[background(style),artwork(card),native_frame(style),style_symbol(style,category)]
    layers.append(set_emblem(HERE/emblem))
    metrics=[];title=card['name'].upper();size=50
    while width(title,'title',size,TITLE_TRACKING,.84)>900:size-=.5
    textline(layers,metrics,'card-title',title,'title',size,530,76.5,tracking=TITLE_TRACKING,sx=.84,stroke=2.5)
    textline(layers,metrics,'card-category',category.upper(),'title',50,607,1001,tracking=CATEGORY_TRACKING,sx=.84,stroke=2.5)
    power_size=49;leading=59;rows,overrides=power_rows(card)
    if len(rows)>3: leading={4:59,5:49}[len(rows)]
    first={1:1203,2:1182,3:1156,4:1129,5:1112}[len(rows)]
    baselines=[first+i*leading for i in range(len(rows))]
    selected_icons=card_effect_icons(rows,overrides)
    for i,(line,baseline) in enumerate(zip(rows,baselines)):
        w=width(line,'power',power_size);cx=530
        kind=selected_icons[i]
        if kind:
            _,cap_bounds=glyphrun('P','power',power_size)
            cap_height=cap_bounds[3]-cap_bounds[1]
            iw=width_at_height(kind,cap_height);gap=12*power_size/49
            fullw=w+gap+iw;left=530-fullw/2;cx=left+iw+gap+w/2
            symbol,_=icon(kind,left,baseline+cap_bounds[1],cap_height,f'rule-{kind}-icon-{i+1}')
            layers.append(ET.tostring(symbol,encoding='unicode'))
            metrics.append({'id':f'rule-{kind}-icon-{i+1}','kind':kind,'height':cap_height,'bounds':[left,baseline+cap_bounds[1],left+iw,baseline+cap_bounds[3]],'text_gap':gap})
            assert left>=60 and left+fullw<=1000,(n,'power overflow',fullw)
        textline(layers,metrics,f'card-power-line-{i+1}',line,'power',power_size,cx,baseline=baseline,fill='#060606')
    textline(layers,metrics,'footer-brand','DRAGON BALL Z','brand',30,530,1400,tracking=6,fill='#f4f4f4')
    textline(layers,metrics,'footer-disclaimer','Not endorsed by Toei Animation or Funimation','footer',25,530,1439,fill='#efefef')
    numberw=width(str(n),'title',42.5,.255,.78)+2.125;ballw=60.8*.85;gap=15.3
    left=907-(ballw+gap+numberw)/2;ballcx=left+ballw/2;numcx=left+ballw+gap+numberw/2
    layers.append(ball(ballcx,FOOTER_SIDE_CENTER_Y,stars))
    textline(layers,metrics,'card-number',str(n),'title',42.5,numcx,FOOTER_SIDE_CENTER_Y,tracking=.255,sx=.78,stroke=2.125)
    path=OUT/(slug+'.svg')
    markup=apply_layout(svg(''.join(layers),card['name']),'combat',HERE/'fonts',HERE/'assets/shared-layout-parts.svg')
    path.write_text(markup)
    for metric in metrics:
        if metric['id']=='card-number':
            metric['size']*=.81;metric['tracking']*=.81
            metric['baseline']=1397.5+(metric['baseline']-1397.5)*.81
            metric['bounds']=[907+(metric['bounds'][0]-907)*.81,1397.5+(metric['bounds'][1]-1397.5)*.81,907+(metric['bounds'][2]-907)*.81,1397.5+(metric['bounds'][3]-1397.5)*.81]
    png=OUT/(slug+'.png')
    rendered=subprocess.run(['inkscape',str(path),'--export-filename=-','--export-type=png','--export-width=2120'],check=True,capture_output=True)
    high=Image.open(io.BytesIO(rendered.stdout)).convert('RGB');high.load()
    encoded=io.BytesIO();high.save(encoded,format='PNG')
    temp=png.with_suffix('.png.tmp')
    with temp.open('wb') as f: f.write(encoded.getvalue());f.flush();os.fsync(f.fileno())
    temp.replace(png)
    high.save(OUT/(slug+'.webp'),'WEBP',lossless=True,method=4)
    display=high.resize((W,H),Image.Resampling.LANCZOS);display.save(OUT/(slug+'-preview.png'));display.save(OUT/(slug+'-preview.webp'),'WEBP',quality=92,method=6)
    assert all(m['bounds'][0]>=50 and m['bounds'][2]<=1010 and m['bounds'][1]>=1070 and m['bounds'][3]<=1320 for m in metrics if m['id'].startswith('card-power'))
    assert abs((left+(left+ballw+gap+numberw))/2-907)<1e-8
    assert Image.open(OUT/(slug+'.webp')).convert('RGB').tobytes()==high.tobytes()
    artpath=HERE/(card.get('artwork_file') or card.get('artwork_reference')) if (card.get('artwork_file') or card.get('artwork_reference')) else HERE/'artwork'/f'saiyan-{n:03}.png'
    entry={'number':n,'id':slug,'name':card['name'],'style':style,'rules':' '.join(rows),'original_rules':card['original_rules'],'set':set_name,'category':category,'rarity':rarity,'stars':stars,'dimensions':[2120,2968],'artwork_sha256':hashlib.sha256(artpath.read_bytes()).hexdigest(),'frame_sha256':hashlib.sha256(native_frame(style).encode()).hexdigest(),'typography':metrics,'png_sha256':hashlib.sha256(png.read_bytes()).hexdigest(),'webp_sha256':hashlib.sha256((OUT/(slug+'.webp')).read_bytes()).hexdigest()}
    report.append(entry)
    (OUT/'verification-progress.json').write_text(json.dumps(report,indent=2)+'\n')
    print(n,card['name'],'rendered',flush=True)

(OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
for style in {x['style'] for x in report}:
    assert len({x['frame_sha256'] for x in report if x['style']==style})==1
contact=Image.new('RGB',(530*min(5,len(report)),742*math.ceil(len(report)/5)),'#111111')
for i,entry in enumerate(report):
    im=Image.open(OUT/(entry['id']+'-preview.png')).resize((530,742),Image.Resampling.LANCZOS)
    contact.paste(im,((i%5)*530,(i//5)*742))
contact.save(OUT/'Cards-Preview.jpg',quality=96,subsampling=0)
print(f'Verified {len(report)} cards, shared vector geometry, and lossless WebP exports.')

