#!/usr/bin/env python3
"""Apply the approved compact Hero/Villain label, preserving all other SVG bytes."""
import argparse, copy, json, re, subprocess
from pathlib import Path
from lxml import etree as E

HERE = Path(__file__).resolve().parent
ASSETS = HERE / 'category-labels'
if not ASSETS.exists():
    ASSETS = HERE.parent / 'assets/personality-category-labels'
NAMES = {'HERO PERSONALITY': 'hero', 'VILLAIN PERSONALITY': 'villain'}

def bounds(path):
    p = subprocess.run(['inkscape', str(path), '--query-id=card-category',
                        '--query-x', '--query-y', '--query-width', '--query-height'],
                       capture_output=True, text=True, check=True)
    return list(map(float, p.stdout.split()))

def signature(g):
    keys = ('aria-label','fill','stroke','stroke-width','stroke-linejoin','paint-order')
    return ([g.get(k) for k in keys], [dict(p.attrib) for p in g])

def span(text):
    matches = list(re.finditer(r'<(?P<tag>(?:[\w.-]+:)?g)\b[^>]*\bid=["\']card-category["\'][^>]*>', text))
    if len(matches) != 1:
        raise ValueError('Expected one card-category group')
    m = matches[0]; depth = 1
    for tag in re.finditer(r'</?' + re.escape(m['tag']) + r'\b[^>]*>', text[m.end():]):
        raw = tag.group()
        depth += -1 if raw.startswith('</') else (0 if raw.endswith('/>') else 1)
        if depth == 0:
            return m.start(), m.end() + tag.end()
    raise ValueError('Unclosed category group')

def apply(source, output=None, check=False):
    source = Path(source); raw = source.read_bytes(); root = E.fromstring(raw)
    gs = root.xpath('//*[@id="card-category"]')
    if len(gs) != 1:
        raise ValueError('Expected one category')
    g = gs[0]; label = g.get('aria-label', '').upper()
    if label not in NAMES:
        if output and not check: Path(output).write_bytes(raw)
        return {'status':'outside-scope','changed':False,'label':label}
    if root.get('viewBox') != '0 0 1060 1484' or g.getparent() is not root:
        raise ValueError('Review nonstandard canvas or inherited category transforms')
    reference = ASSETS / (NAMES[label] + '.svg')
    approved = E.parse(str(reference)).xpath('//*[@id="card-category"]')[0]
    before = bounds(source); expected = bounds(reference)
    match = signature(g) == signature(approved) and max(abs(a-b) for a,b in zip(before,expected)) <= .005
    result = {'label':label,'changed':not match,'before':before,'expected':expected,
              'status':'approved' if match else 'typography-mismatch'}
    if check:
        return result
    output = Path(output or source)
    if match:
        if output != source: output.write_bytes(raw)
        return result
    text = raw.decode('utf-8'); start,end = span(text)
    node = copy.deepcopy(approved); node.tail = None
    replacement = E.tostring(node, encoding='unicode')
    edited = text[:start] + replacement + text[end:]
    assert edited[:start] == text[:start] and edited[start+len(replacement):] == text[end:]
    output.parent.mkdir(parents=True, exist_ok=True); output.write_text(edited)
    after = bounds(output)
    if max(abs(a-b) for a,b in zip(after,expected)) > .005:
        raise ValueError('Exported native category does not match approved bounds')
    result.update(status='corrected', after=after, unrelated_svg_bytes_unchanged=True)
    return result

if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('input',type=Path)
    p.add_argument('output',type=Path,nargs='?');p.add_argument('--check',action='store_true');a=p.parse_args()
    r=apply(a.input,a.output,a.check);print(json.dumps(r,indent=2))
    if a.check and r['changed']:raise SystemExit(1)
