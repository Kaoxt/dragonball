"""Replace AI silver rails with exact SVG segments; preserve approved card content."""
from pathlib import Path
import io, json, hashlib, subprocess, os
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = 'e7fbc26558c51e6f34cc75856beb0f12456be3d9'
SVG = Path(__file__).with_name('judder-free-silver-rails.svg')
manifest_path = ROOT / 'docs/saiyan-approved-frame-001-010.json'
manifest = json.loads(subprocess.check_output(['git','show',f'{SOURCE}:docs/saiyan-approved-frame-001-010.json'], cwd=ROOT))
catalog = subprocess.check_output(['git','show',f'{SOURCE}:public/cards/catalog.js'], cwd=ROOT).decode()
node = os.environ['CODEX_PRIMARY_RUNTIME_NODE']
sharp = str(Path(os.environ['CODEX_PRIMARY_RUNTIME_NODE_MODULES'])/'sharp')
js = "const sharp=require(process.argv[1]); sharp(process.argv[2],{density:288}).png().toBuffer().then(b=>process.stdout.write(b));"
png = subprocess.check_output([node,'-e',js,sharp,str(SVG)])
overlay = Image.open(io.BytesIO(png)).convert('RGBA').resize((1060,1484),Image.Resampling.LANCZOS)
mask = np.array(overlay)[:,:,3] > 0
frame = None
for card in manifest['updated']:
    data = subprocess.check_output(['git','show',f"{SOURCE}:{card['path']}"],cwd=ROOT)
    original = Image.open(io.BytesIO(data)).convert('RGB')
    result = Image.alpha_composite(original.convert('RGBA'),overlay).convert('RGB')
    before,after = np.array(original),np.array(result)
    assert np.array_equal(before[~mask],after[~mask]), 'Content outside rail overlay changed'
    for box in [(112,93,949,157),(80,330,980,690),(80,938,987,1143),(136,1332,204,1370)]:
        assert original.crop(box).tobytes()==result.crop(box).tobytes(), f'Protected content changed: {box}'
    buffer=io.BytesIO(); result.save(buffer,'WEBP',lossless=True,method=4)
    output=buffer.getvalue()
    assert Image.open(io.BytesIO(output)).convert('RGB').tobytes()==result.tobytes()
    sha=hashlib.sha1(b'blob '+str(len(output)).encode()+b'\0'+output).hexdigest()
    catalog=catalog.replace('?v='+card['sha'][:10],'?v='+sha[:10])
    card['sha']=sha
    (ROOT/card['path']).write_bytes(output)
manifest['silver_rail_cleanup']='All silver rails replaced by shared SVG geometry: uniform 8px silver, 16px black keyline, exact straight segments, miter joins, 4x antialiasing.'
manifest['silver_rail_source_commit']=SOURCE
manifest['content_preservation']='Every pixel outside the SVG rail overlay is identical to the approved published export. Title lettering, power rules, numeral and fresh Raditz art are preserved.'
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'public/cards/catalog.js').write_text(catalog)
print('10 cards rendered; protected content and lossless WebP verified.')
