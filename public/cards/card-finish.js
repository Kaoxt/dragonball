import {setupCardMotion} from '../card-motion.js?v=20261103-finish-choice';
import {finishForImage} from '../card-surface.js?v=20261103-finish-choice';
import {createFinishPreference} from './finish-preference.js?v=20261103';

const controls = document.getElementById('card-finish-controls');
const image = document.getElementById('detail-image');
const stage = image.closest('[data-card-motion]');
const motion = setupCardMotion(stage);
const buttons = [...controls.querySelectorAll('button[data-finish]')];
const status = document.getElementById('card-finish-status');
let storage;
try {storage = localStorage;} catch {}
const preference = createFinishPreference({
  request: (...args) => fetch(...args), storage,
  onChange({finish, ready, saving, error}) {
    motion.surface.setFinish(finish);
    controls.setAttribute('aria-busy', String(!ready || saving));
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(ready && button.dataset.finish === finish));
      button.disabled = !ready || saving;
    }
    status.textContent = error;
    status.hidden = !error;
  }
});
function syncEligibility() {
  controls.hidden = !finishForImage(image.getAttribute('src'), location.origin);
}
for (const button of buttons) button.addEventListener('click', () => preference.choose(button.dataset.finish));
new MutationObserver(syncEligibility).observe(image, {attributes: true, attributeFilter: ['src']});
image.addEventListener('load', syncEligibility);
image.addEventListener('error', () => {controls.hidden = true;});
window.addEventListener('dragon:auth-signed-in', preference.resetAccount);
window.addEventListener('dragon:auth-signed-out', preference.resetAccount);
window.addEventListener('focus', preference.load);
window.addEventListener('pageshow', event => {if (event.persisted) preference.resetAccount();});
syncEligibility();
preference.load();
