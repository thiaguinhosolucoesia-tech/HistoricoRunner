// ARQUIVO DE SERVICE WORKER (V14 - FINAL CORRIGIDO)
// CORREÇÃO: Estratégia de cache otimizada para evitar Quota Exceeded em requisições grandes (Firebase/Cloudinary)

const CACHE_NAME = 'curriculo-corredores-v14'; // Versão final
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/main-logic.js',
    '/js/admin-logic.js',
    '/js/config.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/manifest.json'
];

// Instalação: Cacheia o App Shell
self.addEventListener('install', event => {
    console.log('[ServiceWorker] Instalando (v14 - Corrigido)...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Cacheando App Shell (v14)');
                return cache.addAll(urlsToCache).catch(error => {
                    // Adiciona tratamento de erro para Quota Exceeded durante a instalação
                    if (error.name === 'QuotaExceededError') {
                        console.error('[ServiceWorker] Falha ao cachear o App Shell: Quota exceeded. Continuar...');
                        // Se falhar por quota, continua sem cachear tudo
                        return Promise.resolve();
                    }
                    throw error;
                });
            })
    );
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Ativando (v14)...');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log(`[ServiceWorker] Limpando cache antigo: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[ServiceWorker] Ativado (v14) e pronto.');
        })
    );
});

// Fetch: Estratégia de Cache-First para App Shell, Network-Only para tudo mais
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 1. Network-Only para requisições de terceiros (Firebase, Cloudinary, etc.)
    // Isso EVITA o erro Quota Exceeded ao tentar cachear dados grandes de upload/download.
    if (url.origin !== location.origin) {
        return;
    }

    // 2. Cache-First para o App Shell (arquivos locais)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retorna do cache se encontrado
                if (response) {
                    return response;
                }

                // Se não estiver no cache, busca na rede
                return fetch(event.request).then(
                    response => {
                        // Verifica se é uma resposta válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clona a resposta para que possamos colocá-la no cache
                        const responseToCache = response.clone();

                        // Tenta adicionar ao cache (com tratamento de erro para Quota Exceeded)
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache).catch(error => {
                                    if (error.name === 'QuotaExceededError') {
                                        console.warn('[ServiceWorker] Falha ao salvar no cache: Quota exceeded. Continuar...');
                                    } else {
                                        console.error('[ServiceWorker] Erro ao salvar no cache:', error);
                                    }
                                });
                            });

                        return response;
                    }
                );
            })
    );
});