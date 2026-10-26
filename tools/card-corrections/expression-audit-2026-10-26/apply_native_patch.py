"""Apply a retained, localized expression patch to its matching native card."""
import argparse
import base64
import json
from pathlib import Path
from lxml import etree as ET

HERE = Path(__file__).resolve().parent
SVG = 'http://www.w3.org/2000/svg'
XLINK = 'http://www.w3.org/1999/xlink'

def apply(card_id, source, output):
    entries = {r['id']: r for r in json.loads((HERE / 'manifest.json').read_text())}
    entry = entries[card_id]
    tree = ET.parse(str(source))
    root = tree.getroot()
    if root.get('viewBox') != '0 0 1060 1484':
        raise ValueError('Expected the retained 1060 x 1484 native card canvas.')
    title = root.find(f'{{{SVG}}}title')
    if title is None or title.text != entry['name']:
        raise ValueError('Card title does not match the selected expression patch.')
    patch_id = card_id + '-original-expression-patch'
    for node in root.xpath('//*[@id=$id]', id=patch_id):
        node.getparent().remove(node)
    patch = entry['native_patch']
    ET.SubElement(root, f'{{{SVG}}}image', {
        'id': patch_id,
        **{key: str(patch[key]) for key in ['x', 'y', 'width', 'height']},
        'preserveAspectRatio': 'none',
        'data-purpose': 'Original expression restored; retained localized illustration patch',
        f'{{{XLINK}}}href': 'data:image/png;base64,' + base64.b64encode((HERE / patch['file']).read_bytes()).decode(),
    })
    tree.write(str(output), encoding='utf-8', xml_declaration=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('card_id')
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    apply(args.card_id, args.source, args.output)
