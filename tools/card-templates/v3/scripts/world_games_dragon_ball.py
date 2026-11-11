"""Approved November 11 angled Shenron for World Games Earth Dragon Balls."""
from pathlib import Path
import base64

ASSET = Path(__file__).resolve().parents[1] / 'assets/f06231c99579ee5261833446e2d1be95aef43e65e357d0f8543be36d4c8c4ad0.png'


def apply(root):
    """Replace only the illustration, before the builder assetizes the SVG."""
    images = root.xpath('//*[@id="retained-shenron-full-art"]')
    if len(images) != 1:
        raise ValueError('Expected one retained full-art Shenron layer')
    images[0].set('{http://www.w3.org/1999/xlink}href',
                  'data:image/png;base64,' + base64.b64encode(ASSET.read_bytes()).decode())
    return ASSET
