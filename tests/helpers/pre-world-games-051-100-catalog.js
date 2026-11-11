// Historical symbol audits retain the exact catalog membership they reviewed.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {catalog as currentCatalog} from './world-games-shenron-history.js';
const ids=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-world-games-051-100/baseline-card-ids.json',import.meta.url),'utf8'));
const byId=new Map(currentCatalog.map(c=>[c.id,c]));
assert.equal(new Set(ids).size,ids.length);
export const catalog=ids.map(id=>{assert.ok(byId.has(id),`Missing historical card: ${id}`);return byId.get(id);});
