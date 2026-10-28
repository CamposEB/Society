const CACHE_NAME = 'society-mlbb-v2'; // Atualize a versão para forçar o recache
const ASSETS = [
  './',
  './css/static.css',
  './js/shell.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Tenta cachear cada item. Se um falhar, não quebra os outros.
      return Promise.all(
        ASSETS.map(url => cache.add(url).catch(err => console.warn('Falha ao cachear:', url, err)))
      );
    })
  );
  self.skipWaiting(); // Ativa o novo SW imediatamente
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Ignora requisições que não sejam GET (ex: POST)
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});
