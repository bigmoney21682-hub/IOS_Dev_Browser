// ============================================================
// FILE: service-worker.js
// DESC: Minimal PWA service worker that avoids hijacking
//       standalone HTML files (like proxy-mytube.html),
//       prevents SPA fallback issues, and ensures fresh loads.
// ============================================================

// Immediately activate on install
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Take control of all pages ASAP
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ------------------------------------------------------------
// FETCH HANDLER
// ------------------------------------------------------------
// RULES:
// 1. DO NOT intercept standalone HTML files
//    (proxy-mytube.html, docs pages, etc.)
// 2. DO NOT fallback to index.html for unknown paths
// 3. Only cache static assets (JS, CSS, images)
// 4. Always try network first for HTML
// ------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // --- RULE 1: Let HTML files load normally ---
  if (req.destination === "document" || url.pathname.endsWith(".html")) {
    return; // Do NOT intercept — fixes proxy-mytube.html 404
  }

  // --- RULE 2: Only cache static assets ---
  if (
    req.destination === "script" ||
    req.destination === "style" ||
    req.destination === "image" ||
    req.destination === "font"
  ) {
    event.respondWith(
      caches.open("static-v1").then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;

        try {
          const fresh = await fetch(req);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // --- RULE 3: Everything else → network passthrough ---
  // (fetch, XHR, API calls, etc.)
  event.respondWith(fetch(req));
});
