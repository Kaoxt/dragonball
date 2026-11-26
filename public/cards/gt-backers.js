import {catalog} from './catalog.js';
import {isPersonality} from './card-types.js';

export const GT_RENDERER_VERSION = 'v3-gt-1';
const key = value => String(value || '').trim().toLowerCase();
const integer = value => Number.isSafeInteger(value) && value >= 0 && value <= 999999999;
const asset = value => typeof value === 'string' && /^\/assets\/cards\/(?:downloads\/)?[a-z0-9-]+\.webp(?:\?v=[a-z0-9-]+)?$/i.test(value);
const fail = message => { throw new Error(message); };

// Only canonical catalog metadata is trusted. Saved decks carry IDs, never mechanics
// or vector fragments. The empty initial GT catalog deliberately enables no demo cards.
export function createBackerSystem(cards) {
  const byId = new Map(cards.map(card => [card.id, card]));
  const current = card => byId.get(typeof card === 'string' ? card : card?.id);
  const isHiTech = card => !!current(card)?.gtHiTech;
  const needsBacker = deck => (deck?.personalities || []).some(isHiTech);
  function eligible(card, backer, tokui) {
    const hi = current(card), backing = current(backer), h = hi?.gtHiTech, b = backing?.gtBacker;
    if (!h?.verified || !b?.verified || hi.banned || backing.banned || !isPersonality(hi)) return false;
    if (!h.character || !Array.isArray(b.characters) || typeof b.style !== 'string') return false;
    // Named and styled requirements are cumulative; neither is an alternative.
    if (!b.characters.length && !b.style) return false;
    if (b.characters.length && !b.characters.map(key).includes(key(h.character))) return false;
    if (b.style && key(b.style) !== key(tokui)) return false;
    return true;
  }
  function resolve(card, backer, tokui = '') {
    const hi = current(card), backing = current(backer);
    if (!eligible(hi, backing, tokui)) fail('Choose a verified Backer that matches your Main Personality and Tokui-Waza.');
    const h = hi.gtHiTech, b = backing.gtBacker, inherit = h.inherit;
    if (!h.revision || !b.revision || !Array.isArray(h.stages) || h.stages.length < 7 || h.stages.length > 21 ||
        !inherit || typeof inherit.pur !== 'boolean' || typeof inherit.power !== 'boolean' || !Array.isArray(inherit.stages) ||
        new Set(inherit.stages).size !== inherit.stages.length || inherit.stages.some(i => !Number.isInteger(i) || i < 0 || i >= 6) ||
        !Array.isArray(b.stages) || b.stages.length !== 6 || !b.stages.every(integer)) fail('This GT card is awaiting verified backer data.');
    const slots = new Set(inherit.stages);
    const stages = h.stages.map((value, index) => {
      if (slots.has(index)) {
        if (value !== null) fail('A backer cannot overwrite a printed power stage.');
        return b.stages[index];
      }
      if (!integer(value)) fail('A fixed power stage is missing.');
      return value;
    });
    // Slot order is physical; never sort or repack blank rows. Zero is a value.
    if (stages.at(-1) !== 0) fail('The GT power-stage chart must end at zero.');
    const pur = inherit.pur ? b.pur : hi.pur;
    const power = inherit.power ? b.power : h.power;
    if (!(pur === 'X' || Number.isInteger(pur) && pur >= 0 && pur <= 20) || !power || typeof power.rules !== 'string') fail('This GT card is awaiting verified PUR or power text.');
    if (!asset(hi.image) || !asset(hi.downloadImage) || !h.render || !b.native ||
        inherit.pur && !b.native.pur || inherit.power && !b.native.power ||
        inherit.stages.some(i => !b.native.stages?.[i])) fail('This GT card is awaiting its approved native image components.');
    if (inherit.pur && b.native.pur.text !== String(b.pur) || inherit.power && b.native.power.text !== b.power.rules ||
        inherit.stages.some(i => b.native.stages[i].text !== b.stages[i].toLocaleString('en-US'))) fail('The native Backer artwork does not match its verified values.');
    return {card:hi, backer:backing, pur, power:structuredClone(power), stages,
      powerLevels:[...stages].reverse(), inherit, render:h.render, native:b.native};
  }
  function choices(deck) {
    const stack = (deck?.personalities || []).filter(isHiTech);
    if (!stack.length) return [];
    return cards.filter(backer => backer.gtBacker && stack.every(hi => {
      try { resolve(hi, backer, deck.tokui); return true; } catch { return false; }
    }));
  }
  function validateDeck(deck, {required = false} = {}) {
    const stack = (deck?.personalities || []).filter(isHiTech);
    if (!stack.length) {
      if (deck?.backer) fail('A Backer selection requires a GT Hi-Tech in your Main Personality stack.');
      return null;
    }
    if (!deck.backer) {
      if (required) fail('Select one Backer for your GT Hi-Tech Main Personality stack before playing.');
      return null;
    }
    if (Array.isArray(deck.backer) || typeof deck.backer !== 'object' || typeof deck.backer.id !== 'string') fail('Select exactly one Backer for the Main Personality stack.');
    for (const hi of stack) resolve(hi, deck.backer, deck.tokui);
    return current(deck.backer);
  }
  function imageURL(card, backer, tokui = '', download = false) {
    const resolved = resolve(card, backer, tokui);
    const query = new URLSearchParams({hiTech:resolved.card.id,backer:resolved.backer.id,tokui,
      v:[GT_RENDERER_VERSION,resolved.card.gtHiTech.revision,resolved.backer.gtBacker.revision].join('.'),
      size:download?'download':'display'});
    return '/api/cards/gt-composite?' + query;
  }
  function preview(card, deck) {
    if (!isHiTech(card)) return current(card) || card;
    if (!deck?.backer) return current(card);
    const resolved = resolve(card, deck.backer, deck.tokui);
    return {...resolved.card, image:imageURL(card, deck.backer, deck.tokui), downloadImage:imageURL(card, deck.backer, deck.tokui, true),
      pur:resolved.pur,rules:resolved.power.rules,backerId:resolved.backer.id};
  }
  return {current,isHiTech,needsBacker,eligible,resolve,choices,validateDeck,imageURL,preview};
}
export const gtBackers = createBackerSystem(catalog);
