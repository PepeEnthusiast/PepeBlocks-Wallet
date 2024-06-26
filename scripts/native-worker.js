// Listen for native worker installs
self.addEventListener('install', function (_event) {
    console.log('[ServiceWorker] Install');

    // Activate the newly installed worker
    self.skipWaiting();
});

// Listen for native worker activation
self.addEventListener('activate', (_event) => {
    console.log('[ServiceWorker] Activated');

    // Tell the active service worker to take control of the page immediately.
    self.clients.claim();
});

self.addEventListener('fetch', async (event) => {
    // Let the browser do its default thing
    // for non-GET requests.
    if (event.request.method !== 'GET') return;

    const cacheRegexp = /sapling-(spend|output)\.params/;

    if (!cacheRegexp.test(event.request.url)) {
        return;
    }

    event.respondWith(
        (async () => {
            // Try to get the response from a cache.
            const cache = await caches.open('sapling-params-v1');
            const cachedResponse = await cache.match(event.request);

            if (cachedResponse && cachedResponse.ok) {
                return cachedResponse;
            }
            // If we didn't find a match in the cache, use the network.
            const response = await fetch(event.request);
            await cache.put(event.request, response.clone());
            return response;
        })()
    );
});
