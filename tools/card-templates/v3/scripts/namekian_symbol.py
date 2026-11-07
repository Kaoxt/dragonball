"""Match the original teal Namekian style icon 瑪 in Score rulebook page 29."""
from copy import deepcopy
from pathlib import Path
import re
from lxml import etree as E
from .tokui_backing import apply as apply_backing

S = 'http://www.w3.org/2000/svg'
ASSET = Path(__file__).resolve().parents[1] / 'assets/style-symbols/namekian-score.svg'
OLD_TRANSFORMS = {'translate(100 908.5) scale(1.2987012987012987) translate(-49.95 37.95)',
                  'translate(100 908.5) scale(1.3026052104208417) translate(-50.5 38.1)'}
NEW_TRANSFORM = 'translate(100 908.5) scale(1.3488044711951495) translate(-49.300000000000004 36.10917517095362)'
REVISION = 'namekian-score-v2'

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
        return False
    shape = E.parse(str(ASSET)).getroot()[0].get('d')
    targets = [x for x in symbol.iter() if x.get('transform') in OLD_TRANSFORMS]
    assert len(targets) == 1
    targets[0].set('transform', NEW_TRANSFORM)
    paths = symbol.xpath('.//*[local-name()="path"]')
    assert len(paths) == 2 and paths[0].get('d') == paths[1].get('d')
    for path in paths: path.set('d', shape)
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
