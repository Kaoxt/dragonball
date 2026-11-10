"""Match Namekian 瑪 to the rounded stroke family used by the other styles."""
from copy import deepcopy
from pathlib import Path
import re
from lxml import etree as E
from .tokui_backing import apply as apply_backing
from .namekian_symbol_weight import apply as apply_weight, NEW_WIDTH

S = 'http://www.w3.org/2000/svg'
ASSET = Path(__file__).resolve().parents[1] / 'assets/style-symbols/namekian-strokes.svg'
OLD_TRANSFORMS = {'translate(100 908.5) scale(1.3488044711951495) translate(-49.300000000000004 36.10917517095362)'}
NEW_TRANSFORM = 'translate(100 908.5) scale(1.3411754267774958) translate(-53.2844 -56.58044)'
REVISION = 'namekian-strokes-v3'

def make_symbol():
    symbol = E.Element('{'+S+'}g', id='tokui-waza-symbol', transform=NEW_TRANSFORM)
    symbol.set('data-style', 'Namekian')
    symbol.set('aria-label', 'Namekian 瑪')
    symbol.set('data-symbol-revision', REVISION)
    paths = E.parse(str(ASSET)).getroot().findall('{'+S+'}path')
    assert len(paths) == 14
    for color, width in [('#080b0d', '13'), ('#21aaa5', NEW_WIDTH)]:
        group = E.SubElement(symbol, '{'+S+'}g', fill='none', stroke=color)
        group.set('stroke-width', width)
        group.set('stroke-linecap', 'round')
        group.set('stroke-linejoin', 'round')
        for path in paths: group.append(deepcopy(path))
    return symbol

def segment(raw, ident):
    start = re.search(r'<(?:\w+:)?g\b[^>]*\bid="'+re.escape(ident)+r'"[^>]*>', raw)
    if not start:
        raise ValueError('Missing native group: '+ident)
    depth = 0
    for match in re.finditer(r'</?(?:\w+:)?g\b[^>]*>', raw[start.start():]):
        tag = match[0]
        if tag.startswith('</'): depth -= 1
        elif not tag.endswith('/>'): depth += 1
        if depth == 0:
            return raw[start.start():start.start()+match.end()]
    raise ValueError('Unclosed group: '+ident)

def apply(root):
    symbols = root.xpath('//*[@id="tokui-waza-symbol" and @data-style="Namekian"]')
    if len(symbols) != 1:
        raise ValueError('Expected one Namekian symbol')
    symbol = symbols[0]
    if symbol.get('data-symbol-revision') == REVISION:
        return apply_weight(root)
    targets = [x for x in symbol.iter() if x.get('transform') in OLD_TRANSFORMS]
    assert len(targets) == 1
    target = targets[0]
    target.set('transform', NEW_TRANSFORM)
    for child in list(target): target.remove(child)
    for child in make_symbol(): target.append(deepcopy(child))
    symbol.set('aria-label', 'Namekian 瑪')
    symbol.set('data-symbol-revision', REVISION)
    if root.xpath('//*[@id="tokui-waza-smoky-backing"]'):
        apply_backing(root)
    return True

def change(raw):
    root = E.fromstring(raw.encode())
    if not apply(root): return raw, []
    edits = []
    for ident in ['tokui-waza-symbol', 'tokui-waza-smoky-backing']:
        if not root.xpath('//*[@id="'+ident+'"]'): continue
        before = segment(raw, ident)
        node = root.xpath('//*[@id="'+ident+'"]')[0]
        after = E.tostring(node, encoding='unicode', with_tail=False)
        # Namespace declarations already belong to the unchanged document root.
        after = re.sub(r' xmlns(?::\w+)?="[^"]+"', '', after)
        assert raw.count(before) == 1
        raw = raw.replace(before, after)
        edits.append({'id':ident, 'before':before, 'after':after})
    assert change(raw)[0] == raw
    return raw, edits
