"""Populate the approved matte-scouter vector reference with each hero's data.

Use immutable source artwork. All frame paths and scouter geometry are the
approved SVG, with new typeset text rather than repeatedly editing bitmaps.
"""
from pathlib import Path
import io, json, re, subprocess, os, hashlib, functools
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE=Path(__file__).parent
ROOT=HERE.parents[1]
SOURCE='0c5ae087ceaabded76f282fc1b9f6beccf6309a4'
BODY='/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf'
TITLE=str(HERE/'fonts/Teko-Bold.ttf')

def source(path):
    return subprocess.check_output(['git','show',f'{SOURCE}:{path}'],cwd=ROOT)

def svg_image(svg):
    js="require(process.argv[1])(Buffer.from(process.argv[2]),{density:144}).resize(1070,1470).png().toBuffer().then(b=>process.stdout.write(b));"
    data=subprocess.check_output([os.environ['CODEX_PRIMARY_RUNTIME_NODE'],'-e',js,str(Path(os.environ['CODEX_PRIMARY_RUNTIME_NODE_MODULES'])/'sharp'),svg])
    return Image.open(io.BytesIO(data)).convert('RGBA')

@functools.lru_cache()
def templates():
    # The reference's embedded image is large, so pass its path to Sharp.
    js="require(process.argv[1])(process.argv[2],{density:144}).resize(1070,1470).png().toBuffer().then(b=>process.stdout.write(b));"
    data=subprocess.check_output([os.environ['CODEX_PRIMARY_RUNTIME_NODE'],'-e',js,str(Path(os.environ['CODEX_PRIMARY_RUNTIME_NODE_MODULES'])/'sharp'),str(HERE/'personality-approved-reference.svg')])
    return Image.open(io.BytesIO(data)).convert('RGBA'),svg_image((HERE/'personality-approved-overlay.svg').read_text())

def text_layer(text,font,size,maxwidth,stroke=0):
    scale=4;f=ImageFont.truetype(font,size*scale);b=f.getbbox(text,stroke_width=stroke*scale)
    im=Image.new('RGBA',(b[2]-b[0]+40,b[3]-b[1]+40))
    ImageDraw.Draw(im).text((20-b[0],20-b[1]),text,font=f,fill='white',stroke_width=stroke*scale,stroke_fill='#020507')
    im=im.crop(im.getbbox());return im.resize((min(maxwidth,round(im.width/scale)),round(im.height/scale)),Image.Resampling.LANCZOS)

def centered(im,text,font,size,x,y,width,stroke=0):
    t=text_layer(text,font,size,width,stroke);im.alpha_composite(t,(round(x-t.width/2),round(y-t.height/2)))

def render_personality(c,rules,catalog):
    n=int(c['number']);data=json.loads((HERE/'personality-data-081-130.json').read_text())[str(n)]
    assert data['alignment']=='Hero'
    result,rails=templates();result=result.copy();d=ImageDraw.Draw(result)
    # Keep the approved frame, replacing every Goku-specific content region.
    d.polygon([(201,48),(974,48),(1003,73),(1003,114),(972,143),(201,143)],fill='#0951ce')
    d.rectangle((48,44,203,164),fill='#090b0e')
    path='public'+c['image'].split('?')[0]
    original=Image.open(io.BytesIO(source(path))).convert('RGB')
    # Recover only the illustration, excluding the obsolete power-stage UI.
    art=ImageOps.fit(original.crop((63,166,784,745)),(994,638),Image.Resampling.LANCZOS,centering=(0.5,1 if n==85 else 0))
    mask=Image.new('L',(1070,1470));ImageDraw.Draw(mask).polygon([(63,166),(1005,166),(1005,298),(1033,280),(1033,702),(1005,730),(1005,748),(982,803),(796,803),(746,759),(80,759),(40,704),(40,298),(63,288)],fill=255)
    canvas=Image.new('RGB',(1070,1470));canvas.paste(art,(40,120 if n==85 else 166));result.paste(canvas,(0,0),mask)
    d=ImageDraw.Draw(result)
    d.polygon([(61,761),(182,761),(205,784),(205,837),(175,869),(64,869),(37,841),(37,789)],fill='#090b0e')
    d.rectangle((77,1017,995,1322),fill='#090b0e')
    d.rectangle((77,1377,225,1414),fill='#090b0e')
    centered(result,c['name'].upper(),TITLE,92,598,100,756,4)
    centered(result,str(data['level']),'/usr/share/fonts/opentype/urw-base35/NimbusSans-BoldItalic.otf',80,127,89,106)
    centered(result,'LEVEL',BODY,22,137,144,83)
    centered(result,'PUR',BODY,35,122,785,114)
    centered(result,str(data['pur']),BODY,70,122,835,114)
    # Low-opacity dark fills sit under separated, precisely aligned SVG rails.
    panel=[]
    for j,value in enumerate(reversed(data['stages'])):
        y=179.5+j*55.4
        panel.append(f'<path d="M820 {y} H995 V{y+30.5} L977 {y+48.5} H801 V{y+18} Z" fill="#071e36" fill-opacity="0.89"/>')
    result=Image.alpha_composite(result,svg_image('<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="1470">'+''.join(panel)+'</svg>'))
    for j,value in enumerate(reversed(data['stages'])):
        centered(result,f'{value:,}',BODY,34,900,204+j*55.4,170,1)
    f=ImageFont.truetype(BODY,50);lines=[];line=''
    for word in rules.split():
        trial=(line+' '+word).strip()
        if f.getlength(trial)>888:lines.append(line);line=word
        else:line=trial
    if line:lines.append(line)
    assert len(lines)<=5 and ' '.join(lines)==' '.join(rules.split()),(n,lines)
    d=ImageDraw.Draw(result)
    for j,line in enumerate(lines):d.text((94,1034+j*58),line,font=f,fill='white',anchor='lt')
    centered(result,str(n),BODY,40,151,1398,110)
    result=Image.alpha_composite(result,rails).convert('RGB').resize((1060,1484),Image.Resampling.LANCZOS)
    b=io.BytesIO();result.save(b,'WEBP',lossless=True,method=4);binary=b.getvalue()
    assert Image.open(io.BytesIO(binary)).convert('RGB').tobytes()==result.tobytes()
    sha=hashlib.sha1(b'blob '+str(len(binary)).encode()+b'\0'+binary).hexdigest();(ROOT/path).write_bytes(binary)
    current=next(x for x in catalog if x['number']==str(n));current.update(image=c['image'].split('?')[0]+'?v='+sha[:10],width=1060,height=1484)
    return {'number':n,'name':c['name'],'type':c['type'],'style':c['style'],'path':path,'sha':sha,'width':1060,'height':1484,'rules':rules,'body_font_px':50,'body_lines':lines,'art_source_commit':SOURCE,'personality':data,'frame':'personality-approved-overlay.svg','title_font':'Teko Bold 700, 92px, 4px outline'}
