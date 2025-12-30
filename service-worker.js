// ============================================================
// FILE: service-worker.js
// PATH: /service-worker.js
// DESC: Minimal service worker to enable PWA installability and
//       immediate activation for IOS Dev Browser.
// ============================================================

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => clients.claim());
