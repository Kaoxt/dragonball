import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateManifest } from './sync-card-assets.mjs';

const releaseTests = ['tests/card-assets.test.js', 'tests/deployment-assets.test.mjs',
  'tests/game.test.js', 'tests/deck-code.test.js', 'tests/card-pages.test.js'];
const releaseTools = ['tools/deployment/sync-card-assets.mjs', 'tools/deployment/verify-release.mjs'];
const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const blobHash = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');

export async function packageRelease(root, output, sourceCommit) {
  root = resolve(root); output = resolve(output);
  if (output === root || output.startsWith(root + sep)) throw new Error('Release output must be outside the source checkout');
  sourceCommit ||= git(root, ['rev-parse', 'HEAD']).trim();
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('Use an immutable, full source commit SHA');
  const records = git(root, ['ls-tree', '-r', '-z', sourceCommit]).split('\0').filter(Boolean).map(line => {
    const [meta, path] = line.split('\t'); const [mode, type, oid] = meta.split(' ');
    return { mode, type, oid, path };
  });
  const manifest = { schema: 1, repository: 'Kaoxt/dragonball', sourceCommit, assets: {} };
  const included = new Map();
  let originalBytes = 0;
  for (const record of records) {
    const { path, oid, mode } = record;
    const card = path.startsWith('public/assets/cards/');
    const runtime = path.startsWith('public/') || path.startsWith('src/') || releaseTests.includes(path) || releaseTools.includes(path) ||
      ['package.json', 'package-lock.json', 'wrangler.jsonc'].includes(path);
    if (!runtime) continue;
    if (mode !== '100644' && mode !== '100755') throw new Error(`Unsupported release file: ${path}`);
    const bytes = await readFile(resolve(root, path));
    if (blobHash(bytes) !== oid) throw new Error(`Uncommitted or mismatched source: ${path}`);
    originalBytes += bytes.length;
    if (card) {
      const digest = sha256(bytes);
      manifest.assets[path.slice('public'.length)] = { sha256: digest, key: `sha256/${digest}.webp`, size: bytes.length };
    } else included.set(path, bytes);
  }
  validateManifest(manifest);
  for (const path of [...releaseTests, ...releaseTools, 'src/card-assets.js']) {
    if (!included.has(path)) throw new Error(`Missing deployment source: ${path}`);
  }
  const config = JSON.parse(included.get('wrangler.jsonc').toString());
  config.assets.run_worker_first = [...new Set([...config.assets.run_worker_first, '/assets/cards/*'])];
  if (config.r2_buckets.some(b => b.binding === 'CARD_ASSETS')) throw new Error('Source config already has a CARD_ASSETS binding; review before packaging');
  config.r2_buckets.push({ binding: 'CARD_ASSETS', bucket_name: 'dragonball-card-assets' });
  included.set('wrangler.jsonc', Buffer.from(JSON.stringify(config, null, 2) + '\n'));
  const pkg = JSON.parse(included.get('package.json').toString());
  pkg.scripts = {
    dev: 'wrangler dev',
    test: `node tools/deployment/verify-release.mjs && node --test ${releaseTests.join(' ')}`,
    check: 'wrangler deploy --dry-run',
    deploy: 'node tools/deployment/sync-card-assets.mjs && wrangler deploy',
  };
  included.set('package.json', Buffer.from(JSON.stringify(pkg, null, 2) + '\n'));
  included.set('src/card-assets-manifest.json', Buffer.from(JSON.stringify(manifest.assets) + '\n'));
  included.set('deployment/card-assets.json', Buffer.from(JSON.stringify(manifest) + '\n'));
  included.set('.gitignore', Buffer.from('node_modules/\n.wrangler/\n.dev.vars\n.env*\n'));
  included.set('README.md', Buffer.from(`# Dragon Ball production package\n\nGenerated from [${sourceCommit}](https://github.com/Kaoxt/dragonball/commit/${sourceCommit}).\n\nDo not edit this branch directly. Full-resolution images, native SVGs and production evidence remain in the source repository. See \`docs/small-deployments.md\` on the source branch. The private R2 bucket serves original image bytes at unchanged URLs.\n\nCloudflare build command: \`npm ci --include=optional && npm test && npm run check\`. Deploy command: \`npm run deploy\`. Production branch: \`cloudflare-production\`. Disable builds for other branches. Keep \`SKIP_DEPENDENCY_INSTALL=1\`.\n`));
  const bytes = [...included.values()].reduce((sum, b) => sum + b.length, 0);
  if (bytes > 100 * 1024 * 1024) throw new Error('Production package exceeded the 100 MiB size guard');
  await mkdir(output, { recursive: false });
  for (const [path, contents] of included) {
    await mkdir(dirname(resolve(output, path)), { recursive: true });
    await writeFile(resolve(output, path), contents);
  }
  return { sourceCommit, output, files: included.size, bytes, cardFiles: Object.keys(manifest.assets).length,
    cardBytes: Object.values(manifest.assets).reduce((sum, a) => sum + a.size, 0), originalRuntimeBytes: originalBytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  if (!process.argv[2]) throw new Error('Usage: node tools/deployment/package-release.mjs /absolute/output [source-commit]');
  packageRelease(root, resolve(process.argv[2]), process.argv[3]).then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
