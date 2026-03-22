const CACHE_NAME = 'adres-raporu-v1';

// Uygulama açılışında anında önbelleğe alınacak kritik dosyalar (Ağ olmasa dahi anında yüklenir)
const INITIAL_CACHED_RESOURCES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(INITIAL_CACHED_RESOURCES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((name) => {
        if (name !== CACHE_NAME) {
          return caches.delete(name);
        }
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Önbellekte var ise hemen döndür (Hızlı açılış)
      if (cachedResponse) {
        // Arkadan da güncel halini çek ve cache'i yenile (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors' || networkResponse.type === 'opaque')) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Önbellekte yoksa internetten çek ve sakla (Fontlar, CDN scriptleri, İkonlar bu şekilde otomatik cachlenir)
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((e) => {
        console.warn('Çevrimdışı bağlantı nedeniyle istek tamamlanamadı:', event.request.url);
      });
    })
  );
});
