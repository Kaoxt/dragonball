const guestKey = 'dragon:card-finish:guest';
const valid = value => value === 'foil' || value === 'regular';

// Account choices live on the server. Only signed-out visitors use this device.
export function createFinishPreference({request, storage, onChange}) {
  let state = {finish: 'regular', userId: undefined, ready: false, saving: false, error: ''};
  let generation = 0;
  const notify = () => onChange({...state});
  async function load() {
    if (state.saving) return;
    const token = ++generation;
    state = {...state, ready: false, error: ''}; notify();
    try {
      const response = await request('/api/auth/card-finish', {credentials: 'same-origin', cache: 'no-store'});
      if (!response.ok) throw Error();
      const data = await response.json();
      if (token !== generation) return;
      if (!valid(data.finish) || !(data.userId === null || typeof data.userId === 'string')) throw Error();
      let finish = data.finish;
      if (data.userId === null) {
        try {const saved = storage?.getItem(guestKey); if (valid(saved)) finish = saved;} catch {}
      }
      state = {finish, userId: data.userId, ready: true, saving: false, error: ''};
    } catch {
      if (token !== generation) return;
      state = {...state, userId: undefined, ready: true, error: 'Unable to load your saved choice. Changes will apply for this visit.'};
    }
    notify();
  }
  async function choose(finish) {
    if (!valid(finish) || !state.ready || state.saving) return;
    const previous = state.finish, token = generation, userId = state.userId;
    state = {...state, finish, error: ''};
    if (userId === null) {
      try {if (!storage) throw Error(); storage.setItem(guestKey, finish);} catch {state.error = 'Choice applies for this visit. Browser storage is unavailable.';}
      notify(); return;
    }
    if (userId === undefined) {
      state.error = 'Choice applies for this visit. Reload to reconnect and save it.';
      notify(); return;
    }
    state.saving = true; notify();
    try {
      const response = await request('/api/auth/card-finish', {
        method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({userId, finish})
      });
      if (!response.ok) throw Error();
      const data = await response.json();
      if (data.userId !== userId || data.finish !== finish) throw Error();
    } catch {
      if (token !== generation) return;
      state.finish = previous;
      state.error = 'Unable to save your choice. Please try again.';
    }
    if (token !== generation) return;
    state.saving = false; notify();
  }
  function resetAccount() {
    generation++;
    state = {finish: 'regular', userId: undefined, ready: false, saving: false, error: ''};
    notify();
    return load();
  }
  return {load, choose, resetAccount};
}
