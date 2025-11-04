// sw.js

// Define o nome do cache
// =================================================================
// INÍCIO DA ALTERAÇÃO (V9.7) - "Bater" o cache para forçar a atualização dos arquivos JS
// =================================================================
const CACHE_NOME = 'curriculo-corredores-v14'; // Versão atualizada (era v13)
// =================================================================
// FIM DA ALTERAÇÃO (V9.7)
// =================================================================


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
  console.log(`[ServiceWorker] Instalando (${CACHE_NOME})...`);
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => {
        console.log(`[ServiceWorker] Abrindo cache e salvando o App Shell (${CACHE_NOME})`);
        return cache.addAll(listaUrlsParaCache);
      })
      .then(() => {
        console.log(`[ServiceWorker] Instalação completa (${CACHE_NOME}), App Shell cacheado.`);
        return self.skipWaiting(); // Força o novo SW a ativar
      })
      .catch((error) => {
        console.error(`[ServiceWorker] Falha ao cachear o App Shell (${CACHE_NOME}):`, error);
      })
  );
});

// Evento 'activate': Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log(`[ServiceWorker] Ativando (${CACHE_NOME})...`);
  event.waitUntil(
    caches.keys().then((nomesCache) => {
      return Promise.all(
        nomesCache.map((nome) => {
          if (nome !== CACHE_NOME) {
            console.log(`[ServiceWorker] Removendo cache antigo: ${nome}`);
            return caches.delete(nome);
          }
        })
      );
    }).then(() => {
      console.log(`[ServiceWorker] (${CACHE_NOME}) Ativado e caches antigos limpos.`);
      return self.clients.claim(); // Toma controle imediato da página
    })
  );
});

// Evento 'fetch': Intercepta requisições
self.addEventListener('fetch', (event) => {
  // 1. Requisições do App Shell (seus arquivos locais)
  // Estratégia: Cache first, fallback to network
  if (event.request.url.includes(self.location.origin)) {
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
    // 2. Para requisições de terceiros (Firebase, CDNs, Cloudinary)
    // Estratégia: Network first, fallback to cache
    
    // Ignora requisições POST
    if (event.request.method !== 'GET') {
      return event.respondWith(fetch(event.request));
    }

    event.respondWith(
      caches.open(CACHE_NOME).then((cache) => {
        return fetch(event.request).then((networkResponse) => {
          // Salva no cache
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        }).catch(() => {
          // Falhou na rede? Tenta pegar do cache.
          return cache.match(event.request);
        });
      })
    );
  }
});
