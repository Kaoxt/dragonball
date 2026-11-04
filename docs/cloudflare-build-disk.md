# Cloudflare build disk recovery

The repository contains lossless card images and retained native sources. Workers
Builds exhausted its temporary disk during npm installation even with a cleared
cache. Keep every source/export and the original GitHub history intact.

The Production build settings are:

- Build variable: `SKIP_DEPENDENCY_INSTALL=1`.
- Build command:

  ```sh
  test "$WORKERS_CI" = "1" && test "$(pwd -P)" = "/opt/buildhome/repo" && test -d .git && test ! -L .git && rm -rf -- .git && npm ci --include=optional && npm test
  ```

- Deploy command: `npx wrangler deploy`.

The guarded cleanup removes only the disposable build clone's Git objects, before
dependency installation. The npm `pretest` hook restores valid Git metadata for
the exact `WORKERS_CI_COMMIT_SHA`, using a shallow, blobless fetch from the public
repository. It rebuilds the index from existing files without checking out or
overwriting files, and rejects differences from the expected commit. Git can
fetch an individual original blob later if deployment tooling needs a diff.

The hook skips local/GitHub test runs. Its CLI refuses to operate outside
`/opt/buildhome/repo`, or with Git directory/object overrides. It never replaces
an existing Git directory or updates any remote ref. Normal checkouts are kept.

The 2026-11-04 03:07 UTC log confirmed that the cleanup eliminated ENOSPC and
passed all 256 existing tests, but the deploy handoff failed without Wrangler
output. Missing Git metadata is a suspected cause of that handoff failure, not
a provider-confirmed diagnosis. This recovery restores that prerequisite while
retaining the space savings. `wrangler.jsonc` must also use the connected Worker's
actual name, `dragonball`.

Run the recovery fixtures with:

```sh
node --test tests/cloudflare-build-metadata.test.mjs
```
