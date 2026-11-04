import fs from 'node:fs';
import assert from 'node:assert/strict';
export const cellGamesLogoRelease=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-cell-games-logo/release.json',import.meta.url),'utf8'));
const revisions=new Map(cellGamesLogoRelease.cards.flatMap(r=>[r.source,...r.exports]).map(r=>[r.path,r]));
export function currentCellGamesHash(path,historicalHash){
 const revision=revisions.get(path);
 assert.ok(revision,`Missing Cell Games logo revision for ${path}`);
 assert.equal(revision.before_sha256,historicalHash,`Broken historical revision chain for ${path}`);
 return revision.after_sha256;
}
