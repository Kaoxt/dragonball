"""Correct only titles on the approved cards, preserving every other pixel.

The original first ten cards retain raster title glyphs. Teko Bold provides
the same heavy squared, condensed treatment for reproducible later titles.
Font: Google Fonts Teko, OFL; static instance of weight 700.
"""
from pathlib import Path
import argparse, hashlib, importlib.util, io, json, re, subprocess
import numpy as np
from PIL import Image

HERE = Path(__file__).parent
ROOT = HERE.parents[1]
SOURCE = 'efa6f170b4f621ae27b3af075950c45607457e37'
spec = importlib.util.spec_from_file_location('renderer', HERE/'render-approved-range-011-030.py')
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--start', type=int, required=True)
    parser.add_argument('--end', type=int, required=True)
    args = parser.parse_args()
    assert (args.start, args.end) in [(11,20),(21,30)]
    manifest_path = ROOT/f'docs/saiyan-approved-vector-{args.start:03d}-{args.end:03d}.json'
    manifest = json.loads(manifest_path.read_text())
    catalog_path = ROOT/'public/cards/catalog.js'
    text = catalog_path.read_text()
    for card in manifest['updated']:
        data = subprocess.check_output(['git','show',f"{SOURCE}:{card['path']}"],cwd=ROOT)
        original = Image.open(io.BytesIO(data)).convert('RGBA')
        color = '#d5b54d' if card['type']=='Dragon Ball' else renderer.THEMES[card['style']]
        panel = renderer.svg_layer(f'<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="1484"><path d="M110 77L123 87H936L949 77L979 105V132L947 164H112L81 132V105Z" fill="{color}"/></svg>')
        title = renderer.lettering(card['name'].upper(),renderer.TITLE_FONT,74,865,stroke=5)
        result = Image.alpha_composite(original,panel)
        result.alpha_composite(title,(round((1060-title.width)/2),round(122-title.height/2)))
        # Copy only the inner panel; even antialiased border pixels are retained.
        mask = np.array(panel)[:,:,3] == 255
        out = np.array(original.convert('RGB'))
        changed = np.array(result.convert('RGB'))
        out[mask] = changed[mask]
        assert np.array_equal(out[~mask],np.array(original.convert('RGB'))[~mask])
        final = Image.fromarray(out)
        buffer = io.BytesIO();final.save(buffer,'WEBP',lossless=True,method=4)
        exported = buffer.getvalue()
        assert Image.open(io.BytesIO(exported)).convert('RGB').tobytes()==final.tobytes()
        sha = hashlib.sha1(b'blob '+str(len(exported)).encode()+b'\0'+exported).hexdigest()
        (ROOT/card['path']).write_bytes(exported)
        text = text.replace('?v='+card['sha'][:10],'?v='+sha[:10])
        card['sha'] = sha
        card['title_font'] = 'Teko Bold 700, 74px, 5px black outline'
    catalog_path.write_text(text)
    manifest['title_correction'] = {'source_commit':SOURCE,'font':'tools/card-frames/fonts/Teko-Bold.ttf','validation':'All pixels outside the title interior are identical to the approved source; all exports lossless.'}
    manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    print(f'Corrected {len(manifest["updated"])} titles; outside-title pixel preservation passed.')

if __name__ == '__main__':
    main()
