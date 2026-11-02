"""Native caption-only revision; retain every unrelated decoded pixel."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
ASSETS = ROOT / 'public/assets'
PREVIOUS = SOURCE.parent / 'gameplay-discussion-texture-shadow'
LETTERING = SOURCE.parent / 'gameplay-discussion'
CONFIG = {
    'desktop': ((2179, 330), (24, 190), (65, 248, 871, 63), 970, [960, 1276, 1536, 2179]),
    'mobile': ((1920, 384), (24, 255), (58, 311, 770, 56), 875, [480, 960, 1536, 1920]),
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def reference_wear():
    # Recover the actual chips and long hairline cracks in the approved Arena ink.
    ref = Image.open(ASSETS / 'arena-banner-flipside-refined-duo-centered-1920.webp').convert('RGB').crop((630, 271, 1320, 346))
    rgb = np.asarray(ref).astype(float)
    gray = rgb.min(axis=2)
    white = (gray > 170) & (np.ptp(rgb, axis=2) < 45)
    closed = ndimage.binary_closing(white, structure=np.ones((5, 5)))
    # Closing bridges narrow fractures; it does not replace the letter counters.
    damage = np.where(closed, np.clip((245 - gray) / 205, 0, 1), 0)
    damage[:3] = 0
    damage[-3:] = 0
    return Image.fromarray((damage * 255).astype('uint8'))

wear = reference_wear()
wear.save(SOURCE / 'arena-reference-wear.png')
audit = []
for kind, (native, position, bounds, right, widths) in CONFIG.items():
    x, y, width, height = bounds
    old_ink = Image.open(LETTERING / f'{kind}-gameplay-lettering.png').convert('L')
    # Keep the established Flipside geometry; increase height and stem weight.
    glyphs = old_ink.crop(old_ink.getbbox()).resize((width * 4, height * 4), Image.Resampling.LANCZOS)
    expanded = Image.new('L', (width * 4 + 24, height * 4 + 24))
    expanded.paste(glyphs, (12, 12))
    expanded = expanded.filter(ImageFilter.MaxFilter(17 if kind == 'desktop' else 15))
    expanded = expanded.resize((width + 6, height + 6), Image.Resampling.LANCZOS)
    solid = Image.new('L', native)
    solid.paste(expanded, (x - 3, y - 3))

    # Transfer the reference's actual wear rather than adding random noise.
    damage_strip = wear.resize((round(wear.width * height / 64), height + 10), Image.Resampling.LANCZOS)
    damage = Image.new('L', native)
    for dx in range(x - 3, x + width + 6, damage_strip.width):
        damage.paste(damage_strip, (dx, y - 5))
    ink = np.asarray(solid).astype(float)
    damage_array = np.asarray(damage).astype(float) / 255
    ink *= 1 - damage_array * 0.94
    title = Image.fromarray(np.rint(ink).astype('uint8'))

    # A broad, feathered dark backing joins the words without a hard rectangle.
    field = ndimage.maximum_filter(np.asarray(solid).astype(float) / 255, size=(19, 45))
    field = ndimage.gaussian_filter(field, sigma=8)
    shadow = Image.fromarray(np.rint(np.clip(field * 0.90, 0, 1) * 255).astype('uint8'))
    clean_mask = Image.open(PREVIOUS / f'{kind}-cleanup-mask.png').convert('L')
    title.save(SOURCE / f'{kind}-lettering.png')
    shadow.save(SOURCE / f'{kind}-backing.png')
    restore = Image.open(ASSETS / f'gameplay-banner-goku-{kind}-{native[0]}.webp').convert('RGB')
    restore.paste(Image.open(PREVIOUS / f'{kind}-clean-background.png'), position)

    for target_width in widths:
        source = ASSETS / f'gameplay-banner-goku-textured-{kind}-{target_width}.webp'
        original = Image.open(source).convert('RGB')
        size = original.size
        footprint = np.asarray(clean_mask.resize(size, Image.Resampling.NEAREST)) > 0
        if kind == 'mobile':
            protection = Image.new('L', native)
            ImageDraw.Draw(protection).polygon([(830, 383), (875, 359), (875, 384), (830, 384)], fill=255)
            footprint &= np.asarray(protection.resize(size, Image.Resampling.NEAREST)) == 0
        masks = [layer.resize(size, Image.Resampling.LANCZOS) for layer in [clean_mask, title, shadow]]
        cleanup, ink_mask, shade = [Image.fromarray(np.where(footprint, np.asarray(m), 0).astype('uint8')) for m in masks]
        result = Image.composite(restore.resize(size, Image.Resampling.LANCZOS), original, cleanup)
        result = Image.composite(Image.new('RGB', size, '#060505'), result, shade)
        result = Image.composite(Image.new('RGB', size, '#f9f9f9'), result, ink_mask)
        target = ASSETS / f'gameplay-banner-goku-arena-match-{kind}-{target_width}.webp'
        temporary = target.with_suffix('.tmp.webp')
        result.save(temporary, lossless=True, method=6)
        temporary.replace(target)
        decoded = np.asarray(Image.open(target).convert('RGB'))
        changed = np.any(decoded != np.asarray(original), axis=2)
        assert not changed[~footprint].any(), target
        assert not changed[:, round(right * target_width / native[0]) + 2:].any(), target
        audit.append(dict(source=str(source.relative_to(ROOT)), target=str(target.relative_to(ROOT)),
                          source_sha256=sha(source), target_sha256=sha(target), size=size,
                          changed_pixels=int(changed.sum()), changed_outside_text_and_shadow_area=0,
                          character_and_logo_pixels_changed=0))
(SOURCE / 'pixel-audit.json').write_text(json.dumps(audit, indent=2) + '\n')
print('Eight lossless exports verified: zero changed pixels outside the caption and shadow; Goku and logo unchanged.')
