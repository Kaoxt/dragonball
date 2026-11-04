import { readFile } from 'node:fs/promises';
import { catalog } from '../../public/cards/catalog.js';
import { validateManifest } from './sync-card-assets.mjs';

const root = new URL('../../', import.meta.url);
const manifest = validateManifest(JSON.parse(await readFile(new URL('deployment/card-assets.json', root))));
const runtime = JSON.parse(await readFile(new URL('src/card-assets-manifest.json', root)));
if (JSON.stringify(runtime) !== JSON.stringify(manifest.assets)) throw new Error('Runtime and upload manifests differ');
for (const card of catalog) {
  for (const value of [card.image, card.downloadImage].filter(Boolean)) {
    const path = new URL(value, 'https://dragonballocg.com').pathname;
    if (!Object.hasOwn(manifest.assets, path)) throw new Error(`Missing release image: ${card.id} ${path}`);
  }
}
const config = JSON.parse(await readFile(new URL('wrangler.jsonc', root)));
if (!config.assets.run_worker_first.includes('/assets/cards/*') ||
    !config.r2_buckets.some(b => b.binding === 'CARD_ASSETS' && b.bucket_name === 'dragonball-card-assets')) {
  throw new Error('Card storage route or binding is missing');
}
console.log(`Release verified: ${catalog.length} cards, ${Object.keys(manifest.assets).length} original image files, source ${manifest.sourceCommit}.`);
