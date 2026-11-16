/* Optional local JSON state for small pages. No framework or layout dependency. */
window.createPageState = function ({ key, defaults = {}, onStatus = () => {} }) {
  const endpoint = '/__page_state__';
  const hosted = /^https?:$/.test(location.protocol);
  const clone = value => JSON.parse(JSON.stringify(value));
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const read = name => { try { const x = JSON.parse(localStorage.getItem(name)); return object(x) ? x : {}; } catch { return {}; } };
  let pending = read(key + ':pending');
  let data = { ...clone(defaults), ...read(key), ...pending };
  let timer, active = null, ready = false, cacheOK = true;
  function cache() {
    try { localStorage.setItem(key, JSON.stringify(data)); localStorage.setItem(key + ':pending', JSON.stringify(pending)); cacheOK = true; }
    catch { cacheOK = false; }
  }
  function status(kind, updatedAt) { onStatus({ kind, updatedAt, cacheOK, hosted }); }
  async function request(options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(endpoint, { cache: 'no-store', ...options, signal: controller.signal });
      if (!response.ok) throw new Error('State service unavailable');
      return await response.json();
    } finally { clearTimeout(timeout); }
  }
  async function send() {
    if (!ready || !hosted || !Object.keys(pending).length) return;
    status('saving');
    try {
      while (Object.keys(pending).length) {
        const changes = clone(pending);
        const result = await request({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes }), keepalive: true });
        if (result.saved !== true) throw new Error('Save was not acknowledged');
        for (const k of Object.keys(changes)) {
          if (JSON.stringify(pending[k]) === JSON.stringify(changes[k])) delete pending[k];
        }
        cache();
        if (!Object.keys(pending).length) status('saved', result.updatedAt);
      }
    } catch { status('failed'); }
  }
  function flush() {
    clearTimeout(timer);
    if (!active) active = send().finally(() => { active = null; });
    return active;
  }
  const api = {
    get: () => clone(data),
    set(changes) {
      if (!ready) throw new Error('Wait for page state to load before editing');
      for (const [k, v] of Object.entries(changes)) {
        if (JSON.stringify(data[k]) !== JSON.stringify(v)) { data[k] = clone(v); pending[k] = clone(v); }
      }
      cache();
      if (!hosted) { status('browser'); return; }
      if (!Object.keys(pending).length) return;
      status('saving'); clearTimeout(timer); timer = setTimeout(flush, 350);
    },
    flush,
    retry: () => { if (hosted && !Object.keys(pending).length) location.reload(); else return flush(); },
  };
  api.ready = (async () => {
    status('loading');
    if (hosted) {
      try {
        const saved = await request();
        if (saved.version !== 1 || !object(saved.data)) throw new Error('Invalid saved state');
        // A server file is authoritative; only locally pending edits may override it.
        data = { ...clone(defaults), ...saved.data, ...pending };
        cache(); status('saved', saved.updatedAt);
      } catch { cache(); status('failed'); }
    } else { cache(); status('browser'); }
    ready = true;
    if (hosted && Object.keys(pending).length) await flush();
    return api.get();
  })();
  addEventListener('online', flush);
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  return api;
};
