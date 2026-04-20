/* SwiftLab — Service Worker: cache-first + atualização em background (mesma ideia do CTFL-Lab). */
const CACHE_NAME = 'swiftlab-v1.8';
const OFFLINE_FALLBACK = './index.html';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './content/catalog.json',
  './content/glossary.json',
  './content/flashcards.json',
  './content/quiz.json',
  './content/logic-exercises.json',
  './content/schema/module-section.schema.json',
  './content/modules/m01-swift-essentials.json',
  './content/modules/m02-app-swiftui.json',
  './content/modules/m03-views-composition.json',
  './content/modules/m04-layout.json',
  './content/modules/m15-design-system.json',
  './content/modules/m05-state-data-flow.json',
  './content/modules/m06-navigation.json',
  './content/modules/m07-architecture.json',
  './content/modules/m08-swiftdata.json',
  './content/modules/m09-concurrency.json',
  './content/modules/m10-combine.json',
  './content/modules/m11-testing.json',
  './content/modules/m12-accessibility.json',
  './content/modules/m13-debug-performance.json',
  './content/modules/m14-career.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        fetch(event.request)
          .then((res) => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(event.request)
        .then((res) => {
          if (!res || res.status !== 200) return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(OFFLINE_FALLBACK));
    })
  );
});
