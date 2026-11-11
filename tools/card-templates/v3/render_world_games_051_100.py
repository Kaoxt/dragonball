"""Render all fifty completed native World Games 051–100 cards."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from PIL import Image,ImageChops
import io,json,subprocess
P=Path(__file__).resolve().parent;ROOT=P.parents[2]
def render(row):
    source=ROOT/row['native_source_path'];full=next(e for e in row['exports'] if e['field']=='downloadImage')
    result=subprocess.run(['inkscape',str(source),'--export-type=png','--export-filename=-','--export-width='+str(full['size'][0])],capture_output=True,check=True)
    image=Image.open(io.BytesIO(result.stdout)).convert('RGB');assert list(image.size)==full['size']
    for out in row['exports']:
        size=tuple(out['size']);pic=image if size==image.size else image.resize(size,Image.Resampling.LANCZOS)
        target=ROOT/out['path'];target.parent.mkdir(parents=True,exist_ok=True);pic.save(target,'WEBP',lossless=True,method=4)
        assert ImageChops.difference(pic,Image.open(target).convert('RGB')).getbbox() is None
    print(row['id'],flush=True)
if __name__=='__main__':
    rows=json.loads((ROOT/'tools/card-corrections/v3-world-games-051-100/audit.json').read_text())
    assert len(rows)==50 and {r['number'] for r in rows}==set(range(51,101))
    with ProcessPoolExecutor(max_workers=3) as pool:list(pool.map(render,rows))
