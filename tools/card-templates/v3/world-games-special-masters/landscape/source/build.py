"""Build the shared native V3 landscape masters from retained native components."""
from pathlib import Path
from copy import deepcopy
import json, re, subprocess, hashlib
from lxml import etree as E
from PIL import Image, ImageChops
from text_v3 import text, elem

ROOT=Path(__file__).resolve().parents[1]
S='http://www.w3.org/2000/svg'; X='http://www.w3.org/1999/xlink'
W,H,CX=1484,1060,741.5
ART_BOTTOM=628.666666666667
CAT_TOP=ART_BOTTOM; CAT_CY=CAT_TOP+56.5
RULE_TOP=CAT_TOP+113; RULE_BOTTOM=915
FOOT_TOP,FOOT_CY=929,985.5
SAGA_CX,RIGHT_CX=296.55,1186.45

def get(root,id):return root.xpath('//*[@id=$i]',i=id)[0]
def write(root,path):E.ElementTree(root).write(str(path),encoding='utf-8',xml_declaration=True)
def copy(root,id):return deepcopy(get(root,id))
def translate(e,x,y):e.set('transform',f'translate({x:.12f} {y:.12f}) '+e.get('transform',''));return e
def measure(path):
    result=subprocess.check_output(['inkscape',str(path),'--query-all'],text=True,stderr=subprocess.DEVNULL)
    return {v[0]:list(map(float,v[1:])) for line in result.splitlines() if len(v:=line.split(','))==5}
def center(e,b,cx=None,cy=None):
    x,y,w,h=b; dx=0 if cx is None else cx-x-w/2;dy=0 if cy is None else cy-y-h/2
    if abs(dx)>.002 or abs(dy)>.002:translate(e,dx,dy)
    e.set('data-visible-center',f'{x+w/2+dx:.6f} {y+h/2+dy:.6f}')
    return [dx,dy]

def mapped_path(d):
    """Widen straight center spans and remap vertical side details; keep corner cuts."""
    def xx(x):return x+424 if x>529 else x
    def yy(y):
        if y<=1006:return y-965+RULE_TOP
        if y>=1298:return y-1339+RULE_BOTTOM
        return RULE_TOP+41+(y-1006)*(RULE_BOTTOM-RULE_TOP-82)/292
    toks=re.findall(r'[MLHVZ]|[-+]?(?:\d*\.\d+|\d+)',d)
    out=[];i=0;cmd=None
    while i<len(toks):
        if toks[i] in 'MLHVZ':cmd=toks[i];out.append(cmd);i+=1
        if cmd=='Z':cmd=None;continue
        if cmd in ('M','L'):
            out.extend([f'{xx(float(toks[i])):.9f}',f'{yy(float(toks[i+1])):.9f}']);i+=2
        elif cmd=='H':out.append(f'{xx(float(toks[i])):.9f}');i+=1
        elif cmd=='V':out.append(f'{yy(float(toks[i])):.9f}');i+=1
        else:raise ValueError(d)
    return ' '.join(out)

def brush(defs,ident,y,height,footer=False):
    group=elem('g',id=ident,transform=f'translate(0 {y}) scale(1 {height/100})',data_source='shared-brushed-charcoal-panel')
    # This is a continuous piecewise warp, not tiled/repeated paint. Ends keep
    # their native widths, while only the original central span grows.
    splits=[(0,180,0,145),(180,880,145,1339),(880,1060,1339,1484)] if footer else [(0,180,0,180),(180,880,180,1304),(880,1060,1304,1484)]
    for idx,(a,b,c,d) in enumerate(splits):
        cid=f'{ident}-segment-{idx}'
        cp=elem('clipPath',defs,id=cid,clipPathUnits='userSpaceOnUse');elem('rect',cp,x=c,y=-5,width=d-c,height=110)
        part=elem('g',group,clip_path=f'url(#{cid})');u=elem('use',part,transform=f'translate({c-a*(d-c)/(b-a)} 0) scale({(d-c)/(b-a)} 1)');u.set('{'+X+'}href','#shared-brushed-charcoal-panel')
    return group

def title_group(label):
    nominal=86.0349127182045; g,wh=text(label,'Teko-SemiBold.ttf',nominal,CX,79,'card-title')
    size=nominal*min(1,1184/wh[0]);g,wh=text(label,'Teko-SemiBold.ttf',size,CX,79,'card-title')
    g.set('data-font-size',str(size));g.set('data-title-fit','uniform-font-size');g.set('data-safe-region','149.5 1333.5')
    return g

def build(kind):
    (ROOT/'masters').mkdir(parents=True,exist_ok=True)
    old=E.parse(str(ROOT/'source/retained-landscape.svg')).getroot();v3=E.parse(str(ROOT/'source/retained-combat.svg')).getroot()
    root=elem('svg',width=W,height=H,viewBox=f'0 0 {W} {H}',version='1.1',data_template_version='3',data_family=kind,data_footer_layout='landscape-mirrored-side-group-centers-v1')
    elem('title',root).text=f'{kind} V3 landscape master'
    elem('desc',root).text='Shared V3 native brush panels, outlined type and power frame. Retained landscape illustration and emblem. Example game data and provisional Android wordmark are not production verification.'
    defs=deepcopy(old.find('{'+S+'}defs'));root.append(defs)
    existing={e.get('id') for e in defs}
    for e in v3.find('{'+S+'}defs'):
        if e.get('id') not in existing:defs.append(deepcopy(e))
    root.append(copy(old,'continuous-frame-background'))
    root.append(copy(old,'retained-city-artwork'));root.append(copy(old,'artwork-border-vector'))
    root.append(brush(defs,'shared-title-material',12,134))
    root.append(title_group('City in Turmoil' if kind=='Battleground' else 'Location Title'))
    rules=copy(v3,'shared-rules-component')
    for p in rules.xpath('.//*[local-name()="path"]'):p.set('d',mapped_path(p.get('d')))
    get(rules,'matching-upper-left-power-corner').set('transform','translate(1482 0) scale(-1 1)')
    for p in get(defs,'paper-power-panel-clip').xpath('.//*[local-name()="path"]'):p.set('d',mapped_path(p.get('d')))
    for img in rules.xpath('.//*[local-name()="image"]'):
        img.set('y',str(RULE_TOP));img.set('height',str(RULE_BOTTOM-RULE_TOP));img.set('width','1434')
    root.append(rules)
    root.append(brush(defs,'shared-category-material',CAT_TOP,113))
    cat=E.parse(str(ROOT/f'source/category-{kind.lower()}.svg')).getroot()
    root.append(translate(copy(cat,'card-category'),212,CAT_CY-908.5))
    badge=copy(old,'card-type-emblem-badge');translate(badge,0,CAT_CY-689.166666666667);root.append(badge)
    # Keep original example text and approved native infinity/colon, recenter
    # the complete line after the V3 paper-panel geometry is applied.
    rules_text=copy(old,'rules-line-1')
    if kind=='Location':rules_text,_=text('Card power text.','BarlowCondensed-Bold.ttf',49,0,0,'rules-line-1',fill='#060606')
    icon=copy(old,'power-icon'); line=elem('g',root,id='power-line-block');line.append(rules_text);line.append(icon)
    root.append(brush(defs,'shared-footer-material',FOOT_TOP,113,True))
    root.append(translate(copy(v3,'footer-text-block'),212,-424))
    logo=elem('g',root,id='saga-emblem',data_status='provisional Android wordmark; replace with verified set mark during card production')
    for ident in ['set-label-1','set-label-2']:logo.append(copy(old,ident))
    ball=copy(old,'rarity-number-marker');ball.set('id','footer-rarity');root.append(ball)
    root.append(copy(old,'card-number'))
    path=ROOT/f'masters/{kind}-Master-V3.svg';write(root,path);b=measure(path)
    if kind=='Location':
        # Place the demonstration line and icon as a group with the same gap.
        ib=b['power-icon'];tb=b['rules-line-1'];center(rules_text,tb,cx=ib[0]+ib[2]+12+tb[2]/2,cy=ib[1]+ib[3]/2)
        write(root,path);b=measure(path)
    center(line,b['power-line-block'],cx=CX,cy=(RULE_TOP+RULE_BOTTOM)/2)
    center(logo,b['saga-emblem'],cx=SAGA_CX,cy=FOOT_CY)
    center(get(root,'footer-text-block'),b['footer-text-block'],cx=CX,cy=FOOT_CY)
    center(ball,b['footer-rarity'],cy=FOOT_CY);center(get(root,'card-number'),b['card-number'],cy=FOOT_CY)
    write(root,path);b=measure(path)
    bb,nb=b['footer-rarity'],b['card-number'];translate(get(root,'card-number'),bb[0]+bb[2]+12.2-nb[0],0)
    write(root,path);b=measure(path);bb,nb=b['footer-rarity'],b['card-number'];left=min(bb[0],nb[0]);right=max(bb[0]+bb[2],nb[0]+nb[2]);dx=RIGHT_CX-(left+right)/2
    translate(ball,dx,0);translate(get(root,'card-number'),dx,0)
    # Remove unused definition trees so the retained source stays reviewable.
    used=set()
    def scan(elements):
        for e in elements:
            for x in e.iter():
                for k,v in x.attrib.items():
                    used.update(re.findall(r'url\(#([^)]+)\)',v))
                    if k.endswith('href') and v.startswith('#'):used.add(v[1:])
    scan([e for e in root if e is not defs]);prev=None
    while prev!=used:
        prev=set(used);scan([e for e in defs if e.get('id') in used])
    for e in list(defs):
        if e.get('id') not in used:defs.remove(e)
    write(root,path)
    for _ in range(2):
        result=subprocess.check_output(['python3',str(ROOT/'source/align_power_icon.py'),str(path),str(path),'--icon','power-icon','--line','rules-line-1'],text=True)
    return path,json.loads(result)

def render(svg):
    (ROOT/'previews').mkdir(parents=True,exist_ok=True)
    png=ROOT/'previews'/f'{svg.stem}.png'
    subprocess.run(['inkscape',str(svg),'--export-filename='+str(png),'--export-width=2968','--export-height=2120'],check=True,capture_output=True)
    im=Image.open(png).convert('RGB');im.save(png,dpi=(848,848));im.save(png.with_suffix('.webp'),lossless=True,method=6)
    assert ImageChops.difference(im,Image.open(png.with_suffix('.webp')).convert('RGB')).getbbox() is None
    im.resize((1484,1060),Image.Resampling.LANCZOS).save(ROOT/'previews'/f'{svg.stem}-display.png')
    return {'size':list(im.size),'png_webp_pixels_identical':True}

if __name__=='__main__':
    reports={}
    for kind in ['Battleground','Location']:
        svg,alignment=build(kind);reports[kind]={'render':render(svg),'infinity_second_run':alignment,'bounds':{k:v for k,v in measure(svg).items() if k in ['card-title','card-category','saga-emblem','footer-text-block','footer-rarity','card-number','rules-line-1','power-icon']}}
    (ROOT/'verification.json').write_text(json.dumps(reports,indent=2));print(json.dumps(reports,indent=2))
