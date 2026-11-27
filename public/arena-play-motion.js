let initialized = false, lastVersion = null, active = null;
const cardNode = (owner, zone, uid) => document.querySelector(`[data-card="${CSS.escape(`${owner}:${zone}:${uid}`)}"]`);
const visible = rect => rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;

// One visual per committed play. No render loop, polling, canvas or extra animation assets.
export function capturePlayMotion(game, seat) {
  const play = game.lastPlay;
  if (!initialized) { initialized = true; lastVersion = play?.version; return null; }
  if (!play) { lastVersion = null; return null; }
  if (play.version === lastVersion) return null;
  lastVersion = play.version;
  active?.cancel(); active = null;
  if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate) return null;
  const source = cardNode(play.owner, play.from, play.uid);
  const field = document.querySelector(`[data-table="${play.owner}"]`);
  const area = field?.getBoundingClientRect();
  const start = source?.getBoundingClientRect() || (area && {left:area.left+area.width/2-35,top:area.top,width:70,height:98,right:area.left+area.width/2+35,bottom:area.top+98});
  return {play, start:visible(start) ? start : null, mine:play.owner === seat};
}

export function animatePlayMotion(motion) {
  if (!motion) return;
  const {play, mine} = motion;
  const destination = cardNode(play.owner, play.to, play.uid) || document.querySelector(`[data-owner="${play.owner}"][data-zone="${play.to}"] .pile-cover`);
  const image = destination?.querySelector('img');
  if (!destination || !image) return;
  if (mine && !visible(destination.getBoundingClientRect())) destination.scrollIntoView({block:'nearest',behavior:'instant'});
  const end = destination.getBoundingClientRect();
  if (!visible(end)) return;
  const start = motion.start || {left:end.left,top:end.top-24,width:end.width,height:end.height};
  const ghost = image.cloneNode(false);
  ghost.className = 'arena-play-ghost'; ghost.alt = ''; ghost.setAttribute('aria-hidden','true'); ghost.removeAttribute('loading');
  Object.assign(ghost.style,{left:`${end.left}px`,top:`${end.top}px`,width:`${end.width}px`,height:`${end.height}px`});
  document.body.append(ghost);
  const animation = ghost.animate([
    {transform:`translate(${start.left-end.left}px,${start.top-end.top}px) scale(${Math.min(2,start.width/end.width)},${Math.min(2,start.height/end.height)})`,opacity:.85},
    {transform:'translate(0,0) scale(1)',opacity:1}
  ],{duration:260,easing:'ease-out'});
  active = animation;
  const cleanup = () => { ghost.remove(); if (active === animation) active = null; };
  animation.onfinish = cleanup; animation.oncancel = cleanup;
}
