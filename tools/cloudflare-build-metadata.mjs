import { execFileSync } from 'node:child_process';
import { lstatSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BUILD_ROOT = '/opt/buildhome/repo';
const ORIGIN = 'https://github.com/Kaoxt/dragonball.git';

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  }).trim();
}

// Restore only Git metadata after the guarded Cloudflare disk cleanup. A shallow,
// blobless fetch retains the real commit/tree without a second copy of all images.
// read-tree and update-index inspect the existing files; they never check out,
// overwrite, stage, commit, or push application files.
export function restoreMetadata(root, commit, origin = ORIGIN, branch = 'main') {
  if (!/^[0-9a-f]{40}$/.test(commit ?? '')) {
    throw new Error('Missing or invalid WORKERS_CI_COMMIT_SHA; refusing Git recovery.');
  }
  if (!branch) throw new Error('Missing WORKERS_CI_BRANCH; refusing Git recovery.');
  git(root, ['check-ref-format', '--branch', branch]);
  let existing;
  try { existing = lstatSync(resolve(root, '.git')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing) {
    if (!existing.isDirectory() || existing.isSymbolicLink()) {
      throw new Error('Refusing to replace a linked or non-directory .git.');
    }
    if (git(root, ['rev-parse', 'HEAD']) !== commit) {
      throw new Error('Existing Git checkout does not match the Cloudflare build commit.');
    }
    return false;
  }

  git(root, ['init', '--quiet']);
  git(root, ['config', 'gc.auto', '0']);
  git(root, ['remote', 'add', 'origin', origin]);
  git(root, ['config', 'remote.origin.promisor', 'true']);
  git(root, ['config', 'remote.origin.partialclonefilter', 'blob:none']);
  git(root, ['fetch', '--quiet', '--no-tags', '--depth=1', '--filter=blob:none', 'origin', commit]);
  if (git(root, ['rev-parse', 'FETCH_HEAD']) !== commit) {
    throw new Error('Fetched Git metadata does not match the requested build commit.');
  }
  git(root, ['update-ref', `refs/heads/${branch}`, commit]);
  git(root, ['update-ref', `refs/remotes/origin/${branch}`, commit]);
  git(root, ['symbolic-ref', 'HEAD', `refs/heads/${branch}`]);
  git(root, ['config', `branch.${branch}.remote`, 'origin']);
  git(root, ['config', `branch.${branch}.merge`, `refs/heads/${branch}`]);
  git(root, ['read-tree', 'HEAD']);
  git(root, ['update-index', '--refresh']);
  if (git(root, ['status', '--porcelain', '--untracked-files=no'])) {
    throw new Error('Tracked files differ from the build commit; refusing deployment.');
  }
  console.log(`Restored shallow Git metadata for ${commit}; source files are unchanged.`);
  console.log(git(root, ['count-objects', '-v']));
  return true;
}

export function runFromEnvironment(env = process.env, cwd = process.cwd()) {
  if (env.WORKERS_CI !== '1') return false;
  const root = realpathSync(cwd);
  if (root !== BUILD_ROOT || fileURLToPath(new URL('..', import.meta.url)) !== `${BUILD_ROOT}/`) {
    throw new Error('Git recovery is restricted to /opt/buildhome/repo in Workers Builds.');
  }
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) {
    if (env[name]) throw new Error(`Refusing Git recovery with ${name} overridden.`);
  }
  return restoreMetadata(root, env.WORKERS_CI_COMMIT_SHA, ORIGIN, env.WORKERS_CI_BRANCH);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { runFromEnvironment(); }
  catch (error) {
    console.error('Cloudflare Git metadata recovery failed:', error.message);
    if (error.stderr) console.error(String(error.stderr));
    process.exitCode = 1;
  }
}
