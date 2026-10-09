"""Continue the approved vector-frame treatment using immutable source assets.

python tools/card-frames/render-standard-range.py --start 21 --end 70 --manifest /tmp/results.json
Only standard cards are supported. Personality cards are deliberately rejected;
their approved design is documented in personality-design.md.
"""
from pathlib import Path
import argparse, io, json, re, subprocess, colorsys, runpy
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import cairosvg

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
BASE = 'f960acd'
BLACK = '#090d0e'
GRAY = '#7e898e'
FONT = ImageFont.truetype('/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf', 42)
NUMFONT = ImageFont.truetype('DejaVuSans-Bold.ttf', 36)
THEMES = {
    'Orange': ('#f0a000', '#d48a05', 1), 'Red': ('#e21d24', '#d80d16', 6),
    'Blue': ('#0096ed', '#0860b5', 11), 'Saiyan': ('#008b62', '#006e50', 18),
    'Freestyle': ('#969da0', '#7b8286', 17), 'Black': ('#bdc8d2', '#626c7d', 17),
}

def source(path, ref):
    return Image.open(io.BytesIO(subprocess.check_output(['git', 'show', f'{ref}:{path}'], cwd=ROOT))).convert('RGB')

def overlay(im, markup):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="1470">{markup}</svg>'
    layer = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGBA')
    return Image.alpha_composite(im.convert('RGBA'), layer).convert('RGB')

def recolor_frame(im, color):
    a = np.array(im.convert('HSV'))
    h, s, v = colorsys.rgb_to_hsv(*(int(color[i:i+2], 16)/255 for i in (1,3,5)))
    yy, xx = np.indices(a.shape[:2])
    # The side tabs are rebuilt below. Never hue-shift the artwork beneath them.
    frame = (yy < 166) | (yy > 770)
    mask = frame & (a[:,:,1] > 45)
    a[:,:,0][mask] = round(h*255)
    a[:,:,1][mask] = round(s*255)
    a[:,:,2][mask] = np.maximum(20, a[:,:,2][mask].astype(float)*v).astype('uint8')
    converted = Image.fromarray(a, 'HSV').convert('RGB')
    # Avoid HSV round-trip changes to unmodified art, text, and black/silver pixels.
    return Image.composite(converted, im, Image.fromarray(mask.astype('uint8')*255))

def title_glyphs(im):
    crop = im.crop((80,49,990,150))
    a = np.array(crop).min(axis=2).astype(float)
    mask = Image.fromarray(np.clip((a-160)*255/75,0,255).astype('uint8'))
    bounds = mask.getbbox()
    assert bounds, 'No title detected'
    mask = mask.crop(bounds)
    scale = min(1, 852/mask.width, 85/mask.height)
    if scale < 1:
        mask = mask.resize((round(mask.width*scale),round(mask.height*scale)),Image.Resampling.LANCZOS)
    padded = Image.new('L',(mask.width+10,mask.height+10))
    padded.paste(mask,(5,5))
    rgba = Image.new('RGBA',padded.size,(0,0,0,0))
    rgba.paste((3,5,6,255),(0,0),padded.filter(ImageFilter.MaxFilter(7)))
    rgba.paste((255,255,255,255),(0,0),padded)
    return rgba

def wrap(text):
    result=[]
    for paragraph in text.split('\n'):
        line=''
        for word in paragraph.split():
            trial=(line+' '+word).strip()
            if FONT.getlength(trial)>890:
                result.append(line);line=word
            else:line=trial
        if len(line.split()) == 1 and result:
            previous=result.pop().split();line=' '.join(previous[-2:]+[line]);result.append(' '.join(previous[:-2]))
        result.append(line)
    assert len(result)<=6, result
    assert ' '.join(' '.join(result).split()) == ' '.join(text.split())
    return result

def approved_joins(im, accent):
    side=f'''<path d="M16 145L61 169V310L16 278Z" fill="{BLACK}"/>
      <path d="M24 159L46 176V278L24 261Z" fill="{accent}"/>
      <path d="M21 150L50 169V286L21 267" fill="none" stroke="{BLACK}" stroke-width="17"/>
      <path d="M21 150L50 169V286L21 267" fill="none" stroke="{GRAY}" stroke-width="9"/>'''
    lower=f'''<path d="M17 710L77 772H145L216 844H145L100 802H65L18 847Z" fill="{BLACK}"/>
      <path d="M22 721L74 775H137L197 831H151L106 788H65L22 745Z" fill="{accent}"/>
      <path d="M22 755L53 786L22 817Z" fill="{accent}"/>'''
    return overlay(im,f'''<path d="M88 35L107 51H95L88 44Z M982 35L963 51H975L982 44Z" fill="{accent}"/>
      <path d="M87 40L54 74 M983 40L1016 74" fill="none" stroke="{GRAY}" stroke-width="8"/>
      {side}<g transform="translate(1070 0) scale(-1 1)">{side}</g>
      {lower}<g transform="translate(1070 0) scale(-1 1)">{lower}</g>
      <path d="M22 700L78 763H990L1044 703" fill="none" stroke="{BLACK}" stroke-width="22"/>
      <path d="M22 700L78 763H990L1044 703" fill="none" stroke="{GRAY}" stroke-width="8"/>
      <path d="M26 870V837L66 798H100L146 840H923L970 798H1006L1043 837V870" fill="none" stroke="{BLACK}" stroke-width="17"/>
      <path d="M26 870V837L66 798H100L146 840H923L970 798H1006L1043 837V870" fill="none" stroke="{GRAY}" stroke-width="9"/>''')

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--start',type=int,default=21);ap.add_argument('--end',type=int,default=70)
    ap.add_argument('--source-ref',default=BASE);ap.add_argument('--manifest',type=Path,required=True)
    args=ap.parse_args()
    ref=subprocess.check_output(['git','rev-parse',args.source_ref],cwd=ROOT,text=True).strip()
    catalog=json.loads(re.search(r'export const catalog\s*=\s*(\[.*?\]);',(ROOT/'public/cards/catalog.js').read_text(),re.S)[1])
    cards={int(c['number']):c for c in catalog if c['number'].isdigit()}
    rules=json.loads((HERE/'rules-021-070.json').read_text())
    repair=runpy.run_path(str(HERE/'repair-title-joins.py'),run_name='frame_helpers')
    old={'__file__':str(HERE/'render-first-20.py')}
    exec((HERE/'render-first-20.py').read_text().split('entries=[]')[0],old)
    entries=[]
    for n in range(args.start,args.end+1):
        c=cards[n]
        assert c['type'] in ('Physical Combat','Energy Combat','Non-Combat','Combat'), 'Use the approved personality renderer for this card.'
        assert str(n) in rules
        rel=c['image'].split('?')[0].lstrip('/')
        path=ROOT/'public'/rel;gitpath=path.relative_to(ROOT).as_posix()
        original=source(gitpath,ref);assert original.size==(1070,1470)
        accent,panel,template=THEMES[c['style']]
        title=title_glyphs(original)
        im=recolor_frame(original,accent)
        # Same approved geometry and body sizing used for cards 1–20.
        im=Image.alpha_composite(im.convert('RGBA'),Image.open(io.BytesIO(cairosvg.svg2png(bytestring=old['frame']().encode()))).convert('RGBA')).convert('RGB')
        im=repair['clean_edges'](im)
        im=repair['clean_lower_frame'](im,template)
        headerpath=HERE/'update-dragon-ball-headers.py'
        hs={'__file__':str(headerpath),'__name__':'header_helpers'}
        exec(headerpath.read_text().replace('#d9b64f',accent).replace('#c7a64c',panel),hs)
        clean=im.copy();ImageDraw.Draw(clean).rectangle((60,49,1010,146),fill=panel)
        im=hs['header'](clean)
        im=approved_joins(im,accent)
        im.paste(title,(round((1070-title.width)/2),round(96-title.height/2)),title)
        # Preserve the approved footer geometry and brand, replacing the number.
        tc=cards[template];tp='public/'+tc['image'].split('?')[0].lstrip('/')
        template_image=source(tp,ref)
        # Include the lower joins so old diagonal strokes cannot show through.
        for box in ((0,1320,1070,1470),(0,1214,66,1320),(1005,1214,1070,1320)):
            im.paste(template_image.crop(box),box[:2])
        d=ImageDraw.Draw(im)
        d.rectangle((66,979,1005,1318),fill='#0c1011')
        lines=wrap(rules[str(n)])
        for j,line in enumerate(lines):d.text((88,988+j*54),line,font=FONT,fill='white')
        d.rectangle((75,1358,235,1398),fill='#0c1011')
        d.text((157,1377),str(n),font=NUMFONT,fill='white',anchor='mm')
        # Rebuild the POWER decorative rule as precise geometry.
        im=overlay(im,f'<path d="M364 884L398 917H747L770 936" fill="none" stroke="{BLACK}" stroke-width="15"/><path d="M364 884L398 917H747L770 936" fill="none" stroke="{accent}" stroke-width="6"/>')
        assert im.crop((65,315,1005,690)).tobytes()==original.crop((65,315,1005,690)).tobytes(),f'Artwork changed on {n}'
        temp=path.with_suffix('.tmp.webp');im.save(temp,'WEBP',lossless=True,method=4);temp.replace(path)
        sha=subprocess.check_output(['git','hash-object',str(path)],cwd=ROOT,text=True).strip()
        entries.append({'number':n,'id':c['id'],'path':gitpath,'sha':sha,'size':path.stat().st_size,'body_font_px':42,'body_lines':len(lines),'style':c['style'],'artwork_preserved':True})
        print(f'Rendered {n}: {c["name"]}',flush=True)
    args.manifest.write_text(json.dumps({'source_commit':ref,'updated':entries},indent=2)+'\n')

if __name__=='__main__':main()
