"""Set Learn The Rules in native Flipside; keep the current backing and art."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
ASSETS = ROOT / 'public/assets'
PREVIOUS = SOURCE.parent / 'gameplay-discussion-texture-shadow'
CURRENT = SOURCE.parent / 'gameplay-discussion-arena-match'
CONFIG = {
    'desktop': ((2179, 330), (24, 190), [960, 1276, 1536, 2179]),
    'mobile': ((1920, 384), (24, 255), [480, 960, 1536, 1920]),
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

audit = []
for kind, (native, position, widths) in CONFIG.items():
    # The retained alpha is rendered directly with the actual Flipside TTF, without synthetic bold.
    title = Image.open(SOURCE / f'{kind}-lettering.png').convert('L')
    old_title = Image.open(CURRENT / f'{kind}-lettering.png').convert('L')
    shadow = Image.open(CURRENT / f'{kind}-backing.png').convert('L')
    clean_mask = Image.open(PREVIOUS / f'{kind}-cleanup-mask.png').convert('L')
    restore = Image.open(ASSETS / f'gameplay-banner-goku-{kind}-{native[0]}.webp').convert('RGB')
    restore.paste(Image.open(PREVIOUS / f'{kind}-clean-background.png'), position)

    for width in widths:
        baseline = ASSETS / f'gameplay-banner-goku-textured-{kind}-{width}.webp'
        source = ASSETS / f'gameplay-banner-goku-arena-match-{kind}-{width}.webp'
        original = Image.open(baseline).convert('RGB')
        current = Image.open(source).convert('RGB')
        size = original.size
        footprint = np.asarray(clean_mask.resize(size, Image.Resampling.NEAREST)) > 0
        if kind == 'mobile':
            protection = Image.new('L', native)
            ImageDraw.Draw(protection).polygon([(830, 383), (875, 359), (875, 384), (830, 384)], fill=255)
            footprint &= np.asarray(protection.resize(size, Image.Resampling.NEAREST)) == 0
        layers = [layer.resize(size, Image.Resampling.LANCZOS) for layer in [clean_mask, title, shadow, old_title]]
        cleanup, ink, shade, old_ink = [Image.fromarray(np.where(footprint, np.asarray(m), 0).astype('uint8')) for m in layers]
        backdrop = Image.composite(restore.resize(size, Image.Resampling.LANCZOS), original, cleanup)
        backdrop = Image.composite(Image.new('RGB', size, '#060505'), backdrop, shade)
        # Reconstruct the current result as an independent exactness check.
        reconstructed = Image.composite(Image.new('RGB', size, '#f9f9f9'), backdrop, old_ink)
        assert np.array_equal(np.asarray(reconstructed), np.asarray(current)), source
        result = Image.composite(Image.new('RGB', size, '#f9f9f9'), backdrop, ink)
        target = ASSETS / f'rules-banner-goku-flipside-{kind}-{width}.webp'
        temporary = target.with_suffix('.tmp.webp')
        result.save(temporary, lossless=True, method=6)
        temporary.replace(target)
        decoded = np.asarray(Image.open(target).convert('RGB'))
        changed = np.any(decoded != np.asarray(current), axis=2)
        lettering_area = (np.asarray(old_ink) > 0) | (np.asarray(ink) > 0)
        assert not changed[~lettering_area].any(), target
        audit.append(dict(source=str(source.relative_to(ROOT)), target=str(target.relative_to(ROOT)),
                          source_sha256=sha(source), target_sha256=sha(target), size=size,
                          native_flipside_lettering_mask=str((SOURCE / f'{kind}-lettering.png').relative_to(ROOT)),
                          unchanged_shadow_mask=str((CURRENT / f'{kind}-backing.png').relative_to(ROOT)),
                          changed_pixels=int(changed.sum()), changed_outside_old_and_new_lettering=0,
                          shadow_and_artwork_preserved=True))
(SOURCE / 'pixel-audit.json').write_text(json.dumps(audit, indent=2) + '\n')
print('Eight exports verified: only the lettering changed. Current shadow and all unrelated pixels are identical.')
