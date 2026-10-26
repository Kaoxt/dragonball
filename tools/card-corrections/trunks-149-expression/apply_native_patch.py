"""Apply the retained expression patch to an existing native Trunks #149 master."""
from pathlib import Path
from lxml import etree as ET
import argparse
import base64

S = 'http://www.w3.org/2000/svg'
X = 'http://www.w3.org/1999/xlink'
PATCH_ID = 'trunks-149-original-expression-patch'

def apply(source, output):
    tree = ET.parse(str(source))
    root = tree.getroot()
    title = root.find(f'{{{S}}}title')
    if title is None or title.text != 'Blue Style Mastery':
        raise ValueError('This patch is only for the retained Blue Style Mastery master.')
    if root.get('viewBox') != '0 0 1060 1484':
        raise ValueError('Unexpected native canvas; review coordinates before applying.')
    for existing in root.xpath('//*[@id=$name]', name=PATCH_ID):
        existing.getparent().remove(existing)
    patch = Path(__file__).with_name('mouth-patch.png').read_bytes()
    ET.SubElement(root, f'{{{S}}}image', {
        'id': PATCH_ID, 'x': '649', 'y': '474.5',
        'width': '163', 'height': '117.5',
        'preserveAspectRatio': 'none',
        'data-purpose': 'Restore original Piccolo smirk; localized raster illustration only',
        f'{{{X}}}href': 'data:image/png;base64,' + base64.b64encode(patch).decode('ascii')
    })
    tree.write(str(output), encoding='utf-8', xml_declaration=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    apply(args.source, args.output)
