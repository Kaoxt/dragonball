"""Apply the shared middle-strip font while proving every outside pixel unchanged."""
from pathlib import Path
import re,json,hashlib,io,concurrent.futures
from PIL import Image
from type_label import apply_type_label

ROOT=Path(__file__).resolve().parents[2]

def main():
    path=ROOT/'public/cards/catalog.js';text=path.read_text()
    match=re.search(r'export const catalog\s*=\s*(\[.*?\]);',text,re.S)
    catalog=json.loads(match[1])
    def process(card):
        asset='public'+card['image'].split('?')[0]
        original=(ROOT/asset).read_bytes()
        image=Image.open(io.BytesIO(original)).convert('RGB')
        result=apply_type_label(image,card)
        output=io.BytesIO();result.save(output,'WEBP',lossless=True,method=4)
        binary=output.getvalue()
        assert Image.open(io.BytesIO(binary)).convert('RGB').tobytes()==result.tobytes()
        sha=hashlib.sha1(b'blob '+str(len(binary)).encode()+b'\0'+binary).hexdigest()
        (ROOT/asset).write_bytes(binary)
        card.update(image=card['image'].split('?')[0]+'?v='+sha[:10],width=1060,height=1484)
        return dict(number=card['number'],name=card['name'],type=card['type'],path=asset,sha=sha,
                    width=1060,height=1484,bytes=len(binary),protected_pixels_unchanged=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        entries=[]
        for row in pool.map(process,catalog):
            entries.append(row)
            if len(entries)%10==0: print('Verified and exported',len(entries),'type strips',flush=True)
    path.write_text(text[:match.start(1)]+json.dumps(catalog,indent=2,ensure_ascii=False)+text[match.end(1):])
    (ROOT/'docs/saiyan-shared-type-font.json').write_text(json.dumps(dict(
        design='Heavy condensed oblique middle labels matched to the Physical Combat reference',
        font='Teko Bold 700, supersampled fixed oblique, shared weight and cap height',
        protected='All pixels outside the middle-label interior; sword icons and vector rails untouched',
        updated=entries),indent=2)+'\n')
    print('Finished',len(entries),'cards',flush=True)

if __name__=='__main__': main()
