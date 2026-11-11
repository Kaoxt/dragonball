"""Reduce only Blue's colored stroke, leaving all other source bytes intact."""
from lxml import etree as E
import re

OLD_WIDTH = '7.69230769'
NEW_WIDTH = '7.403846151625'
REVISION = 'blue-stroke-weight-v1'


def change(raw):
    root = E.fromstring(raw.encode())
    symbols = root.xpath('//*[@id="tokui-waza-symbol" and @data-style="Blue"]')
    if not symbols:
        return raw, []
    assert len(symbols) == 1
    paint = symbols[0].xpath('.//*[@id="blue-style-symbol"]')
    assert len(paint) == 1
    paint = paint[0]
    assert paint.get('stroke') == '#3b9cde'
    assert paint.get('stroke-linecap') == paint.get('stroke-linejoin') == 'round'
    assert len(paint) == 8
    if paint.get('stroke-width') == NEW_WIDTH:
        return raw, []
    assert paint.get('stroke-width') == OLD_WIDTH
    tags = re.findall(r'<(?:\w+:)?g\b[^>]*\bid="blue-style-symbol"[^>]*>', raw)
    assert len(tags) == 1
    before = tags[0]
    assert before.count('stroke-width="'+OLD_WIDTH+'"') == 1
    after = before.replace('stroke-width="'+OLD_WIDTH+'"', 'stroke-width="'+NEW_WIDTH+'"')
    updated = raw.replace(before, after, 1)
    assert change(updated) == (updated, [])
    return updated, [{'id': 'blue-style-symbol', 'before': before, 'after': after}]


def apply(root):
    """For new-card builders; existing repairs use byte-preserving change()."""
    symbols = root.xpath('//*[@id="tokui-waza-symbol" and @data-style="Blue"]')
    if not symbols:
        return False
    assert len(symbols) == 1
    paint = symbols[0].xpath('.//*[@id="blue-style-symbol"]')
    assert len(paint) == 1
    width = paint[0].get('stroke-width')
    assert width in (OLD_WIDTH, NEW_WIDTH)
    paint[0].set('stroke-width', NEW_WIDTH)
    return width != NEW_WIDTH
