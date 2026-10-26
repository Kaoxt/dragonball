// Enhance the static illustrated guide; every card remains readable without JavaScript.
const cardGroups = [...document.querySelectorAll('[data-card-group]')].map(root => ({
  tabs: [...root.querySelectorAll('[data-card-tab]')],
  panels: [...root.querySelectorAll('[data-card-panel]')],
  tabList: root.querySelector('.card-type-tabs')
}));
const cardPanels = cardGroups.flatMap(group => group.panels);
const browseChapters = document.querySelector('#browse-chapters');
function selectCardPanel(panelId, focusTab = false) {
  const group = cardGroups.find(group => group.panels.some(panel => panel.id === panelId));
  if (!group) return;
  group.tabs.forEach(tab => {
    const selected = tab.hash === `#${panelId}`;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focusTab) tab.focus({ preventScroll: true });
  });
  group.panels.forEach(panel => { panel.hidden = panel.id !== panelId; });
}
for (const {tabs: cardTabs, panels, tabList} of cardGroups) {
  tabList.setAttribute('role', 'tablist');
  cardTabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', tab.hash.slice(1));
    const panel = document.querySelector(tab.hash);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.addEventListener('click', event => {
      event.preventDefault();
      selectCardPanel(panel.id);
    });
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % cardTabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + cardTabs.length) % cardTabs.length;
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const columns = cardTabs.filter(tab => tab.offsetTop === cardTabs[0].offsetTop).length;
        next = (index + (event.key === 'ArrowDown' ? columns : -columns) + cardTabs.length) % cardTabs.length;
      }
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = cardTabs.length - 1;
      else if (event.key !== ' ') return;
      event.preventDefault();
      selectCardPanel(cardTabs[next].hash.slice(1), true);
    });
  });
  selectCardPanel(panels.some(panel => `#${panel.id}` === location.hash) ? location.hash.slice(1) : panels[0].id);
}
document.documentElement.classList.add('rules-enhanced');
browseChapters.addEventListener('click', () => {
  browseChapters.setAttribute('aria-expanded', String(browseChapters.getAttribute('aria-expanded') !== 'true'));
});
document.querySelectorAll('.chapter-links a').forEach(link => link.addEventListener('click', () => {
  browseChapters.setAttribute('aria-expanded', 'false');
}));
const search = document.querySelector('#rule-search');
const chapters = [...document.querySelectorAll('[data-chapter]')];
const disclosures = [...document.querySelectorAll('details')];
const expandButton = document.querySelector('#expand-rules');
const savedOpen = new Map();
const normalize = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const chapterText = new Map(chapters.map(chapter => [chapter, normalize(chapter.textContent)]));
let searching = false;
function syncExpandLabel() {
  expandButton.textContent = disclosures.every(d => d.open) ? 'Collapse all' : 'Expand all';
}
function filterRules() {
  const query = normalize(search.value);
  const words = query.split(' ').filter(Boolean);
  if (words.length && !searching) disclosures.forEach(d => savedOpen.set(d, d.open));
  let count = 0;
  for (const chapter of chapters) {
    chapter.hidden = words.some(word => !chapterText.get(chapter).includes(word));
    if (!chapter.hidden) count++;
    if (words.length) chapter.querySelectorAll('details').forEach(d => { d.open = !chapter.hidden; });
  }
  if (!words.length && searching) {
    for (const [d, open] of savedOpen) d.open = open;
    savedOpen.clear();
  }
  if (words.length) {
    for (const group of cardGroups) {
      const matchedPanel = group.panels.find(panel => words.every(word => normalize(panel.textContent).includes(word)));
      if (matchedPanel) selectCardPanel(matchedPanel.id);
    }
  }
  searching = words.length > 0;
  document.querySelector('#search-status').textContent = searching ? `${count} matching chapter${count === 1 ? '' : 's'}` : '';
  document.querySelector('#no-results').hidden = count !== 0;
  syncExpandLabel();
}
search.addEventListener('input', filterRules);
function clearSearch() { search.value = ''; filterRules(); }
document.querySelector('#clear-search').addEventListener('click', () => { clearSearch(); search.focus(); });
document.querySelectorAll('.manual a[href^="#"]:not([data-card-tab])').forEach(a => a.addEventListener('click', clearSearch));
window.addEventListener('hashchange', () => {
  clearSearch();
  if (cardPanels.some(panel => `#${panel.id}` === location.hash)) selectCardPanel(location.hash.slice(1));
});
expandButton.addEventListener('click', () => {
  const open = !disclosures.every(d => d.open);
  disclosures.forEach(d => { d.open = open; });
  syncExpandLabel();
});
disclosures.forEach(d => d.addEventListener('toggle', syncExpandLabel));
const previous = new Map();
window.addEventListener('beforeprint', () => {
  cardPanels.forEach(panel => panel.querySelectorAll('img').forEach(img => { img.loading = 'eager'; }));
  disclosures.forEach(d => { previous.set(d, d.open); d.open = true; });
});
window.addEventListener('afterprint', () => {
  for (const [d, open] of previous) d.open = open;
  previous.clear();
  syncExpandLabel();
});
document.querySelector('#print-rulebook').addEventListener('click', () => window.print());
const attacker = document.querySelector('#pat-attacker');
const defender = document.querySelector('#pat-defender');
function updateDamage() {
  const a = Number(attacker.value), d = Number(defender.value);
  const damage = a === 9 || d === 9 ? 2 : Math.min(8, Math.max(0, a - d + 1));
  document.querySelector('#pat-result').textContent = `Base damage: ${damage} power stage${damage === 1 ? '' : 's'}${a === 9 || d === 9 ? ' (Z rating)' : ''}`;
  document.querySelectorAll('.pat-table td').forEach(cell => cell.classList.toggle('selected-damage', Number(cell.dataset.atk) === a && Number(cell.dataset.def) === d));
}
attacker.addEventListener('change', updateDamage);
defender.addEventListener('change', updateDamage);
updateDamage();


// The handbook opens with the full rules visible, including before JavaScript runs.
syncExpandLabel();
const chapterLinks = [...document.querySelectorAll('.chapter-links a')];
let pendingLocation = false;
function updateChapterLocation() {
  pendingLocation = false;
  const visible = chapters.filter(chapter => !chapter.hidden);
  const current = [...visible].reverse().find(chapter => chapter.getBoundingClientRect().top <= 180) || visible[0];
  for (const link of chapterLinks) {
    if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
function queueChapterLocation() {
  if (pendingLocation) return;
  pendingLocation = true;
  requestAnimationFrame(updateChapterLocation);
}
window.addEventListener('scroll', queueChapterLocation, { passive: true });
search.addEventListener('input', queueChapterLocation);
window.addEventListener('hashchange', queueChapterLocation);
updateChapterLocation();

