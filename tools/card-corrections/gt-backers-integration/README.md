# GT Backers integration history

The GT Backers feature changed runtime files, `AGENTS.md`, and the test command
after Babidi #30 was published. Earlier releases pin exact source hashes. This
separate layer restores their original inputs before those audits run, while
the application and GT feature tests continue to use the current implementation.

`integration-files.json` records the exact files preceding GT feature commit
`a17cbe24741b03103e10c03cc45fd2a7fbec1886`. Every `before/` snapshot comes from
source commit `023c12fcbadc598bcdca388388e0d35856f1326e`. It covers the five modified
inputs protected by earlier audits: `AGENTS.md`, `package.json`, personality
data, deck storage and Arena code, plus the historical reader/test changed
by this repair.

`repair-files.json` separately records the files changed by the compatibility
repair relative to the GT commit. Where those prior bytes are identical, it
reuses the existing snapshot; the GT version of `package.json` has its own
`before-repair/` snapshot.

The read order is GT Backers → Babidi #30 → Majin Buu → Movie 7 → earlier
releases. Both the latest historical reader and the strict #30 revision test
use this layer. Original release manifests, audit hashes and instructions are
unchanged. No catalog entry, permanent deck ID, artwork, native card source,
or export is changed by the feature or this compatibility repair.

Run `tests/gt-backers-history.test.js`, `tests/card-v3-babidi-030.test.js`, the
GT runtime tests listed in `docs/gt-hi-tech-backers.md`, and the existing
release checks. Keep the ordinary CI and publication gates intact.
