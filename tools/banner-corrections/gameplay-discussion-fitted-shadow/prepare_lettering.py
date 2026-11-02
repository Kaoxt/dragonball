"""Native Flipside with repaired lower erosion and a fitted soft shadow."""
from pathlib import Path
import hashlib
import json
import sys
from PIL import Image, ImageFont, ImageDraw
import numpy as np
from scipy import ndimage

source = Path(__file__).resolve().parent
font_path = Path(sys.argv[1])
metadata = {
    'text': 'GAMEPLAY DISCUSSION', 'font': 'Flipside',
    'font_sha256': hashlib.sha256(font_path.read_bytes()).hexdigest(),
    'font_url': 'https://fonts.resourceboy.com/file/rb-fonts/2024/08/58988/Flipside-Font.zip',
    'synthetic_bold': False, 'bottom_erosion_repair': True,
    'artwork_regenerated': False, 'config': {},
}
for kind, native, points, xy in [
    ('desktop', (2179, 330), 78, (65, 258)),
    ('mobile', (1920, 384), 69, (58, 320)),
]:
    font = ImageFont.truetype(str(font_path), points)
    probe = Image.new('L', (1100, 150))
    ImageDraw.Draw(probe).text((10, 10), metadata['text'], font=font, fill=255)
    glyphs = probe.crop(probe.getbbox())
    raw = np.asarray(glyphs).astype(float)
    # Fill small cracks/open chips only in the lower portion. Upper glyph
    # strokes and texture remain exactly the native font, with no dilation.
    closed = ndimage.grey_closing(np.pad(raw, 12), size=(5, 5))[12:-12, 12:-12]
    ramp = np.clip((np.arange(raw.shape[0]) - raw.shape[0] * .66) / (raw.shape[0] * .18), 0, 1)[:, None]
    solid = np.clip((closed - 25) * 2.2, 0, 255)
    repaired = raw + (np.maximum(raw, solid) - raw) * ramp
    title = Image.new('L', native)
    title.paste(Image.fromarray(np.rint(repaired).astype('uint8')), xy)
    title.save(source / f'{kind}-lettering.png')
    field = ndimage.maximum_filter(np.asarray(title).astype(float) / 255, size=(15, 25))
    field = ndimage.gaussian_filter(field, sigma=6)
    shadow = Image.fromarray(np.rint(np.clip(field * .90, 0, 1) * 255).astype('uint8'))
    shadow.save(source / f'{kind}-backing.png')
    metadata['config'][kind] = {'font_size': points, 'ink_bounds': title.getbbox()}
(source / 'lettering-provenance.json').write_text(json.dumps(metadata, indent=2) + '\n')
