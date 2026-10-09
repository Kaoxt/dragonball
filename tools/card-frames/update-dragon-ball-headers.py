"""Use the current combat-card title geometry with gold Dragon Ball panels."""
from pathlib import Path
import io, sys
from PIL import Image
import cairosvg

ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT

def header(original):
    defs=[]
    for side,x in [('left',110),('right',110)]:
        stops=[]
        for y in range(50,146,5):
            color=original.getpixel((x,max(55,min(y,138))))
            stops.append(f'<stop offset="{(y-50)/95}" stop-color="rgb{color}"/>')
        defs.append(f'<linearGradient id="{side}" x1="0" y1="50" x2="0" y2="145" gradientUnits="userSpaceOnUse">{"".join(stops)}</linearGradient>')
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="166">
      <defs>{''.join(defs)}</defs>
      <rect width="1070" height="166" fill="#090d0e"/>
      <path d="M21 48L50 20H126L146 44H104L92 33H82L45 72V121L86 158H65L21 118Z" fill="#d9b64f"/>
      <path d="M1049 48L1020 20H944L924 44H966L978 33H988L1025 72V121L984 158H1005L1049 118Z" fill="#d9b64f"/>
      <path d="M87 40L54 74V118L85 153H980L1017 118V73L986 41L976 48H104L96 40Z" fill="#c7a64c"/>
      <path d="M88 48H111V145H91L62 112V77Z" fill="url(#left)"/>
      <path d="M980 48H959V145H976L1009 112V77Z" fill="url(#right)"/>
      <path d="M146 40H928" stroke="#7e898e" stroke-width="8"/>
      <path d="M17 48L48 17 M1022 18L1052 48" fill="none" stroke="#899499" stroke-width="8"/>
      <path d="M87 40L54 74V118L85 153H980L1017 118V73L986 41" fill="none" stroke="#090d0e" stroke-width="16" stroke-linejoin="miter"/>
      <path d="M87 40L54 74V118L85 153H980L1017 118V73L986 41" fill="none" stroke="#7e898e" stroke-width="8" stroke-linejoin="miter"/>
      <path d="M96 48H978 M89 145H978" stroke="#090d0e" stroke-width="6"/>
    </svg>'''
    out=original.copy()
    rendered=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGB')
    rendered.paste(original.crop((111,51,979,130)),(111,51))
    rendered.paste(original.crop((111,130,959,142)),(111,130))
    out.paste(rendered,(0,0))
    return out

if __name__=='__main__':
    for n in (15,16):
        src=next((SOURCE/'public/assets/cards').glob(f'saiyan-{n:03d}-*.webp'))
        im=Image.open(src).convert('RGB'); updated=header(im)
        assert im.crop((0,166,1070,1470)).tobytes()==updated.crop((0,166,1070,1470)).tobytes()
        assert im.crop((111,55,959,138)).tobytes()==updated.crop((111,55,959,138)).tobytes()
        updated.save(ROOT/'public/assets/cards'/src.name,'WEBP',lossless=True,method=4)
