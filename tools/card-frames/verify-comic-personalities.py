"""Verify rendered card coverage/data and produce review contact sheets."""
from pathlib import Path
import json, hashlib, subprocess
from PIL import Image, ImageDraw
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
report=json.loads((ROOT/'docs/comic-personality-progress.json').read_text())
def catalog(s):return json.loads(s.split('=',1)[1].strip().rstrip(';'))
old=catalog(subprocess.check_output(['git','show','76c6a91:public/cards/catalog.js'],cwd=ROOT,text=True))
new=catalog((ROOT/'public/cards/catalog.js').read_text())
assert len(old)==len(new)
changed=[]
for a,b in zip(old,new):
    assert a['id']==b['id']
    if a==b:continue
    assert b['number'] in report
    assert {k:v for k,v in a.items() if k not in ['image','width','height']}=={k:v for k,v in b.items() if k not in ['image','width','height']}
    changed.append(b['number'])
assert set(changed)==set(report)
for n,r in report.items():
    p=ROOT/r['path'];im=Image.open(p);im.load();assert im.size==(1060,1484)
    assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256']
    assert ' '.join(r['lines'])==' '.join(r['rules'].split())
    assert r['art_visible_bounds'][1]>=(129 if n=='85' else 185)
    left,_,right,_=r['art_bounds']
    assert abs(left+(right-left)*r['art_focus_x']-428)<=0.5
    assert r['art_visible_bounds'][0]>=28 and r['art_visible_bounds'][2]<=828
    assert r['title_font']=='Teko Bold 700' and r['title_center']==[530,77]
    assert r['title_size']==92 and r['title_outline']==4
    c=next(c for c in new if c['number']==n and c['set']=='Saiyan Saga')
    assert c['image'].endswith(r['sha256'][:12])
out=ROOT/'docs/previews/comic-personalities';out.mkdir(parents=True,exist_ok=True)
manifest=json.loads((HERE/'original-personality-references/manifest.json').read_text())
rs=[report[e['number']] for e in manifest if e['number'] in report]
for start in range(0,len(rs),10):
    group=rs[start:start+10];sheet=Image.new('RGB',(1800,1060),'#161b22');d=ImageDraw.Draw(sheet)
    for i,r in enumerate(group):
        im=Image.open(ROOT/r['path']);im.load();im=im.resize((350,490),Image.Resampling.LANCZOS);x=(i%5)*360;y=(i//5)*530
        sheet.paste(im,(x,y+25));d.text((x+8,y+5),r['number']+' '+r['name'],fill='white')
    sheet.save(out/f'batch-{start//10+1}.jpg',quality=94)
print(f'PASS: {len(report)} rendered cards; image integrity, catalog scope, dimensions, text, and artwork margins verified.')
print('Remaining:',49-len(report))
