// FILE: service-worker.js
// PATH: /service-worker.js
// DESC: Minimal service worker for PWA installability

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    clients.claim();
});
