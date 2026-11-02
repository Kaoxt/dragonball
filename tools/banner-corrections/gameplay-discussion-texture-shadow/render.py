"""Correct only the Forums caption's texture and old shadow remnants."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw

SOURCE=Path(__file__).resolve().parent
ROOT=SOURCE.parents[2]
ASSETS=ROOT/'public/assets'
CONFIG={
 'desktop':((2179,330),(24,190),970,[960,1276,1536,2179]),
 'mobile':((1920,384),(24,255),875,[480,960,1536,1920]),
}
audit=[]
for kind,(native,position,right,widths) in CONFIG.items():
    restore=Image.open(ASSETS/f'gameplay-banner-goku-{kind}-{native[0]}.webp').convert('RGB')
    restore.paste(Image.open(SOURCE/f'{kind}-clean-background.png'),position)
    clean_mask=Image.open(SOURCE/f'{kind}-cleanup-mask.png')
    title=Image.open(SOURCE/f'{kind}-textured-lettering.png')
    shadow=Image.open(SOURCE/f'{kind}-soft-shadow.png')
    for width in widths:
        source=ASSETS/f'gameplay-banner-goku-{kind}-{width}.webp'
        original=Image.open(source).convert('RGB');size=original.size
        masks=[layer.resize(size,Image.Resampling.LANCZOS) for layer in [clean_mask,title,shadow]]
        # Clip resampling to the approved local text-and-shadow region.
        footprint=np.asarray(clean_mask.resize(size,Image.Resampling.NEAREST))>0
        if kind=='mobile':
            protect=Image.new('L',native)
            ImageDraw.Draw(protect).polygon([(830,383),(875,359),(875,384),(830,384)],fill=255)
            footprint &= np.asarray(protect.resize(size,Image.Resampling.NEAREST))==0
        masks=[Image.fromarray(np.where(footprint,np.asarray(m),0).astype('uint8')) for m in masks]
        cleanup,ink,shade=masks
        result=Image.composite(restore.resize(size,Image.Resampling.LANCZOS),original,cleanup)
        result=Image.composite(Image.new('RGB',size,'#070505'),result,shade)
        result=Image.composite(Image.new('RGB',size,'#f9f9f9'),result,ink)
        target=ASSETS/f'gameplay-banner-goku-textured-{kind}-{width}.webp'
        result.save(target,lossless=True,method=6)
        decoded=np.asarray(Image.open(target).convert('RGB'))
        changed=np.any(decoded!=np.asarray(original),axis=2)
        assert not changed[~footprint].any(),f'Outside caption/shadow: {target}'
        assert not changed[:,round(right*width/native[0])+2:].any(),f'Character/logo changed: {target}'
        audit.append(dict(source=str(source.relative_to(ROOT)),target=str(target.relative_to(ROOT)),
            source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
            target_sha256=hashlib.sha256(target.read_bytes()).hexdigest(),size=size,
            changed_pixels=int(changed.sum()),changed_outside_text_and_shadow_area=0,
            character_and_logo_pixels_changed=0))
(SOURCE/'pixel-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
print('All eight exports preserve every pixel outside the text/shadow area, including Goku and the logo.')
