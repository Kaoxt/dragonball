// Freeze earlier audits at their reviewed membership. The new release has its
// own tests against the actual current catalog and permanent code positions.
import fs from 'node:fs';
import {catalog as currentCatalog} from './world-games-hi-tech-history.js';
import {codeCardIds as currentCodeIds} from './pre-cell-games-101-125.js';
const release=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-cell-191-200/release.json',import.meta.url),'utf8'));
const added=new Set(release.card_ids);
export const catalog=currentCatalog.filter(c=>!added.has(c.id));
export const codeCardIds=currentCodeIds.filter(id=>!added.has(id));
