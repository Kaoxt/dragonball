"""Deterministic vector border repair; Pillow/CairoSVG required.

Uses committed pre-repair assets so reruns never compound raster edits.
Power copy is transcribed verbatim from those assets. All body type is 42px.
"""
from pathlib import Path
import io, json, subprocess, re
from PIL import Image, ImageDraw, ImageFont
import cairosvg

ROOT=Path(__file__).resolve().parents[2]
BASE='055c861af7a080ec3a564fa47cd2a8be461d2272'
SIZE=42
FONT=ImageFont.truetype('/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf',SIZE)
NUMFONT=ImageFont.truetype('DejaVuSans-Bold.ttf',36)
RULES=json.loads((Path(__file__).parent/'rules-001-020.json').read_text())
GRAY='#7e898e'; OUTER='#6e7a80'; BLACK='#090d0e'

def frame(dragon=False):
    gold='#c7a64c'
    inner=gold if dragon else GRAY
    paths=[
      ('M153 40H928',8,GRAY),
      ('M17 48L48 17 M1022 18L1052 48',8,'#899499'),
      ('M87 40L54 74V118L85 153H980L1017 118V73L986 41',8,inner),
      ('M21 150L50 169V286L21 267 M1046 150L1018 169V286L1046 267',8,inner),
      ('M22 700L78 763H144L150 767H919L927 763H989L1044 703',8,inner),
      ('M26 1217V837L66 798H100L146 840H923L970 798H1006L1043 837V1217',9,inner),
    ]
    if dragon:
      paths = [
        ('M17 48L47 13H131L148 31H919L937 13H1020L1054 48',7,GRAY),
        ('M83 39L57 66V111L100 151H964L1015 110V64L980 39',7,gold),
        ('M21 145L49 161V289 M1047 145L1020 161V289',7,gold),
        ('M23 706L79 766H990L1046 706',7,gold),
      ]
      paths += [('M24 1248V843L66 800H102L145 842H925L968 800H1006L1044 843V1248',7,gold),
                ('M24 1300L35 1315V1394L71 1432H272L325 1382H745L798 1432H998L1035 1394V1315L1047 1300',8,gold),
                ('M86 1372H979',7,gold)]
    else:
      paths += [('M24 1266L38 1281V1363L72 1403H273L326 1350H744L797 1403H998L1035 1363V1281L1047 1268',9,OUTER),
                ('M87 1350H244 M826 1350H984',7,OUTER)]
    elements=[] if dragon else ['<rect x="146" y="24" width="784" height="23" fill="#090d0e"/>']
    for d,w,c in paths:
      elements.extend([f'<path d="{d}" fill="none" stroke="{BLACK}" stroke-width="{w+8}" stroke-linejoin="miter"/>',f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linejoin="miter"/>'])
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="1470">'+''.join(elements)+'</svg>'

def lines(text):
    result=[]
    for para in text.split('\n'):
      line=''
      for word in para.split():
        trial=(line+' '+word).strip()
        if FONT.getlength(trial)>890:
          result.append(line);line=word
        else: line=trial
      if len(line.split()) == 1 and result:
        previous=result.pop().split()
        line=' '.join(previous[-2:]+[line])
        result.append(' '.join(previous[:-2]))
      result.append(line)
    assert len(result)<=6, result
    return result

entries=[]
for n in range(1,21):
    p=next((ROOT/'public/assets/cards').glob(f'saiyan-{n:03d}-*.webp'))
    rel=str(p.relative_to(ROOT))
    original=subprocess.check_output(['git','show',f'{BASE}:{rel}'],cwd=ROOT)
    im=Image.open(io.BytesIO(original)).convert('RGB')
    assert im.size==(1070,1470)
    dragon=n in (15,16)
    if dragon:
      # Restrict hue conversion to green frame pixels; red art and gold balls stay intact.
      hsv=im.convert('HSV'); h,s,v=hsv.split()
      import numpy as np
      a=np.array(hsv); mask=(a[:,:,0]>=60)&(a[:,:,0]<=125)&(a[:,:,1]>65)
      a[:,:,0][mask]=30
      im=Image.fromarray(a,'HSV').convert('RGB')
    svg=frame(dragon)
    overlay=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGBA')
    im=Image.alpha_composite(im.convert('RGBA'),overlay).convert('RGB')
    d=ImageDraw.Draw(im)
    # One fixed body font: no phrase-specific emphasis or automatic enlargement.
    d.rectangle((66,979,1005,1318),fill='#0c1011')
    for j,line in enumerate(lines(RULES[str(n)])):
      d.text((88,988+j*54),line,font=FONT,fill='white',stroke_width=0)
    ny=1408 if dragon else 1377
    d.polygon([(44,ny-20),(246,ny-20),(266,ny+18),(74,ny+18),(44,ny-10)],fill='#0c1011')
    d.rectangle((75,ny-22,235,ny+18),fill='#0c1011')
    d.text((157,ny),str(n),font=NUMFONT,fill='white',anchor='mm',stroke_width=0)
    im.save(p,'WEBP',lossless=True,method=6)
    sha=subprocess.check_output(['git','hash-object',str(p)],cwd=ROOT,text=True).strip()
    entries.append({'number':n,'path':rel,'sha':sha,'power_font_px':SIZE,'power_lines':len(lines(RULES[str(n)]))})
    if n in (1,12,15,16,17): im.save(ROOT.parent/f'vector-card-{n:02d}.png')

catalog=ROOT/'public/cards/catalog.js'
s=catalog.read_text()
for e in entries:
    name=Path(e['path']).name
    s=re.sub(re.escape(name)+r'(?:\?v=[a-zA-Z0-9]+)?',name+'?v='+e['sha'][:10],s)
catalog.write_text(s)
(ROOT/'docs/saiyan-vector-border-batch-01.json').write_text(json.dumps({'source_commit':BASE,'body_font':'Nimbus Sans Bold','body_font_px':SIZE,'line_height_px':54,'number_shadow':False,'dragon_ball_accents':'gold; no green','updated':entries},indent=2)+'\n')
(Path(__file__).parent/'combat-border.svg').write_text(frame())
(Path(__file__).parent/'dragon-ball-border.svg').write_text(frame(True))
print(json.dumps(entries))
