const CACHE_NAME = "speakflow-static-v2";
const STATIC_ASSETS = [
  "/manifest.json",
  "/brand/speakflow-logo.png",
  "/brand/speakflow-mark.png",
  "/icons/apple-touch-icon.png",
  "/icons/glow-mic.svg",
  "/icons/maskable-icon-512x512.png",
  "/icons/pwa-icon-192x192.png",
  "/icons/pwa-icon-512x512.png"
];

function shouldBypass(request) {
  if (request.method !== "GET") return true;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/auth/")) return true;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return true;

  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (shouldBypass(request)) return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    return;
  }

  const isStaticAsset =
    url.pathname === "/manifest.json" ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/icons/");

  if (!isStaticAsset) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    })
  );
});
