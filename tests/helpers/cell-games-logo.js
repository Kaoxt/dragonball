import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const cellGamesLogoRelease=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-cell-games-logo/release.json',import.meta.url),'utf8'));
export const cellGamesGokuCorrection=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/cell-games-030-goku/release.json',import.meta.url),'utf8'));
const revisions=new Map(cellGamesLogoRelease.cards.flatMap(r=>[r.source,...r.exports]).map(r=>[r.path,r]));
const artworkRevisions=new Map([cellGamesGokuCorrection.source,...cellGamesGokuCorrection.exports].map(r=>[r.path,r]));
export function afterCellGamesLogoHash(path,logoHash){
 const revision=artworkRevisions.get(path);
 if(!revision)return logoHash;
 assert.equal(revision.before_sha256,logoHash,`Broken Cell Games artwork revision chain for ${path}`);
 return revision.after_sha256;
}
export function sourceBeforeCellGamesArtwork(path,source){
 const revision=artworkRevisions.get(path);
 if(!revision)return source;
 assert.equal(path,cellGamesGokuCorrection.source.path);
 const insert=fs.readFileSync(new URL('../../'+cellGamesGokuCorrection.native_insert_path,import.meta.url),'utf8');
 assert.equal(source.split(insert).length,2,'Expected exactly one retained Goku correction');
 const original=source.replace(insert,'');
 assert.equal(createHash('sha256').update(original).digest('hex'),revision.before_sha256);
 return original;
}
export function currentCellGamesHash(path,historicalHash){
 const revision=revisions.get(path);
 assert.ok(revision,`Missing Cell Games logo revision for ${path}`);
 assert.equal(revision.before_sha256,historicalHash,`Broken historical revision chain for ${path}`);
 return afterCellGamesLogoHash(path,revision.after_sha256);
}
