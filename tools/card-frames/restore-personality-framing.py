"""Restore source composition inside the approved vector personality window.

The art must fit beside the 234px scouter column, not underneath its full
width. Preserve all pixels outside the artwork window and existing SVG rails.
"""
from pathlib import Path
import io, json, re, subprocess, hashlib, argparse
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from render_personality_081_130 import svg_image, centered, BODY

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).parent
BASE='c65d5a357649691d48a0c38253c6137ddcc3e6ba'
EARLY='0c5ae087ceaabded76f282fc1b9f6beccf6309a4'
LATE='c5ccdf8fbb9a393ad5a58fb6930dca3f2022fcfe'

def read(ref,path):
    return subprocess.check_output(['git','show',f'{ref}:{path}'],cwd=ROOT)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--only');args=parser.parse_args()
    text=read(BASE,'public/cards/catalog.js').decode()
    match=re.search(r'export const catalog\s*=\s*(\[.*?\]);',text,re.S)
    catalog=json.loads(match[1]);data={}
    for name in ('081-130','156-205','remaining'):
        data.update(json.loads((HERE/f'personality-data-{name}.json').read_text()))
    overlay=(HERE/'personality-approved-overlay.svg').read_text()
    rails=svg_image(overlay)
    mask=Image.new('L',(1070,1470))
    ImageDraw.Draw(mask).polygon([(63,166),(1005,166),(1005,298),(1033,280),(1033,702),(1005,730),(1005,748),(982,803),(796,803),(746,759),(80,759),(40,704),(40,298),(63,288)],fill=255)
    updates=[]
    for c in catalog:
        if c['type']!='Main Personality' or (args.only and c['number']!=args.only):continue
        n=c['number'];path='public'+c['image'].split('?')[0]
        ref=EARLY if n.isdigit() and int(n)<=205 else LATE
        original=Image.open(io.BytesIO(read(ref,path))).convert('RGB')
        current=Image.open(io.BytesIO(read(BASE,path))).convert('RGB')
        villain=data[n]['alignment']=='Villain'
        layer=Image.new('RGBA',(1070,1470),'#170b10' if villain else '#091522')
        # Fit the recovered illustration to the space left of the scouter.
        # Its previous 994px target magnified it behind the stage column.
        art=ImageOps.fit(original.crop((63,166,784,745)),(761,593),Image.Resampling.LANCZOS,centering=(.5,.5))
        layer.paste(art,(40,166))
        # No original bitmap UI is copied into the stage column.
        panel=[]
        for j,value in enumerate(reversed(data[n]['stages'])):
            y=179.5+j*55.4
            color='#2c0b13' if villain else '#071e36'
            panel.append(f'<path d="M820 {y} H995 V{y+30.5} L977 {y+48.5} H801 V{y+18} Z" fill="{color}"/>')
        layer=Image.alpha_composite(layer,svg_image('<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="1470">'+''.join(panel)+'</svg>'))
        for j,value in enumerate(reversed(data[n]['stages'])):
            centered(layer,f'{value:,}',BODY,34,900,204+j*55.4,170,1)
        # Render unchanged vector paths over the new art so edge antialiasing
        # blends with the new background, never with the previous enlarged art.
        card_rails=rails if not villain else svg_image(overlay.replace('#006aff','#b51d30'))
        layer=Image.alpha_composite(layer,card_rails)
        size=current.size
        m=np.asarray(mask.resize(size,Image.Resampling.NEAREST)).copy()
        safe_mask=Image.fromarray(m)
        out=current.copy();out.paste(layer.convert('RGB').resize(size,Image.Resampling.LANCZOS),(0,0),safe_mask)
        a=np.asarray(out);b=np.asarray(current)
        assert np.array_equal(a[m==0],b[m==0]),n
        buffer=io.BytesIO();out.save(buffer,'WEBP',lossless=True,method=4);binary=buffer.getvalue()
        assert Image.open(io.BytesIO(binary)).convert('RGB').tobytes()==out.tobytes()
        sha=hashlib.sha1(b'blob '+str(len(binary)).encode()+b'\0'+binary).hexdigest()
        (ROOT/path).write_bytes(binary)
        c['image']=c['image'].split('?')[0]+'?v='+sha[:10]
        updates.append(dict(number=n,name=c['name'],path=path,sha=sha,source_commit=ref,protected_pixels_unchanged=True))
        print(n,c['name'],flush=True)
    (ROOT/'public/cards/catalog.js').write_text(text[:match.start(1)]+json.dumps(catalog,indent=2,ensure_ascii=False)+text[match.end(1):])
    (ROOT/'docs/personality-art-framing.json').write_text(json.dumps(dict(base=BASE,art_window=[40,166,801,759],updated=updates),indent=2)+'\n')

if __name__=='__main__':main()
