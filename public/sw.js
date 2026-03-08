const CACHE_VERSION = 'everlume-v2';
const SHELL_CACHE = `everlume-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `everlume-runtime-${CACHE_VERSION}`;
const PUBLIC_MEMORIAL_CACHE = `everlume-memorials-${CACHE_VERSION}`;

const SHELL_URLS = ['/', '/offline', '/favicon.svg', '/manifest.webmanifest'];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isSafeImageRequest(request, url) {
  return (
    request.destination === 'image' &&
    isSameOrigin(url) &&
    !url.pathname.startsWith('/api/') &&
    !url.searchParams.has('token')
  );
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/');
}

async function cachePublicMemorialIfSafe(request, response) {
  if (!response.ok) return;

  const url = new URL(request.url);
  if (!url.pathname.startsWith('/memorials/')) return;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return;

  const html = await response.clone().text();
  if (!html.includes('data-memorial-access="public"')) return;

  const cache = await caches.open(PUBLIC_MEMORIAL_CACHE);
  await cache.put(request, response.clone());
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.includes(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          await cachePublicMemorialIfSafe(request, response);
          return response;
        })
        .catch(async () => {
          const publicMemorialCache = await caches.open(PUBLIC_MEMORIAL_CACHE);
          const memorialMatch = await publicMemorialCache.match(request);
          if (memorialMatch) return memorialMatch;

          const shellMatch = await caches.match(request);
          if (shellMatch) return shellMatch;

          return caches.match('/offline');
        })
    );
    return;
  }

  if (isStaticAsset(url) || isSafeImageRequest(request, url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response.ok) {
            const targetCache = isStaticAsset(url) ? SHELL_CACHE : RUNTIME_CACHE;
            const clone = response.clone();
            caches.open(targetCache).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
