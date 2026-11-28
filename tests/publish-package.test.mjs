import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawnSync} from 'node:child_process';
const publisher=fileURLToPath(new URL('../tools/deployment/publish-package.mjs',import.meta.url));

async function fixture(t, {mismatch=false,advance=false}={}) {
  const root=await mkdtemp(join(tmpdir(),'publish-package-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const repo=join(root,'repo'),artifact=join(root,'artifact'),requests=join(root,'requests.json');
  await mkdir(join(repo,'nested'),{recursive:true});
  await mkdir(join(artifact,'deployment'),{recursive:true});
  await writeFile(join(repo,'nested','card image.txt'),'unchanged source bytes');
  const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init');git('add','.');git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m','Fixture');
  const source=git('rev-parse','HEAD'),blob=git('rev-parse','HEAD:nested/card image.txt');
  await writeFile(join(artifact,'source.txt'),'unchanged source bytes');
  await writeFile(join(artifact,'deployment','card-assets.json'),JSON.stringify({repository:'Kaoxt/dragonball',sourceCommit:mismatch?'f'.repeat(40):source}));
  const preload=join(root,'mock-api.mjs');
  await writeFile(preload, `
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const calls=[];let mainReads=0;
globalThis.fetch=async (url,options)=>{
 const path=new URL(url).pathname.replace('/repos/Kaoxt/dragonball/','');
 const body=options.body?JSON.parse(options.body):null;
 calls.push({path,method:options.method,body});writeFileSync(${JSON.stringify(requests)},JSON.stringify(calls));
 let result;
 if(path==='git/ref/heads/main')result={object:{sha:${JSON.stringify(advance)}&&++mainReads>1?'e'.repeat(40):${JSON.stringify(source)}}};
 else if(path==='git/ref/heads/cloudflare-production')result={object:{sha:'a'.repeat(40)}};
 else if(path==='git/commits/'+'a'.repeat(40))result={tree:{sha:'b'.repeat(40)}};
 else if(path==='git/blobs'&&options.method==='POST'){
  const bytes=Buffer.from(body.content,'base64');result={sha:createHash('sha1').update('blob '+bytes.length+'\\0').update(bytes).digest('hex')};
 }else if(path==='git/trees'&&options.method==='POST')result={sha:'c'.repeat(40)};
 else if(path==='git/commits'&&options.method==='POST')result={sha:'d'.repeat(40)};
 else if(path==='git/refs/heads/cloudflare-production'&&options.method==='PATCH')result={object:{sha:body.sha}};
 else throw new Error('Unexpected GitHub API request: '+options.method+' '+path);
 return new Response(JSON.stringify(result),{status:200});
};
`);
  const result=spawnSync(process.execPath,['--import',preload,publisher,artifact],{
    cwd:repo,encoding:'utf8',env:{...process.env,GITHUB_TOKEN:'test-token-only',SOURCE_COMMIT:source},
  });
  const calls=await readFile(requests,'utf8').then(JSON.parse).catch(()=>[]);
  return {result,calls,blob};
}

test('publisher reuses locally known blobs without requesting the recursive GitHub tree',async t=>{
  const {result,calls,blob}=await fixture(t);
  assert.equal(result.status,0,result.stderr);
  assert.equal(calls.some(c=>c.path.includes('recursive')||c.method==='GET'&&c.path.startsWith('git/trees/')),false);
  const uploads=calls.filter(c=>c.path==='git/blobs');
  assert.equal(uploads.length,1,'only the generated manifest is uploaded');
  const tree=calls.find(c=>c.path==='git/trees').body.tree;
  assert.equal(tree.find(e=>e.path==='source.txt').sha,blob);
  assert.deepEqual(calls.find(c=>c.path==='git/commits').body.parents,['a'.repeat(40)]);
  assert.deepEqual(calls.at(-1).body,{sha:'d'.repeat(40),force:false});
});
test('a mismatched artifact fails before any GitHub read or write',async t=>{
  const {result,calls}=await fixture(t,{mismatch:true});
  assert.notEqual(result.status,0);assert.match(result.stderr,/Artifact source does not match/);assert.equal(calls.length,0);
});
test('a newer source during packaging prevents the production branch update',async t=>{
  const {result,calls}=await fixture(t,{advance:true});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/superseded/);
  assert.equal(calls.some(c=>c.method==='PATCH'),false);
});
