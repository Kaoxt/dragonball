"""Independently compare all supplied World Games promo exports to native SVGs."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import hashlib,io,json,subprocess
from lxml import etree
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[3]
EVID=ROOT/'tools/card-corrections/v3-world-games-201-promos'
def verify(row):
    source=ROOT/row['native_source_path'];raw=source.read_bytes()
    assert hashlib.sha256(raw).hexdigest()==row['native_source_sha256']
    tree=etree.fromstring(raw);ids=[e.get('id') for e in tree.iter() if e.get('id')]
    assert len(ids)==len(set(ids)),(row['number'],'duplicate SVG IDs')
    assert not tree.xpath('//*[local-name()="text"]')
    for a in row['assets']:assert hashlib.sha256((ROOT/a['path']).read_bytes()).hexdigest()==a['sha256']
    for im in tree.xpath('//*[local-name()="image"]'):
        ref=im.get('{http://www.w3.org/1999/xlink}href') or im.get('href')
        assert ref and ref.startswith('../assets/'),ref
        assert (source.parent/ref).resolve().is_file()
    full=next(e for e in row['exports'] if e['field']=='downloadImage')
    result=subprocess.run(['inkscape',str(source),'--export-type=png','--export-filename=-','--export-width='+str(full['size'][0])],capture_output=True,check=True)
    large=Image.open(io.BytesIO(result.stdout)).convert('RGB');assert list(large.size)==full['size']
    exports=[]
    for e in row['exports']:
        path=ROOT/e['path'];data=path.read_bytes();assert hashlib.sha256(data).hexdigest()==e['after_sha256']
        actual=Image.open(path).convert('RGB');assert list(actual.size)==e['size']
        expected=large if e['field']=='downloadImage' else large.resize(e['size'],Image.Resampling.LANCZOS)
        difference=ImageChops.difference(actual,expected)
        assert difference.getbbox() is None,(row['number'],e['field'],'native render differs',difference.getbbox(),difference.getextrema())
        assert data[12:16]==b'VP8L'
        exports.append({**e,'independent_render_pixel_differences':0,'lossless':True})
    print('Verified',row['number'],flush=True)
    return {'number':row['number'],'id':row['id'],'native_source_sha256':row['native_source_sha256'],'unique_svg_ids':True,'native_outlined_text':True,'exports':exports}
if __name__=='__main__':
    rows=json.loads((EVID/'audit.json').read_text());assert len(rows)==18
    with ProcessPoolExecutor(max_workers=3) as pool:results=list(pool.map(verify,rows))
    (EVID/'publication-render-verification.json').write_text(json.dumps({'method':'Independent Inkscape 2x render and Lanczos display downsample; exact RGB comparison','cards':18,'exports':36,'results':results},indent=2)+'\n')
