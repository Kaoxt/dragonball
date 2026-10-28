import {setupCardSurface} from './card-surface.js?v=20261028-hi-tech-edge';

// Shared physical-card interaction for enlarged previews only.
export function setupCardMotion(stage) {
  const image = stage.querySelector('img');
  if (!image || stage.dataset.motionReady) return;
  stage.dataset.motionReady = 'true';
  image.draggable = false;
  const surface = setupCardSurface(image);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pointerId = null, frame = 0, x = 0, y = 0;
  const clamp = value => Math.max(-1, Math.min(1, value));

  function render() {
    frame = 0;
    const angle = reducedMotion.matches ? 4 : 30;
    const travel = reducedMotion.matches ? 0 : pointerId === null ? 6 : 14;
    const roll = reducedMotion.matches ? 0 : -x * y * 4;
    surface.element.style.transform = `translate3d(${x * travel}px, ${y * travel}px, 0) rotateX(${-y * angle}deg) rotateY(${x * angle}deg) rotateZ(${roll}deg)`;
    surface.reflect(x, y);
  }
  function update() {
    stage.classList.add('is-interacting');
    if (!frame) frame = requestAnimationFrame(render);
  }
  function reset() {
    // Clear capture before releasing it: lostpointercapture may fire immediately.
    const released = pointerId;
    pointerId = null;
    if (released !== null && stage.hasPointerCapture(released)) stage.releasePointerCapture(released);
    if (frame) cancelAnimationFrame(frame);
    frame = 0; x = 0; y = 0;
    stage.classList.remove('is-interacting');
    surface.element.style.removeProperty('transform');
    surface.reflect();
  }
  function point(event) {
    // Measure the fixed stage, never the transformed image. This prevents jitter
    // and keeps the same tilt when the pointer stops moving.
    const rect = stage.getBoundingClientRect();
    if (!image.offsetWidth || !image.offsetHeight) return;
    x = clamp((event.clientX - rect.left - rect.width / 2) / (image.offsetWidth / 2));
    y = clamp((event.clientY - rect.top - rect.height / 2) / (image.offsetHeight / 2));
    update();
  }
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    stage.setPointerCapture(pointerId);
    stage.focus({preventScroll: true});
    point(event);
  });
  stage.addEventListener('pointermove', event => {
    if (!event.isPrimary) return;
    if (pointerId !== null) {
      if (event.pointerId !== pointerId) return;
    } else if (event.pointerType !== 'mouse' || event.buttons || reducedMotion.matches) return;
    point(event);
  });
  stage.addEventListener('pointerleave', () => { if (pointerId === null) reset(); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stage.addEventListener(type, event => { if (event.pointerId === pointerId) reset(); });
  }
  // Firefox Android also needs native touch panning cancelled in this region.
  // Listeners stay on the card stage so the rest of the dialog scrolls normally.
  for (const type of ['touchstart', 'touchmove']) {
    stage.addEventListener(type, event => { if (event.cancelable) event.preventDefault(); }, {passive: false});
  }
  stage.addEventListener('dragstart', event => event.preventDefault());
  stage.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (['Home', 'Enter', ' '].includes(event.key)) { event.preventDefault(); reset(); return; }
    const directions = {ArrowLeft: [-.2, 0], ArrowRight: [.2, 0], ArrowUp: [0, -.2], ArrowDown: [0, .2]};
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    x = clamp(x + direction[0]); y = clamp(y + direction[1]); update();
  });
  stage.addEventListener('blur', reset);
  window.addEventListener('blur', reset);
  window.addEventListener('pagehide', reset);
  window.addEventListener('resize', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  reducedMotion.addEventListener('change', reset);
  const dialog = stage.closest('dialog');
  dialog?.addEventListener('close', reset);
  dialog?.addEventListener('cancel', reset);
  // A new image or a reopened dialog always starts flat, including cached images.
  image.addEventListener('load', reset);
  image.addEventListener('error', reset);
  const observer = new MutationObserver(() => {surface.refresh();reset();});
  observer.observe(image, {attributes: true, attributeFilter: ['src']});
  if (dialog) observer.observe(dialog, {attributes: true, attributeFilter: ['open']});
  return {reset, surface};
}

if (typeof document !== 'undefined') document.querySelectorAll('[data-card-motion]').forEach(setupCardMotion);
