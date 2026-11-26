#!/usr/bin/env python3
"""Extract approved outlined SVG components; never typeset or redraw a card.
Usage: extract-components.py approved.svg selection.json native.json
Requires fontTools. Selection maps pur, six stages and power to {text, ids}.
"""
import json, math, re, sys
import xml.etree.ElementTree as ET
from fontTools.misc.transform import Transform, Identity
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path


def transform(value):
    result = Identity
    for name, args in re.findall(r'([A-Za-z]+)\(([^)]*)\)', value or ''):
        n = [float(v) for v in re.split(r'[ ,]+', args.strip()) if v]
        if name == 'translate': t = Identity.translate(n[0], n[1] if len(n) > 1 else 0)
        elif name == 'scale': t = Identity.scale(n[0], n[1] if len(n) > 1 else n[0])
        elif name == 'matrix': t = Transform(*n)
        elif name == 'rotate':
            t = Identity
            if len(n) == 3: t = t.translate(n[1], n[2])
            t = t.rotate(math.radians(n[0]))
            if len(n) == 3: t = t.translate(-n[1], -n[2])
        else: raise ValueError('Unsupported transform: ' + name)
        result = result.transform(t)
    return result


def main(svg, selection, output):
    root = ET.parse(svg).getroot()
    by_id = {e.get('id'): e for e in root.iter() if e.get('id')}
    parents = {child: parent for parent in root.iter() for child in parent}
    def state(e, matrix, fill, rule):
        for attr in ('style', 'clip-path', 'mask', 'filter', 'stroke', 'opacity', 'fill-opacity'):
            if attr in e.attrib: raise ValueError('Flatten unsupported SVG treatment first: ' + attr)
        matrix = matrix.transform(transform(e.get('transform')))
        if e.tag.split('}')[-1] == 'svg' and e is not root:
            x, y = float(e.get('x', 0)), float(e.get('y', 0))
            left, top, w, h = map(float, e.get('viewBox').split())
            width, height = float(e.get('width')), float(e.get('height'))
            if e.get('preserveAspectRatio', 'xMidYMid meet') != 'xMidYMid meet': raise ValueError('Unsupported aspect ratio')
            s = min(width/w, height/h)
            matrix = matrix.translate(x+(width-w*s)/2, y+(height-h*s)/2).scale(s).translate(-left, -top)
        return matrix, e.get('fill', fill), e.get('fill-rule', rule)
    def component(spec):
        paths = []
        bounds = BoundsPen(None)
        def walk(e, matrix=Identity, fill='#000000', rule='nonzero'):
            matrix, fill, rule = state(e, matrix, fill, rule)
            tag = e.tag.split('}')[-1]
            if tag == 'path':
                if fill == 'none': return
                if re.fullmatch(r'#[0-9a-fA-F]{3}', fill): fill = '#' + ''.join(c*2 for c in fill[1:])
                if not re.fullmatch(r'#[0-9a-fA-F]{6}', fill): raise ValueError('Solid hex fills required')
                pen = SVGPathPen(None, ntos=lambda v: format(v, '.9g'))
                parse_path(e.get('d'), TransformPen(pen, matrix))
                d = pen.getCommands();parse_path(d, bounds)
                paths.append({'d':d, 'fill':fill, 'fillRule':rule})
            elif tag in ('svg','g'):
                for child in e: walk(child, matrix, fill, rule)
            elif tag not in ('title','desc'): raise ValueError('Outline or flatten this element first: '+tag)
        for identity in spec['ids']:
            e = by_id[identity]; chain = []; current = e
            while current in parents:
                current = parents[current];chain.append(current)
            matrix, fill, rule = Identity, '#000000', 'nonzero'
            for ancestor in reversed(chain): matrix, fill, rule = state(ancestor,matrix,fill,rule)
            walk(e,matrix,fill,rule)
        if not paths: raise ValueError('No vector paths')
        x,y,right,bottom = bounds.bounds
        return {'text':spec['text'],'bounds':[x,y,right-x,bottom-y],'paths':paths}
    spec = json.load(open(selection))
    native = {'pur':component(spec['pur']), 'stages':[component(s) for s in spec['stages']], 'power':component(spec['power'])}
    with open(output,'w') as f: json.dump(native,f,separators=(',',':'))

if __name__ == '__main__': main(*sys.argv[1:])
