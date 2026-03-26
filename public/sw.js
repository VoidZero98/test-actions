const CACHE_NAME = "tetris-pwa-cache-v1";

self.addEventListener("install", (event) => {
  // Activate SW immediately.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function isHttpGetSameOrigin(request) {
  try {
    const url = new URL(request.url);
    return request.method === "GET" && url.origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  if (!isHttpGetSameOrigin(event.request)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;

      // Network-first for first load; then cache the response.
      const res = await fetch(event.request);
      // Only cache successful responses.
      if (res && res.ok) {
        cache.put(event.request, res.clone());
      }
      return res;
    })()
  );
});

