// Define o nome do cache (incrementar versão força atualização)
const CACHE_NOME = 'curriculo-corredores-v3'; // <--- VERSÃO INCREMENTADA

// Lista de arquivos exatos do seu projeto para o App Shell
// Caminhos relativos à raiz do escopo do Service Worker (/HistoricoRunner/)
const listaUrlsParaCache = [
  './', // Atalho para index.html no escopo
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/admin-logic.js',
  './js/main-logic.js',
  './manifest.json', // Manifest também deve ser cacheado
  // Dados JSON são carregados via fetch no main-logic, não precisam estar aqui
  // Ícones referenciados no manifest e HTML
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/icon-144x144.png', // Adicione outros se usar
  './icons/icon-152x152.png',
  './icons/icon-384x384.png',
  './icons/icon-128x128.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  // CDNs importantes (opcional, mas melhora offline se cachear)
  'https://cdn.jsdelivr.net/npm/boxicons@2.1.4/css/boxicons.min.css'
  // URLs do Firebase SDK são carregadas pelo HTML, serão cacheadas dinamicamente
];

// Evento 'install': Salva os arquivos do App Shell no cache
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Instalando v3...');
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => {
        console.log('[ServiceWorker] Cache aberto:', CACHE_NOME);
        // Usar addAll é atômico: falha se um arquivo não for encontrado
        return cache.addAll(listaUrlsParaCache)
          .catch(error => {
            console.error('[ServiceWorker] Falha ao adicionar arquivos ao cache durante install:', error);
            // Verificar quais URLs falharam pode ajudar a depurar caminhos errados
            console.error('URLs que tentamos cachear:', listaUrlsParaCache);
            // Não impede a instalação, mas o cache pode estar incompleto
          });
      })
      .then(() => {
        console.log('[ServiceWorker] Conteúdo estático cacheado. Ativando...');
        // Força o novo Service Worker a assumir o controle imediatamente
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Erro geral durante instalação:', error);
      })
  );
});

// Evento 'activate': Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Ativando v3...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Deleta caches que NÃO sejam o cache atual definido em CACHE_NOME
          if (cacheName !== CACHE_NOME) {
            console.log('[ServiceWorker] Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[ServiceWorker] Caches antigos limpos. Assumindo controle...');
        // Garante que o SW controle a página imediatamente após ativação
        return self.clients.claim();
    })
  );
});

// Evento 'fetch': Intercepta requisições de rede
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignora requisições que não são GET (como POST para login, etc.)
  // Ignora requisições para a API do Chrome Extensions
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    // console.log('[ServiceWorker] Ignorando requisição não-GET ou chrome-extension:', request.method, request.url);
    // Deixa a requisição seguir normalmente para a rede, sem interceptar
    return;
  }

  // Estratégia: Cache First (Tenta o cache, se falhar, vai pra rede)
  // Boa para assets estáticos (App Shell)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Se encontrou no cache, retorna a resposta do cache
        if (cachedResponse) {
          // console.log('[ServiceWorker] Servindo do Cache:', request.url);
          return cachedResponse;
        }

        // Se não encontrou no cache, busca na rede
        // console.log('[ServiceWorker] Buscando na Rede:', request.url);
        return fetch(request)
          .then((networkResponse) => {
            // Verifica se a resposta da rede foi bem-sucedida
            if (networkResponse && networkResponse.ok) {
              // Clona a resposta para poder salvar no cache E retornar ao navegador
              const responseToCache = networkResponse.clone();
              // Abre o cache e salva a resposta da rede
              caches.open(CACHE_NOME)
                .then((cache) => {
                  // console.log('[ServiceWorker] Cacheando resposta da rede:', request.url);
                  cache.put(request, responseToCache);
                });
            } else if (networkResponse) {
                // Loga respostas não-ok (ex: 404) mas não lança erro necessariamente
                console.warn('[ServiceWorker] Resposta da rede não foi OK:', networkResponse.status, request.url);
            }
            // Retorna a resposta original da rede (mesmo se não for 'ok', para o navegador lidar)
            return networkResponse;
          })
          .catch((error) => {
            // Falha ao buscar na rede (offline?)
            console.error('[ServiceWorker] Falha no fetch (rede indisponível?):', request.url, error);
            // Poderia retornar uma página offline padrão aqui, se tivesse uma
            // return new Response("Você está offline.", { headers: { 'Content-Type': 'text/plain' }});
            // Ou simplesmente deixar o navegador mostrar o erro padrão de offline
            throw error; // Propaga o erro
          });
      })
  );
});
