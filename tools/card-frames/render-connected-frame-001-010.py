"""Export cards 1–10 using one approved frame and fresh imagegen Raditz art.

The common frame is immutable. Existing artwork, title lettering, rules and
number positions are taken from the prior published cards; #5 uses fresh art.
This prevents independent generative edits from changing border geometry.
Requires Pillow and NumPy.
"""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE_COMMIT = '8bff6c3c430850a13d20a77db203a7b0b42676cb'
manifest_path = ROOT / 'docs/saiyan-approved-frame-001-010.json'
manifest = json.loads(manifest_path.read_text())
catalog_path = ROOT / 'public/cards/catalog.js'
catalog = catalog_path.read_text()
master = Image.open(Path(__file__).with_name('approved-connected-frame-raditz.png')).convert('RGB')
assert master.size == (1060, 1484)
W, H = master.size

# Content regions do not touch any of the approved border rails or accents.
art_mask = Image.new('L', (W, H))
d = ImageDraw.Draw(art_mask)
d.polygon([(79,183),(982,183),(982,321),(1018,292),(1018,695),
           (968,741),(92,741),(40,695),(40,292),(79,321)], fill=255)
title_box = (110, 90, 950, 157)
rules_box = (80, 938, 987, 1143)
number_box = (136, 1332, 204, 1373)
content_mask = art_mask.copy()
d = ImageDraw.Draw(content_mask)
for box in (title_box, rules_box, number_box):
    d.rectangle((box[0],box[1],box[2]-1,box[3]-1),fill=255)
frame_pixels = np.array(content_mask) == 0
art_boundary = (np.array(art_mask)>0) & (np.array(art_mask.filter(ImageFilter.MinFilter(13)))==0)
first_frame = {}
number_pixels = np.zeros((H,W),dtype=bool)
number_pixels[number_box[1]:number_box[3],number_box[0]:number_box[2]] = True

for card in manifest['updated']:
    source_bytes = subprocess.check_output(['git','show',f"{SOURCE_COMMIT}:{card['path']}"],cwd=ROOT)
    original = Image.open(io.BytesIO(source_bytes)).convert('RGB')
    output = master.copy()
    style = 'Orange' if card['number'] <= 5 else 'Red'
    if style == 'Red':
        rgb = np.array(output)
        hsv = np.array(output.convert('HSV'))
        orange = (hsv[:,:,0] < 38) & (hsv[:,:,1] > 100) & (rgb[:,:,0] > 55)
        hsv[:,:,0][orange] = 0
        recolored = np.array(Image.fromarray(hsv,'HSV').convert('RGB'))
        rgb[orange] = recolored[orange]
        output = Image.fromarray(rgb)
    expected_art = np.array(original).copy()
    if card['number'] != 5:
        # The previous exports left a few blue master-art pixels at the upper
        # window edges. Replace only those narrow remnants with adjacent art.
        rgb = expected_art.astype(float)
        blue = (rgb[:,:,2] > rgb[:,:,0]*1.25) & (rgb[:,:,2] > rgb[:,:,1]*1.2) & (rgb[:,:,2] > 50)
        below_blue = np.roll(blue,-8,axis=0)
        repair = art_boundary & blue & ~below_blue
        repair[330:,:] = False
        adjacent = np.roll(expected_art,-8,axis=0)
        expected_art[repair] = adjacent[repair]
        output.paste(Image.fromarray(expected_art),(0,0),art_mask)
    # Reuse the original title glyphs without copying an old rectangular panel.
    # Unmix neutral lettering from the orange/red background, preserving its
    # antialiasing; use one smooth panel from the shared master underneath.
    if card['number'] != 5:
        x0,y0,x1,y1 = title_box
        src = np.array(original).astype(float)
        dst = np.array(output).astype(float)
        height,width = y1-y0,x1-x0
        mix_y = np.linspace(0,1,height)[:,None,None]
        background = src[86,x0:x1][None,:,:]*(1-mix_y) + src[157,x0:x1][None,:,:]*mix_y
        observed = src[y0:y1,x0:x1]
        alpha = np.clip(1-(observed[:,:,0]-observed[:,:,2])/np.maximum(1,background[:,:,0]-background[:,:,2]),0,1)
        alpha[alpha<0.025]=0
        alpha[alpha>0.995]=1
        foreground = np.clip((observed-background*(1-alpha[:,:,None]))/np.maximum(alpha[:,:,None],0.001),0,255)
        mix_x = np.linspace(0,1,width)[None,:,None]
        panel = dst[y0:y1,180][:,None,:]*(1-mix_x) + dst[y0:y1,880][:,None,:]*mix_x
        dst[y0:y1,x0:x1] = foreground*alpha[:,:,None] + panel*(1-alpha[:,:,None])
        output = Image.fromarray(np.uint8(np.clip(np.round(dst),0,255)))
    output.paste(original.crop(rules_box),rules_box[:2])
    # Clear master numeral with adjacent unprinted footer, retaining its background.
    x0,y0,x1,y1 = number_box
    blank = output.crop((207,y0,235,y1)).resize((x1-x0,y1-y0))
    output.paste(blank,(x0,y0))
    # Original numeral has no shadow; isolate its antialiased white glyph.
    numeral = np.array(original.crop(number_box)).astype(float)
    alpha = np.uint8(np.clip((numeral.min(axis=2)-40)*255/215,0,255))
    output.paste('white',(x0,y0),Image.fromarray(alpha))

    a = np.array(output)
    if style not in first_frame:
        first_frame[style] = a
    else:
        assert np.array_equal(a[frame_pixels],first_frame[style][frame_pixels]), 'Frame mismatch'
    assert output.crop(rules_box).tobytes() == original.crop(rules_box).tobytes(), 'Rules changed'
    if card['number'] != 5:
        assert np.array_equal(a[np.array(art_mask)>0],expected_art[np.array(art_mask)>0]), 'Art changed'
    path = ROOT / card['path']
    buffer = io.BytesIO()
    output.save(buffer,'WEBP',lossless=True,method=4)
    data = buffer.getvalue()
    assert Image.open(io.BytesIO(data)).convert('RGB').tobytes() == output.tobytes(), 'Lossless mismatch'
    temporary = path.with_suffix('.tmp.webp')
    temporary.write_bytes(data)
    temporary.replace(path)
    sha = hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    catalog = catalog.replace('?v='+card['sha'][:10],'?v='+sha[:10])
    card['sha'] = sha

manifest['design'] = 'Approved connected title and footer rails, continuous colored stepped Combat accents, fresh clean Raditz artwork on #5'
manifest['frame_pixel_equality'] = 'Passed: every frame pixel identical within each style; shared sword and lettering placement'
manifest['lossless_export_equality'] = 'Passed for all 10'
manifest['content_preservation'] = 'Original title glyphs retained on a shared seamless title panel. Rules pixel-identical on all 10; original art retained on all except #5, with stray blue edge pixels removed. Numerals retain original glyph shapes and positions.'
manifest['raditz_artwork'] = 'Fresh clean anime drawing from imagegen, replacing the repeatedly edited portrait on Orange Arm Bar #5.'
manifest['source_commit'] = SOURCE_COMMIT
manifest.pop('corner_cleanup',None)
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
catalog_path.write_text(catalog)
print('10 exports validated: identical shared frames, preserved text/art, lossless WebP.')
