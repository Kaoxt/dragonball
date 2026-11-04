# Small Cloudflare deployments

The source checkout currently contains about 8.4 GB, including native card sources and 1,922 lossless WebP exports. Cloudflare failed while checking out Git, before any build command ran. Removing `.git` after checkout cannot fix that phase.

## Source and production

`main` remains the complete, authoritative source repository. Do not delete card artwork, native SVGs, audit evidence, or rewrite its history. The source Worker still serves local card files when no `CARD_ASSETS` binding exists, so source development and the current production deployment remain compatible during rollout.

`cloudflare-production` is generated from a verified source commit. It contains the site code, non-card public files, runtime tests and two matching image manifests. It excludes `public/assets/cards/` and production/editing archives. Its initial parent is the repository's original README-only commit, not `main`; subsequent releases append only small production commits. Never merge `main` into this branch.

The full source tests and CodeQL remain required. After a successful push to `main`, Security checks saves a production artifact. The separate Publish Cloudflare package workflow consumes only artifacts from a successful push of this repository's `main`, checks that the source is still current, and updates the production branch without force. The publisher uses GitHub's built-in workflow token and does not require a Cloudflare deployment secret. Old runs cannot overwrite a newer source release.

## Source checkout cache

Security checks first checks out only the workflow and deployment instructions with a shallow, blobless checkout. It then restores Git objects from the Actions cache and materializes the **complete current commit** before running the unchanged dependency audit, source tests, and Wrangler checks. No source files or tests are omitted.

Only `.git/objects` is cached; Git configuration, credentials, refs, and the index are freshly initialized on each runner. The cache key follows the Git tree revisions of the card exports, native templates, and correction evidence. Ordinary code changes reuse the cache; changed assets are fetched by Git using their current object IDs. A previous asset revision may supply unchanged objects, but it cannot select the checked-out commit. `git diff --exit-code HEAD` checks the materialized working tree before tests.

Only successful push jobs save this cache. GitHub's branch scoping keeps pull-request caches out of `main`. CodeQL keeps its existing independent sparse checkout. A missing or evicted cache falls back to a complete source download, so the first run or a cold cache remains slower. Cache entries are an acceleration only; the full source repository remains authoritative.

## Image storage

The private R2 bucket is `dragonball-card-assets`, bound as `CARD_ASSETS`. Every original `/assets/cards/...webp` and `/assets/cards/downloads/...webp` URL is preserved. Content-addressed keys use the complete SHA-256 of the exact original bytes. No resizing, recompression or native-source changes occur.

The deployment script fetches missing images from the immutable source commit in this public repository, verifies SHA-256 and size, uploads them, then verifies R2's single-part MD5 ETag or reads the object back to check SHA-256. It checkpoints each batch and never deletes stored objects. Subsequent releases transfer only images not already recorded as verified. Preserve this bucket and its `_migration/verified-v1.json` checkpoint; do not manually alter immutable objects. If objects are manually removed, remove the corresponding receipt entries before deployment so they upload again.

The first migration transfers approximately 5.4 GB. It may need more than one build: after 14 minutes it fails safely with a retry instruction, retaining verified progress. Wrangler deployment runs only after the entire image manifest is ready. No production code is replaced after a partial or failed transfer. The REST API client is rate-limited and retries transient failures; credentials are never written into the package or logs.

The Worker accepts only manifest-listed paths, preserves HEAD/conditional/range requests and security headers, and caches by content hash. Missing storage objects fail with a noncached 503. R2 is not made public and has no separate public hostname.

## One-time Cloudflare switch

Sign into the existing `dragonball` Worker under account `c258dd1982f4b993816f209b2b7b57b5` and change its Git build configuration:

| Setting | Value |
| --- | --- |
| Repository | `Kaoxt/dragonball` |
| Production branch | `cloudflare-production` |
| Other branch builds | Disabled |
| Root directory | `/` |
| Build command | `npm ci --include=optional && npm test && npm run check` |
| Deploy command | `npm run deploy` |
| `SKIP_DEPENDENCY_INSTALL` | `1` |
| `CLOUDFLARE_ACCOUNT_ID` | `c258dd1982f4b993816f209b2b7b57b5` |

The build/deploy environment needs `CLOUDFLARE_API_TOKEN` with R2 storage edit permission as well as the existing Worker deployment permissions. Cloudflare's automatically generated Workers Builds token normally includes R2 edit; verify availability in the actual deploy environment. If it is unavailable, add a securely stored build secret via Cloudflare's dashboard. Do not paste tokens into chat or Git. The script fails before deployment if authentication or permissions are absent. Existing Durable Objects, mail/upload buckets, rate limits, Worker identity and production routes remain unchanged.

Retry the build after saving these settings. Verify the live catalog has 949 cards, including Cell Games Saga 001–050; verify all 100 new display/download exports against their approved SHA-256 records and their 50 card-page routes. Until this succeeds, the Cell Games release is not published.

## Local package verification

After committing the source changes:

```sh
npm test
npm run check
node tools/deployment/package-release.mjs /absolute/new-output-directory
```

In the output directory run `npm ci`, `npm test`, and `npm run check`. Packaging rejects dirty/mismatched runtime files, unpinned source SHAs, incomplete manifests and output larger than 100 MiB. Do not run the storage sync until the intended Cloudflare account is authenticated. Production rollback uses an earlier production branch commit and its retained immutable image keys; do not delete historical R2 objects.
