// A basic service worker is required for PWA installation to work in Chrome.
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
});

self.addEventListener('fetch', (e) => {
    // Basic pass-through fetch handler
    e.respondWith(fetch(e.request));
});
