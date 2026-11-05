"""Retained V3 LEVEL numeral paths and placement, including both layers of ink."""
from pathlib import Path
import json

COMPONENT = Path(__file__).resolve().parents[1] / 'assets/text/personality-levels.json'
LEVELS = json.loads(COMPONENT.read_text())


def validate_level(root):
    badges = root.xpath('//*[@id="level-badge-v3"]')
    if not badges:
        return
    badge, = badges
    number, = badge.xpath('.//*[@id="v3-level-number"]')
    shadow, = badge.xpath('.//*[@id="v3-level-number-soft-shadow"]')
    level = number.get('aria-label')
    expected = LEVELS[level]
    for layer in (number, shadow):
        if layer.get('aria-label') != level or any(layer.get(k) != v for k, v in expected.items()):
            raise ValueError(f'LEVEL {level} must use the retained V3 numeral and placement')


def apply_level(root, value):
    """Set both visible numeral and shadow from the same master geometry."""
    level = str(value)
    for ident in ('v3-level-number', 'v3-level-number-soft-shadow'):
        layer, = root.xpath('//*[@id=$ident]', ident=ident)
        for key, val in LEVELS[level].items():
            layer.set(key, val)
        layer.set('aria-label', level)
