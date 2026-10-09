"""Close title panel joins using precise SVG fills; keep title glyphs intact."""
from pathlib import Path
import io, sys
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT

def repair(im):
    # Sample the existing panel near each end, outside the title glyphs.
    definitions = []
    for side, x in [('left', 110), ('right', 960)]:
        stops = []
        for y in range(50, 146, 5):
            rgb = im.getpixel((x, max(55, min(y, 138))))[:3]
            stops.append(f'<stop offset="{(y-50)/95}" stop-color="rgb{rgb}"/>')
        definitions.append(f'<linearGradient id="{side}" x1="0" y1="50" x2="0" y2="145" gradientUnits="userSpaceOnUse">{"".join(stops)}</linearGradient>')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="1470">
      <defs>{''.join(definitions)}</defs>
      <!-- Remove raster remnants above the top trim without clipping corners. -->
      <path d="M128 12H942L926 46H146Z" fill="#090d0e"/>
      <path d="M146 40H928" fill="none" stroke="#7e898e" stroke-width="8"/>
      <!-- Fill to the inside of the vector frame, covering the old inset line. -->
      <path d="M88 48H111V145H91L62 112V77Z" fill="url(#left)"/>
      <path d="M980 48H959V145H976L1009 112V77Z" fill="url(#right)"/>
      <path d="M96 48H978 M89 145H978" fill="none" stroke="#090d0e" stroke-width="6"/>
      <path d="M87 40L54 74V118L85 153H980L1017 118V73L986 41"
        fill="none" stroke="#090d0e" stroke-width="16" stroke-linejoin="miter"/>
      <path d="M87 40L54 74V118L85 153H980L1017 118V73L986 41"
        fill="none" stroke="#7e898e" stroke-width="8" stroke-linejoin="miter"/>
    </svg>'''
    overlay = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode())))
    return Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')

def clean_lower_frame(im, n):
    color = '#f0a000' if n<=5 else '#e51a22' if n<=10 else '#0096ed' if n<=14 else '#969da0' if n==17 else '#008b62'
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="1470">
      <path d="M18 1214L61 1249V1300L99 1349H76L39 1312V1284L18 1262Z" fill="#090d0e"/>
      <path d="M1052 1214L1009 1249V1300L971 1349H994L1031 1312V1284L1052 1262Z" fill="#090d0e"/>
      <path d="M18 1258L47 1280V1358L83 1411H62L18 1380Z M1052 1258L1023 1280V1358L987 1411H1008L1052 1380Z" fill="#090d0e"/>
      <path d="M24 1266L38 1281V1363L72 1403H273L326 1350H744L797 1403H998L1035 1363V1281L1047 1268" fill="none" stroke="#090d0e" stroke-width="17" stroke-linejoin="miter"/>
      <path d="M24 1266L38 1281V1363L72 1403H273L326 1350H744L797 1403H998L1035 1363V1281L1047 1268" fill="none" stroke="#6e7a80" stroke-width="9" stroke-linejoin="miter"/>
      <rect x="86" y="1327" width="898" height="29" fill="#0c1011"/>
      <path d="M87 1350H244 M326 1350H744 M826 1350H984" stroke="#6e7a80" stroke-width="7"/>
      <path d="M87 1340H983" stroke="#090d0e" stroke-width="12"/>
      <path d="M87 1340H983" stroke="#7e898e" stroke-width="6"/>
      <path d="M21 1220L52 1252V1305L88 1341H79L45 1309V1271L21 1254Z" fill="{color}"/>
      <path d="M1049 1220L1018 1252V1305L982 1341H991L1025 1309V1271L1049 1254Z" fill="{color}"/>
    </svg>'''
    overlay = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode())))
    return Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')

def clean_edges(im, dragon=False):
    bottom, corner = (1452, 1410) if dragon else (1416, 1375)
    # A solid outer frame removes the distressed raster texture.
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="1470">
+      <path fill="#090d0e" fill-rule="evenodd" d="M0 0H1070V1470H0Z
+        M50 12H1020L1050 44V{corner}L1012 {bottom}H58L20 {corner}V44Z"/>
+      <path d="M17 48L48 17 M1022 18L1052 48" fill="none" stroke="#090d0e" stroke-width="16"/>
+      <path d="M17 48L48 17 M1022 18L1052 48" fill="none" stroke="#899499" stroke-width="8"/>
+    </svg>'''.replace('\n+', '\n')
    overlay = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode())))
    return Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')

if __name__ == '__main__':
    for n in range(1, 21):
        p = next(p for p in (ROOT/'public/assets/cards').glob(f'saiyan-{n:03d}-*.webp') if '.tmp.' not in p.name)
        original = Image.open(SOURCE / p.relative_to(ROOT)).convert('RGB')
        fixed = original if n in (15,16) else repair(original)
        fixed = clean_edges(fixed, n in (15,16))
        if n not in (15,16): fixed = clean_lower_frame(fixed, n)
        assert fixed.crop((26,180,1040,1210)).tobytes() == original.crop((26,180,1040,1210)).tobytes()
        assert fixed.crop((112,55,959,140)).tobytes() == original.crop((112,55,959,140)).tobytes()
        temp = p.with_suffix('.tmp.webp')
        fixed.save(temp, 'WEBP', lossless=True, method=4)
        temp.replace(p)
