/* Cache only the public offline page. Account pages, API and OAuth stay on the network. */
const CACHE = "todly-offline-v1";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add("/offline.html")).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("todly-offline-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  // Never intercept writes, API calls, login, callbacks or RSC requests.
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname !== "/" || event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(async () => {
    const cache = await caches.open(CACHE);
    return await cache.match("/offline.html") || new Response("Todly richiede una connessione. Riprova quando sei online.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }));
});
