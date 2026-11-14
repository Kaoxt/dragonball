"""Preflight or import this additive card release into a current repository."""
from pathlib import Path
import argparse,hashlib,json,shutil

P=Path(__file__).resolve().parent
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()

def parse_array(path,name):
    s=path.read_text();marker='export const '+name+' = ';a=s.index(marker)+len(marker)
    value,length=json.JSONDecoder().raw_decode(s[a:]);b=a+length
    return s[:a],value,s[b:]

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('repo',type=Path);ap.add_argument('--apply',action='store_true');args=ap.parse_args();repo=args.repo.resolve()
    manifest=json.loads((P/'SHA256SUMS.json').read_text())
    files=sorted(p for p in (P/'files').rglob('*') if p.is_file())
    for src in files:
        assert digest(src)==manifest[str(src.relative_to(P))],f'Package checksum mismatch: {src}'
        target=repo/src.relative_to(P/'files')
        assert not target.exists() or digest(target)==digest(src),f'Refusing to overwrite a differing existing file: {target}'
    cat=repo/'public/cards/catalog.js';pre,rows,post=parse_array(cat,'catalog');before=list(rows)
    new=json.loads((P/'catalog-additions.json').read_text());byid={c['id']:c for c in rows};bynum={(c.get('set'),str(c.get('number'))):c for c in rows}
    for c in new:
        conflict=bynum.get((c['set'],c['number']))
        assert conflict is None or conflict['id']==c['id'],f'Number collision: {c["number"]}'
        if c['id'] in byid:assert byid[c['id']]==c,f'Existing card differs: {c["id"]}'
        else:rows.append(c)
    assert rows[:len(before)]==before
    ids_path=repo/'public/decks/code-card-ids.js';ipre,ids,ipost=parse_array(ids_path,'codeCardIds');oldids=list(ids)
    for c in new:
        if c['id'] not in ids:ids.append(c['id'])
    assert ids[:len(oldids)]==oldids and len(ids)==len(set(ids))
    updates={cat:pre+json.dumps(rows,indent=2,ensure_ascii=False)+post,ids_path:ipre+json.dumps(ids,indent=2,ensure_ascii=False)+ipost}
    print(f'Validated {len(files)} files; {len(rows)-len(before)} new catalog cards; {len(ids)-len(oldids)} appended deck IDs.')
    if not args.apply:print('Dry run only. Add --apply to import.');return
    for src in files:
        target=repo/src.relative_to(P/'files');target.parent.mkdir(parents=True,exist_ok=True)
        if not target.exists():shutil.copy2(src,target)
    for path,content in updates.items():
        if content!=path.read_text():
            temp=path.with_suffix(path.suffix+'.cell-games-import.tmp');temp.write_text(content);temp.replace(path)
    print('Imported locally. Deployment and full repository checks have not been run by this script.')

if __name__=='__main__':main()
