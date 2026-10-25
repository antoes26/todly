/* Cache only the public offline page. Account pages, API and OAuth stay on the network. */
const CACHE = "todly-offline-v2";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add("/offline.html")).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    // Navigation preload: the browser asks for the page while this worker is still starting, so opening the app does not wait for it.
    self.registration && self.registration.navigationPreload ? self.registration.navigationPreload.enable().catch(() => {}) : null,
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("todly-offline-") && key !== CACHE).map(key => caches.delete(key)))),
  ]).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  // Never intercept writes, API calls, login, callbacks or RSC requests.
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname !== "/" || event.request.mode !== "navigate") return;
  event.respondWith((async () => {
    try {
      const preloaded = event.preloadResponse ? await event.preloadResponse : undefined;
      return preloaded || await fetch(event.request);
    } catch {
      const cache = await caches.open(CACHE);
      return await cache.match("/offline.html") || new Response("Todly richiede una connessione. Riprova quando sei online.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
