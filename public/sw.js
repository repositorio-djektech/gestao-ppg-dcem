/*
 * Service Worker de App Shell conservador para Gestão PPG-DCEM
 *
 * Estratégia de cache:
 * 1. App Shell e estáticos essenciais (HTML, CSS, JS, manifest, ícones, fontes):
 *    Cache-first / stale-while-revalidate conservador para ativos imutáveis,
 *    permitindo funcionamento offline após a primeira visita.
 * 2. Navegação (mode === 'navigate'):
 *    Sempre REDE primeiro (Network-first). Se offline ou falha de rede, fallback para o app shell (/index.html).
 * 3. Chamadas de API e dados (Supabase, Edge Functions, APIs externas):
 *    SEMPRE REDE (Network-only). Stale data é estritamente PROIBIDO porque o sistema trata de dados acadêmicos vivos.
 * 4. Métodos não-GET (POST, PUT, PATCH, DELETE):
 *    Direto para a rede (Network-only).
 */

const CACHE_NAME = 'ppg-dcem-shell-v1'

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/dcem-logo-trans-3d28d.webp',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon-180.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable-512.svg',
]

// Instalação do Service Worker: pré-carrega os ativos essenciais do app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          // Log suave sem abortar a instalação se algum recurso opcional falhar
          console.warn('[SW] Aviso no pré-cacheamento do app shell:', err)
        })
      })
      .then(() => self.skipWaiting()),
  )
})

// Ativação do Service Worker: limpa caches antigos e assume controle imediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Removendo cache obsoleto:', name)
              return caches.delete(name)
            }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const request = event.request

  // 1. Somente métodos GET são cacheados/interceptados
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  // 2. Chamadas de dados da API / Supabase / Edge Functions: SEMPRE REDE
  // Nunca interceptar chamadas ao backend do Supabase, auth, rest, storage ou funções
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/rest/v1') ||
    url.pathname.startsWith('/auth/v1') ||
    url.pathname.startsWith('/functions/v1') ||
    url.pathname.startsWith('/storage/v1') ||
    url.hostname.includes('api.openalex.org') ||
    url.hostname.includes('api.elsevier.com')
  ) {
    return
  }

  // 3. Requisições de Navegação (HTML da SPA): Network-first com fallback para index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Se obteve resposta válida, atualiza o cache do shell
          if (response && response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone)
            })
          }
          return response
        })
        .catch(async () => {
          // Offline: serve o app shell do cache
          const cachedResponse = await caches.match('/index.html')
          if (cachedResponse) {
            return cachedResponse
          }
          return caches.match('/')
        }),
    )
    return
  }

  // 4. Ativos estáticos originados do mesmo domínio ou fontes: Cache-first / Stale-while-revalidate
  const isSameOrigin = url.origin === self.location.origin
  const isStaticAsset =
    isSameOrigin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.woff') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.ttf') ||
      url.pathname.endsWith('.ico'))

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Se já está no cache, retorna imediatamente e atualiza em background
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache)
              })
            }
            return networkResponse
          })
          .catch(() => {
            // Em falha de rede para estáticos, se não tinha cache, retorna erro limpo
          })

        return cachedResponse || fetchPromise
      }),
    )
    return
  }

  // 5. Demais requisições de mesma origem: rede com fallback no cache
  if (isSameOrigin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response
        })
        .catch(() => {
          return caches.match(request)
        }),
    )
  }
})
