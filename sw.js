// A basic service worker is required for PWA installation to work in Chrome.
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Activated');
    // Tell the active service worker to take control of the page immediately.
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Basic pass-through fetch handler
    e.respondWith(fetch(e.request));
});
