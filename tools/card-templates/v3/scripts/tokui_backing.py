"""Apply the approved soft charcoal backing without changing the Tokui logo.

Run after selecting the final style symbol and before rendering. Safe to repeat.
"""
from copy import deepcopy
from pathlib import Path
import argparse
from lxml import etree as E
from fontTools.svgLib.path import parse_path
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.areaPen import AreaPen
from fontTools.pens.reverseContourPen import ReverseContourPen

NS = 'http://www.w3.org/2000/svg'
BACKING = 'tokui-waza-smoky-backing'
FILTER = 'tokui-waza-soft-backing'


def filled_contours(data):
    """Fill holes in a backing silhouette, retaining disconnected components."""
    recording = RecordingPen()
    parse_path(data, recording)
    contours, current = [], []
    for operation in recording.value:
        current.append(operation)
        if operation[0] in ('closePath', 'endPath'):
            contours.append(current)
            current = []
    if current or any(c[-1][0] != 'closePath' for c in contours):
        return data
    output = SVGPathPen(None)
    for contour in contours:
        pen = RecordingPen()
        pen.value = contour
        area = AreaPen(None)
        pen.replay(area)
        pen.replay(ReverseContourPen(output) if area.value < 0 else output)
    return output.getCommands()


def apply(root):
    symbols = root.xpath('//*[@id="tokui-waza-symbol" or @id="red-tokui-waza-symbol"]')
    for old in root.xpath(f'//*[@id="{BACKING}" or @id="{FILTER}"]'):
        old.getparent().remove(old)
    if not symbols:
        return False
    if len(symbols) != 1:
        raise ValueError('Expected one Tokui Waza symbol')
    symbol = symbols[0]
    defs = root.find(f'{{{NS}}}defs')
    if defs is None:
        defs = E.Element(f'{{{NS}}}defs')
        root.insert(0, defs)
    effect = E.SubElement(defs, f'{{{NS}}}filter', id=FILTER,
                          x='-35%', y='-35%', width='170%', height='170%')
    effect.set('color-interpolation-filters', 'sRGB')
    E.SubElement(effect, f'{{{NS}}}feGaussianBlur', stdDeviation='4')
    backing = E.Element(f'{{{NS}}}g', id=BACKING,
                        transform=symbol.get('transform', ''),
                        opacity='.90', filter=f'url(#{FILTER})')
    silhouette = deepcopy(symbol[0])
    for node in silhouette.iter():
        node.attrib.pop('id', None)
        for attribute in ('fill', 'stroke'):
            if attribute in node.attrib and node.get(attribute) != 'none':
                node.set(attribute, '#11171b')
        if 'stroke-width' in node.attrib:
            node.set('stroke-width', '16')
        if node.tag == f'{{{NS}}}path':
            # White's two counters disappear only in the backing, never the logo.
            if symbol.get('data-style') == 'Freestyle':
                node.set('d', node.get('d').split(' Z')[0] + ' Z')
            else:
                node.set('d', filled_contours(node.get('d')))
            node.set('fill-rule', 'nonzero')
    backing.append(silhouette)
    symbol.addprevious(backing)
    return True


def update(path):
    path = Path(path)
    root = E.parse(str(path)).getroot()
    if not apply(root):
        return False
    path.write_bytes(E.tostring(root, encoding='utf-8', xml_declaration=True))
    return True


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sources', nargs='+')
    for source in parser.parse_args().sources:
        if update(source):
            print(source)
