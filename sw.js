/* Офлайн-кэш: после первого открытия приложение работает без интернета. */
const CACHE = 'maqsat-v6';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './css/style.css?v=6',
  './js/i18n.js?v=6', './js/data.js?v=6', './js/engine.js?v=6', './js/app.js?v=6', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const fromCache = () => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined));
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (!res.ok) return fromCache().then(r => r || res);
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => fromCache().then(r => r || Response.error()))
  );
});
