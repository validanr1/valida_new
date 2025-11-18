// Service Worker otimizado - ignora requisições não suportadas pelo Cache API
const CACHE_NAME = 'validanr1-cache-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Ativado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET (POST, HEAD, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar esquemas não suportados (chrome-extension, chrome, about, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Ignorar WebSocket e HMR do Vite
  if (url.pathname.includes('__vite') || url.search.includes('token=')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return fetch(request)
        .then((response) => {
          // Só cachear respostas válidas (status 200-299)
          if (response && response.ok && response.status >= 200 && response.status < 300) {
            try {
              cache.put(request, response.clone());
            } catch (error) {
              console.warn('[SW] Falha ao cachear:', request.url, error);
            }
          }
          return response;
        })
        .catch((error) => {
          console.warn('[SW] Fetch falhou, tentando cache:', request.url);
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Se não houver cache, retornar erro
            throw error;
          });
        });
    })
  );
});
