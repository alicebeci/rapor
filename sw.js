const CACHE_NAME = 'adres-raporu-v15';

// Uygulama açılışında anında önbelleğe alınacak kritik dosyalar (Ağ olmasa dahi anında yüklenir)
// Analiz için gerekli gizli worker ve harici kütüphaneler de listeye eklendi (İlk yüklemede çekilir)
const INITIAL_CACHED_RESOURCES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdn.tailwindcss.com?plugins=forms,container-queries',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js',
  'https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg',
  'https://api.iconify.design/vscode-icons/file-type-excel.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Bir dosyanın cache aşaması başarısız olsa bile komple iptal olmasını engeller
      return Promise.all(
        INITIAL_CACHED_RESOURCES.map(url => cache.add(url).catch(err => console.warn('Cache edilemedi:', url, err)))
      );
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
