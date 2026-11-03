// Approved brushed, reflective Ultra Rare material. All source artwork remains
// unchanged; only the enlarged viewer receives this live lighting layer.
const width = 530, height = 742, count = width * height;
const smooth = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp = value => Math.max(0, Math.min(255, value));

export function createUltraRareFoil(image, effects) {
  const doc = image.ownerDocument;
  const canvas = doc.createElement('canvas');
  canvas.className = 'card-finish-ultra-rare';
  canvas.width = width; canvas.height = height; canvas.hidden = true;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return {refresh() {}, reflect() {}, clear() {}};
  effects.append(canvas);
  const frame = ctx.createImageData(width, height);
  const red = new Float32Array(count), green = new Float32Array(count), blue = new Float32Array(count);
  const energy = new Float32Array(count), field = new Float32Array(count), grain = new Float32Array(count);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / width, v = y / height;
    field[y * width + x] = (u - .46) * 1.5 + .22 * Math.sin(v * 7 + u * 3)
      + ((v - .4) * .65 + .13 * Math.sin(u * 8 - v * 2)) * .55;
  }
  let sourceKey = '', generation = 0, ready = false, pending = 0;
  let currentX = 0, currentY = 0, lastX, lastY, lastDraw = -Infinity;
  let source;
  function sample(bitmap) {
    const buffer = doc.createElement('canvas'); buffer.width = width; buffer.height = height;
    const painter = buffer.getContext('2d', {willReadFrequently: true});
    painter.drawImage(bitmap, 0, 0, width, height);
    return painter.getImageData(0, 0, width, height).data;
  }
  function clear() {
    generation++; ready = false; sourceKey = ''; canvas.hidden = true;
    if (pending) cancelAnimationFrame(pending);
    pending = 0; currentX = currentY = 0; lastX = lastY = undefined;
    if (source) source.onload = source.onerror = null;
    source = null;
  }
  function draw(force = false) {
    if (!ready || effects.hidden) return;
    const x = currentX, y = currentY;
    if (!force && x === lastX && y === lastY) return;
    const out = frame.data;
    for (let p = 0; p < count; p++) {
      const brush = grain[p] * 1.8;
      // Keep the continuous reflection; never curl it around aura boundaries.
      const coordinate = field[p] + x * 1.38 - y * .92 + brush * .04;
      const distance = (coordinate - .12) / .28;
      const key = 1 / (1 + distance * distance * distance * distance);
      const rimDistance = (coordinate + .75) / .13;
      const rim = 1 / (1 + rimDistance * rimDistance * rimDistance * rimDistance);
      const e = energy[p];
      const shade = .54 + key * (.67 + e * .14) + rim * .16
        + brush * (.045 + key * .15 + rim * .08);
      const peak = key * key * key * key;
      const catchLight = (peak * .23 + rim * .085) * (1 + brush * .7);
      const i = p * 4;
      out[i] = clamp(red[p] * shade + (195 + e * 60) * catchLight);
      out[i + 1] = clamp(green[p] * shade + (207 + e * 35) * catchLight);
      out[i + 2] = clamp(blue[p] * shade + (221 - e * 49) * catchLight);
    }
    ctx.putImageData(frame, 0, 0); canvas.hidden = false;
    lastX = x; lastY = y; lastDraw = performance.now();
  }
  function tick(time) {
    pending = 0;
    if (!ready || effects.hidden || doc.hidden) return;
    if (time - lastDraw < 32) { pending = requestAnimationFrame(tick); return; }
    draw();
  }
  function reflect(x = 0, y = 0) {
    currentX = x; currentY = y;
    if (!ready || effects.hidden || doc.hidden) return;
    if (x === 0 && y === 0) {
      if (pending) cancelAnimationFrame(pending);
      pending = 0; draw(); return;
    }
    if (!pending && (x !== lastX || y !== lastY)) pending = requestAnimationFrame(tick);
  }
  function refresh(card) {
    if (!card) {clear();return;}
    if (sourceKey === card.image) return;
    clear(); sourceKey = card.image;
    const token = generation;
    const personality = /personality/i.test(card.type || '');
    const goku = card.id === 'frieza-125-super-saiyan-goku';
    source = new Image();
    source.onload = () => {
      if (token !== generation) return;
      try {
        const pixels = sample(source), raw = new Float32Array(count);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const p = y * width + x, i = p * 4;
          const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
          const luma = r * .2126 + g * .7152 + b * .0722;
          const artwork = x >= 8 && x < (personality ? 406 : 522) && y >= 74 && y < 425;
          const saturation = artwork ? 1.22 : 1.12;
          red[p] = clamp(((luma + (r - luma) * saturation - 128) * 1.06 + 128) * 1.02);
          green[p] = clamp(((luma + (g - luma) * saturation - 128) * 1.06 + 128) * 1.02);
          blue[p] = clamp(((luma + (b - luma) * saturation - 128) * 1.06 + 128) * 1.02);
          const neutral = 1 - smooth(15, 55, Math.max(r, g, b) - Math.min(r, g, b));
          const whiteInk = artwork ? 0 : smooth(150, 225, Math.min(r, g, b)) * neutral;
          frame.data[i + 3] = Math.round(255 * (1 - whiteInk));
          if (artwork) {
            const leftEdge = 178 - (y - 74) * .15;
            const local = goku ? smooth(leftEdge - 23, leftEdge + 15, x) * (1 - smooth(375, 406, x)) : 1;
            raw[p] = smooth(12, 85, Math.min(r, g) - b) * smooth(125, 215, r)
              * (1 - smooth(70, 135, Math.abs(r - g))) * local;
          }
        }
        energy.fill(0);
        for (let y = 2; y < height - 2; y++) for (let x = 2; x < width - 2; x++) {
          let total = 0;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) total += raw[(y + dy) * width + x + dx];
          energy[y * width + x] = total / 25;
        }
        ready = true; draw(true);
      } catch {clear();} // A failed/tainted image never obscures the original card.
    };
    source.onerror = () => {if (token === generation) clear();};
    source.src = card.image;
  }
  const texture = new Image();
  texture.onload = () => {
    try {
      const pixels = sample(texture);
      for (let p = 0; p < count; p++) grain[p] = pixels[p * 4] / 255 - .4;
      draw(true);
    } catch { /* Smooth foil is a safe fallback if the texture cannot load. */ }
  };
  texture.src = '/card-effects/ultra-rare/brushed-foil.webp';
  return {refresh, reflect, clear};
}
