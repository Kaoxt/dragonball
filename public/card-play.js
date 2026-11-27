import { isHiTechPersonality } from './decks/eligibility.js';
import { catalog } from './cards/catalog.js';
import { saiyanPlayRules } from './cards/saiyan-play-rules.js';

const byId = new Map(catalog.map(card => [card.id, card]));
const persistent = {Setup:'noncombat', 'Non-Combat':'noncombat', Drill:'drills', 'Non-Combat Drill':'drills',
  'Dragon Ball':'dragonballs', Location:'location', Battleground:'location', 'Main Personality':'allies', Personality:'allies'};

// Routing only: costs, damage, timing and conditional effects stay under player control.
// Use current catalog data, including for older saved decks, rather than trusting an imported type.
export function cardPlayPlan(card) {
  const current = byId.get(card?.id);
  if (!current || current.banned || current.status === 'Banned' || isHiTechPersonality(current)) return null;
  const rules = current.rules || saiyanPlayRules[current.id] || '';
  const afterUse = /(?:^|[.!?]\s*)Banish after use\.(?:\s|$)/i.test(rules) ? 'removed' : 'discard';
  // Do not throw away repeat-use attacks, attachments, or cards with a conditional destination.
  const stays = /(?:this (?:card|attack)|this|it) (?:stays|remains) in play|keep in play|(?:^|[.!?]\s*)Remains in play|\battach (?:this|to)\b/i.test(rules);
  const conditional = /banish after use/i.test(rules) && afterUse !== 'removed';
  const returns = /(?:shuffle|return|place|put) (?:this(?: card)?|it)\b[^.!?]*\b(?:hand|life deck)\b|\b(?:shuffled|returned|placed) (?:into|in|to|on|at)\b[^.!?]*\b(?:hand|life deck)\b[^.!?]*after use\b/i.test(rules);
  if (persistent[current.type]) return {to:persistent[current.type], afterUse, resolve:!stays && !conditional && !returns, label:'Put into play'};
  if (!['Physical Combat','Energy Combat','Event','Combat'].includes(current.type)) return null;
  return {resolve:!conditional && !returns, to:stays || conditional || returns ? 'combat' : afterUse, afterUse, label:'Play card',
    ...(stays || conditional || returns ? {note:'This card has a repeat use, attachment, or destination condition. Keep it in play until resolved; use Move to for exceptions.'} : {})};
}
