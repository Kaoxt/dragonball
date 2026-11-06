"""Rebuild the isolated Goku correction and verify protected published pixels."""
from pathlib import Path
from lxml import etree as E
from PIL import Image
import hashlib, io, json, subprocess, tempfile
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
BASE = '59b09acc653daf0f0474c2ce196a002010b178ed'
SOURCE = 'tools/card-templates/v3/cell-games-001-050/cell-games-030-strength-training.svg'
ASSET = 'tools/card-templates/v3/assets/b0087b683cca3b4568474046e4e235157550c611efd8d41187dc6049f2cb7ebf.png'
CARD = 'cell-games-030-strength-training'
def sha(b): return hashlib.sha256(b).hexdigest()
def baseline(path): return subprocess.check_output(['git', 'show', BASE+':'+path], cwd=ROOT)
def render(raw, destination):
    tree = E.fromstring(raw)
    for image in tree.xpath('//*[local-name()="image"]'):
        for attr in ['href', '{http://www.w3.org/1999/xlink}href']:
            ref = image.get(attr)
            if ref and ref.startswith('../assets/'):
                image.set(attr, str(ROOT/'tools/card-templates/v3/assets'/ref.split('/')[-1]))
    svg = destination.with_suffix('.svg')
    svg.write_bytes(E.tostring(tree, xml_declaration=True))
    subprocess.run(['inkscape', str(svg), '--export-filename='+str(destination), '--export-width=2120', '--export-height=2968'], check=True, capture_output=True)
    return Image.open(destination).convert('RGB')

before = baseline(SOURCE)
after = (ROOT/SOURCE).read_bytes()
insert = (HERE/'native-insert.svg.txt').read_bytes()
assert after.count(insert) == 1 and after.replace(insert, b'') == before
release = {
    'id': CARD, 'number': 30, 'name': 'Strength Training', 'base_commit': BASE,
    'source': {'path': SOURCE, 'before_sha256': sha(before), 'after_sha256': sha(after)},
    'native_insert_path': str((HERE/'native-insert.svg.txt').relative_to(ROOT)),
    'asset': {'path': ASSET, 'sha256': sha((ROOT/ASSET).read_bytes())},
    'printed_reference': 'tools/card-corrections/v3-cell-games-001-050/originals/030.jpg',
    'correction': 'The adult is Super Saiyan Goku training with Gohan in Saiyan armor. The original production review incorrectly identified Vegeta and Trunks. Correct only the adult head and neck transition using the retained masked imagegen insert.',
    'review': {
        'identity': 'Goku front bangs, hair silhouette and face replace the Vegeta widow peak and face.',
        'expression': 'Head remains tilted down-left, looking at Gohan with clenched teeth.',
        'preserved': 'Gohan, pushing hands, full-body stance, blue undersuits, white/gold armor, boots, framing, rules, title, rarity, set emblem and numbering.',
        'unresolved': 'The 429 by 600 original limits exact small facial-detail and color comparisons.',
        'display_reviewed': True, 'download_reviewed': True
    },
    'exports': []
}
with tempfile.TemporaryDirectory() as temp:
    temp = Path(temp)
    old_native = render(before, temp/'before.png')
    new_native = render(after, temp/'after.png')
    for field, size, prefix in [('image', (1060,1484), ''), ('downloadImage', (2120,2968), 'downloads/')]:
        path = 'public/assets/cards/'+prefix+CARD+'.webp'
        original = baseline(path)
        old = np.array(old_native.resize(size, Image.Resampling.LANCZOS) if size != old_native.size else old_native)
        new = np.array(new_native.resize(size, Image.Resampling.LANCZOS) if size != new_native.size else new_native)
        published = np.array(Image.open(io.BytesIO(original)).convert('RGB'))
        changed = np.any(old != new, axis=2)
        output = published.copy()
        output[changed] = new[changed]
        assert np.array_equal(output[~changed], published[~changed])
        y,x = np.where(changed)
        bounds = [int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]
        scale = size[0]/1060
        assert bounds[0] >= 450*scale and bounds[1] >= 142*scale and bounds[2] <= 750*scale and bounds[3] <= 405*scale
        error = int(np.abs(output.astype(int)-new.astype(int)).max())
        assert error <= 2, error
        image = Image.fromarray(output)
        image.save(ROOT/path, format='WEBP', lossless=True, method=6)
        assert np.array_equal(np.array(Image.open(ROOT/path).convert('RGB')), output)
        release['exports'].append({'field':field,'path':path,'before_sha256':sha(original),'after_sha256':sha((ROOT/path).read_bytes()),'size':list(size),'lossless':True,'changed_pixels':int(changed.sum()),'changed_bounds':bounds,'outside_patch_changed_pixels':0,'native_max_channel_error':error})
catalog = ROOT/'public/cards/catalog.js'
text = catalog.read_text()
for export in release['exports']:
    old = export['path'].removeprefix('public')+'?v='+export['before_sha256'][:12]
    new = export['path'].removeprefix('public')+'?v='+export['after_sha256'][:12]
    assert old in text or new in text
    text = text.replace(old,new)
catalog.write_text(text)
(HERE/'release.json').write_text(json.dumps(release,indent=2)+'\n')
print(json.dumps(release['exports'],indent=2))
