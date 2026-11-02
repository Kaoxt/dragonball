"""Reproduce the title-only Forums banner patch; preserve unrelated pixels."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageFilter

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
ASSETS = ROOT / 'public/assets'
CONFIG = {
    'desktop': ((2179, 330), (32, 220), 965, [960, 1276, 1536, 2179]),
    'mobile': ((1920, 384), (40, 290), 870, [480, 960, 1536, 1920]),
}

audit = []
for kind, (native_size, patch_position, patch_right, widths) in CONFIG.items():
    original = Image.open(ASSETS / f'deck-banner-goku-{kind}-{native_size[0]}.webp').convert('RGB')
    restored = original.copy()
    restored.paste(Image.open(SOURCE / f'{kind}-restored-background.png'), patch_position)
    old_mask = Image.open(SOURCE / f'{kind}-old-ink-mask.png')
    title = Image.open(SOURCE / f'{kind}-gameplay-lettering.png')
    for width in widths:
        source = ASSETS / f'deck-banner-goku-{kind}-{width}.webp'
        before = Image.open(source).convert('RGB')
        size = before.size
        old = old_mask.resize(size, Image.Resampling.LANCZOS)
        old = Image.fromarray((np.asarray(old) > 0).astype('uint8') * 255)
        old = old.filter(ImageFilter.MaxFilter(3))
        ink = title.resize(size, Image.Resampling.LANCZOS)
        stroke = ink.filter(ImageFilter.MaxFilter(3))
        shadow = Image.new('L', size)
        shadow.paste(stroke, (0, 1))
        shadow = Image.fromarray(np.maximum(np.asarray(stroke), np.asarray(shadow)))
        result = Image.composite(restored.resize(size, Image.Resampling.LANCZOS), before, old)
        result = Image.composite(Image.new('RGB', size, '#080606'), result, shadow)
        result = Image.composite(Image.new('RGB', size, '#f9f9f9'), result, ink)
        target = ASSETS / f'gameplay-banner-goku-{kind}-{width}.webp'
        result.save(target, lossless=True, method=6)
        decoded = np.asarray(Image.open(target).convert('RGB'))
        changed = np.any(decoded != np.asarray(before), axis=2)
        allowed = (np.asarray(old) > 0) | (np.asarray(shadow) > 0) | (np.asarray(ink) > 0)
        assert not changed[~allowed].any(), f'Unrelated pixels changed: {target}'
        right = round(patch_right * width / native_size[0]) + 3
        assert not changed[:, right:].any(), f'Character or logo changed: {target}'
        audit.append(dict(source=str(source.relative_to(ROOT)), output=target.name,
                          size=size, changed_pixels=int(changed.sum()),
                          pixels_changed_outside_lettering=0,
                          character_and_logo_pixels_changed=0,
                          sha256=hashlib.sha256(target.read_bytes()).hexdigest()))

(SOURCE / 'pixel-audit.json').write_text(json.dumps(audit, indent=2) + '\n')
print('Verified all 8 lossless exports: zero changes outside old/new lettering footprints.')
