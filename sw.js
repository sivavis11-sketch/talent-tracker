// Offline support. The app's own files are fetched fresh from the network every time
// (so a new version shows on the next open) and kept in the cache only for when there
// is no signal. Fonts and PDF libraries never change, so they come from the cache.
// Calls to the Google Apps Script are never cached.
const VERSION = "tt-v14";
const SHELL = ["./", "index.html", "app.css", "manifest.webmanifest",
  "js/icons.js", "js/core.js", "js/views.js", "js/store.js", "js/actions.js",
  "img/p-stand.webp", "img/p-dribble.webp", "img/p-juggle.webp", "img/p-celebrate.webp", "img/p-header.webp", "img/p-kick.webp",
  "img/pdf-stand.png", "img/pdf-kick.png", "img/ball.webp",
  "icons/icon-192.png", "icons/favicon.png"];
const RUNTIME = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)\//;

self.addEventListener("install", e => {
  // cache: "reload" skips the browser's own HTTP cache, so an update never stores old files
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const own = url.origin === location.origin && url.pathname.startsWith(new URL("./", location).pathname);
  if (own) {
    e.respondWith(caches.open(VERSION).then(cache =>
      fetch(req, { cache: "no-cache" }).then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cache.match(req, { ignoreSearch: true }).then(hit => hit || cache.match("index.html")))));
    return;
  }
  if (!RUNTIME.test(req.url)) return; // Apps Script and everything else: straight to the network
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req);
    return hit || fetch(req).then(res => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; });
  }));
});
