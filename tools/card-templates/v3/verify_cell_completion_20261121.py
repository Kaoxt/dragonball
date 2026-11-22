"""Independently render each source and compare both published lossless sizes."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageChops
from hashlib import sha256
import io,json,subprocess
ROOT=Path(__file__).resolve().parents[3]
EVID=ROOT/'tools/card-corrections/v3-cell-completion-20261121'

def verify(row):
    svg=ROOT/row['native_source_path']
    assert sha256(svg.read_bytes()).hexdigest()==row['native_source_sha256']
    high=next(e for e in row['exports'] if e['field']=='downloadImage')
    result=subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename=-','--export-width='+str(high['size'][0])],capture_output=True,check=True)
    native=Image.open(io.BytesIO(result.stdout)).convert('RGB')
    assert native.size==tuple(high['size'])
    checks=[]
    for export in row['exports']:
        actual=Image.open(ROOT/export['path']).convert('RGB')
        expected=native if native.size==actual.size else native.resize(actual.size,Image.Resampling.LANCZOS)
        assert ImageChops.difference(actual,expected).getbbox() is None,export['path']
        checks.append(dict(path=export['path'],size=list(actual.size),changed_pixels=0,sha256=sha256((ROOT/export['path']).read_bytes()).hexdigest()))
    print('Verified '+row['key'],flush=True)
    return dict(key=row['key'],independent_native_render=True,exports=checks)

if __name__=='__main__':
    rows=json.loads((EVID/'audit.json').read_text())
    with ProcessPoolExecutor(max_workers=3) as pool:results=list(pool.map(verify,rows))
    (EVID/'pixel-verification.json').write_text(json.dumps(results,indent=2)+'\n')
