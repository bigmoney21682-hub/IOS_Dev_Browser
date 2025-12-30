// FILE: service-worker.js
// DESC: Basic PWA service worker for offline caching

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    clients.claim();
});
