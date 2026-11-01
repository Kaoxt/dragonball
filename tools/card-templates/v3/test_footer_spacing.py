"""Exercise footer fitting with short, long, and prefixed numbers in each V3 family."""
from pathlib import Path
from tempfile import TemporaryDirectory
from lxml import etree as E
import hashlib, sys

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE/'scripts'))
from footer_spacing import change, bounds
from text_v3 import text

for master in sorted((HERE/'masters').glob('*.svg')):
    for number in ['5','200','P1']:
        tree = E.parse(str(master)); root = tree.getroot()
        old = root.xpath('//*[@id="card-number"]')[0]
        replacement, size = text(number, 'Teko-SemiBold.ttf', 53, 900, 1409.5, 'card-number')
        old.getparent().replace(old, replacement)
        for e in root.iter():
            for k,v in list(e.attrib.items()):
                if k.endswith('href') and not v.startswith(('data:','#')):
                    e.set(k, str((master.parent/v).resolve()))
        with TemporaryDirectory() as work:
            source = Path(work)/'card.svg'; tree.write(str(source), encoding='utf-8', xml_declaration=True)
            before = bounds(source); change(source, normalize_gap=True); after = bounds(source)
            ball, num, logo = (after[id] for id in ['footer-rarity','card-number','saga-emblem'])
            assert abs((min(ball[0],num[0])+max(ball[0]+ball[2],num[0]+num[2]))/2-847.25)<.002
            assert abs(num[0]-ball[0]-ball[2]-12.2)<.002
            assert abs(logo[0]+logo[2]/2-211.75)<.002
            for id in ['card-number','footer-rarity','saga-emblem']:
                assert all(abs(after[id][i]-before[id][i])<.002 for i in [1,2,3])
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            assert not change(source, normalize_gap=True)['changed']
            assert hashlib.sha256(source.read_bytes()).hexdigest()==digest
        print(master.stem,number,'passed')
