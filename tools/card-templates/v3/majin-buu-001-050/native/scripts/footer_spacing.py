"""Center V3 footer side groups without resizing, redrawing or changing stars."""
from pathlib import Path
from lxml import etree as E
import argparse, json, subprocess

SAGA_CENTER_X = 211.75
RIGHT_GROUP_CENTER_X = 847.25
REVISION = 'mirrored-side-group-centers-v1'
TOLERANCE = .002


def bounds(path):
    out = subprocess.check_output(['inkscape', str(path), '--query-all'], text=True, stderr=subprocess.DEVNULL)
    return {v[0]: list(map(float, v[1:])) for line in out.splitlines() if len(v := line.split(',')) == 5}


def change(source, destination=None, normalize_gap=False):
    source = Path(source)
    destination = Path(destination or source)
    tree = E.parse(str(source)); root = tree.getroot(); measured = bounds(source)
    logo, ball, number = (measured[k] for k in ['saga-emblem', 'footer-rarity', 'card-number'])
    gap_dx = ball[0] + ball[2] + 12.2 - number[0] if normalize_gap else 0
    gap_dx = 0 if abs(gap_dx) <= TOLERANCE else round(gap_dx, 6)
    left = min(ball[0], number[0] + gap_dx); right = max(ball[0] + ball[2], number[0] + gap_dx + number[2])
    logo_dx = SAGA_CENTER_X - logo[0] - logo[2] / 2
    right_dx = RIGHT_GROUP_CENTER_X - (left + right) / 2
    logo_dx = 0 if abs(logo_dx) <= TOLERANCE else round(logo_dx, 6)
    right_dx = 0 if abs(right_dx) <= TOLERANCE else round(right_dx, 6)
    metadata_changed = root.get('data-footer-layout') != REVISION or 'data-footer-inner-gap' in root.attrib
    for id, dx in [('saga-emblem', logo_dx), ('footer-rarity', right_dx), ('card-number', right_dx + gap_dx)]:
        if not dx: continue
        el = root.xpath('//*[@id=$id]', id=id)[0]
        el.set('transform', f'translate({dx:.6f} 0) ' + el.get('transform', ''))
        x, y, w, h = measured[id]
        el.set('data-visible-center', f'{x + w/2 + dx:.6f} {y + h/2:.6f}')
    root.attrib.pop('data-footer-inner-gap', None)
    root.set('data-footer-layout', REVISION)
    root.set('data-footer-saga-center-x', str(SAGA_CENTER_X))
    root.set('data-footer-right-group-center-x', str(RIGHT_GROUP_CENTER_X))
    changed = bool(logo_dx or right_dx or gap_dx or metadata_changed)
    if changed or source != destination:
        destination.parent.mkdir(parents=True, exist_ok=True)
        tree.write(str(destination), encoding='utf-8', xml_declaration=True)
    return {'revision': REVISION, 'logo_dx': logo_dx, 'ball_and_number_dx': right_dx,
            'changed': changed, 'saga_center_x': SAGA_CENTER_X,
            'right_group_center_x': RIGHT_GROUP_CENTER_X,
            'number_gap_dx': gap_dx,
            'ball_number_gap': number[0] + gap_dx - ball[0] - ball[2]}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('source'); p.add_argument('destination', nargs='?')
    p.add_argument('--normalize-gap', action='store_true', help='Set the standard 12.2-unit gap after replacing a number during new-card composition; omit for localized spacing repairs.')
    a = p.parse_args(); print(json.dumps(change(a.source, a.destination, normalize_gap=a.normalize_gap)))
