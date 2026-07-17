const CACHE = "ss-cache-v1";
const PRECACHE = ["/", "/demo-call", "/login", "/asha", "/doctor", "/admin"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache the latest version if it's a valid response
        if (res && res.status === 200 && res.type === "basic" && e.request.method === "GET") {
          const resClone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("/")))
  );
});
