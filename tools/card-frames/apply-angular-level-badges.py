"""Apply the approved vector header without regenerating card illustrations.

Source is immutable. Only the top 166/1470 of each card and old pink villain
frame accents may change. Existing image dimensions and all game text remain.
"""
from pathlib import Path
import io, re, json, subprocess, hashlib, colorsys
from PIL import Image, ImageDraw
from render_personality_081_130 import svg_image, centered, TITLE, BODY

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SOURCE = '63fa30722e23cfae9ac45f2cd01be4de60fb0497'
LEVELS = json.loads((HERE/'personality-levels.json').read_text())['levels']
VILLAINS = {'Raditz', 'Vegeta', 'Nappa', 'Saibaimen'}

def original(path):
    return subprocess.check_output(['git', 'show', f'{SOURCE}:{path}'], cwd=ROOT)

def header(name, level, villain):
    im = Image.new('RGBA', (1070,1470), '#090b0e')
    d = ImageDraw.Draw(im)
    d.polygon([(201,48),(974,48),(1003,73),(1003,114),(972,143),(201,143)], fill='#990e22' if villain else '#0951ce')
    centered(im, name.upper(), TITLE,92,598,100,756,4)
    centered(im,str(level),'/usr/share/fonts/opentype/urw-base35/NimbusSans-BoldItalic.otf',80,127,89,106)
    centered(im,'LEVEL',BODY,22,137,144,83)
    overlay=(HERE/'personality-approved-overlay.svg').read_text()
    ids={'upper-left-blue','upper-right-blue','left-cap','right-cap','header-top','title-frame','level-frame','left-upper-side','right-upper-side'}
    groups=[]
    for match in re.finditer(r'<g id="([^"]+)".*?</g>',overlay):
        if match[1] in ids:groups.append(match[0])
    svg='<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="1470">'+''.join(groups)+'</svg>'
    if villain:svg=svg.replace('#006aff','#b51d30')
    return Image.alpha_composite(im,svg_image(svg)).convert('RGB')

def main():
    text=original('public/cards/catalog.js').decode()
    match=re.search(r'export const catalog\s*=\s*(\[.*?\]);',text,re.S)
    catalog=json.loads(match[1]); updates=[]
    for c in catalog:
        if c['type']!='Main Personality':continue
        path='public'+c['image'].split('?')[0]
        src=Image.open(io.BytesIO(original(path))).convert('RGB')
        out=src.copy();w,h=out.size;cut=round(166*h/1470)
        villain=c['name'] in VILLAINS; changed_accents=0
        if villain:
            pixels=out.load()
            for y in range(cut,h):
                for x in range(w):
                    # Protect the illustration, stage values and PUR area.
                    if 55*w/1070<=x<=1012*w/1070 and y<760*h/1470:continue
                    r,g,b=pixels[x,y]
                    if r>70 and r>g*1.35 and b>g*1.2 and r>b*1.05:
                        hue,sat,val=colorsys.rgb_to_hsv(r/255,g/255,b/255)
                        if .84<hue<.99:
                            pixels[x,y]=tuple(round(v*255) for v in colorsys.hsv_to_rgb(.981,max(.82,sat),val*.75))
                            changed_accents+=1
        panel=header(c['name'],LEVELS[c['number']],villain).resize((w,h),Image.Resampling.LANCZOS)
        out.paste(panel.crop((0,0,w,cut)),(0,0))
        # Verify protected artwork, numerical stages, PUR and ability text.
        art=(round(55*w/1070),cut,round(1012*w/1070),round(760*h/1470))
        assert out.crop(art).tobytes()==src.crop(art).tobytes()
        if not villain:assert out.crop((0,cut,w,h)).tobytes()==src.crop((0,cut,w,h)).tobytes()
        b=io.BytesIO();out.save(b,'WEBP',lossless=True,method=4);binary=b.getvalue()
        assert Image.open(io.BytesIO(binary)).convert('RGB').tobytes()==out.tobytes()
        sha=hashlib.sha1(b'blob '+str(len(binary)).encode()+b'\0'+binary).hexdigest()
        (ROOT/path).write_bytes(binary)
        c.update(image=c['image'].split('?')[0]+'?v='+sha[:10],width=w,height=h)
        updates.append(dict(number=c['number'],name=c['name'],level=LEVELS[c['number']],path=path,sha=sha,width=w,height=h,deep_red_accent_pixels=changed_accents))
        print(c['number'],c['name'],sha,flush=True)
    assert len(updates)==len(LEVELS)==49
    (ROOT/'public/cards/catalog.js').write_text(text[:match.start(1)]+json.dumps(catalog,indent=2,ensure_ascii=False)+text[match.end(1):])
    (ROOT/'docs/personality-angular-level-badges.json').write_text(json.dumps(dict(source_commit=SOURCE,design='Approved Chi-Chi angular numeral panel and narrower LEVEL tab; blue heroes and deep red villains',updated=updates),indent=2)+'\n')

if __name__=='__main__':main()
