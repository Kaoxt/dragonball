#!/usr/bin/env python3
"""Preflight or apply the additive Cell Saga P1–P10 release to a current checkout."""
from pathlib import Path
import argparse, hashlib, json, re, shutil

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read_export(p,name):
 raw=p.read_text()
 m=re.search(r'export const '+name+r'\s*=\s*(\[.*\]);\s*$',raw,re.S)
 if not m:raise ValueError('Unsupported export format: '+str(p))
 return raw,m,json.loads(m.group(1))
def merge(raw,m,before,after):
 return raw[:m.start(1)]+json.dumps(after,indent=2,ensure_ascii=False)+raw[m.end(1):]

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('repository',type=Path);ap.add_argument('--apply',action='store_true');args=ap.parse_args()
 base=Path(__file__).resolve().parent;root=args.repository.resolve();payload=base/'payload'
 manifest=json.loads((base/'manifest.json').read_text())
 prior=manifest.get('replaces',{})
 prior_entries=manifest.get('prior_p3_entries',[]) or [manifest.get('prior_p3_entry')]
 # Complete all conflict and integrity checks before changing any file.
 for f in manifest['files']:
  src=payload/f['path'];dst=root/f['path']
  assert src.is_file() and sha(src)==f['sha256'],('Package integrity failure',f['path'])
  allowed=prior.get(f['path'],[])
  if isinstance(allowed,str):allowed=[allowed]
  assert not dst.exists() or sha(dst) in [f['sha256']]+allowed,('Existing file conflicts; review before overwriting',f['path'])
 additions=json.loads((payload/'tools/card-corrections/v3-cell-promos-p1-p10/catalog-additions.json').read_text())
 catfile=root/'public/cards/catalog.js';idsfile=root/'public/decks/code-card-ids.js'
 craw,cm,catalog=read_export(catfile,'catalog');iraw,im,ids=read_export(idsfile,'codeCardIds')
 assert len({c['id'] for c in catalog})==len(catalog) and len(set(ids))==len(ids)
 nextcat=list(catalog);nextids=list(ids)
 for c in additions:
  same=[x for x in nextcat if x['id']==c['id'] or (x.get('set')==c['set'] and x.get('number')==c['number'])]
  if same:
   if same!=[c]:
    assert c['number']=='P3' and len(same)==1 and same[0] in prior_entries,('Existing promo data differs',c['number'])
    assert {k:v for k,v in same[0].items() if k not in ['image','downloadImage']}=={k:v for k,v in c.items() if k not in ['image','downloadImage']}
    nextcat[nextcat.index(same[0])]=c
  else:nextcat.append(c)
  if c['id'] not in nextids:nextids.append(c['id'])
 assert nextids[:len(ids)]==ids
 assert all(a==b or a in prior_entries and b['number']=='P3' for a,b in zip(catalog,nextcat))
 numbers={c['number'] for c in nextcat if c['set']=='Cell Saga'}
 assert {str(n) for n in range(1,201)}.issubset(numbers),'Baseline numbered Cell Saga set is incomplete'
 assert {f'P{n}' for n in range(1,11)}.issubset(numbers)
 planned={catfile:merge(craw,cm,catalog,nextcat),idsfile:merge(iraw,im,ids,nextids)}
 changed=[str(p.relative_to(root)) for p,s in planned.items() if p.read_text()!=s]
 missing=[f['path'] for f in manifest['files'] if not (root/f['path']).exists()]
 replacements=[f['path'] for f in manifest['files'] if (root/f['path']).exists() and sha(root/f['path'])!=f['sha256']]
 if args.apply:
  for path in missing+replacements:
   dest=root/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(payload/path,dest)
  for p,s in planned.items():
   if p.read_text()!=s:
    tmp=p.with_name(p.name+'.cell-promos.tmp');tmp.write_text(s);tmp.replace(p)
 print(json.dumps({'applied':args.apply,'new_payload_files':len(missing),'replaced_payload_files':len(replacements),'changed_index_files':changed,'catalog_added':len(nextcat)-len(catalog),'deck_ids_appended':len(nextids)-len(ids),'cell_cards_after':sum(c['set']=='Cell Saga' for c in nextcat)},indent=2))

if __name__=='__main__':main()
