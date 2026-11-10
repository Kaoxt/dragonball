"""Match Namekian's colored stroke to Red without changing any other source bytes."""
from lxml import etree as E
import re

OLD_WIDTH = '7.69230769'
NEW_WIDTH = '7.3076923055'
REVISION = 'namekian-stroke-weight-v1'


def paint(root):
    symbols = root.xpath('//*[@id="tokui-waza-symbol" and @data-style="Namekian"]')
    if not symbols:
        return None
    assert len(symbols) == 1
    groups = symbols[0].xpath('.//*[@stroke="#21aaa5"]')
    assert len(groups) == 1
    group = groups[0]
    assert group.get('stroke-linecap') == group.get('stroke-linejoin') == 'round'
    assert len(group) == 14
    assert group.get('stroke-width') in (OLD_WIDTH, NEW_WIDTH)
    return group


def change(raw):
    group = paint(E.fromstring(raw.encode()))
    if group is None or group.get('stroke-width') == NEW_WIDTH:
        return raw, []
    tags = re.findall(r'<(?:\w+:)?g\b[^>]*\bstroke="#21aaa5"[^>]*>', raw)
    assert len(tags) == 1
    before = tags[0]
    assert before.count('stroke-width="'+OLD_WIDTH+'"') == 1
    after = before.replace('stroke-width="'+OLD_WIDTH+'"', 'stroke-width="'+NEW_WIDTH+'"')
    updated = raw.replace(before, after, 1)
    assert change(updated) == (updated, [])
    return updated, [{'id': 'namekian-colored-strokes', 'before': before, 'after': after}]


def apply(root):
    """For new-card builders; repairs use the byte-preserving change function."""
    group = paint(root)
    if group is None:
        return False
    old = group.get('stroke-width')
    group.set('stroke-width', NEW_WIDTH)
    return old != NEW_WIDTH
