"""Release check for both infinity-corrected exports and their catalog revisions."""
from pathlib import Path
import hashlib,json,math
from PIL import Image
import numpy as np

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[2]
catalog_text=(REPO/'public/cards/catalog.js').read_text()
catalog=json.loads(catalog_text.split('=',1)[1].strip().removesuffix(';'))
cards={c['id']:c for c in catalog}
manifest=json.loads((HERE/'manifest.json').read_text())
count=0
for record in manifest:
    native=record['native_alignment'];card=cards[record['id']]
    assert native['idempotent'] and abs(native['center_error'])<=.01
    assert native['colon_and_text_unchanged'] and native['shape_size_and_horizontal_position_preserved']
    x,y,w,h=native['new_visible_bounds']
    cap=native['capital_visible_bounds'];cap_center=cap[1]+cap[3]/2
    for export in record['exports']:
        path=REPO/export['path'];digest=hashlib.sha256(path.read_bytes()).hexdigest()
        assert digest==export['after_sha256'],(path,'unexpected export')
        field='downloadImage' if '/downloads/' in export['path'] else 'image'
        assert card[field]==export['path'].removeprefix('public')+'?v='+digest[:12],(path,'stale catalog revision')
        assert export['pixels_changed_outside_symbol_mask']==0 and export['lossless_round_trip']
        image=Image.open(path).convert('RGB');assert list(image.size)==export['size']
        scale=image.width/1060
        left=math.floor((x-2)*scale);top=math.floor((y-2)*scale)
        right=math.ceil((x+w+2)*scale);bottom=math.ceil((y+h+2)*scale)
        ink=np.all(np.asarray(image)[top:bottom,left:right]<100,axis=2)
        ys,xs=np.where(ink);assert len(ys)>0
        center=(top+(ys.min()+ys.max()+1)/2)/scale
        assert abs(center-cap_center)<=1,(path,center,cap_center)
        count+=1
print(f'Passed: {len(manifest)} native corrections, {count} actual exports, catalog revisions, and preservation records.')
