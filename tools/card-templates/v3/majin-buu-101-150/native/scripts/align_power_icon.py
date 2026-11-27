"""Align native power-symbol ink to the adjacent visible capital-letter band.

Constant-power infinity is measured independently of its colon. The helper is
idempotent and preserves all geometry except the selected symbol's translation.
"""
from pathlib import Path
from copy import deepcopy
import argparse
import json
import math
import re
import subprocess
import tempfile
from lxml import etree as E

NS = 'http://www.w3.org/2000/svg'


def _multiply(a, b):
    aa, ab, ac, ad, ae, af = a
    ba, bb, bc, bd, be, bf = b
    return (aa*ba+ac*bb, ab*ba+ad*bb, aa*bc+ac*bd,
            ab*bc+ad*bd, aa*be+ac*bf+ae, ab*be+ad*bf+af)


def _matrix(text):
    matrix = (1, 0, 0, 1, 0, 0)
    for name, arguments in re.findall(r'([A-Za-z]+)\s*\(([^)]*)\)', text or ''):
        v = [float(s) for s in re.findall(r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?', arguments)]
        if name == 'matrix' and len(v) == 6:
            item = tuple(v)
        elif name == 'translate' and len(v) in (1, 2):
            item = (1, 0, 0, 1, v[0], v[1] if len(v) == 2 else 0)
        elif name == 'scale' and len(v) in (1, 2):
            item = (v[0], 0, 0, v[-1], 0, 0)
        elif name == 'rotate' and len(v) in (1, 3):
            c, s = math.cos(math.radians(v[0])), math.sin(math.radians(v[0]))
            item = (c, s, -s, c, 0, 0)
            if len(v) == 3:
                item = _multiply(_multiply((1,0,0,1,v[1],v[2]), item), (1,0,0,1,-v[1],-v[2]))
        elif name in ('skewX', 'skewY') and len(v) == 1:
            t = math.tan(math.radians(v[0]))
            item = (1,0,t,1,0,0) if name == 'skewX' else (1,t,0,1,0,0)
        else:
            raise ValueError('Unsupported SVG transform: ' + name)
        matrix = _multiply(matrix, item)
    return matrix


def _center(bounds):
    return bounds[1] + bounds[3]/2


def align_power_icon(root, icon_id, line_id, tolerance=0.01):
    icons = root.xpath('//*[@id=$v]', v=icon_id)
    lines = root.xpath('//*[@id=$v]', v=line_id)
    if len(icons) != 1 or len(lines) != 1:
        raise ValueError('Expected one icon and one outlined rule line')
    icon, line = icons[0], lines[0]
    label = line.get('aria-label', '')
    visible = [c for c in label if not c.isspace()]
    if len(visible) != len(line) or any(e.tag != '{'+NS+'}path' for e in line):
        raise ValueError('Expected one outlined path per visible rule-line glyph')
    caps = [(i, c) for i, c in enumerate(visible) if 'A' <= c <= 'Z']
    if not caps:
        raise ValueError('Rule line must contain a capital letter')
    constant = 'constant' in icon.get('aria-label', '').lower()
    explicit = icon.xpath('.//*[@data-power-icon-symbol="infinity" or @id="constant-infinity-symbol"]')
    paths = icon.xpath('.//*[local-name()="path"]')
    if constant or explicit:
        if len(explicit) == 1:
            target = explicit[0]
        elif not explicit and len(paths) == 1:
            target = paths[0]
        else:
            raise ValueError('Cannot identify infinity separately from punctuation')
    else:
        target = icon
    target_index = list(root.iter()).index(target)
    marker = '__power_alignment_symbol__'
    cap_prefix = '__power_alignment_cap_'
    if any((e.get('id', '').startswith(cap_prefix) or e.get('id') == marker) for e in root.iter()):
        raise ValueError('Reserved measurement ID already exists')

    def measure():
        probe = deepcopy(root)
        list(probe.iter())[target_index].set('id', marker)
        probe_line = probe.xpath('//*[@id=$v]', v=line_id)[0]
        for index, _ in caps:
            probe_line[index].set('id', cap_prefix + str(index))
        with tempfile.TemporaryDirectory() as td:
            path = Path(td)/'measure.svg'
            E.ElementTree(probe).write(str(path), encoding='utf-8', xml_declaration=True)
            result = subprocess.run(['inkscape', str(path), '--query-all'], check=True, capture_output=True, text=True)
        found = {}
        for row in result.stdout.splitlines():
            parts = row.split(',')
            if len(parts) == 5 and (parts[0] == marker or parts[0].startswith(cap_prefix) or parts[0] == icon_id):
                found[parts[0]] = tuple(map(float, parts[1:]))
        if marker not in found:
            raise ValueError('Cannot measure symbol ink')
        return found

    measurements = measure()
    before = measurements[marker]
    # Inline deck limits can precede the icon. Choose the actual capital on its
    # right, never a parenthesis, descender or unrelated prefix capital.
    icon_bounds = measurements.get(icon_id, before)
    right = icon_bounds[0] + icon_bounds[2]
    candidates = [(i, c, measurements[cap_prefix+str(i)]) for i, c in caps]
    following = [v for v in candidates if v[2][0] >= right - tolerance]
    if not following:
        raise ValueError('No adjacent capital found to the right of the icon')
    cap_index, cap_letter, cap = min(following, key=lambda v:v[2][0])
    dy = _center(cap) - _center(before)
    original = target.get('transform', '')
    if abs(dy) > tolerance:
        parent_matrix = (1, 0, 0, 1, 0, 0)
        for parent in reversed(list(target.iterancestors())):
            parent_matrix = _multiply(parent_matrix, _matrix(parent.get('transform', '')))
        a, b, c, d, _, _ = parent_matrix
        determinant = a*d-b*c
        if abs(determinant) < 1e-12:
            raise ValueError('Cannot translate through a singular transform')
        dx_local, dy_local = -c*dy/determinant, a*dy/determinant
        # Nested SVG viewports interpret their own transform differently in
        # Inkscape. Move viewport coordinates in the parent coordinate system.
        if target.tag == '{'+NS+'}svg' and not original:
            target.set('x', str(float(target.get('x', 0)) + dx_local))
            target.set('y', str(float(target.get('y', 0)) + dy_local))
        else:
            target.set('transform', f'translate({dx_local:.12f} {dy_local:.12f}) {original}'.strip())
    after_measurements = measure()
    after = after_measurements[marker]
    cap_after = after_measurements[cap_prefix+str(cap_index)]
    error = _center(after) - _center(cap_after)
    assert abs(error) <= tolerance, error
    assert all(abs(after[i]-before[i]) <= tolerance for i in (0, 2, 3))
    assert cap_after == cap
    return {'icon': icon_id, 'line': line_id, 'measured_symbol': 'infinity_without_colon' if target is not icon else 'whole_icon',
            'first_capital': cap_letter, 'capital_glyph_index': cap_index,
            'previous_visible_bounds': before, 'capital_visible_bounds': cap_after,
            'new_visible_bounds': after, 'vertical_shift': dy if abs(dy)>tolerance else 0,
            'center_error': error, 'shape_size_and_horizontal_position_preserved': True,
            'colon_and_text_unchanged': target is not icon}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--icon', required=True)
    parser.add_argument('--line', default='rules-line-1')
    args = parser.parse_args()
    tree = E.parse(str(args.source))
    report = align_power_icon(tree.getroot(), args.icon, args.line)
    tree.write(str(args.destination), encoding='utf-8', xml_declaration=True)
    print(json.dumps(report, indent=2))
