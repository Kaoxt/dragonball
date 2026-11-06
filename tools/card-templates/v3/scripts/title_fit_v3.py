"""Fit a V3 title by reducing its font size uniformly, preserving its center."""
from text_v3 import text

NOMINAL_SIZE = 86.0349127182045
CX, CY = 529.5, 79.0
SAFE_LEFT, SAFE_RIGHT = 149.5, 909.5
PERSONALITY_SAFE_LEFT, PERSONALITY_SAFE_RIGHT = 209.5, 849.5

def title(label, safe_left=SAFE_LEFT, safe_right=SAFE_RIGHT):
    """Reserve additional badge clearance by narrowing the supplied safe region."""
    max_width = 2 * min(CX - safe_left, safe_right - CX)
    if max_width <= 0:
        raise ValueError('The title center must lie inside the safe region')
    group, bounds = text(label, 'Teko-SemiBold.ttf', NOMINAL_SIZE,
                         CX, CY, 'card-title', vertical_ignore_punctuation=True)
    size = NOMINAL_SIZE * min(1.0, max_width / bounds[0])
    if size < NOMINAL_SIZE:
        group, bounds = text(label, 'Teko-SemiBold.ttf', size,
                             CX, CY, 'card-title', vertical_ignore_punctuation=True)
    group.set('data-font-family', 'Teko SemiBold')
    group.set('data-font-size', str(size))
    group.set('data-title-fit', 'uniform-font-size')
    group.set('data-title-vertical-alignment', 'letters-and-digits-visible-ink-bounds')
    group.set('data-safe-region', f'{safe_left} {safe_right}')
    return group, {'font_size': size, 'nominal_font_size': NOMINAL_SIZE,
                   'visible_width': bounds[0], 'visible_height': bounds[1],
                   'visible_center': [CX, CY], 'max_width': max_width,
                   'scale_factor': size / NOMINAL_SIZE}

def apply(root, safe_left=None, safe_right=None):
    # Reserve visible breathing room around LEVEL and the staggered brush ends.
    personality = bool(root.xpath('//*[@id="v3-level-number"]'))
    old = root.xpath('//*[@id="card-title"]')[0]
    label = old.get('aria-label')
    if not label:
        raise ValueError('The native title needs an aria-label')
    # Retain a measured per-title brush clearance after the visual contour check.
    # Discard it if the title wording changes; the new lettering needs its own check.
    clearance = old.get('data-brush-safe-width') if old.get('data-brush-safe-label') == label else None
    if safe_left is None: safe_left = CX-float(clearance)/2 if clearance else (PERSONALITY_SAFE_LEFT if personality else SAFE_LEFT)
    if safe_right is None: safe_right = CX+float(clearance)/2 if clearance else (PERSONALITY_SAFE_RIGHT if personality else SAFE_RIGHT)
    if personality:
        safe_left = max(safe_left, PERSONALITY_SAFE_LEFT)
        safe_right = min(safe_right, PERSONALITY_SAFE_RIGHT)
    group, report = title(label, safe_left, safe_right)
    if report['max_width'] < (640 if personality else SAFE_RIGHT-SAFE_LEFT):
        group.set('data-brush-safe-width', str(report['max_width']))
        group.set('data-brush-safe-label', label)
    old.getparent().replace(old, group)
    return report
