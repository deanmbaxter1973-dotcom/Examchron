// Exam Chronicle Service Worker v2.0 — offline-first
const CACHE = "exam-chronicle-v2.0";
const SHELL = ["/", "/index.html", "/manifest.json",
  "/icons/icon-180.png", "/icons/icon-192.png", "/icons/icon-512.png",
  "/logo.png", "/favicon.ico"
];

// Install — cache shell immediately
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate — clear old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch — cache-first for assets, network-first for nav, skip AI APIs
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Never intercept AI API calls
  if (url.hostname.match(/anthropic\.com|openai\.com|azure\.com|googleapis\.com\/\/fonts(?!.*css)/)) return;
  if (url.hostname === "fonts.gstatic.com") return; // Font files — browser caches

  // SPA navigation — network first, fall back to shell
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets — cache first
  if (url.pathname.match(/\/assets\/|\/icons\/|\/logo\.png|\.woff2?$|\.css$|\.js$/) ||
      url.pathname === "/manifest.json" || url.pathname === "/favicon.ico") {
    e.respondWith(
      caches.match(e.request)
        .then(hit => hit || fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        }))
    );
  }
});

// Background sync for calendar data
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
