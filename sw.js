// ==========================================
// ARQUIVO: sw.js (SERVICE WORKER)
// VERSÃO: V15 (CORREÇÃO DA ESTRATÉGIA)
// OBJETIVO: Mudar para "Network First" e limpar o cache V14 quebrado.
// ==========================================

// Define o nome do cache
// =========================================
// INÍCIO DA ALTERAÇÃO (V15) - "Bater" o cache
// =========================================
const CACHE_NOME = 'curriculo-corredores-v15'; // <-- MUDANÇA CRÍTICA
// =========================================
// FIM DA ALTERAÇÃO
// =========================================

// Lista de arquivos exatos do App Shell
// (Assegurando que styles-v2.css e manifest.json estejam incluídos)
const listaUrlsParaCache = [
  '/',
  'index.html',
  'manifest.json', // Adicionado para PWA
  'css/styles.css',
  'css/styles-v2.css', // Adicionado (estava faltando no seu)
  'js/config.js',
  'js/main-logic.js',
  'js/admin-logic.js',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// Evento 'install': Salva os arquivos do App Shell no cache
self.addEventListener('install', (event) => {
  console.log(`[ServiceWorker ${CACHE_NOME}] Install`);
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => {
        console.log(`[ServiceWorker ${CACHE_NOME}] Abrindo cache e adicionando App Shell`);
        // O addAll faz o fetch da rede
        return cache.addAll(listaUrlsParaCache);
      })
      .then(() => {
        console.log(`[ServiceWorker ${CACHE_NOME}] Cacheado com sucesso.`);
        return self.skipWaiting(); // Força o novo SW a ativar
      })
  );
});

// Evento 'activate': Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log(`[ServiceWorker ${CACHE_NOME}] Activate`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Deleta todos os caches que NÃO sejam o cache atual
          if (cacheName !== CACHE_NOME) {
            console.log(`[ServiceWorker ${CACHE_NOME}] Limpando cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log(`[ServiceWorker ${CACHE_NOME}] Clients claimed.`);
        return self.clients.claim(); // Torna-se o SW controlador imediatamente
    })
  );
});


// Evento 'fetch': Intercepta requisições
// =================================================================
// INÍCIO DA ALTERAÇÃO (V15) - MUDANÇA DA ESTRATÉGIA DE CACHE
// =================================================================
self.addEventListener('fetch', (event) => {
  
  // 1. Ignora requisições POST ou não-GET
  if (event.request.method !== 'GET') {
    return;
  }
    
  // 2. Para requisições de terceiros (Firebase, Cloudinary), usa Network only
  // (Elas não devem ser cacheadas pelo SW)
  if (!event.request.url.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // 3. Para o App Shell (Nossos arquivos): Estratégia "Network First"
  // Tenta buscar da rede primeiro. Se falhar (offline), usa o cache.
  // ISSO GARANTE QUE O CÓDIGO CORRIGIDO (V10) SEJA CARREGADO.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a resposta da rede for boa, salva no cache
        return caches.open(CACHE_NOME).then((cache) => {
          // Clona a resposta, pois ela só pode ser consumida uma vez
          cache.put(event.request, networkResponse.clone());
          // Retorna a resposta da rede
          return networkResponse;
        });
      })
      .catch(() => {
        // Falhou na rede? Tenta pegar do cache. (Modo Offline)
        console.log(`[ServiceWorker ${CACHE_NOME}] Falha na rede. Usando cache para: ${event.request.url}`);
        return caches.match(event.request);
      })
  );
});
// =================================================================
// FIM DA ALTERAÇÃO (V15)
// =================================================================
