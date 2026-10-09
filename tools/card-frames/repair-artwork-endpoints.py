"""Trim the approved open-side artwork diagonals cleanly at the artwork edge.

Only two 65 x 75 pixel corner regions are changed. No vertical rails are added.
Run with --start/--end to repair and version catalog assets in batches of ten.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BOXES = ((0, 675, 65, 750), (1005, 675, 1070, 750))

def repair(im, trim='#7e898e'):
    assert im.size == (1070, 1470)
    # Continue the existing slopes beyond the art window, then clip at its edge.
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1070" height="1470">
      <defs><clipPath id="art"><rect x="22" y="675" width="1026" height="100"/></clipPath></defs>
      <g clip-path="url(#art)">
        <path d="M6 682L78 763H990L1062 683" fill="none" stroke="#090d0e" stroke-width="22" stroke-linejoin="miter"/>
        <path d="M6 682L78 763H990L1062 683" fill="none" stroke="{trim}" stroke-width="8" stroke-linejoin="miter"/>
      </g>
      <rect x="0" y="675" width="22" height="75" fill="#090d0e"/>
      <rect x="1048" y="675" width="22" height="75" fill="#090d0e"/>
    </svg>'''
    layer = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGBA')
    rendered = Image.alpha_composite(im.convert('RGBA'), layer).convert('RGB')
    result = im.convert('RGB').copy()
    for box in BOXES:
        result.paste(rendered.crop(box), box[:2])
    return result

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--start', type=int, default=1)
    ap.add_argument('--end', type=int, default=70)
    args = ap.parse_args()
    catalog_path = ROOT/'public/cards/catalog.js'
    text = catalog_path.read_text()
    cards = json.loads(re.search(r'export const catalog\s*=\s*(\[.*?\]);', text, re.S)[1])
    manifest_path = ROOT/'docs/saiyan-open-artwork-endpoints.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
        'fix': 'Clean clipped diagonal endpoints; artwork sides remain open',
        'changed_regions': BOXES, 'updated': []}
    for n in range(args.start, args.end+1):
        c = next(c for c in cards if c['id'].startswith(f'saiyan-{n:03d}-'))
        path = ROOT/'public'/c['image'].split('?')[0].lstrip('/')
        original = Image.open(path).convert('RGB')
        result = repair(original, '#c7a64c' if n in (15,16) else '#7e898e')
        # Verify every pixel outside the two explicitly allowed corner regions.
        check = result.copy()
        for box in BOXES: check.paste(original.crop(box), box[:2])
        assert check.tobytes() == original.tobytes()
        result.save(path, 'WEBP', lossless=True, method=4)
        data = path.read_bytes()
        sha = hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
        new_image = c['image'].split('?')[0]+'?v='+sha[:10]
        text = text.replace(c['image'], new_image)
        manifest['updated'] = [x for x in manifest['updated'] if x['number'] != n]
        manifest['updated'].append({'number': n, 'path': str(path.relative_to(ROOT)), 'sha': sha})
        print(n, sha, flush=True)
    manifest['updated'].sort(key=lambda x: x['number'])
    catalog_path.write_text(text)
    manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')

if __name__ == '__main__': main()
