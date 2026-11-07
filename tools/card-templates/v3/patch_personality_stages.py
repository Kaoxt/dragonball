"""Repair stage ink only, independently in both existing lossless exports.

Keep production audits immutable. The release records reversible native edits,
current hashes, and per-export comparisons against the retained originals.
"""
from pathlib import Path
from copy import deepcopy
from hashlib import sha256
from tempfile import TemporaryDirectory
from lxml import etree as E
from PIL import Image
import argparse, json, os, re, shutil, subprocess
import numpy as np
from scripts.personality_stages import printed_stages

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT/'tools/card-corrections/v3-personality-stages'
BACK = Path(os.environ.get('PERSONALITY_STAGE_BASELINE', str(ROOT.parent/'stage-baseline')))
ROI = (800, 140, 1052, 858)
GROUP = re.compile(r'<(?:\w+:)?g\b[^>]*\bid="power-stage-value-(\d+)"[^>]*>.*?</(?:\w+:)?g>', re.S)
CORRECTED_ID = 'android-116-android-18'

def digest(p): return sha256(p.read_bytes()).hexdigest()
def save(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
def backup(p):
    q=BACK/p.relative_to(ROOT);q.parent.mkdir(parents=True, exist_ok=True)
    if not q.exists(): shutil.copyfile(p,q)
    return q
def catalog():
    return json.loads((ROOT/'public/cards/catalog.js').read_text().split('=',1)[1].strip().removesuffix(';'))
def sources(cards):
    result={}
    for p in (ROOT/'tools/card-corrections').glob('v3-*/audit.json'):
        rows=json.loads(p.read_text())
        if not isinstance(rows,list): continue
        for row in rows:
            if isinstance(row,dict) and row.get('id') in cards and row.get('native_source_path'):
                assert row['id'] not in result, row['id']
                result[row['id']]=row['native_source_path']
    assert set(result)==set(cards)
    return result
def values(raw):
    groups=list(GROUP.finditer(raw))
    assert [int(g[1]) for g in groups]==list(range(len(groups)))
    return [int(re.search(r'aria-label="([\d,]+)"',g[0])[1].replace(',','')) for g in groups]
def change(raw, donor=None):
    matches=list(GROUP.finditer(raw));nums=values(raw)
    desired=printed_stages(nums)
    if donor: desired=[399000 if n==499000 else n for n in desired]
    if nums==desired: return raw, []
    available={n:m[0] for n,m in zip(nums,matches)}
    if donor: available[399000]=donor
    edits=[]
    for i,(m,n) in enumerate(zip(matches,desired)):
        new=re.sub(r'id="power-stage-value-\d+"',f'id="power-stage-value-{i}"',available[n],count=1)
        if m[0]!=new: edits.append({'id':f'power-stage-value-{i}','before':m[0],'after':new})
    parts=[];last=0
    for i,(m,n) in enumerate(zip(matches,desired)):
        parts.extend([raw[last:m.start()], re.sub(r'id="power-stage-value-\d+"',f'id="power-stage-value-{i}"',available[n],count=1)])
        last=m.end()
    parts.append(raw[last:]);new=''.join(parts)
    assert GROUP.sub('',raw)==GROUP.sub('',new)
    assert values(new)==desired
    return new,edits
def render(raw, source, directory, name):
    root=E.fromstring(raw.encode())
    for e in root.xpath('//*[local-name()="image"]'):
        key='{http://www.w3.org/1999/xlink}href' if e.get('{http://www.w3.org/1999/xlink}href') else 'href'
        ref=e.get(key)
        if ref and not ref.startswith(('data:','#')):
            p=(source.parent/ref).resolve();assert p.exists(),p;e.set(key,str(p))
    svg=directory/(name+'.svg');png=directory/(name+'.png');svg.write_bytes(E.tostring(root))
    subprocess.run(['inkscape',str(svg),'--export-area='+':'.join(map(str,ROI)),
        '--export-width='+str((ROI[2]-ROI[0])*2),'--export-filename='+str(png)],check=True,capture_output=True)
    return Image.open(png).convert('RGB')
def patch_export(path, field, old, new, context):
    p=ROOT/path;q=backup(p);before=Image.open(q).convert('RGB');scale=before.width//1060
    assert scale in (1,2) and before.size==(1060*scale,1484*scale)
    box=tuple(v*scale for v in ROI);size=(box[2]-box[0],box[3]-box[1])
    # Match the original full-canvas resampling phase. Resizing a cropped strip
    # separately can give different Lanczos rounding in small preview glyphs.
    rendered=[]
    for im in (old,new):
        if scale==1:
            canvas=context.copy();canvas.paste(im,(ROI[0]*2,ROI[1]*2))
            im=canvas.resize(before.size,Image.Resampling.LANCZOS).crop(box)
        rendered.append(np.array(im,dtype=np.int16))
    a,b=rendered
    mask=np.any(a!=b,axis=2);ys,xs=np.where(mask)
    bounds=[int(xs.min()+box[0]),int(ys.min()+box[1]),int(xs.max()+box[0]+1),int(ys.max()+box[1]+1)]
    assert bounds[0]>=820*scale and bounds[1]>=150*scale and bounds[2]<1045*scale and bounds[3]<852*scale,bounds
    actual=np.array(before.crop(box),dtype=np.int16)
    residual=int(np.abs(actual-a)[mask].max());assert residual<=4,(path,residual)
    patch=actual.copy();patch[mask]=np.clip(actual[mask]+b[mask]-a[mask],0,255)
    pixels=np.array(before);pixels[box[1]:box[3],box[0]:box[2]]=patch.astype(np.uint8)
    allowed=np.zeros(pixels.shape[:2],dtype=bool);allowed[box[1]:box[3],box[0]:box[2]]=mask
    changed=np.any(pixels!=np.array(before),axis=2);assert not np.any(changed & ~allowed)
    Image.fromarray(pixels).save(p,format='WEBP',lossless=True,method=4,exact=True)
    assert np.array_equal(np.array(Image.open(p).convert('RGB')),pixels)
    return {'field':field,'path':path,'before_sha256':digest(q),'after_sha256':digest(p),
        'size':list(before.size),'changed_pixels':int(changed.sum()),'changed_bounds':bounds,
        'pixels_changed_outside_stage_ink':0,'old_native_max_channel_error':residual,
        'lossless_round_trip':True}
def verify_release(release):
    for row in release['cards']:
        for e in [row['source'],*row['exports']]: assert digest(ROOT/e['path'])==e['after_sha256'],e['path']
    cards={c['id']:c for c in catalog() if 'Personality' in c['type']}
    charts=json.loads(subprocess.check_output(['node','--input-type=module','-e',
        "import {catalog} from './public/cards/catalog.js'; import {powerChart} from './public/personality-power.js'; console.log(JSON.stringify(Object.fromEntries(catalog.filter(c=>c.type.includes('Personality')).map(c=>[c.id,powerChart(c)]))))"],cwd=ROOT,text=True))
    repaired={r['id'] for r in release['cards']}
    audit={r['id']:r for r in release['audit']}
    for ident,path in sources(cards).items():
        nums=values((ROOT/path).read_text());assert nums==printed_stages(nums),ident
        assert nums==audit[ident]['after_values'],ident
        if ident in repaired:
            assert sorted(nums)==sorted(cards[ident].get('powerStages',charts[ident])),ident
    print(f'Verified {len(cards)} Personality sources and {len(release["cards"])*2} repaired exports; no changes needed.',flush=True)
def main():
    if (OUT/'release.json').exists(): return verify_release(json.loads((OUT/'release.json').read_text()))
    cards={c['id']:c for c in catalog() if 'Personality' in c['type']};paths=sources(cards)
    donor_raw=(ROOT/paths['android-115-android-17']).read_text()
    donor=next(m[0] for m in GROUP.finditer(donor_raw) if 'aria-label="399,000"' in m[0])
    rows=[];audit=[]
    for ident,path in sorted(paths.items()):
        source=ROOT/path;old=backup(source).read_text();before_values=values(old)
        new,edits=change(old,donor if ident==CORRECTED_ID else None)
        audit.append({'id':ident,'source_path':path,'before_values':before_values,'after_values':values(new),'changed':bool(edits)})
        if not edits: continue
        checkpoint=BACK/'checkpoints'/(ident+'.json')
        if checkpoint.exists():
            row=json.loads(checkpoint.read_text())
            for e in [row['source'],*row['exports']]: assert digest(ROOT/e['path'])==e['after_sha256']
            rows.append(row);continue
        with TemporaryDirectory() as directory:
            a,b=[render(raw,source,Path(directory),name) for raw,name in [(old,'old'),(new,'new')]]
            context=Image.open(backup(ROOT/('public'+cards[ident]['downloadImage'].split('?')[0]))).convert('RGB')
            exports=[patch_export('public'+cards[ident][field].split('?')[0],field,a,b,context) for field in ['image','downloadImage']]
        source.write_text(new)
        row={'id':ident,'before_values':before_values,'after_values':values(new),
            'source':{'path':path,'before_sha256':digest(backup(source)),'after_sha256':digest(source),
                'reversible_edits':edits,'unchanged_outside_stage_groups_sha256':sha256(GROUP.sub('',old).encode()).hexdigest()},'exports':exports}
        save(checkpoint,row);rows.append(row);print('Verified both exports: '+ident,flush=True)
    assert len(audit)==172 and len(rows)==22
    cat=ROOT/'public/cards/catalog.js';raw=backup(cat).read_text()
    for row in rows:
        for e in row['exports']:
            before=e['path'].removeprefix('public')+'?v='+e['before_sha256'][:12]
            after=e['path'].removeprefix('public')+'?v='+e['after_sha256'][:12]
            assert raw.count(before)==1;raw=raw.replace(before,after)
    # Keep the corrected scan value synchronized in the catalog, game chart and builder input.
    pos=raw.index('"id": "'+CORRECTED_ID+'"');end=raw.index('\n  }',pos)
    block=raw[pos:end];assert len(re.findall(r'\b499000\b',block))==1
    raw=raw[:pos]+re.sub(r'\b499000\b','399000',block)+raw[end:];cat.write_text(raw)
    chart=ROOT/'public/personality-power.js';ch=backup(chart).read_text()
    oldline=next(line for line in ch.splitlines() if '"'+CORRECTED_ID+'"' in line)
    assert len(re.findall(r'\b499000\b',oldline))==1;chart.write_text(ch.replace(oldline,re.sub(r'\b499000\b','399000',oldline)))
    records=ROOT/'tools/card-corrections/v3-android-101-125-promos/cards.json';old=backup(records).read_text()
    pos=old.index('"id": "'+CORRECTED_ID+'"');end=old.index('\n  }',pos);block=old[pos:end]
    assert len(re.findall(r'\b499000\b',block))==1;new=old[:pos]+re.sub(r'\b499000\b','399000',block)+old[end:];records.write_text(new)
    data_revision={'path':str(records.relative_to(ROOT)),'before_sha256':sha256(old.encode()).hexdigest(),'after_sha256':digest(records),
        'reversible_edits':[{'before':block,'after':re.sub(r'\b499000\b','399000',block)}]}
    release={'revision':'personality-stages-highest-to-zero-v1','source_base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
        'audited_personality_count':len(audit),'corrected_card_count':len(rows),'export_count':len(rows)*2,
        'historical_audits_preserved':True,'all_unrelated_pixels_unchanged':True,
        'value_correction':{'id':CORRECTED_ID,'before':499000,'after':399000,
            'original_scan':'tools/card-corrections/v3-android-101-125-promos/originals/116.png',
            'original_scan_sha256':digest(ROOT/'tools/card-corrections/v3-android-101-125-promos/originals/116.png')},
        'data_revisions':[data_revision],'audit':audit,'cards':rows}
    save(OUT/'release.json',release);verify_release(release)

if __name__=='__main__':
    os.environ.setdefault('OMP_NUM_THREADS','1');main()
