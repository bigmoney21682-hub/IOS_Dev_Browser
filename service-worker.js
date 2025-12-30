// FILE: service-worker.js
// PATH: /service-worker.js
// DESC: Minimal service worker for PWA installability

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => clients.claim());
