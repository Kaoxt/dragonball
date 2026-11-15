from pathlib import Path
import json,copy,subprocess,concurrent.futures,os,hashlib
from lxml import etree as E
B=Path(__file__).resolve().parent
BASE=B.parent/'remaining-review/snapshot';CACHE=B/'cache';CACHE.mkdir(exist_ok=True)
REPO=Path('/workspace/scratch/33bd84853a18/dragonball')
INV=json.loads((B.parent/'remaining-review/inventory.json').read_text())
V={r['id']:r for r in json.loads((B.parent/'remaining-review/visual-review.json').read_text())}
NS='http://www.w3.org/2000/svg';XL='{http://www.w3.org/1999/xlink}href'
OFFSETS={
 'Saiyan Saga':{'82':-40,'84':-70,'85':-60,'86':-150,'163':-50,'166':50,'175':40,'179':-70,'180':-160,'182':-45,'183':60,'243':-50,'P1':50,'P2':100,'P3':-50,'P6':55},
 'Cell Saga':{'109':48,'127':54,'136':-96,'139':-114,'154':56,'159':48,'164':54,'165':54,'173':76,'176':75,'182':-70},
 'Cell Games Saga':{'115':-90,'122':-110},
 'World Games Saga':{'128':-120,'129':-85,'131':-90,'134':-105,'138':-110,'146':-114,'153':52,'163':-114,'164':-65,'172':-114,'175':-100,'176':-95,'179':-60,'180':52,'182':-105,'183':-85,'184':-105,'185':70,'186':-100,'188':-114,'192':-95,'194':-60,'195':-110,'196':-114,'198':-80,'199':-114,'200':-75}
}
def render(svg,png,w):
 if png.exists():return
 r=subprocess.run(['inkscape',str(svg),'--export-type=png',f'--export-filename={png}',f'--export-width={w}'],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr[-1000:])
def prepare(row):
 c=row['card'];cid=c['id'];source=BASE/row['native'];root=E.parse(str(source)).getroot();deps=[]
 for e in root.iter():
  for k in [XL,'href']:
   h=e.get(k)
   if h and not h.startswith(('#','data:')):
    target=(source.parent/h).resolve();assert target.exists(),target;deps.append(str(target.relative_to(BASE.resolve())));e.set(k,str(target))
 art=next(e for e in root if e.get('id') in ['retained-illustration','retained-hi-tech-composition','retained-hi-tech-183-composition','full-bleed-artwork'])
 row['horizontal_shift']=OFFSETS[c['set']].get(c['number'],0);row['art_group']=art.get('id');row['dependencies']=sorted(set(deps));row['audit_recommendation']=V[cid]
 for mode in ['art','ui','full']:
  r=copy.deepcopy(root)
  if mode!='full':
   for child in list(r):
    if child.tag.endswith(('defs','title')):continue
    isart=child.get('id')==art.get('id')
    if (mode=='art' and not isart) or (mode=='ui' and (isart or child.get('id') in ['background-brightness-trial-wrapper','original-site-frame'])):r.remove(child)
  if mode=='art':next(e for e in r if e.get('id')==art.get('id')).attrib.pop('clip-path',None)
  path=CACHE/f'{cid}-{mode}.svg';E.ElementTree(r).write(str(path),encoding='UTF-8',xml_declaration=True)
  if mode=='art':
   for scale in [1,2]:render(path,CACHE/f'{cid}-art-{scale}x.png',1060*scale)
  if mode=='ui':render(path,CACHE/f'{cid}-ui-1x.png',1060)
 return row
if __name__=='__main__':
 selected=[r for r in INV['rows'] if V[r['card']['id']]['centering'].startswith(('shift','reframe')) or r['card']['id']=='saiyan-184-vegeta-lvl-1-ht']
 assert len(selected)==57
 needed=set()
 for row in selected:
  source=BASE/row['native'];root=E.parse(str(source)).getroot()
  for e in root.iter():
   h=e.get(XL) or e.get('href')
   if h and not h.startswith(('#','data:')):needed.add(str((source.parent/h).resolve().relative_to(BASE.resolve())))
 tree=subprocess.check_output(['git','ls-tree','-r',INV['baseline_commit']],cwd=REPO).decode().splitlines();hashes={l.split('\t')[1]:l.split()[2] for l in tree}
 shas=sorted({hashes[n] for n in needed if not (BASE/n).exists()})
 q=subprocess.run(['git','cat-file','--batch-check=%(objectname) %(objecttype)'],cwd=REPO,env=dict(os.environ,GIT_NO_LAZY_FETCH='1'),input='\n'.join(shas)+'\n',text=True,capture_output=True,check=True)
 missing=[l.split()[0] for l in q.stdout.splitlines() if l.endswith(' missing') and len(l.split()[0])==40]
 if missing:
  q=subprocess.run(['git','-c','fetch.negotiationAlgorithm=noop','fetch','--no-tags','--no-write-fetch-head','--recurse-submodules=no','--filter=blob:none','origin','--stdin'],cwd=REPO,input='\n'.join(missing)+'\n',text=True,capture_output=True);q.check_returncode()
 for n in needed:
  p=BASE/n;p.parent.mkdir(parents=True,exist_ok=True)
  if not p.exists():p.write_bytes(subprocess.check_output(['git','show',INV['baseline_commit']+':'+n],cwd=REPO,stderr=subprocess.PIPE))
 print('Dependencies ready:',len(needed),flush=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  out=[]
  for row in pool.map(prepare,selected):out.append(row);print(row['card']['id'],row['horizontal_shift'],flush=True)
 (B/'prepared.json').write_text(json.dumps({'baseline_commit':INV['baseline_commit'],'rows':out},indent=2))
