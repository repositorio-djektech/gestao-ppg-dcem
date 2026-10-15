/**
 * Utilitário seguro para registro do Service Worker PWA no PPG-DCEM.
 *
 * Registra o service worker preferencialmente em ambientes de produção
 * ou quando suportado pelo navegador, sem interromper o HMR de desenvolvimento.
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  // Não interferir com Vite HMR no ambiente de desenvolvimento local puro
  const isDev = import.meta.env.DEV

  // Registra após o carregamento completo da página para não competir com a renderização inicial
  window.addEventListener('load', () => {
    // Em desenvolvimento podemos registrar se explicitamente habilitado, mas o padrão é focar em build/preview/prod
    // para evitar conflitos de HMR.
    if (isDev) {
      console.log('[PWA] Service Worker desativado em modo de desenvolvimento Vite (HMR ativo).')
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registrado com sucesso:', registration.scope)

        // Escutar atualizações do Service Worker
        registration.onupdatefound = () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[PWA] Nova versão do app disponível.')
              } else {
                console.log('[PWA] Conteúdo em cache para uso offline.')
              }
            }
          }
        }
      })
      .catch((error) => {
        console.warn('[PWA] Falha ao registrar Service Worker:', error)
      })
  })
}
