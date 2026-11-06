from pathlib import Path
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor,as_completed
from lxml import etree as E
from PIL import Image
import numpy as np
import patch_cell_games_logo as H
import json,hashlib,math,tempfile,shutil,threading
ROOT=Path(__file__).resolve().parents[3]
import os
BACK=Path(os.environ.get('CELL_GAMES_LOGO_BASELINE',str(ROOT/'.cell-games-logo-baseline')))
OUT=ROOT/'tools/card-corrections/v3-cell-games-banner-logo'
GROUP=(OUT/'approved-emblem-group.svg').read_text()
ASSET='tools/card-templates/v3/assets/c0be062538157d871bd6d4448b6c2be0ec3a63c332f3aa63f37d496a487f1005.png'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def backup(p):
 q=BACK/p.relative_to(ROOT);q.parent.mkdir(parents=True,exist_ok=True)
 if not q.exists():shutil.copyfile(p,q)
 return q
def base(p):return BACK/p if (BACK/p).exists() else ROOT/p
def replace(raw,land=False):
 a,b,_=H.logo_range(raw);g=E.fromstring(GROUP.encode())
 cx,cy=(296.55,985.5) if land else (211.75,1409.5)
 g.set('transform',f'translate({cx-73.9635/2:.12f} {cy-64.62830097087378/2:.12f})')
 group=E.tostring(g,encoding='unicode')
 return raw[:a]+group+raw[b:],raw[a:b],hashlib.sha256((raw[:a]+raw[b:]).encode()).hexdigest()
def footer(raw,source):
 return H.footer_tree(raw,ROOT/source)
def pair(source,land):
 raw=base(source).read_text();new,old_group,outside=replace(raw,land)
 cx,cy=(296.55,985.5) if land else (211.75,1409.5)
 roi=[math.floor(cx-73.9635/2)-5,math.floor(cy-33)-5,math.ceil(cx+73.9635/2)+5,math.ceil(cy+33)+5]
 with tempfile.TemporaryDirectory(prefix='banner-logo-') as td:
  old=H.render(footer(raw,source),roi,Path(td),'old')
  newim=H.render(footer(new,source),roi,Path(td),'new')
 return {'old':old,'new':newim,'roi':roi,'new_raw':new,'old_group':old_group,'outside':outside,'source':source,'center':[cx,cy]}
def export(path,field,pair):
 p=ROOT/path;q=backup(p);im=Image.open(q).convert('RGB');before=np.array(im)
 scale=2 if field=='downloadImage' else 1
 old=pair['old'];new=pair['new'];roi=pair['roi'];box=tuple(v*scale for v in roi)
 if scale==1:old=old.resize((old.width//2,old.height//2),Image.Resampling.LANCZOS);new=new.resize(old.size,Image.Resampling.LANCZOS)
 old_a=np.array(old).astype('int16');new_a=np.array(new).astype('int16');live=np.array(im.crop(box)).astype('int16')
 error=int(np.abs(live-old_a).max());assert error<=3,(path,error)
 mask=np.any(old_a!=new_a,axis=2)
 patch=live.copy();patch[mask]=np.clip(live[mask]+new_a[mask]-old_a[mask],0,255)
 after=before.copy();after[box[1]:box[3],box[0]:box[2]]=patch.astype('uint8')
 changed=np.any(after!=before,axis=2);allowed=np.zeros(changed.shape,dtype=bool);allowed[box[1]:box[3],box[0]:box[2]]=mask
 assert not np.any(changed&~allowed)
 y,x=np.where(changed)
 Image.fromarray(after).save(p,format='WEBP',lossless=True,quality=0,method=0,exact=True)
 assert np.array_equal(np.array(Image.open(p).convert('RGB')),after)
 return {'path':path,'field':field,'before_sha256':sha(q),'after_sha256':sha(p),'before_size_bytes':q.stat().st_size,'before_git_blob_sha':hashlib.sha1(f'blob {q.stat().st_size}\0'.encode()+q.read_bytes()).hexdigest(),'size_bytes':p.stat().st_size,'size':list(im.size),'lossless_round_trip':True,'changed_pixels':int(changed.sum()),'changed_bounds':[int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)],'outside_logo_changed_pixels':0,'old_native_roi_max_channel_error':error,'final_native_roi_max_channel_error':int(np.abs(patch-new_a).max())}
OLD=json.loads((ROOT/'tools/card-corrections/v3-cell-games-logo/release.json').read_text())
FINAL=json.loads((ROOT/'tools/card-corrections/v3-cell-games-final-five/release.json').read_text())
PAIRS={}
def one(row):
 source=row['source']['path'];land=row['family'] in ['LOCATION','BATTLEGROUND']
 pp=pair(source,land);PAIRS[row['id']]=pp
 exports=[export(e['path'],e['field'],pp) for e in row['exports']]
 p=ROOT/source;q=backup(p);p.write_text(pp['new_raw'])
 a,b,_=H.logo_range(p.read_text());assert hashlib.sha256((p.read_text()[:a]+p.read_text()[b:]).encode()).hexdigest()==pp['outside']
 print('Updated '+row['id'],flush=True)
 result={'id':row['id'],'number':int(row['number']),'family':row['family'],'visible_center':pp['center'],'visible_width':73.9635,'visible_height':64.62830097087378,'source':{'path':source,'before_sha256':sha(q),'after_sha256':sha(p),'old_emblem_group':pp['old_group'],'new_emblem_group':pp['new_raw'][H.logo_range(pp['new_raw'])[0]:H.logo_range(pp['new_raw'])[1]],'unchanged_outside_emblem_sha256':pp['outside']},'exports':exports}
 checkpoint=BACK/'checkpoints';checkpoint.mkdir(exist_ok=True);(checkpoint/(str(row['number'])+'.json')).write_text(json.dumps(result))
 return result
def final(row):
 image=Image.open(base(row['exports'][1]['path'])).convert('RGB')
 best=None
 for key,pp in PAIRS.items():
  if pp['center']!=[211.75,1409.5]:continue
  box=tuple(v*2 for v in pp['roi']);err=int(np.abs(np.array(image.crop(box)).astype('int16')-np.array(pp['old']).astype('int16')).max())
  if best is None or err<best[0]:best=(err,key,pp)
  if err<=3:break
 assert best[0]<=3,(row['id'],'no matching native footer',best[0],best[1])
 pp=best[2];exports=[export(e['path'],e['field'],pp) for e in row['exports']]
 print('Updated '+row['id']+' using verified footer '+best[1],flush=True)
 return {'id':row['id'],'number':row['number'],'family':row['type'].upper(),'visible_center':pp['center'],'visible_width':73.9635,'visible_height':64.62830097087378,'source':None,'native_source_available':False,'footer_donor_source':pp['source'],'footer_baseline_max_channel_error':best[0],'exports':exports}
if __name__=='__main__':
 if (OUT/'release.json').exists():
  release=json.loads((OUT/'release.json').read_text())
  assert sha(ROOT/ASSET)==release['asset']['sha256']
  for row in release['cards']:
   for item in [row['source'],*row['exports']]:
    if item:assert sha(ROOT/item['path'])==item['after_sha256'],item['path']
  print('Verified 100 cards / 200 exports; no changes needed.')
  raise SystemExit(0)
 OUT.mkdir(parents=True,exist_ok=True)
 assert sha(ROOT/ASSET)=='c0be062538157d871bd6d4448b6c2be0ec3a63c332f3aa63f37d496a487f1005'
 title=json.loads((ROOT/'tools/card-corrections/v3-title-footer-width/release.json').read_text())
 title_rows={r['path']:r for c in title['cards'] for r in [c['source'],*c['exports']]}
 for c in [*OLD['cards'],*FINAL['cards']]:
  for e in c['exports']:
   assert sha(base(e['path']))==title_rows[e['path']]['after_sha256'],e['path']
 rows=[];errors=[]
 with ThreadPoolExecutor(max_workers=4) as pool:
  futures={pool.submit(one,r):r for r in OLD['cards']}
  for future in as_completed(futures):
   try:rows.append(future.result())
   except Exception as e:
    print('ERROR '+futures[future]['id']+': '+repr(e),flush=True);errors.append(str(e))
 assert not errors,errors
 rows.extend(final(r) for r in FINAL['cards']);rows.sort(key=lambda r:r['number']);assert [r['number'] for r in rows]==list(range(1,101))
 cat=ROOT/'public/cards/catalog.js';backup(cat);raw=base('public/cards/catalog.js').read_text()
 for row in rows:
  for e in row['exports']:
   before=e['path'][len('public'):]+'?v='+e['before_sha256'][:12];after=e['path'][len('public'):]+'?v='+e['after_sha256'][:12]
   assert raw.count(before)==1,(row['id'],before);raw=raw.replace(before,after)
 cat.write_text(raw)
 release={'revision':'cell-games-banner-emblem-v1','source_base_commit':'66125731699a6f5bb02355313670a1ab805342e6','approved_preview_library_file_id':'libfile_c1a0b502ea6081918a386be74e33f2da','approved_preview_sha256':'67d4d8058b942226ec6c05435d7259f9c889bf92b42e78b106010aa3d22c9b20','asset':{'path':ASSET,'sha256':sha(ROOT/ASSET)},'published_card_count':100,'export_count':200,'historical_audits_preserved':True,'previous_revision':'v3-title-footer-width','all_unrelated_pixels_unchanged':True,'native_source_limitation':'The five final cards retain their existing missing-native-source status. Their unchanged footer baseline was matched to a retained native donor within three channel levels before applying the same localized logo delta. Artwork was not rerendered.','cards':rows}
 (OUT/'release.json').write_text(json.dumps(release,indent=2)+'\n')
 (OUT/'approved-emblem-group.svg').write_text(GROUP)
 print('COMPLETE: 100 cards / 200 lossless exports; zero unrelated pixel changes.',flush=True)
