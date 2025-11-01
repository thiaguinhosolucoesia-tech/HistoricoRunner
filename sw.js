// sw.js

// Define o nome do cache
const CACHE_NOME = 'curriculo-corredores-v13'; // Versão atualizada

// Lista de arquivos exatos do seu projeto para o App Shell
const listaUrlsParaCache = [
  '.',
  'index.html',
  'css/styles.css',
  'js/config.js',
  'js/admin-logic.js',
  'js/main-logic.js',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// Evento 'install': Salva os arquivos do App Shell no cache
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Instalando (v13)...');
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => {
        console.log('[ServiceWorker] Abrindo cache e salvando o App Shell (v13)');
        return cache.addAll(listaUrlsParaCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Instalação completa (v13), App Shell cacheado.');
        return self.skipWaiting(); // Força o novo SW a ativar
      })
      .catch((error) => {
        console.error('[ServiceWorker] Falha ao cachear o App Shell (v13):', error);
      })
  );
});

// Evento 'activate': Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Ativando (v13)...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Deleta caches que não sejam o cache atual
          if (cacheName !== CACHE_NOME) {
            console.log('[ServiceWorker] Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[ServiceWorker] Ativado (v13) e pronto para controlar a página.');
        return self.clients.claim(); // Torna-se o SW controlador imediatamente
    })
  );
});

// Evento 'fetch': Intercepta requisições
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Se a requisição for para nosso próprio domínio (App Shell)
  if (requestUrl.origin === self.location.origin) {
    // Estratégia: Cache first, fallback to network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((networkResponse) => {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NOME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              return networkResponse;
            }
          ).catch((error) => {
            console.error('[ServiceWorker] Falha no fetch (App Shell):', error);
          });
        })
    );
  } else {
    // Para requisições de terceiros (Firebase, CDNs, Cloudinary)
    // Estratégia: Network first, fallback to cache
    // Verifica se o método da requisição não é GET
    if (event.request.method !== 'GET') {
      // Ignora requisições POST e outros métodos não GET para cache
      return event.respondWith(fetch(event.request));
    }

    event.respondWith(
      caches.open(CACHE_NOME).then((cache) => {
        return fetch(event.request).then((networkResponse) => {
          // Somente cacheia requisições GET
          if (event.request.method === 'GET') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Falhou na rede? Tenta pegar do cache.
          return cache.match(event.request);
        });
      })
    );
  }
});
