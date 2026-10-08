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
  searching = words.length > 0;
  document.querySelector('#search-status').textContent = searching ? `${count} matching chapter${count === 1 ? '' : 's'}` : '';
  document.querySelector('#no-results').hidden = count !== 0;
  syncExpandLabel();
}
search.addEventListener('input', filterRules);
function clearSearch() { search.value = ''; filterRules(); }
document.querySelector('#clear-search').addEventListener('click', () => { clearSearch(); search.focus(); });
document.querySelectorAll('.chapter-nav a, .hero-links a').forEach(a => a.addEventListener('click', clearSearch));
window.addEventListener('hashchange', clearSearch);
expandButton.addEventListener('click', () => {
  const open = !disclosures.every(d => d.open);
  disclosures.forEach(d => { d.open = open; });
  syncExpandLabel();
});
disclosures.forEach(d => d.addEventListener('toggle', syncExpandLabel));
const previous = new Map();
window.addEventListener('beforeprint', () => {
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
