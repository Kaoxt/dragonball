import {catalog} from './cards/catalog.js';
import {createUltraRareFoil} from './ultra-rare-foil.js?v=20261103';
import {ultraRareMask} from './ultra-rare-profiles.js?v=20261106-title-width';

// Resolve the actual catalog image, including legacy saved-deck URLs. Never
// infer a finish from an opponent's hidden card, a name, or an external image.
export function isHiTech(card) {
  return /hi[\s-]?tech/i.test(card?.rarity || '') || /(?:^|-)ht(?:-|$)/i.test(card?.id || '');
}
export function isUltraRare(card) {
  return /^ultra[\s-]+rare$/i.test(card?.rarity?.trim() || '');
}
const finishImages = new Map(catalog.filter(card => isHiTech(card) || isUltraRare(card)).flatMap(card => [card.image, card.downloadImage].filter(Boolean).map(source => [source.split('?')[0], card])));
export function finishForImage(source, origin = 'https://dragonballocg.com') {
  if (!source) return null;
  try {
    const url = new URL(source, origin);
    if (url.origin !== new URL(origin).origin) return null;
    return finishImages.get(url.pathname.replace(/\.jpg$/, '.webp')) || null;
  } catch { return null; }
}

// The approved reference has circular corners at 5% of the short edge.
// The 1.1% stock depth is slightly thinner than the 1.5% preview.
export function cardGeometry(width, height, displayedWidth) {
  const short = Math.min(width, height);
  return {radiusX: 5 * short / width, radiusY: 5 * short / height,
    depth: Math.max(0, displayedWidth) * short / width * .011};
}

export function setupCardSurface(image) {
  const doc = image.ownerDocument || document;
  const element = doc.createElement('div'); element.className = 'card-object';
  // Gecko's masked, blended foil layers are expensive on Android. Keep its
  // engraving stationary and move a prepainted reflection instead of repainting
  // five gradients/masks on every frame. Chromium keeps the original finish.
  const lightweight = globalThis.CSS?.supports?.('-moz-appearance', 'none') || false;
  element.dataset.foilRenderer = lightweight ? 'lightweight' : 'full';
  const face = doc.createElement('div'); face.className = 'card-face';
  image.replaceWith(element);
  // Closely spaced planes form a thin gray card stock edge under the face.
  for (let i = 12; i >= 1; i--) {
    const edge = doc.createElement('span'); edge.className = `card-stock card-stock-${i}`;
    edge.style.setProperty('--stock-step', String(i / 12));
    edge.setAttribute('aria-hidden', 'true'); element.append(edge);
  }
  element.append(face); face.append(image);
  const effects = doc.createElement('div'); effects.className = 'card-finish'; effects.setAttribute('aria-hidden', 'true');
  for (const name of lightweight ? ['texture', 'reflection'] : ['tonal', 'color', 'etch', 'grain', 'sheen']) {
    const layer = doc.createElement('span'); layer.className = `card-finish-${name}`; effects.append(layer);
  }
  let reflection;
  if (lightweight) {
    reflection = doc.createElement('span'); reflection.className = 'card-reflection-light';
    effects.children[1].append(reflection);
  }
  face.append(effects);
  let lastX, lastY, ultraFoil, ultraRare = false, selectedFinish = 'foil';
  function reflect(x = 0, y = 0) {
    if (ultraRare) {ultraFoil?.reflect(x, y);return;}
    if (effects.hidden || (x === lastX && y === lastY)) return;
    lastX = x; lastY = y;
    if (lightweight) {
      // Only a transform changes: no inherited variables, moving SVG masks,
      // background-position changes, or layout reads in the Firefox foil path.
      reflection.style.transform = `translate3d(${x * 22}%, ${y * 14}%, 0)`;
      return;
    }
    const u = (x + 1) / 2, v = (y + 1) / 2;
    for (const [key, value] of Object.entries({
      'light-x':u*100, 'light-y':v*100, 'spectrum-x':100-u*100,
      'spectrum-y':85-v*70, 'etch-x':110-u*120, 'etch-y':20+v*60
    })) element.style.setProperty(`--${key}`, `${value}%`);
  }
  let naturalWidth = 1060, naturalHeight = 1484;
  function resize(width = element.offsetWidth) {
    const geometry = cardGeometry(naturalWidth, naturalHeight, width);
    element.style.setProperty('--card-radius-x', `${geometry.radiusX}%`);
    element.style.setProperty('--card-radius-y', `${geometry.radiusY}%`);
    element.style.setProperty('--card-depth', `${geometry.depth}px`);
  }
  // Resize only when layout changes; dragging keeps the existing transform-only path.
  const observer = globalThis.ResizeObserver && new ResizeObserver(entries => {
    const entry = entries.find(entry => entry.target === element);
    if (entry) resize(entry.contentRect.width);
  });
  observer?.observe(element);
  function refresh() {
    const source = image.getAttribute('src');
    const card = finishForImage(source, globalThis.location?.origin || 'https://dragonballocg.com');
    const foiled = Boolean(card) && selectedFinish === 'foil';
    ultraRare = foiled && isUltraRare(card);
    element.dataset.finish = ultraRare ? 'ultra-rare' : foiled ? 'hi-tech' : 'standard';
    element.dataset.foilMask = card?.id === 'trunks-195-vegeta' ? 'vegeta' : 'personality';
    effects.hidden = !foiled;
    if (ultraRare) {
      element.style.setProperty('--ultra-mask', `url("${ultraRareMask(card)}")`);
      ultraFoil ||= createUltraRareFoil(image, effects);
      ultraFoil.refresh(card);
    } else {
      ultraFoil?.clear();
      element.style.removeProperty('--ultra-mask');
    }
    element.hidden = !source;
    const width = image.naturalWidth || card?.width || 1060, height = image.naturalHeight || card?.height || 1484;
    element.style.setProperty('--card-ratio', String(width / height));
    naturalWidth = width; naturalHeight = height; resize();
    lastX = lastY = undefined;
    reflect();
  }
  refresh();
  image.addEventListener('load', refresh);
  image.addEventListener('error', () => {element.hidden = true;ultraFoil?.clear();});
  function setFinish(value) {
    if (!['foil', 'regular'].includes(value) || value === selectedFinish) return;
    selectedFinish = value;
    refresh();
  }
  return {element, effects, reflect, refresh, setFinish};
}
