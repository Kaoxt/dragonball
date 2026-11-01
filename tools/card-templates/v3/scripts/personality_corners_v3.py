"""Use the established red power-box accents for V3 Villains only.

Change only the four corner fills and their two shadow paths. Preserve the
native geometry, neutral highlights, outer rails, text, artwork and paper.
"""
from lxml import etree as E

REVISION = '2026-11-01-villain-red-power-corners'
COLORS = {'fill': ('#0a4a96', '#8e1722'),
          'stroke': ('#092b50', '#4c1119')}


def apply(root):
    labels = root.xpath('//*[@id="card-category"]')
    if not labels or labels[0].get('aria-label') != 'VILLAIN PERSONALITY':
        return {'applies': False, 'changed': False}
    panel = root.xpath('//*[@id="shared-rules-component"]')[0]
    changes = 0
    counts = {}
    for attr, (blue, red) in COLORS.items():
        nodes = panel.xpath('.//*[@' + attr + '=$blue or @' + attr + '=$red]',
                            blue=blue, red=red)
        counts[attr] = len(nodes)
        for node in nodes:
            if node.get(attr) != red:
                node.set(attr, red)
                changes += 1
    if counts != {'fill': 4, 'stroke': 2}:
        raise ValueError(f'Unexpected V3 Personality corner structure: {counts}')
    return {'applies': True, 'changed': bool(changes), 'revision': REVISION,
            'corner_fill': COLORS['fill'][1], 'shadow_stroke': COLORS['stroke'][1],
            'corner_count': counts['fill'], 'shadow_path_count': counts['stroke']}


if __name__ == '__main__':
    import argparse, json
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source')
    a = p.parse_args()
    tree = E.parse(a.source)
    result = apply(tree.getroot())
    if result['changed']:
        tree.write(a.source, encoding='utf-8', xml_declaration=True)
    print(json.dumps(result))
