// Freeze earlier audits at their reviewed membership. The new release has its
// own tests against the actual current catalog and permanent code positions.
import fs from 'node:fs';
import {catalog as currentCatalog} from '../../public/cards/catalog.js';
import {codeCardIds as currentCodeIds} from '../../public/decks/code-card-ids.js';
const release=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-cell-191-200/release.json',import.meta.url),'utf8'));
const added=new Set(release.card_ids);
export const catalog=currentCatalog.filter(c=>!added.has(c.id));
export const codeCardIds=currentCodeIds.filter(id=>!added.has(id));
