// Define o nome do cache
const CACHE_NOME = 'curriculo-corredores-v1';

// Lista de arquivos exatos do seu projeto para o App Shell
// Caminhos relativos para funcionar no GitHub Pages
const listaUrlsParaCache = [
  '.',
  'index.html',
  'css/styles.css',
  'js/config.js',
  'js/admin-logic.js',
  'js/main-logic.js',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
  // Adicione aqui outros tamanhos de ícones que você gerar
  // NOTA: Não estamos cacheando os scripts do Firebase ou Boxicons no 'install'
  // Eles serão cacheados dinamicamente pela rede no evento 'fetch'.
];

// Evento 'install': Salva os arquivos do App Shell no cache
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => {
        console.log('[ServiceWorker] Abrindo cache e salvando o App Shell');
        return cache.addAll(listaUrlsParaCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Instalação completa, App Shell cacheado.');
        return self.skipWaiting(); // Força o novo SW a ativar
      })
      .catch((error) => {
        console.error('[ServiceWorker] Falha ao cachear o App Shell:', error);
      })
  );
});

// Evento 'activate': Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Ativando...');
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
        console.log('[ServiceWorker] Ativado e pronto para controlar a página.');
        return self.clients.claim(); // Torna-se o SW controlador imediatamente
    })
  );
});

// Evento 'fetch': Intercepta requisições
// Estratégia: Stale-While-Revalidate (Rápido, mas atualiza em background)
// Para o App Shell (HTML, CSS, JS) - Cache first, fallback to network.
// Para todo o resto (Firebase, CDNs, Imagens) - Network first, fallback to cache.

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Se a requisição for para nosso próprio domínio (App Shell)
  if (requestUrl.origin === self.location.origin) {
    // Estratégia: Cache first, fallback to network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Se tiver no cache, retorna
          if (response) {
            // console.log(`[ServiceWorker] Servindo do cache: ${event.request.url}`);
            return response;
          }
          // Se não, busca na rede
          // console.log(`[ServiceWorker] Buscando na rede: ${event.request.url}`);
          return fetch(event.request).then((networkResponse) => {
              // Clona a resposta para poder salvar no cache e retornar
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NOME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              return networkResponse;
            }
          ).catch((error) => {
            console.error('[ServiceWorker] Falha no fetch (App Shell):', error);
            // Poderíamos retornar uma página offline aqui
          });
        })
    );
  } else {
    // Para requisições de terceiros (Firebase, CDNs)
    // Estratégia: Network first, fallback to cache (Stale-While-Revalidate)
    event.respondWith(
      caches.open(CACHE_NOME).then((cache) => {
        return fetch(event.request).then((networkResponse) => {
          // Deu certo na rede? Ótimo. Salva no cache e retorna.
          // console.log(`[ServiceWorker] Buscando na rede (3rd party): ${event.request.url}`);
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        }).catch(() => {
          // Falhou na rede? Tenta pegar do cache.
          // console.log(`[ServiceWorker] Rede falhou, servindo do cache (3rd party): ${event.request.url}`);
          return cache.match(event.request);
        });
      })
    );
  }
});
