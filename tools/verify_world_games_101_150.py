"""Verify the ready World Games 101–150 sources, artwork and exact exports."""
from pathlib import Path
import argparse, hashlib, json, re, sys, importlib
from xml.etree import ElementTree as ET
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
EVID = ROOT / 'tools/card-corrections/v3-world-games-101-150'
sys.path.insert(0,str(ROOT/'tools/card-templates/v3/scripts'))

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--render-work', type=Path, help='Also compare exports against retained final PNG renders')
    args = ap.parse_args()
    data = json.loads((EVID/'cards.json').read_text())
    rows = json.loads((EVID/'audit.json').read_text())
    expected = list(range(101,151))
    assert [r['number'] for r in rows] == expected
    assert [c['number'] for c in data if c['publish_ready']] == expected
    total = 0
    for row in rows:
        c = next(c for c in data if c['number'] == row['number'])
        source = ROOT/row['native_source_path']
        assert sha(source) == row['native_source_sha256'], source
        root = ET.parse(source).getroot()
        ids = [e.get('id') for e in root.iter() if e.get('id')]
        assert len(ids) == len(set(ids)), ('duplicate IDs',c['number'])
        references = set()
        for e in root.iter():
            for key,value in e.attrib.items():
                references.update(re.findall(r'url\(#([^)]*)\)',value))
                if key.endswith('href') and value.startswith('#'): references.add(value[1:])
        assert references <= set(ids), ('unresolved SVG references',c['number'],references-set(ids))
        assert not any(e.tag.rsplit('}',1)[-1]=='text' for e in root.iter())
        for e in root.iter():
            if e.tag.rsplit('}',1)[-1] != 'image': continue
            href = e.get('{http://www.w3.org/1999/xlink}href') or e.get('href')
            assert href and not href.startswith(('http:','https:','file:')), href
            if not href.startswith(('data:','#')):
                assert (source.parent/href).is_file(), href
        for a in row['assets']:
            assert sha(ROOT/a['path']) == a['sha256'], a['path']
        assert sha(ROOT/row['artwork']['source']) == row['artwork']['source_sha256']
        if 'stages' in c:
            stages=[e.get('data-stage-value') for e in root.iter() if re.fullmatch(r'power-stage-\d+',e.get('id',''))]
            assert stages == list(map(str,c['stages']))
            assert stages[-1] == '0'
        if 'sensei_capacity' in c:
            capacity=next(e for e in root.iter() if e.get('id')=='sensei-deck-capacity')
            assert capacity.get('aria-label') == str(c['sensei_capacity'])
        assert len(row['rules']) <= 5
        if c['style']!='Red' and c['category'] not in ('LOCATION','SENSEI','HERO PERSONALITY','VILLAIN PERSONALITY'):
            from lxml import etree
            native=etree.parse(str(source)).getroot()
            assert importlib.import_module(c['style'].lower()+'_symbol_weight').apply(native) is False, ('symbol weight',c['number'])
        rendered = Image.open(args.render_work/(c['id']+'.png')).convert('RGB') if args.render_work else None
        for ex in row['exports']:
            p=ROOT/ex['path'];assert sha(p)==ex['after_sha256'],p
            with Image.open(p) as im:
                assert im.format=='WEBP' and list(im.size)==ex['size']
                assert b'VP8L' in p.read_bytes()[:64], ('not lossless WebP',p)
                if rendered is not None:
                    target=rendered if rendered.size==im.size else rendered.resize(im.size,Image.Resampling.LANCZOS)
                    assert ImageChops.difference(target,im.convert('RGB')).getbbox() is None,p
            total+=1
    print(json.dumps({'ready_cards':len(rows),'verified_exports':total,'pending_cards':[],
                      'source_and_asset_hashes':'passed','native_stages_and_capacities':'passed',
                      'lossless_webp':'passed','pixel_comparison':'passed' if args.render_work else 'not requested'}))

if __name__=='__main__':main()
