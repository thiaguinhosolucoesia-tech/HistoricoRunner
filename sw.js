// Define o nome do cache (incrementar versão força atualização)
const CACHE_NOME = 'curriculo-corredores-v4'; // <-- VERSÃO INCREMENTADA NOVAMENTE

// Lista de arquivos exatos do seu projeto para o App Shell
// Caminhos relativos à raiz do escopo do Service Worker (/HistoricoRunner/)
// Garanta que todos esses arquivos existem nos locais especificados no seu repo
const listaUrlsParaCache = [
  './', // index.html no escopo
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/admin-logic.js',
  './js/main-logic.js',
  './manifest.json',
  // Ícones (verifique se os caminhos estão corretos, ex: ./icons/ ou icons/)
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-384x384.png',
  './icons/icon-128x128.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  // CDNs
  'https://cdn.jsdelivr.net/npm/boxicons@2.1.4/css/boxicons.min.css',
  'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js', // Cacheia SDKs
  'https://www.gstatic.com/firebasejs/9.6.1/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js'
];

// Evento 'install': Salva os arquivos do App Shell no cache
self.addEventListener('install', (event) => {
  console.log(`[ServiceWorker] Instalando ${CACHE_NOME}...`);
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => {
        console.log(`[ServiceWorker] Cache ${CACHE_NOME} aberto. Adicionando App Shell.`);
        return cache.addAll(listaUrlsParaCache);
      })
      .then(() => {
        console.log('[ServiceWorker] App Shell cacheado. Ativando worker...');
        return self.skipWaiting(); // Força ativação
      })
      .catch((error) => {
        console.error('[ServiceWorker] Falha ao cachear App Shell durante install:', error);
        // Não impede a instalação, mas loga o erro
      })
  );
});

// Evento 'activate': Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log(`[ServiceWorker] Ativando ${CACHE_NOME}...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NOME) {
            console.log('[ServiceWorker] Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[ServiceWorker] Caches antigos limpos. Assumindo controle.');
        return self.clients.claim(); // Controla clientes imediatamente
    })
  );
});

// Evento 'fetch': Intercepta requisições
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // [CORREÇÃO] IGNORA requisições que NÃO SÃO GET
  // Isso impede o erro "Request method 'POST' is unsupported"
  if (request.method !== 'GET') {
    // console.log('[SW] Ignorando requisição não-GET:', request.method, request.url);
    // Deixa a requisição passar direto para a rede
    return;
  }

  // Ignora requisições internas do Chrome/Extensões
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Estratégia: Cache first, then network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Retorna do cache se encontrado
        if (cachedResponse) {
          // console.log('[SW] Servindo do cache:', request.url);
          return cachedResponse;
        }

        // Se não está no cache, busca na rede
        // console.log('[SW] Buscando na rede:', request.url);
        return fetch(request).then((networkResponse) => {
            // Verifica se a resposta da rede é válida antes de cachear
            if (networkResponse && networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NOME)
                .then((cache) => {
                  // console.log('[SW] Cacheando resposta da rede:', request.url);
                  cache.put(request, responseToCache); // Salva a resposta no cache
                });
            } else if(networkResponse) {
                 console.warn('[SW] Resposta da rede não OK:', networkResponse.status, request.url);
            }
            // Retorna a resposta da rede (mesmo que não seja 'ok')
            return networkResponse;
          })
          .catch(error => {
              console.error('[SW] Erro no Fetch (rede?):', request.url, error);
              // Poderia retornar uma resposta offline aqui
              // return new Response('Offline', { status: 503, statusText: 'Offline' });
              throw error; // Propaga o erro para o navegador lidar
          });
      })
  );
});
