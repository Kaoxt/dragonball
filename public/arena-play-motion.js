let initialized = false, lastVersion = -1, currentGame, active = null;
const queue = [];
const $ = id => document.getElementById(id);
const areas = {discard:'Discard pile', removed:'Banished pile', noncombat:'Setups', drills:'Drills', allies:'Allies', dragonballs:'Dragon Balls', location:'Battleground / Location', combat:'Combat cards'};
const cardNode = (owner, zone, uid) => document.querySelector(`[data-card="${CSS.escape(`${owner}:${zone}:${uid}`)}"]`);
const visible = r => r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const cardsAt = play => currentGame?.players[play.owner]?.zones[play.to];
const stillPublic = motion => cardsAt(motion.play)?.some(c => c.uid === motion.play.uid && !c.faceDown);
const destinationFor = play => cardNode(play.owner, play.to, play.uid) || document.querySelector(`[data-owner="${play.owner}"][data-zone="${play.to}"] .pile-cover`);

// The server commits once. This small client-only queue presents confirmed public plays
// to both seats without timers, extra messages or animation work on the server.
export function capturePlayMotion(game, seat, imageFor = card => card.image) {
  currentGame = game;
  const play = game.lastPlay;
  if (!initialized) { initialized = true; lastVersion = game.version ?? play?.version ?? -1; return null; }
  if (document.hidden || game.status !== 'playing') { clearVisuals(); lastVersion = game.version; return null; }
  if (active && !stillPublic(active.motion)) finish(active);
  if (!play || play.version <= lastVersion) return null;
  lastVersion = play.version;
  const card = cardsAt(play)?.find(c => c.uid === play.uid);
  if (!areas[play.to] || !card?.name || card.faceDown) return null;
  return {play:{...play}, name:card.name, image:imageFor(card), player:game.players[play.owner].name, mine:play.owner === seat};
}

function syncDestinations() {
  document.querySelectorAll('.arena-play-pending').forEach(node => node.classList.remove('arena-play-pending'));
  for (const motion of [...(active ? [active.motion] : []), ...queue]) {
    const {play} = motion, card = cardNode(play.owner, play.to, play.uid);
    // A pile can already have another card on top while this reveal is queued.
    if (card || cardsAt(play)?.at(-1)?.uid === play.uid) destinationFor(play)?.classList.add('arena-play-pending');
  }
}
function finish(state) {
  if (active !== state) return;
  active = null;
  clearTimeout(state.timer); clearTimeout(state.fallback);
  state.animation?.cancel(); state.ghost?.remove();
  const image = $('arena-play-reveal-image');
  image.onload = image.onerror = null;
  $('arena-play-reveal').hidePopover?.();
  $('arena-play-reveal').hidden = true;
  syncDestinations();
  showNext();
}
function clearVisuals() {
  queue.length = 0;
  if (active) finish(active);
  syncDestinations();
}
export function resetPlayMotion() {
  clearVisuals(); initialized = false; lastVersion = -1; currentGame = null;
}

function flyToDestination(state) {
  if (active !== state) return;
  if (document.hidden || reduced()) { finish(state); return; }
  const image = $('arena-play-reveal-image'), start = image.getBoundingClientRect();
  const destination = destinationFor(state.motion.play);
  if (!destination || !image.naturalWidth || !image.animate) { finish(state); return; }
  // Keep the reveal centered even when the player is scrolled down to their hand.
  // Only after the reading pause, bring the receiving pile/area into view.
  if (!visible(destination.getBoundingClientRect())) destination.scrollIntoView({block:'center',behavior:'instant'});
  const end = destination.getBoundingClientRect();
  if (!visible(end)) { finish(state); return; }
  const ghost = image.cloneNode(false);
  ghost.className = 'arena-play-ghost'; ghost.alt = ''; ghost.setAttribute('aria-hidden','true');
  Object.assign(ghost.style,{left:`${start.left}px`,top:`${start.top}px`,width:`${start.width}px`,height:`${start.height}px`});
  $('arena-play-reveal').append(ghost); state.ghost = ghost;
  $('arena-play-reveal').classList.add('is-flying');
  const animation = ghost.animate([
    {transform:'translate(0,0) scale(1)',opacity:1},
    {transform:`translate(${end.left-start.left}px,${end.top-start.top}px) scale(${end.width/start.width},${end.height/start.height})`,opacity:1}
  ],{duration:380,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
  state.animation = animation;
  animation.onfinish = animation.oncancel = () => finish(state);
  state.fallback = setTimeout(() => finish(state), 550);
}
function showNext() {
  if (active || document.hidden) return;
  let motion;
  while ((motion = queue.shift()) && !stillPublic(motion)) { /* Skip undone or privately moved cards. */ }
  if (!motion) { syncDestinations(); return; }
  const state = active = {motion};
  const overlay = $('arena-play-reveal'), panel = $('arena-play-reveal-panel'), image = $('arena-play-reveal-image');
  $('arena-play-reveal-player').textContent = `${motion.mine ? 'You' : motion.player} ${motion.play.from === 'hand' ? 'played' : 'used'}`;
  $('arena-play-reveal-name').textContent = motion.name;
  $('arena-play-reveal-destination').textContent = `Next: ${areas[motion.play.to]}`;
  image.hidden = !motion.image;
  const hold = () => {
    if (active !== state || state.holding) return;
    state.holding = true; clearTimeout(state.timer);
    state.timer = setTimeout(() => flyToDestination(state), 2200);
  };
  image.onload = hold;
  image.onerror = () => { image.hidden = true; hold(); };
  if (motion.image) image.src = motion.image;
  else image.removeAttribute('src');
  overlay.hidden = false;
  overlay.classList.remove('is-flying');
  overlay.showPopover?.();
  if (!reduced() && panel.animate) state.animation = panel.animate([
    {transform:'scale(.88)',opacity:0}, {transform:'scale(1)',opacity:1}
  ],{duration:180,easing:'ease-out'});
  if (!motion.image || image.complete) hold();
  else state.timer = setTimeout(hold, 1500);
  syncDestinations();
}
export function animatePlayMotion(motion) {
  if (motion) queue.push(motion);
  syncDestinations(); showNext();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) clearVisuals(); });
