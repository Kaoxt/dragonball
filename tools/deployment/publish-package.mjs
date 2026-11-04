import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] || '');
const repository = 'Kaoxt/dragonball';
const token = process.env.GITHUB_TOKEN;
const source = process.env.SOURCE_COMMIT;
if (!token || !/^[a-f0-9]{40}$/.test(source || '')) throw new Error('GITHUB_TOKEN and SOURCE_COMMIT are required');
const manifest = JSON.parse(await readFile(resolve(root, 'deployment/card-assets.json')));
if (manifest.sourceCommit !== source || manifest.repository !== repository) throw new Error('Artifact source does not match the successful workflow');
async function api(path, method = 'GET', data) {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
    body: data ? JSON.stringify(data) : undefined, redirect: 'error', signal: AbortSignal.timeout(120000),
  });
  if (response.status === 404 && method === 'GET') return null;
  if (!response.ok) throw new Error(`GitHub release operation failed (${response.status})`);
  return response.json();
}
async function mainStillMatches() { return (await api('git/ref/heads/main'))?.object.sha === source; }
if (!await mainStillMatches()) { console.log('A newer source commit exists; this release was superseded.'); process.exit(0); }
const sourceTree = await api(`git/trees/${source}?recursive=1`);
if (!sourceTree || sourceTree.truncated) throw new Error('Unable to read the complete source tree');
const knownBlobs = new Set(sourceTree.tree.filter(e => e.type === 'blob').map(e => e.sha));
const entries = []; let total = 0;
async function walk(directory, prefix = '') {
  for (const file of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = prefix + file.name;
    if (file.isDirectory()) { await walk(resolve(directory, file.name), path + '/'); continue; }
    if (!file.isFile() || path.startsWith('public/assets/cards/') || path.startsWith('.git/') || path.startsWith('node_modules/')) throw new Error(`Invalid production artifact file: ${path}`);
    const bytes = await readFile(resolve(directory, file.name)); total += bytes.length;
    if (total > 100 * 1024 * 1024) throw new Error('Production artifact exceeds 100 MiB');
    const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (!knownBlobs.has(sha)) {
      const created = await api('git/blobs', 'POST', { content: bytes.toString('base64'), encoding: 'base64' });
      if (created.sha !== sha) throw new Error(`GitHub content mismatch: ${path}`);
    }
    entries.push({ path, mode: '100644', type: 'blob', sha });
  }
}
await walk(root);
const current = await api('git/ref/heads/cloudflare-production');
// The initial repository commit contains only a 6 KB README. Never parent the
// deployment branch to main: doing so would reintroduce the artwork history.
const parent = current?.object.sha || 'abee5ce913cc0e811b8ff36f48967648c80341b9';
// GitHub can time out resolving hundreds of existing blobs in one tree request.
// Construct an initially empty tree in small batches, preserving no source history.
let tree;
for (let offset = 0; offset < entries.length; offset += 48) {
  tree = await api('git/trees', 'POST', {
    ...(tree ? { base_tree: tree.sha } : {}), tree: entries.slice(offset, offset + 48),
  });
}
if (current && (await api(`git/commits/${parent}`)).tree.sha === tree.sha) {
  console.log('This production package is already published.'); process.exit(0);
}
const commit = await api('git/commits', 'POST', { message: `Deploy source ${source} with private card storage`, tree: tree.sha, parents: [parent] });
if (!await mainStillMatches()) { console.log('Source advanced during packaging; this release was superseded.'); process.exit(0); }
if (current) await api('git/refs/heads/cloudflare-production', 'PATCH', { sha: commit.sha, force: false });
else await api('git/refs', 'POST', { ref: 'refs/heads/cloudflare-production', sha: commit.sha });
console.log(`Production package published: ${commit.sha}; ${entries.length} files, ${total} bytes.`);
