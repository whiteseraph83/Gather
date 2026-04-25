// ── Hex Domain Service Worker ─────────────────────────────────────────────────
// Update VERSION to match GAME_VERSION in js/config.js on every release.
// Changing this string invalidates the old cache and forces all clients to reload.

const VERSION = '1.31';
const CACHE   = `hexdomain-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './favicon.svg',
  './js/main.js',
  './js/config.js',
  './js/state.js',
  './js/storage.js',
  './js/map.js',
  './js/workers.js',
  './js/resources.js',
  './js/economy.js',
  './js/render.js',
  './js/ui.js',
  './js/input.js',
  './js/hex.js',
  './js/day.js',
  './js/gearMode.js',
  './js/achievements.js',
];

// Install: cache all assets immediately
self.addEventListener('install', e => {
  self.skipWaiting(); // activate right away, don't wait for old SW to die
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});

// Activate: delete stale caches, claim all open tabs
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }).then(clients => {
        // Tell every open tab that a new version has loaded
        clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: VERSION }));
      }))
  );
});

// Fetch: serve from cache, fall back to network (and cache the new response)
self.addEventListener('fetch', e => {
  // Only intercept same-origin GET requests
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      });
    })
  );
});
