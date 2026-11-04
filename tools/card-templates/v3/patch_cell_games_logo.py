"""Apply the approved Cell Games emblem, changing only each old/new logo footprint.

Historical production audits stay immutable. release.json records their exact
before hashes, current hashes, measured centers, and independent lossless checks.
"""
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from lxml import etree as E
from PIL import Image
import argparse,hashlib,io,json,math,re,subprocess,tempfile
import numpy as np

ROOT=Path(__file__).resolve().parents[3]
ASSET='tools/card-templates/v3/assets/2581b08f1b28fceedf0748d3acd774f2d36106d059148d799ca3a0cce3614e8c.png'
ASSET_SHA='2581b08f1b28fceedf0748d3acd774f2d36106d059148d799ca3a0cce3614e8c'
RELEASE='tools/card-corrections/v3-cell-games-logo/release.json'
BASE='9f3b4db295e3d71d7c0a151f6b74e4b3ec7c8c78'
S='http://www.w3.org/2000/svg';XL='{http://www.w3.org/1999/xlink}href'
WIDTH=73.9635;ALPHA=(67,97,1243,1072);SCALE=WIDTH/(ALPHA[2]-ALPHA[0]);HEIGHT=(ALPHA[3]-ALPHA[1])*SCALE
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,b):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
def js(p):return json.loads((ROOT/p).read_text())
def logo_range(raw):
 at=raw.index('id="saga-emblem"');start=raw.rfind('<',0,at);prefix=re.match(r'<([\w:]+)',raw[start:])[1];depth=0
 for m in re.finditer(r'</?'+re.escape(prefix)+r'(?=[\s>])[^>]*>',raw[start:]):
  token=m[0]
  if token.startswith('</'):depth-=1
  elif not token.endswith('/>'):depth+=1
  if depth==0:return start,start+m.end(),prefix
 raise ValueError('Missing emblem closing tag')
def updated_source(raw,cx,cy):
 a,b,prefix=logo_range(raw);ns=prefix[:-1]
 g=E.Element('{'+S+'}g',nsmap={ns[:-1]:S},id='saga-emblem',attrib={'data-set':'Cell Games Saga','data-emblem-finish':'android-satin-v1','transform':f'translate({cx-WIDTH/2:.12f} {cy-HEIGHT/2:.12f})'})
 defs=E.SubElement(g,'{'+S+'}defs');clip=E.SubElement(defs,'{'+S+'}clipPath',id='cell-games-satin-visible',clipPathUnits='userSpaceOnUse')
 E.SubElement(clip,'{'+S+'}rect',x='0',y='0',width=str(WIDTH),height=str(HEIGHT))
 im=E.SubElement(g,'{'+S+'}image',x=str(-ALPHA[0]*SCALE),y=str(-ALPHA[1]*SCALE),width=str(1312*SCALE),height=str(1199*SCALE),attrib={'clip-path':'url(#cell-games-satin-visible)','preserveAspectRatio':'xMidYMid meet'})
 im.set(XL,'../assets/'+Path(ASSET).name)
 replacement=E.tostring(g,encoding='unicode')
 return raw[:a]+replacement+raw[b:],hashlib.sha256((raw[:a]+raw[b:]).encode()).hexdigest()
def footer_tree(raw,source):
 r=E.fromstring(raw.encode())
 keep={'background-brightness-trial-wrapper','continuous-frame-background','shared-footer-material','saga-emblem'}
 for e in list(r):
  if E.QName(e).localname not in ['defs','title'] and e.get('id')not in keep:r.remove(e)
 for e in r.xpath('//*[local-name()="image"]'):
  for k in ['href',XL]:
   h=e.get(k)
   if h and not h.startswith('data:'):e.set(k,str((source.parent/h).resolve()))
 return r
def render(r,roi,folder,name):
 p=folder/(name+'.svg');p.write_bytes(E.tostring(r,xml_declaration=True))
 args=['inkscape',str(p),'--export-type=png','--export-filename=-','--export-area='+':'.join(map(str,roi)),'--export-width='+str((roi[2]-roi[0])*2),'--export-height='+str((roi[3]-roi[1])*2)]
 out=subprocess.run(args,capture_output=True,check=True).stdout
 return Image.open(io.BytesIO(out)).convert('RGB')
def one(row):
 source=ROOT/row['native_source_path'];assert sha(source)==row['native_source_sha256'],row['id']
 raw=source.read_text();land=row['family']in['LOCATION','BATTLEGROUND'];cx,cy=(296.55,985.5)if land else(211.75,1409.5)
 updated,unchanged=updated_source(raw,cx,cy)
 a,b,_=logo_range(updated);assert hashlib.sha256((updated[:a]+updated[b:]).encode()).hexdigest()==unchanged
 roi=[math.floor(cx-WIDTH/2)-4,math.floor(cy-31.8)-4,math.ceil(cx+WIDTH/2)+4,math.ceil(cy+31.8)+4]
 with tempfile.TemporaryDirectory(prefix='cell-games-logo-')as td:
  folder=Path(td);old=render(footer_tree(raw,source),roi,folder,'old');new=render(footer_tree(updated,source),roi,folder,'new')
  # Query the actual clipped image group; white/transparent canvas margins must
  # not move the visible emblem away from the shared footer center.
  query=subprocess.run(['inkscape',str(folder/'new.svg'),'--query-all'],capture_output=True,text=True,check=True).stdout
  measured=next(list(map(float,line.split(',')[1:]))for line in query.splitlines()if line.startswith('saga-emblem,'))
  assert abs(measured[0]+measured[2]/2-cx)<.002 and abs(measured[1]+measured[3]/2-cy)<.002,measured
  # The shield's upper face must render green, rejecting a missing-image placeholder.
  px=round((cx-roi[0])*2);py=round((cy-HEIGHT/2+(320-ALPHA[1])*SCALE-roi[1])*2)
  red,green,blue=new.getpixel((px,py));assert green>red+8 and green>blue+8,(red,green,blue)
  exports=[]
  for ex in row['exports']:
   path=ROOT/ex['path'];assert sha(path)==ex['after_sha256']
   live=Image.open(path).convert('RGB');assert list(live.size)==ex['size'];scale=2 if ex['field']=='downloadImage'else 1
   box=tuple(v*scale for v in roi);old_im=old if scale==2 else old.resize((old.width//2,old.height//2),Image.Resampling.LANCZOS);new_im=new if scale==2 else new.resize(old_im.size,Image.Resampling.LANCZOS)
   before=np.array(live);old_a=np.array(old_im).astype('int16');new_a=np.array(new_im).astype('int16');existing=np.array(live.crop(box)).astype('int16')
   baseline_error=int(np.max(np.abs(existing-old_a)));assert baseline_error<=3,(row['id'],ex['field'],baseline_error)
   mask=np.any(old_a!=new_a,axis=2);assert mask.any()
   # Carry the pre-existing renderer's <=3-level rounding forward rather than
   # replacing published texture pixels or re-encoding unrelated card content.
   patch=existing.copy();patch[mask]=np.clip(existing[mask]+new_a[mask]-old_a[mask],0,255)
   result=before.copy();result[box[1]:box[3],box[0]:box[2]]=patch.astype('uint8')
   changed=np.any(result!=before,axis=2);allowed=np.zeros(changed.shape,dtype=bool);allowed[box[1]:box[3],box[0]:box[2]]=mask
   assert not np.any(changed&~allowed)
   ys,xs=np.where(changed);bbox=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
   Image.fromarray(result).save(path,format='WEBP',lossless=True,quality=70,method=3,exact=True)
   assert np.array_equal(np.array(Image.open(path).convert('RGB')),result)
   exports.append({'field':ex['field'],'path':ex['path'],'before_sha256':ex['after_sha256'],'after_sha256':sha(path),'size':list(live.size),'lossless_round_trip':True,'changed_pixels':int(changed.sum()),'changed_bounds':bbox,'outside_logo_changed_pixels':0,'old_native_roi_max_channel_error':baseline_error,'final_native_roi_max_channel_error':int(np.max(np.abs(patch-new_a)))})
 source.write_text(updated)
 print('Updated '+row['id'],flush=True)
 return {'id':row['id'],'number':row['number'],'family':row['family'],'source':{'path':row['native_source_path'],'before_sha256':row['native_source_sha256'],'after_sha256':sha(source),'unchanged_outside_emblem_sha256':unchanged},'visible_center':[cx,cy],'visible_bounds':measured,'exports':exports}
def verify(release):
 assert sha(ROOT/ASSET)==ASSET_SHA
 for r in release['cards']:
  assert sha(ROOT/r['source']['path'])==r['source']['after_sha256']
  assert 'data-emblem-finish="android-satin-v1"'in(ROOT/r['source']['path']).read_text()
  for e in r['exports']:assert sha(ROOT/e['path'])==e['after_sha256']
 print(f'Verified {len(release["cards"])} cards; no changes needed.',flush=True)
def main():
 p=argparse.ArgumentParser();p.add_argument('--only',help='Comma-separated numbers for local validation');p.add_argument('--workers',type=int,default=3);a=p.parse_args()
 if (ROOT/RELEASE).exists():verify(js(RELEASE));return
 assert sha(ROOT/ASSET)==ASSET_SHA
 rows=[]
 for batch in ['001-050','051-100']:rows+=js('tools/card-corrections/v3-cell-games-'+batch+'/audit.json')
 assert len(rows)==95
 if a.only:rows=[r for r in rows if str(r['number'])in a.only.split(',')]
 with ThreadPoolExecutor(max_workers=a.workers)as pool:results=list(pool.map(one,rows))
 catalog_path=ROOT/'public/cards/catalog.js';catalog=catalog_path.read_text()
 for r in results:
  for e in r['exports']:
   before=e['path'][len('public'):]+'?v='+e['before_sha256'][:12];after=e['path'][len('public'):]+'?v='+e['after_sha256'][:12]
   assert catalog.count(before)==1,before;catalog=catalog.replace(before,after)
 catalog_path.write_text(catalog)
 release={'revision':'cell-games-android-satin-v1','source_base_commit':BASE,'asset':{'path':ASSET,'sha256':ASSET_SHA,'approved_png_sha256':'2581b08f1b28fceedf0748d3acd774f2d36106d059148d799ca3a0cce3614e8c','visible_alpha_bounds':list(ALPHA)},'published_card_count':len(results),'held_numbers':[70,72,73,81,83],'historical_audits_preserved':True,'cards':results}
 target=ROOT/(RELEASE if not a.only else 'tools/card-corrections/v3-cell-games-logo/sample-release.json')
 write(target,(json.dumps(release,indent=2)+'\n').encode());verify(release)
if __name__=='__main__':main()
