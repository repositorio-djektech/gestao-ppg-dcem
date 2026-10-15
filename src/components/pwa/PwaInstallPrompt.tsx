import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react'

// Interface para o evento beforeinstallprompt padrão do Chromium/Android
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const STORAGE_KEY_DISMISSED = 'ppg_dcem_pwa_prompt_dismissed_until'
// Se o usuário dispensar, respeitamos e não incomodamos por 14 dias
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isIosPrompt, setIsIosPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // 1. Detectar se o app já está rodando em modo standalone / PWA instalado
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://')

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // 2. Verificar se o prompt foi dispensado recentemente
    try {
      const dismissedUntilStr = localStorage.getItem(STORAGE_KEY_DISMISSED)
      if (dismissedUntilStr) {
        const dismissedUntil = parseInt(dismissedUntilStr, 10)
        if (!isNaN(dismissedUntil) && Date.now() < dismissedUntil) {
          return // Dispensado temporariamente
        }
      }
    } catch {
      // Ignora erro de acesso ao localStorage (ex: navegação privada restrita)
    }

    // 3. Escuta do evento nativo `beforeinstallprompt` (Android, Chrome, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsVisible(true)
      setIsIosPrompt(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Escuta evento de instalação concluída
    const handleAppInstalled = () => {
      setIsVisible(false)
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    // 4. Detecção de iOS Safari (onde não há `beforeinstallprompt`)
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIos = /iphone|ipad|ipod/.test(userAgent)
    const isSafari =
      /safari/.test(userAgent) &&
      !/crios|fxios|edgios|opt|brave/.test(userAgent) &&
      !userAgent.includes('chrome')

    // Mostra dica para iOS apenas em telas touch pequenas (< 768px) e após um leve delay de cortesia
    if (isIos && isSafari && !isStandalone) {
      const isMobileScreen = window.innerWidth < 768
      if (isMobileScreen) {
        const timer = setTimeout(() => {
          setIsIosPrompt(true)
          setIsVisible(true)
        }, 3500)
        return () => {
          clearTimeout(timer)
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
          window.removeEventListener('appinstalled', handleAppInstalled)
        }
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false)
        setDeferredPrompt(null)
      } else {
        handleDismiss()
      }
    } catch (err) {
      console.warn('[PWA] Erro ao disparar prompt de instalação:', err)
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    try {
      const dismissedUntil = Date.now() + DISMISS_DURATION_MS
      localStorage.setItem(STORAGE_KEY_DISMISSED, dismissedUntil.toString())
    } catch {
      // Ignora erro
    }
  }

  if (!isVisible || isInstalled) {
    return null
  }

  return (
    <aside
      aria-label="Instalação do aplicativo PPG-DCEM"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-fade-in-up"
    >
      <div className="rounded-xl border border-blue-200 bg-white dark:bg-neutral-900 shadow-xl p-3.5 sm:p-4 text-neutral-900 dark:text-neutral-100 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100 truncate leading-snug">
                Instalar Gestão PPG-DCEM
              </span>
              <span className="text-xs text-slate-500 dark:text-neutral-400 leading-snug">
                {isIosPrompt
                  ? 'Acesso rápido como app nativo na sua tela de início.'
                  : 'Instale o app para navegação rápida e uso offline.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1 -mr-1 -mt-1 rounded-md transition-colors"
            title="Fechar aviso de instalação"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isIosPrompt ? (
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 dark:border-neutral-800 text-xs text-slate-600 dark:text-neutral-300">
            <p className="flex items-center gap-1.5 leading-relaxed">
              <span>Para instalar no iOS: toque no botão</span>
              <Share className="h-3.5 w-3.5 text-primary inline shrink-0" />
              <strong className="font-medium text-slate-800 dark:text-neutral-100">
                Compartilhar
              </strong>
            </p>
            <p className="flex items-center gap-1.5 leading-relaxed">
              <span>e selecione</span>
              <PlusSquare className="h-3.5 w-3.5 text-primary inline shrink-0" />
              <strong className="font-medium text-slate-800 dark:text-neutral-100">
                Adicionar à Tela de Início
              </strong>
              .
            </p>
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-7 text-xs text-slate-600 hover:text-slate-900 dark:text-neutral-300 px-2"
              >
                Entendi
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 text-xs text-slate-600 hover:text-slate-900 dark:text-neutral-300"
            >
              Agora não
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleInstallClick}
              className="h-8 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Instalar app</span>
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}
