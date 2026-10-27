"""Apply approved inner-rail footer alignment without rewriting unrelated SVG bytes.

Portrait visible inner edges: y=1354.575 and y=1450.575.
Target midpoint: y=1402.575. Landscape uses the same geometry translated -424.
Android alone uses the approved 0.95 size adjustment to the previous .8175 scale.
"""
import argparse
from pathlib import Path
import re

ALIGNMENTS = {
    'saiyan-set-emblem-flat': (
        ['translate(98.5 1373)'], 'translate(98.5 1369.325)'),
    'frieza-set-emblem': (
        ['translate(116.16902834008097 1378.3932186234817) scale(0.5516194331983806)'],
        'translate(116.16902834008097 1374.7182186234817) scale(0.5516194331983806)'),
    'trunks-set-emblem': (
        ['translate(143.5 1406.25)'], 'translate(143.5 1402.575)'),
    'android-set-emblem': (
        ['translate(111.05 1379) scale(.545)', 'translate(94.7 1365.375) scale(.8175)',
         'translate(94.7 1361.7) scale(.8175)'],
        'translate(97.1525 1363.74375) scale(.776625)'),
}

def align_svg(data: bytes) -> bytes:
    text = data.decode('utf-8')
    found = 0
    for id, (previous, target) in ALIGNMENTS.items():
        pattern = re.compile(r'<(?:[\w.-]+:)?g\b[^>]*\bid="'+re.escape(id)+r'"[^>]*>')
        match = pattern.search(text)
        if not match:
            continue
        found += 1
        tag = match.group(0)
        transform = re.search(r'\btransform="([^"]*)"', tag)
        if not transform:
            raise ValueError(f'{id}: missing transform')
        value = transform.group(1)
        if target in value:
            continue
        candidates = [v for v in previous if v in value]
        if len(candidates) != 1:
            raise ValueError(f'{id}: unexpected transform {value!r}; measure before changing')
        value = value.replace(candidates[0], target)
        new_tag = tag[:transform.start(1)] + value + tag[transform.end(1):]
        text = text[:match.start()] + new_tag + text[match.end():]
    if found != 1:
        raise ValueError(f'Expected one recognized set emblem, found {found}')
    return text.encode('utf-8')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    source = args.input.read_bytes()
    corrected = align_svg(source)
    assert align_svg(corrected) == corrected, 'Alignment must be idempotent'
    args.output.write_bytes(corrected)
