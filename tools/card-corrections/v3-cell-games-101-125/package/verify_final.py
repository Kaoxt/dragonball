from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from collections import Counter
import hashlib, json, io, subprocess, sys
from lxml import etree
from PIL import Image, ImageChops

P=Path(__file__).resolve().parent
R=Path(sys.argv[sys.argv.index('--repo')+1]).resolve() if '--repo' in sys.argv else P/('source' if (P/'source').exists() else 'files')
V=R/'tools/card-templates/v3';E=R/'tools/card-corrections/v3-cell-games-101-125'
sys.path.append(str(P/'build-context/tools/card-templates/v3/scripts'))
sys.path.insert(0,str(V/'scripts'))
from title_width_v3 import change as title_change
from freestyle_symbol_weight import change as freestyle_change
from orange_symbol_weight import change as orange_change
from blue_symbol_weight import change as blue_change
from personality_levels import validate_level
from personality_stages import printed_stages

def verify(c):
    svg=V/'cell-games-101-125'/(c['id']+'.svg');raw=svg.read_bytes();root=etree.fromstring(raw)
    assert not root.xpath('//*[local-name()="text"]')
    ids=[e.get('id') for e in root.iter() if e.get('id')];assert len(ids)==len(set(ids))
    assert title_change(raw)[0]==raw
    for change in [freestyle_change,orange_change,blue_change]:assert change(raw.decode())[1]==[]
    assert root.get('data-card-id')==c['id']
    paths=[]
    for im in root.xpath('//*[local-name()="image"]'):
        ref=im.get('{http://www.w3.org/1999/xlink}href') or im.get('href');assert ref
        assert not ref.startswith(('http:', 'https:', 'file:','data:'))
        path=(svg.parent/ref).resolve();assert path.is_file();paths.append(str(path.relative_to(R)))
    if 'PERSONALITY' in c['category']:
        validate_level(root);assert printed_stages(c['stages'])==c['stages'];assert c['stages'][-1]==0
        assert [int(e.get('data-stage-value')) for e in root.xpath('//*[starts-with(@id,"power-stage-value-")]')]==c['stages']
    assert len(root.xpath('//*[@id="power-icon"]'))==int(bool(c['power_icon']))
    land=c['category'] in ['LOCATION','BATTLEGROUND'];w=2968 if land else 2120
    rendered=subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename=-','--export-width='+str(w)],capture_output=True,check=True)
    im=Image.open(io.BytesIO(rendered.stdout)).convert('RGB');assert im.size==((2968,2120) if land else (2120,2968))
    out=[]
    for sub,size in [('',(1484,1060) if land else (1060,1484)),('downloads',im.size)]:
        path=R/'public/assets/cards'/sub/(c['id']+'.webp');image=Image.open(path).convert('RGB');assert image.size==size
        expected=im if size==im.size else im.resize(size,Image.Resampling.LANCZOS)
        assert ImageChops.difference(expected,image).getbbox() is None,(c['id'],sub,'pixels differ')
        out.append({'path':str(path.relative_to(R)),'size':list(size),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'independent_render_pixel_differences':0})
    print('Verified',c['number'],flush=True)
    return {'number':c['number'],'id':c['id'],'unique_svg_ids':True,'native_outlined_text':True,'current_title_alignment':True,'current_style_weight':True,'linked_assets':sorted(set(paths)),'exports':out}

if __name__=='__main__':
    cards=json.loads((E/'cards.json').read_text());assert [c['number'] for c in cards]==list(range(101,126))
    with ProcessPoolExecutor(max_workers=3) as pool:results=list(pool.map(verify,cards))
    (E/'independent-verification.json').write_text(json.dumps({'cards':25,'exports':50,'method':'Independent Inkscape render from final SVG, then exact RGB comparison at both output resolutions. Display downsample uses Lanczos.','results':results},indent=2)+'\n')
