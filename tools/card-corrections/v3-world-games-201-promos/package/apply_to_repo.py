"""Preflight or import the additive World Games completion release."""
from pathlib import Path
import argparse,hashlib,json,shutil
P=Path(__file__).resolve().parent
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def parse(path,marker):
 s=path.read_text();a=s.index(marker)+len(marker);value,length=json.JSONDecoder().raw_decode(s[a:]);return s[:a],value,s[a+length:]
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('repo',type=Path);ap.add_argument('--apply',action='store_true');a=ap.parse_args();repo=a.repo.resolve()
 hashes=json.loads((P/'SHA256SUMS.json').read_text())
 for rel,h in hashes.items():assert digest(P/rel)==h,f'Package checksum mismatch: {rel}'
 files=sorted(p for p in (P/'files').rglob('*')if p.is_file())
 for src in files:
  target=repo/src.relative_to(P/'files');assert not target.exists() or digest(target)==digest(src),f'Differing file already exists: {target}'
 new=json.loads((P/'catalog-additions.json').read_text());cat=repo/'public/cards/catalog.js';pre,rows,post=parse(cat,'export const catalog = ');old=list(rows);byid={x['id']:x for x in rows};bynum={(x.get('set'),str(x.get('number'))):x for x in rows}
 for c in new:
  conflict=bynum.get((c['set'],c['number']));assert conflict is None or conflict['id']==c['id'],f'Card number collision: {c["number"]}'
  if c['id'] in byid:assert c==byid[c['id']],f'Existing card differs: {c["id"]}'
  else:rows.append(c)
 assert rows[:len(old)]==old
 ids_path=repo/'public/decks/code-card-ids.js';ipre,ids,ipost=parse(ids_path,'export const codeCardIds = ');oldids=list(ids)
 for c in new:
  if c['id'] not in ids:ids.append(c['id'])
 assert ids[:len(oldids)]==oldids and len(ids)==len(set(ids))
 power=repo/'public/personality-power.js';ppre,charts,ppost=parse(power,'const charts = ');oldcharts=dict(charts);extra=json.loads((P/'power-chart-additions.json').read_text())
 for k,v in extra.items():
  assert k not in charts or charts[k]==v,f'Power chart collision: {k}'
  charts[k]=v
 assert all(charts[k]==v for k,v in oldcharts.items())
 updates={cat:pre+json.dumps(rows,indent=2,ensure_ascii=False)+post,ids_path:ipre+json.dumps(ids,indent=2,ensure_ascii=False)+ipost,power:ppre+json.dumps(charts,indent=2,ensure_ascii=False)+ppost}
 print(f'Validated {len(files)} payload files; {len(rows)-len(old)} catalog additions; {len(ids)-len(oldids)} appended deck IDs; {len(charts)-len(oldcharts)} power charts.')
 if not a.apply:print('Dry run only. Use --apply to import locally.');return
 for src in files:
  target=repo/src.relative_to(P/'files');target.parent.mkdir(parents=True,exist_ok=True)
  if not target.exists():shutil.copy2(src,target)
 for path,content in updates.items():
  if path.read_text()!=content:
   tmp=path.with_suffix(path.suffix+'.world-games-import.tmp');tmp.write_text(content);tmp.replace(path)
 print('Local import completed. No commit, push or deployment performed.')
if __name__=='__main__':main()
