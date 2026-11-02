"""Render native Flipside lettering without synthetic weight or shape changes."""
from pathlib import Path
import hashlib
import json
import sys
from PIL import Image, ImageFont, ImageDraw

source = Path(__file__).resolve().parent
font_path = Path(sys.argv[1])
metadata = {
    'text': 'LEARN THE RULES', 'font': 'Flipside',
    'font_sha256': hashlib.sha256(font_path.read_bytes()).hexdigest(),
    'font_url': 'https://fonts.resourceboy.com/file/rb-fonts/2024/08/58988/Flipside-Font.zip',
    'synthetic_bold': False, 'morphology_applied': False,
    'artwork_regenerated': False, 'config': {},
}
for kind, native, points, xy in [
    ('desktop', (2179, 330), 78, (65, 258)),
    ('mobile', (1920, 384), 69, (58, 320)),
]:
    font = ImageFont.truetype(str(font_path), points)
    probe = Image.new('L', (1100, 150))
    ImageDraw.Draw(probe).text((10, 10), metadata['text'], font=font, fill=255)
    title = Image.new('L', native)
    title.paste(probe.crop(probe.getbbox()), xy)
    title.save(source / f'{kind}-lettering.png')
    metadata['config'][kind] = {'font_size': points, 'ink_bounds': title.getbbox()}
(source / 'lettering-provenance.json').write_text(json.dumps(metadata, indent=2) + '\n')
