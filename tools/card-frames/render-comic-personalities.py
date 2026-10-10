"""Shared, reproducible comic personality frame; isolated art stays proportional.

All UI geometry and text are rendered independently of generated character art.
Only manifest-listed personality catalog records can be changed.
"""
from pathlib import Path
import json, math, hashlib, io, os, subprocess, argparse
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
ASSETS=HERE/'comic-personalities'
W,H=1060,1484
FONT='/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf'
TITLE_FONT=str(HERE/'fonts/Teko-Bold.ttf')
SIZE=46

def svg(s):
    js="require(process.argv[1])(Buffer.from(require('fs').readFileSync(0)),{density:144}).resize(1060,1484).png().toBuffer().then(b=>process.stdout.write(b));"
    b=subprocess.check_output([os.environ['CODEX_PRIMARY_RUNTIME_NODE'],'-e',js,str(Path(os.environ['CODEX_PRIMARY_RUNTIME_NODE_MODULES'])/'sharp')],input=s.encode())
    return Image.open(io.BytesIO(b)).convert('RGBA')

def centered(im,t,size,x,y,maxw,font=FONT,stroke=0):
    f=ImageFont.truetype(font,size*3);b=f.getbbox(t,stroke_width=stroke*3)
    a=Image.new('RGBA',(b[2]-b[0]+12,b[3]-b[1]+12))
    ImageDraw.Draw(a).text((6-b[0],6-b[1]),t,font=f,fill='white',stroke_width=stroke*3,stroke_fill='black')
    a=a.crop(a.getbbox()); scale=min(1/3,maxw/a.width)
    a=a.resize((round(a.width*scale),round(a.height*scale)),Image.Resampling.LANCZOS)
    im.alpha_composite(a,(round(x-a.width/2),round(y-a.height/2)))

def wrap(t):
    f=ImageFont.truetype(FONT,SIZE);lines=[];line=''
    for word in t.split():
        q=(line+' '+word).strip()
        if f.getlength(q)>930:lines.append(line);line=word
        else:line=q
    if line:lines.append(line)
    assert ' '.join(lines)==' '.join(t.split())
    return lines

def render(entry,data,rules):
    n=entry['number'];d=data[n];hero=d['alignment']=='Hero'
    accent='#0061ff' if hero else '#ed0711';light='#63dcff' if hero else '#ff6767'
    lines=wrap(rules[n]);assert len(lines)<=7,(n,lines)
    top=1085-max(0,len(lines)-3)*54
    im=Image.open(ASSETS/'backgrounds'/('hero.png' if hero else 'villain.png')).convert('RGBA').resize((W,H),Image.Resampling.LANCZOS)
    art=Image.open(ASSETS/'art'/f'{n}.png').convert('RGBA')
    assert art.getchannel('A').getextrema()[0]==0,('opaque cutout',n)
    # Near-transparent extraction specks must not determine scale or centering.
    # Measure the visible silhouette, preserving a two-pixel antialias margin.
    bounds=art.getchannel('A').point(lambda value:255 if value>8 else 0).getbbox()
    assert bounds is not None
    l,t,r,b=bounds
    art=art.crop((max(0,l-2),max(0,t-2),min(art.width,r+2),min(art.height,b+2)))
    # Frame the character as a portrait rather than shrinking a complete figure
    # to keep its feet above the rules. Lower legs can continue behind the UI.
    # Keep the silhouette centered in the open artwork area, left of the stages.
    art_top=185
    art_left,art_right=28,828
    portrait_height=round((top-art_top)*1.38)
    # Optical anchors for portraits with a large cape or an off-center blast.
    # These center the person rather than the outer edge of the accessory.
    focus_x={'87':.40,'172':.42,'174':.60,'180':.60,'P2':.28,'P3':.60}.get(n,.5)
    fit_width=1020 if n=='P2' else art_right-art_left
    art=ImageOps.contain(art,(fit_width,portrait_height),Image.Resampling.LANCZOS)
    x=round(428-art.width*focus_x);y=art_top
    if n=='85':y=top-80-art.height  # Inverted pose: keep Yamcha's face visible.
    # The lower body ends behind the rules panel, never below its bottom rail.
    clip_top=129 if n=='85' else art_top
    clip=(max(0,art_left-x),max(0,clip_top-y),min(art.width,art_right-x),min(art.height,top+60-y))
    visible_art=art.crop(clip)
    im.alpha_composite(visible_art,(x+clip[0],y+clip[1]))
    s=['<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="1484">',
       '<defs><linearGradient id="silver" x2="0" y2="1"><stop stop-color="#faffff"/><stop offset=".48" stop-color="#b1bac6"/><stop offset="1" stop-color="#ecf1f5"/></linearGradient></defs>']
    def path(p,fill='#080c11',stroke='url(#silver)',sw=7):
        s.append(f'<path d="{p}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>')
    path('M183 23 H994 L1038 65 L998 110 H846 L824 129 H234 L214 109 V65 Z')
    path('M213 36 H986 L1018 65 L986 97 H838 L815 117 H246 V66 Z','#080f19',accent,2)
    path('M61 23 H173 L215 65 V116 L171 161 H61 L20 119 V62 Z')
    # Consistent stage geometry, with restrained colored outer rails.
    step=(top-28-156)/11
    s.append(f'<path d="M932 124 V{top}" stroke="{accent}" stroke-width="13"/><path d="M932 124 V{top}" stroke="{light}" stroke-width="3"/>')
    stage_centers=[]
    for j,v in enumerate(reversed(d['stages'])):
        yy=153+j*step; hh=step-15
        p=f'M865 {yy} H1009 L1027 {yy+17} V{yy+hh-17} L1009 {yy+hh} H865 L848 {yy+hh-17} V{yy+17} Z'
        path(p,'#090c12',accent,9);path(p,'#090c12',light,2)
        stage_centers.append((v,yy+hh/2))
    # One connected contour wraps the rules box and raised PUR badge.
    path(f'M28 {top-28} L62 {top-65} H190 L229 {top-28} V{top} H331 L366 {top-58} H767 L820 {top} H997 L1037 {top+34} V1376 L999 1418 H237 L200 1446 H61 L26 1410 Z')
    path(f'M229 {top} H997 L1037 {top+34}',fill='none')
    path(f'M28 {top+77} H186 L229 {top+36} V{top}',fill='none')
    path('M27 1380 H200 L239 1418 L202 1446 H61 L27 1411 Z')
    path(f'M250 {top+21} H484 L516 {top+53} L484 {top+85} H250 Z',accent,accent,1)
    s.append('</svg>');im=Image.alpha_composite(im,svg(''.join(s)))
    centered(im,entry['name'].upper(),92,530,77,560,font=TITLE_FONT,stroke=4)
    centered(im,str(d['level']),83,120,75,118);centered(im,'LEVEL',29,120,132,155)
    for v,yy in stage_centers:centered(im,f'{v:,}',38,938,yy,162)
    centered(im,d['alignment'].upper()+' PERSONALITY',34,569,top-27,443)
    # Optical bounding-box centering, equal exterior space around PUR + value.
    centered(im,'PUR',34,125,top-30,144);centered(im,str(d['pur']),78,125,top+25,144)
    centered(im,'POWER',42,378,top+52,224)
    f=ImageFont.truetype(FONT,SIZE);draw=ImageDraw.Draw(im)
    for j,line in enumerate(lines):draw.text((62,top+111+j*54),line,font=f,fill='white',anchor='lt')
    assert top+111+(len(lines)-1)*54+SIZE<1374
    centered(im,n,37,130,1410,150)
    target=ROOT/entry['path'];buf=io.BytesIO();im.convert('RGB').save(buf,'WEBP',lossless=True,method=4)
    tmp=target.with_suffix('.webp.tmp');tmp.write_bytes(buf.getvalue());tmp.replace(target)
    digest=hashlib.sha256(target.read_bytes()).hexdigest()
    return {'number':n,'name':entry['name'],'path':entry['path'],'sha256':digest,'alignment':d['alignment'],'rules':rules[n],'lines':lines,'title_font':'Teko Bold 700', 'title_center':[530,77], 'title_size':92, 'title_outline':4, 'font':'Nimbus Sans Bold','font_size':SIZE,'art_bounds':[x,y,x+art.width,y+art.height],'art_visible_bounds':[x+clip[0],y+clip[1],x+clip[2],y+clip[3]],'art_focus_x':focus_x,'art_center_x':428,'framing':'closer-portrait-v2','power_panel_top':top,'size':[W,H]}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--numbers',nargs='*');args=ap.parse_args()
    data={};rules={}
    for f in HERE.glob('personality-data-*.json'):data.update(json.loads(f.read_text()))
    for f in HERE.glob('rules-*.json'):rules.update(json.loads(f.read_text()))
    entries=json.loads((HERE/'original-personality-references/manifest.json').read_text())
    if args.numbers:entries=[e for e in entries if e['number'] in args.numbers]
    catalog_path=ROOT/'public/cards/catalog.js';raw=catalog_path.read_text();catalog=json.loads(raw.split('=',1)[1].strip().rstrip(';'))
    report_path=ROOT/'docs/comic-personality-progress.json'
    report=json.loads(report_path.read_text()) if report_path.exists() else {}
    for entry in entries:
        n=entry['number'];r=render(entry,data,rules);report[n]=r
        c=next(c for c in catalog if c['number']==n and c['set']=='Saiyan Saga')
        c.update(image='/'+entry['path'].removeprefix('public/')+'?v='+r['sha256'][:12],width=W,height=H)
        print(n,entry['name'],len(r['lines']),'lines',flush=True)
    catalog_path.write_text('export const catalog = '+json.dumps(catalog,indent=2,ensure_ascii=False)+';\n')
    report_path.write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':main()
