"""Export the approved charcoal palette from immutable current card renders.

Only identified slate frame colors are remapped. Artwork, text, and silver
rails are protected. Run once against SOURCE, not against a previous output.
"""
from pathlib import Path
import io, json, re, subprocess, hashlib
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = '5c1fdd05659324da68f8af464d89e47921d1dc96'
OLD = np.array([98., 108., 125.])
NEW = np.array([41., 44., 48.])

def source(path):
    return subprocess.check_output(['git', 'show', SOURCE + ':' + path], cwd=ROOT)

def main():
    text = source('public/cards/catalog.js').decode()
    match = re.search(r'export const catalog\s*=\s*(\[.*?\]);', text, re.S)
    catalog = json.loads(match[1]); updates = []
    for card in catalog:
        if card['style'] != 'Black':
            continue
        path = 'public' + card['image'].split('?')[0]
        original = Image.open(io.BytesIO(source(path))).convert('RGB')
        a = np.array(original); h, w = a.shape[:2]
        protected = Image.new('L', (w, h)); draw = ImageDraw.Draw(protected)
        if (w, h) == (1060, 1484):
            draw.polygon([(79,184),(982,184),(982,321),(1018,292),(1018,695),(968,741),(92,741),(40,695),(40,292),(79,321)], fill=255)
        else:
            # #235 has not yet received the full vector modernization.
            assert card['number'] == '235' and (w, h) == (1070,1470)
            draw.rectangle((0,160,w,h),fill=255)
        f = a.astype(float)
        # Quantized shades of the exact slate palette, including its dark edge
        # blends. Neutral/silver pixels and white type cannot enter this mask.
        scale = f[:,:,2] / OLD[2]
        error = np.max(np.abs(f - scale[:,:,None] * OLD), axis=2)
        mask = (error < 3.0) & (scale > .16) & (scale < 1.12) & (np.array(protected) == 0)
        assert mask.sum() > 15000, card['number']
        out = a.copy()
        out[mask] = np.rint(scale[:,:,None] * NEW).clip(0,255).astype('uint8')[mask]
        if card['number'] == '235':
            # This legacy export is lossy. A hard palette cutoff would leave
            # speckled gray edges around the title. Recover the continuous
            # slate contribution through black/white antialiasing instead.
            panel = Image.new('L',(w,h))
            ImageDraw.Draw(panel).polygon([(96,49),(975,49),(1007,79),(1007,109),(975,151),(96,151),(62,120),(62,79)],fill=255)
            mask = (np.array(panel)>0) & (np.min(a,axis=2)<160)
            alpha = np.clip((f[:,:,2]-f[:,:,0])/(OLD[2]-OLD[0]),0,1)
            out = a.copy()
            adjusted = np.rint(f + alpha[:,:,None]*(NEW-OLD)).clip(0,255).astype('uint8')
            out[mask] = adjusted[mask]
        assert np.array_equal(out[~mask], a[~mask])
        assert np.array_equal(out[np.array(protected)>0], a[np.array(protected)>0])
        # All bright text/silver pixels remain byte-identical.
        bright = np.min(a,axis=2) > 160
        assert np.array_equal(out[bright], a[bright])
        image = Image.fromarray(out); stream = io.BytesIO()
        image.save(stream,'WEBP',lossless=True,method=4); binary = stream.getvalue()
        assert np.array_equal(np.array(Image.open(io.BytesIO(binary))),out)
        sha = hashlib.sha1(b'blob '+str(len(binary)).encode()+b'\0'+binary).hexdigest()
        (ROOT/path).write_bytes(binary)
        card['image'] = card['image'].split('?')[0] + '?v=' + sha[:10]
        updates.append(dict(number=card['number'],name=card['name'],path=path,sha=sha,changed_pixels=int(mask.sum()),artwork_preserved=True,lettering_and_silver_preserved=True))
    assert len(updates) == 18
    (ROOT/'public/cards/catalog.js').write_text(text[:match.start(1)]+json.dumps(catalog,indent=2,ensure_ascii=False)+text[match.end(1):])
    (ROOT/'docs/black-style-charcoal.json').write_text(json.dumps(dict(source_commit=SOURCE,black_style='#292c30',freestyle_unchanged='#8d959d',updated=updates),indent=2)+'\n')
    print(f'Updated {len(updates)} Black Style cards; artwork, lettering, and silver preservation checks passed.')

if __name__ == '__main__':
    main()
