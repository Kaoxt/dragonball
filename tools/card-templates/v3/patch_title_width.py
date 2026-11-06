"""Patch both existing lossless exports in the verified native header footprint.

Historical release evidence is immutable. This independent revision records
current hashes, reversible native edits, and pixel checks for every export.
"""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor,as_completed
from lxml import etree as E
from PIL import Image
import argparse,copy,hashlib,json,subprocess,sys,re,os
import numpy as np
ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE/'scripts'))
import title_width_v3 as title_width
REV='title-footer-width-letter-centering-20261106'
OUT=ROOT/'tools/card-corrections/v3-title-footer-width'

def digest(data):return hashlib.sha256(data).hexdigest()
def sha(p):return digest(Path(p).read_bytes())
def catalog():
    return json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {catalog} from './public/cards/catalog.js'; console.log(JSON.stringify(catalog))"],cwd=ROOT,text=True))
def sources():
    result={p.stem:p for p in HERE.glob('*/*.svg') if p.parent.name not in ['assets','artwork-corrections','masters']}
    return result

def header_tree(data,source):
    root=E.fromstring(data)
    # Remove lower components before rendering. All earlier illustration/rail
    # clips are retained, including full-bleed Hi-Tech art and title shadows.
    cutoff=next(i for i,c in enumerate(root) if c.get('id')=='shared-rules-component')
    for c in list(root)[cutoff:]:root.remove(c)
    for image in root.xpath('//*[local-name()="image"]'):
        for key,value in list(image.attrib.items()):
            if key.endswith('href') and not value.startswith('data:'):
                target=(source.parent/value).resolve()
                if not target.is_file():raise FileNotFoundError(target)
                image.set(key,str(target))
    return root

def render(root,path,width):
    f=path.with_suffix('.svg');E.ElementTree(root).write(str(f),encoding='utf-8',xml_declaration=True)
    result=subprocess.run(['inkscape',str(f),f'--export-area=0:0:{width}:160',f'--export-width={width*2}','--export-background-opacity=0','--export-filename='+str(path)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=180,env={**os.environ,'OMP_NUM_THREADS':'1','INKSCAPE_PROFILE_DIR':str(path.parent/'inkscape-profile')})
    if result.returncode:raise RuntimeError(f'Inkscape failed for {f}: {result.stderr.decode(errors="replace")}')
    return Image.open(path).convert('RGB')

def missing_header(card,work):
    # Only a verified header is reconstructed, never the missing full-card source.
    from title_fit_v3 import title
    donor=HERE/'cell-games-051-100'/('cell-games-071-orange-energy-concentration.svg' if card['style']=='Orange' else 'cell-games-082-red-energy-outburst.svg')
    if not donor.exists():
        candidates=[c for c in catalog() if c['id'] in sources() and c['set']=='Cell Games Saga' and c.get('style')==card['style'] and c.get('type') not in ['Personality','Dragon Ball']]
        donor=sources()[candidates[0]['id']]
    r=E.parse(str(donor)).getroot();old=r.xpath('//*[@id="card-title"]')[0];new,_=title(card['name'],164.5,894.5) if str(card['number']) in ['70','81'] else title(card['name']);old.getparent().replace(old,new)
    # Keep shared definitions, background, top rail, title and footer material
    # only. The footer material remains as the width reference, hidden in render.
    keep={'original-site-frame','background-brightness-trial-wrapper','continuous-frame-background','clean-native-artwork-rails','artwork-border-vector','shared-title-material','card-title','shared-footer-material'}
    for c in list(r):
        if E.QName(c).localname!='defs' and c.get('id') not in keep:r.remove(c)
    # Render helper uses this marker; it has no paint.
    marker=E.Element('{http://www.w3.org/2000/svg}g',id='shared-rules-component');r.insert(next(i for i,c in enumerate(r) if c.get('id')=='shared-footer-material'),marker)
    r.set('data-source-scope','reconstructed-header-only');r.set('data-card-id',card['id'])
    destination=OUT/'reconstructed-headers'/(card['id']+'.svg')
    for image in r.xpath('//*[local-name()="image"]'):
        for key,value in list(image.attrib.items()):
            if key.endswith('href') and not value.startswith('data:'):
                image.set(key,os.path.relpath((donor.parent/value).resolve(),destination.parent))
    # Preserve the original pixels directly below y146 for the display export's
    # downsampling kernel. These are outside the brush; no missing artwork is recreated.
    original=Image.open(ROOT/'public'/card['downloadImage'].split('?')[0].lstrip('/')).convert('RGB')
    strip=original.crop((0,292,2120,320));asset=destination.parent/'assets'/(card['id']+'-below-header.png');asset.parent.mkdir(parents=True,exist_ok=True);strip.save(asset)
    image=E.Element('{http://www.w3.org/2000/svg}image',id='retained-below-header-pixels',x='0',y='146',width='1060',height='14',preserveAspectRatio='none')
    image.set('{http://www.w3.org/1999/xlink}href',os.path.relpath(asset,destination.parent))
    r.insert(next(i for i,c in enumerate(r) if c.get('id')=='shared-title-material'),image)
    return E.tostring(r,xml_declaration=True,encoding='utf-8'),destination

def process(args):
    card,source_string,work_string=args;work=Path(work_string)/card['id'];work.mkdir(parents=True,exist_ok=True)
    source=Path(source_string) if source_string else None
    if source:before=source.read_bytes();asset_base=source
    else:before,asset_base=missing_header(card,work)
    after,alignment=title_width.change(before);assert title_width.change(after)[0]==after
    width,height=map(int,E.fromstring(before).get('viewBox').split()[2:]);assert (width,height) in [(1060,1484),(1484,1060)]
    old=render(header_tree(before,asset_base),work/'before.png',width)
    new=render(header_tree(after,asset_base),work/'after.png',width)
    checks=[]
    for field in ['image','downloadImage']:
        target=ROOT/'public'/card[field].split('?')[0].lstrip('/');baseline=Image.open(target).convert('RGB');scale=baseline.width/width;assert scale in [1,2]
        size=(baseline.width,round(160*scale));old_img=old if scale==2 else old.resize(size,Image.Resampling.LANCZOS);new_img=new if scale==2 else new.resize(size,Image.Resampling.LANCZOS)
        oa=np.asarray(old_img).astype(np.int16);na=np.asarray(new_img).astype(np.int16);base=np.asarray(baseline);strip=base[:size[1]].astype(np.int16)
        affected=np.any(oa!=na,axis=2)
        assert not affected[round(150*scale):].any(),card['id']
        mismatch=np.abs(strip-oa);maximum=int(mismatch[affected].max());p99=float(np.percentile(mismatch[affected],99))
        # Different Inkscape image resamplers retain small grain residuals.
        # Missing-source headers require a tighter independent match.
        assert maximum<=3,(card['id'],field,'unverified native header',maximum,p99)
        patched=base.copy();corrected=np.clip(strip+na-oa,0,255).astype(np.uint8);patched[:size[1]][affected]=corrected[affected]
        diff=np.any(patched!=base,axis=2);outside=diff.copy();outside[:size[1]][affected]=False;assert not outside.any()
        assert np.array_equal(patched[size[1]:],base[size[1]:])
        staged=work/(field+'.webp');Image.fromarray(patched).save(staged,'WEBP',lossless=True,method=4);assert np.array_equal(np.asarray(Image.open(staged).convert('RGB')),patched)
        ys,xs=np.where(diff);checks.append({'field':field,'path':str(target.relative_to(ROOT)),'before_sha256':sha(target),'before_size_bytes':target.stat().st_size,'before_git_blob_sha':hashlib.sha1(f'blob {target.stat().st_size}\0'.encode()+target.read_bytes()).hexdigest(),'after_sha256':sha(staged),'dimensions':list(baseline.size),'changed_pixels':int(diff.sum()),'changed_bounds':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)],'pixels_changed_outside_native_header_delta':0,'pixels_changed_below_header':0,'old_render_max_channel_difference':maximum,'old_render_p99_channel_difference':p99,'lossless_round_trip':True})
    (work/'before-source.svg').write_bytes(before);(work/'after-source.svg').write_bytes(after)
    result={'id':card['id'],'source':{'path':str(source.relative_to(ROOT)) if source else f'tools/card-corrections/v3-title-footer-width/reconstructed-headers/{card["id"]}.svg','before_sha256':digest(before),'after_sha256':digest(after),'scope':'complete-native-source' if source else 'verified-header-only','reversible_edits':title_width.revert_segments(before,after)},'alignment':alignment,'helper_idempotent':True,'exports':checks}
    (work/'verification.json').write_text(json.dumps(result,indent=2)+'\n');return result

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('work',type=Path);parser.add_argument('--ids',nargs='*');parser.add_argument('--workers',type=int,default=4);parser.add_argument('--apply',action='store_true');args=parser.parse_args();work=args.work.resolve();work.mkdir(parents=True,exist_ok=True)
    cards=catalog();mapping=sources()
    if args.ids:cards=[c for c in cards if c['id'] in args.ids];assert len(cards)==len(args.ids)
    if (OUT/'release.json').exists():
        release=json.loads((OUT/'release.json').read_text())
        for r in release['cards']:
            for f in [r['source'],*r['exports']]:assert sha(ROOT/f['path'])==f['after_sha256']
        print('Revision already applied; all source and export bytes unchanged.');return
    results=[]
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(process,(c,str(mapping[c['id']]) if c['id'] in mapping else None,str(work))):c['id'] for c in cards}
        for f in as_completed(futures):
            r=f.result();results.append(r);print(f'Verified {len(results)}/{len(cards)} {r["id"]}',flush=True)
    results.sort(key=lambda r:next(i for i,c in enumerate(cards) if c['id']==r['id']))
    release={'revision':REV,'baseline_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'cards':results,'card_count':len(results),'export_count':sum(len(r['exports']) for r in results),'historical_audits_preserved':True,'middle_bars_and_footers_unchanged':True}
    (work/'release.json').write_text(json.dumps(release,indent=2)+'\n')
    if not args.apply:return
    assert not args.ids and len(results)==len(catalog())
    text=(ROOT/'public/cards/catalog.js').read_text();profiles=(ROOT/'public/ultra-rare-profiles.js').read_text()
    for r in results:
        target=ROOT/r['source']['path'];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((work/r['id']/'after-source.svg').read_bytes())
        for e in r['exports']:
            target=ROOT/e['path'];assert sha(target)==e['before_sha256'];target.write_bytes((work/r['id']/(e['field']+'.webp')).read_bytes())
            old=e['path'].removeprefix('public')+'?v='+e['before_sha256'][:12];new=e['path'].removeprefix('public')+'?v='+e['after_sha256'][:12]
            assert text.count('"'+old+'"')==1,(r['id'],old);text=text.replace('"'+old+'"','"'+new+'"');profiles=profiles.replace('"'+old+'"','"'+new+'"')
    (ROOT/'public/cards/catalog.js').write_text(text);(ROOT/'public/ultra-rare-profiles.js').write_text(profiles)
    # Future portrait masters inherit both the width and punctuation-safe centering.
    release['masters']=[]
    for target in sorted((HERE/'masters').glob('*.svg')):
        before=target.read_bytes();after,alignment=title_width.change(before);assert title_width.change(after)[0]==after;target.write_bytes(after)
        release['masters'].append({'path':str(target.relative_to(ROOT)),'before_sha256':digest(before),'after_sha256':digest(after),'reversible_edits':title_width.revert_segments(before,after)})
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'release.json').write_text(json.dumps(release,indent=2)+'\n')
    print('Applied',len(results),'cards and',release['export_count'],'lossless exports',flush=True)
if __name__=='__main__':main()
