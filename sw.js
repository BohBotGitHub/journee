// Service worker : l'appli s'ouvre même hors ligne. Les appels aux API Google/Microsoft ne passent jamais par le cache.
const CACHE = 'mydaybot-v16';
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon.svg", "./icon-192.png", "./icon-512.png", "./css/app.css", "./js/ai.js", "./js/auth.js", "./js/core.js", "./js/events.js", "./js/flow.js", "./js/google.js", "./js/import.js", "./js/main.js", "./js/microsoft.js", "./js/render.js", "./js/sync.js", "./js/tree.js", "./js/treeview.js", "./js/views.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
// clic sur une notification : ramène MyDayBot au premier plan
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.includes('/journee/'));
    return c ? c.focus() : self.clients.openWindow('./');
  }));
});
