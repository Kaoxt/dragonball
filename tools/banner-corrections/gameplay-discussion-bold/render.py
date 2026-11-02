"""Bold the retained Flipside caption without moving or regenerating artwork."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
ASSETS = ROOT / 'public/assets'
OLD = SOURCE.parent / 'gameplay-discussion-fitted-shadow'
CLEAN = SOURCE.parent / 'gameplay-discussion-texture-shadow'
CONFIG = {
    'desktop': ((2179, 330), (24, 190), 2, [960, 1276, 1536, 2179]),
    'mobile': ((1920, 384), (24, 255), 1.75, [480, 960, 1536, 1920]),
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def bold_mask(old, radius):
    # Work from the actual retained Flipside glyphs, at their original size,
    # position and spacing. Supersampling makes the added weight antialiased.
    raw = np.asarray(old)
    shape = ndimage.grey_closing(raw, size=(5, 5))
    solid = Image.fromarray(shape).resize((old.width * 4, old.height * 4), Image.Resampling.LANCZOS)
    solid = solid.filter(ImageFilter.MaxFilter(2 * round(radius * 4) + 1))
    solid = solid.resize(old.size, Image.Resampling.LANCZOS)
    ink = np.asarray(solid).astype(float)
    # Retain the original scratches inside each glyph; only thicken contours.
    interior = ndimage.binary_erosion(shape > 180, iterations=1)
    texture = np.divide(raw, shape, out=np.ones(raw.shape, dtype=float), where=shape > 0)
    ink *= np.where(interior, texture, 1)
    return Image.fromarray(np.rint(ink).astype('uint8'))

audit = []
for kind, (native, position, radius, widths) in CONFIG.items():
    old_title = Image.open(OLD / f'{kind}-lettering.png').convert('L')
    old_shadow = Image.open(OLD / f'{kind}-backing.png').convert('L')
    title = bold_mask(old_title, radius)
    field = ndimage.maximum_filter(np.asarray(title).astype(float) / 255, size=(15, 25))
    shadow = Image.fromarray(np.rint(ndimage.gaussian_filter(field, sigma=6) * .90 * 255).astype('uint8'))
    title.save(SOURCE / f'{kind}-lettering.png')
    shadow.save(SOURCE / f'{kind}-backing.png')
    clean_mask = Image.open(CLEAN / f'{kind}-cleanup-mask.png').convert('L')
    restore = Image.open(ASSETS / f'gameplay-banner-goku-{kind}-{native[0]}.webp').convert('RGB')
    restore.paste(Image.open(CLEAN / f'{kind}-clean-background.png'), position)
    protection = Image.new('L', native)
    if kind == 'mobile':
        ImageDraw.Draw(protection).polygon([(830, 383), (875, 359), (875, 384), (830, 384)], fill=255)

    for width in widths:
        source = ASSETS / f'gameplay-banner-goku-fitted-shadow-{kind}-{width}.webp'
        current = Image.open(source).convert('RGB')
        size = current.size
        baseline = Image.open(ASSETS / f'gameplay-banner-goku-textured-{kind}-{width}.webp').convert('RGB')
        footprint = np.asarray(clean_mask.resize(size, Image.Resampling.NEAREST)) > 0
        footprint &= np.asarray(protection.resize(size, Image.Resampling.NEAREST)) == 0
        masks = [m.resize(size, Image.Resampling.LANCZOS) for m in [clean_mask, old_title, old_shadow, title, shadow]]
        cleanup, old_ink, old_shade, ink, shade = [Image.fromarray(np.where(footprint, np.asarray(m), 0).astype('uint8')) for m in masks]
        backdrop = Image.composite(restore.resize(size, Image.Resampling.LANCZOS), baseline, cleanup)
        dark = Image.new('RGB', size, '#060505')
        white = Image.new('RGB', size, '#f9f9f9')
        reconstructed = Image.composite(white, Image.composite(dark, backdrop, old_shade), old_ink)
        assert np.array_equal(np.asarray(reconstructed), np.asarray(current)), f'Baseline mismatch: {source}'
        result = Image.composite(white, Image.composite(dark, backdrop, shade), ink)
        target = ASSETS / f'gameplay-banner-goku-bold-{kind}-{width}.webp'
        result.save(target, lossless=True, method=6)
        decoded = np.asarray(Image.open(target).convert('RGB'))
        changed = np.any(decoded != np.asarray(current), axis=2)
        allowed = np.logical_or.reduce([np.asarray(m) > 0 for m in [old_ink, old_shade, ink, shade]])
        assert not changed[~allowed].any(), target
        assert not changed[~footprint].any(), target
        audit.append(dict(source=str(source.relative_to(ROOT)), target=str(target.relative_to(ROOT)),
                          source_sha256=sha(source), target_sha256=sha(target), size=size,
                          bold_radius_native_px=radius, changed_pixels=int(changed.sum()),
                          changed_outside_text_and_shadow=0, character_and_logo_pixels_changed=0,
                          prior_export_reconstructed_exactly=True))
(SOURCE / 'pixel-audit.json').write_text(json.dumps(audit, indent=2) + '\n')
print('Verified eight lossless exports: exact source reconstruction; zero changes outside text/shadow.')
