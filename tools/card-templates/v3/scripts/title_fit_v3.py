"""Fit a V3 title by reducing its font size uniformly, preserving its center."""
from text_v3 import text

NOMINAL_SIZE = 86.0349127182045
CX, CY = 529.5, 79.0
SAFE_LEFT, SAFE_RIGHT = 219.5, 839.5

def title(label, safe_left=SAFE_LEFT, safe_right=SAFE_RIGHT):
    """Reserve additional badge clearance by narrowing the supplied safe region."""
    max_width = 2 * min(CX - safe_left, safe_right - CX)
    if max_width <= 0:
        raise ValueError('The title center must lie inside the safe region')
    group, bounds = text(label, 'Teko-SemiBold.ttf', NOMINAL_SIZE,
                         CX, CY, 'card-title')
    size = NOMINAL_SIZE * min(1.0, max_width / bounds[0])
    if size < NOMINAL_SIZE:
        group, bounds = text(label, 'Teko-SemiBold.ttf', size,
                             CX, CY, 'card-title')
    group.set('data-font-family', 'Teko SemiBold')
    group.set('data-font-size', str(size))
    group.set('data-title-fit', 'uniform-font-size')
    group.set('data-safe-region', f'{safe_left} {safe_right}')
    return group, {'font_size': size, 'nominal_font_size': NOMINAL_SIZE,
                   'visible_width': bounds[0], 'visible_height': bounds[1],
                   'visible_center': [CX, CY], 'max_width': max_width,
                   'scale_factor': size / NOMINAL_SIZE}

def apply(root, safe_left=SAFE_LEFT, safe_right=SAFE_RIGHT):
    old = root.xpath('//*[@id="card-title"]')[0]
    label = old.get('aria-label')
    if not label:
        raise ValueError('The native title needs an aria-label')
    group, report = title(label, safe_left, safe_right)
    old.getparent().replace(old, group)
    return report
