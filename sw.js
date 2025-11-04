// =================================================================
// SERVICE WORKER CORRIGIDO - V14 (FINAL)
// CORREÇÃO: Resolve erro "QuotaExceededError" ao cachear requisições grandes
// =================================================================

// Define o nome do cache (incrementado para forçar atualização)
const CACHE_NOME = 'curriculo-corredores-v14';

// Lista de arquivos do App Shell (apenas arquivos locais essenciais)
const listaUrlsParaCache = [
  '.',
  'index.html',
  'css/styles.css',
  'js/config.js',
  'js/admin-logic.js', // Versão final
  'js/main-logic.js',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// Evento 'install': Salva apenas o App Shell no cache
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Instalando (v14 - Corrigido)...');
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => {
        console.log('[ServiceWorker] Cacheando App Shell (v14)');
        return cache.addAll(listaUrlsParaCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Instalação completa (v14)');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Falha ao cachear o App Shell:', error);
        // Não bloqueia a instalação mesmo se houver erro
      })
  );
});

// Evento 'activate': Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Ativando (v14)...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NOME) {
            console.log('[ServiceWorker] Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Ativado (v14) e pronto.');
      return self.clients.claim();
    })
  );
});

// Evento 'fetch': Intercepta requisições COM FILTRO
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // CORREÇÃO CRÍTICA: Cacheia APENAS arquivos do próprio domínio (App Shell)
  if (requestUrl.origin === self.location.origin) {
    // Estratégia: Cache first, fallback to network (para App Shell)
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            console.log('[ServiceWorker] Servindo do cache:', event.request.url);
            return response;
          }
          // Não está no cache, busca na rede
          return fetch(event.request)
            .then((networkResponse) => {
              // Tenta cachear a resposta (com tratamento de erro)
              if (event.request.method === 'GET' && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NOME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache)
                      .catch((cacheError) => {
                        // Se falhar ao cachear (quota exceeded), apenas loga mas não quebra
                        console.warn('[ServiceWorker] Não foi possível cachear:', event.request.url, cacheError);
                      });
                  });
              }
              return networkResponse;
            })
            .catch((error) => {
              console.error('[ServiceWorker] Falha no fetch:', error);
              // Tenta retornar do cache como fallback
              return caches.match(event.request);
            });
        })
    );
  } else {
    // CORREÇÃO CRÍTICA: Para requisições de terceiros (Firebase, Cloudinary)
    // NÃO CACHEIA - apenas passa direto para a rede
    // Isso evita o erro QuotaExceededError ao fazer upload de resultados grandes
    event.respondWith(
      fetch(event.request)
        .catch((error) => {
          console.error('[ServiceWorker] Falha em requisição de terceiro:', event.request.url, error);
          // Retorna erro para o app tratar
          return new Response('Erro de rede', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
  }
});

// NOVO: Listener para mensagens (permite limpar cache manualmente se necessário)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[ServiceWorker] Limpando cache por solicitação...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('[ServiceWorker] Cache limpo com sucesso.');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});
