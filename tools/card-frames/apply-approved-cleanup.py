"""Apply approved Red Lunge Punch vector cleanup to cards 1–20, gold Dragon Balls included.

Usage: python apply-approved-cleanup.py SOURCE_ROOT
Source is the current first-20 assets. Exports lossless WebP without changing rules text.
"""
from pathlib import Path
import io, sys, json, hashlib
from PIL import Image
import cairosvg
ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT
header_source=Path(__file__).with_name('update-dragon-ball-headers.py')
entries=[]
for n in ([int(sys.argv[2])] if len(sys.argv)>2 else range(1,21)):
    accent,panel = ('#f0a000','#d48a05') if n<=5 else ('#e21d24','#d80d16') if n<=10 else ('#0096ed','#0860b5') if n<=14 else ('#d9b64f','#c7a64c') if n<=16 else ('#969da0','#7b8286') if n==17 else ('#008b62','#006e50')
    trim='#c7a64c' if n in (15,16) else '#7e898e'
    scope={'__file__':str(header_source),'__name__':'header_module'}
    exec(header_source.read_text().replace('#d9b64f',accent).replace('#c7a64c',panel),scope)
    src=next(p for p in (SOURCE/'public/assets/cards').glob(f'saiyan-{n:03d}-*.webp') if '.tmp.' not in p.name)
    original=Image.open(src).convert('RGB')
    im=scope['header'](original)
    side=f'''<path d="M16 145L61 169V310L16 278Z" fill="#090d0e"/>
    <path d="M24 159L46 176V278L24 261Z" fill="{accent}"/>
    <path d="M21 150L50 169V286L21 267" fill="none" stroke="#090d0e" stroke-width="17" stroke-linejoin="miter"/>
    <path d="M21 150L50 169V286L21 267" fill="none" stroke="{trim}" stroke-width="9" stroke-linejoin="miter"/>'''
    lower=f'''<path d="M17 710L77 772H145L216 844H145L100 802H65L18 847Z" fill="#090d0e"/>
    <path d="M22 721L74 775H137L197 831H151L106 788H65L22 745Z" fill="{accent}"/>
    <path d="M22 755L53 786L22 817Z" fill="{accent}"/>'''
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="1470">
    <path d="M88 35L107 51H95L88 44Z" fill="{accent}"/>
    <path d="M982 35L963 51H975L982 44Z" fill="{accent}"/>
    <path d="M87 40L54 74 M983 40L1016 74" fill="none" stroke="#7e898e" stroke-width="8"/>
    {side}<g transform="translate(1070 0) scale(-1 1)">{side}</g>
    {lower}<g transform="translate(1070 0) scale(-1 1)">{lower}</g>
    <path d="M22 700L78 763H990L1044 703" fill="none" stroke="#090d0e" stroke-width="22" stroke-linejoin="miter"/>
    <path d="M22 700L78 763H990L1044 703" fill="none" stroke="{trim}" stroke-width="8" stroke-linejoin="miter"/>
    <path d="M26 870V837L66 798H100L146 840H923L970 798H1006L1043 837V870" fill="none" stroke="#090d0e" stroke-width="17" stroke-linejoin="miter"/>
    <path d="M26 870V837L66 798H100L146 840H923L970 798H1006L1043 837V870" fill="none" stroke="{trim}" stroke-width="9" stroke-linejoin="miter"/>
    </svg>'''
    overlay=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode())))
    im=Image.alpha_composite(im.convert('RGBA'),overlay).convert('RGB')
    assert im.crop((88,980,1005,1210)).tobytes()==original.crop((88,980,1005,1210)).tobytes()
    assert im.crop((65,315,1005,690)).tobytes()==original.crop((65,315,1005,690)).tobytes()
    path=ROOT/'public/assets/cards'/src.name
    temporary=path.with_suffix('.tmp.webp')
    im.save(temporary,'WEBP',lossless=True,method=4)
    temporary.replace(path)
    b=path.read_bytes();ob=src.read_bytes()
    entries.append({'number':n,'path':'public/assets/cards/'+src.name,'size':len(b),'sha':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),'oldsha':hashlib.sha1(b'blob '+str(len(ob)).encode()+b'\0'+ob).hexdigest()})
print(json.dumps(entries))
