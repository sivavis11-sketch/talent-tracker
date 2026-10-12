// Offline support: the app's own files come from the cache (refreshed in the
// background); fonts and PDF libraries are cached on first use. Calls to the
// Google Apps Script are never cached.
const VERSION = "tt-v1";
const SHELL = ["./", "index.html", "app.css", "manifest.webmanifest",
  "js/icons.js", "js/core.js", "js/views.js", "js/store.js", "js/actions.js",
  "img/home.jpg", "img/points.jpg", "img/setup.jpg", "img/rank.jpg", "img/downloads.jpg", "img/report.jpg", "img/pdfhead.jpg", "img/ball.webp",
  "icons/icon-192.png", "icons/favicon.png"];
const RUNTIME = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)\//;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const own = url.origin === location.origin;
  if (!own && !RUNTIME.test(req.url)) return; // Apps Script and everything else: straight to the network
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: own });
    const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
