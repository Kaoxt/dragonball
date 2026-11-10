"""Reduce the retained Freestyle white silhouette without moving its contours."""
from lxml import etree as E
import re

REVISION = 'freestyle-stroke-weight-v1'
EDGE_WIDTH = '0.8'
EDGE_ATTRIBUTES = ' stroke="#080b0d" stroke-width="0.8" stroke-linejoin="round"'


def change(raw):
    root = E.fromstring(raw.encode())
    symbols = root.xpath('//*[@id="tokui-waza-symbol" and @data-style="Freestyle"]')
    if not symbols:
        return raw, []
    assert len(symbols) == 1
    glyphs = symbols[0].xpath('.//*[@id="freestyle-glyph"]')
    assert len(glyphs) == 1
    glyph = glyphs[0]
    assert glyph.get('fill') == '#ffffff' and len(glyph) == 1
    if glyph.get('stroke-width') == EDGE_WIDTH:
        assert glyph.get('stroke') == '#080b0d' and glyph.get('stroke-linejoin') == 'round'
        return raw, []
    assert glyph.get('stroke') is None and glyph.get('stroke-width') is None
    tags = re.findall(r'<(?:\w+:)?g\b[^>]*\bid="freestyle-glyph"[^>]*>', raw)
    assert len(tags) == 1
    before = tags[0]
    after = before[:-1] + EDGE_ATTRIBUTES + '>'
    updated = raw.replace(before, after, 1)
    assert change(updated) == (updated, [])
    return updated, [{'id': 'freestyle-glyph', 'before': before, 'after': after}]


def apply(root):
    """Idempotent helper for newly composed cards using historical donors."""
    glyphs = root.xpath('//*[@id="tokui-waza-symbol" and @data-style="Freestyle"]//*[@id="freestyle-glyph"]')
    if not glyphs:
        return False
    assert len(glyphs) == 1
    glyph = glyphs[0]
    old = glyph.get('stroke-width')
    assert old in (None, EDGE_WIDTH)
    glyph.set('stroke', '#080b0d')
    glyph.set('stroke-width', EDGE_WIDTH)
    glyph.set('stroke-linejoin', 'round')
    return old != EDGE_WIDTH
