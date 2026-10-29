import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface FrameHorizontalScrollbarProps {
  /**
   * Ref para o contêiner com rolagem horizontal (overflow-y-auto overflow-x-... table-scroll-container)
   */
  targetRef: React.RefObject<HTMLElement | null>
  className?: string
}

interface ScrollMetrics {
  scrollWidth: number
  clientWidth: number
  scrollLeft: number
  hasOverflow: boolean
}

/**
 * Resolve o elemento que realmente possui rolagem horizontal.
 *
 * Em páginas com o componente shadcn <Table>, a tabela é envolvida internamente
 * por um `<div className="relative w-full overflow-auto table-scroll-container">`.
 * O contêiner externo (apontado por targetRef) rola na vertical, enquanto o contêiner
 * interno rola na horizontal.
 *
 * 1. Se o próprio contêiner externo tiver overflow horizontal real, usa ele;
 * 2. Caso contrário, busca o primeiro descendente com classe `.table-scroll-container`
 *    e verifica se este possui overflow horizontal;
 * 3. Se nenhum tiver overflow, retorna o próprio `targetRef` (ou null se inexistente),
 *    o que resultará em hasOverflow = false.
 */
export function resolveScrollElement(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null
  if (el.scrollWidth > el.clientWidth + 1) {
    return el
  }

  const inner = el.querySelector<HTMLElement>('.table-scroll-container')
  if (inner && inner.scrollWidth > inner.clientWidth + 1) {
    return inner
  }

  return el
}

/**
 * Barra de rolagem horizontal SEMPRE VISÍVEL para a "moldura estilo Supabase".
 *
 * Resolve o comportamento do macOS/iOS onde scrollbars nativas são overlay e
 * desaparecem quando o scroll vertical não está no fim da página.
 *
 * Características:
 * - Trilho sempre visível (~10px de altura, tons compatíveis com .table-scroll-container)
 * - Polegar (thumb) proporcional a clientWidth/scrollWidth e posicionado proporcionalmente
 * - Arrastável com pointer capture (drag suave sem travar se o ponteiro sair do trilho)
 * - Clique no trilho posiciona o centro do polegar no ponto clicado
 * - Só renderiza no breakpoint md+ (mesmo breakpoint da moldura desktop)
 * - Desaparece completamente (zero altura/faixa vazia) quando não há overflow horizontal (scrollWidth <= clientWidth + 1)
 */
export function FrameHorizontalScrollbar({ targetRef, className }: FrameHorizontalScrollbarProps) {
  const [metrics, setMetrics] = useState<ScrollMetrics>({
    scrollWidth: 0,
    clientWidth: 0,
    scrollLeft: 0,
    hasOverflow: false,
  })

  const trackRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{
    pointerX: number
    scrollLeft: number
  }>({ pointerX: 0, scrollLeft: 0 })

  const updateMetrics = useCallback(() => {
    const rawEl = targetRef.current
    const el = resolveScrollElement(rawEl)
    if (!el) {
      setMetrics((prev) =>
        prev.hasOverflow
          ? { scrollWidth: 0, clientWidth: 0, scrollLeft: 0, hasOverflow: false }
          : prev,
      )
      return
    }

    const { scrollWidth, clientWidth, scrollLeft } = el
    const hasOverflow = scrollWidth > clientWidth + 1

    setMetrics((prev) => {
      if (
        prev.scrollWidth === scrollWidth &&
        prev.clientWidth === clientWidth &&
        Math.abs(prev.scrollLeft - scrollLeft) < 0.5 &&
        prev.hasOverflow === hasOverflow
      ) {
        return prev
      }
      return {
        scrollWidth,
        clientWidth,
        scrollLeft,
        hasOverflow,
      }
    })
  }, [targetRef])

  useEffect(() => {
    const rootEl = targetRef.current
    if (!rootEl) return

    updateMetrics()

    let activeScrollEl = resolveScrollElement(rootEl)

    let rafId: number | null = null
    const handleScroll = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        updateMetrics()
      })
    }

    // Registra listener no elemento atualmente resolvido e no próprio contêiner raiz
    rootEl.addEventListener('scroll', handleScroll, { passive: true })
    if (activeScrollEl && activeScrollEl !== rootEl) {
      activeScrollEl.addEventListener('scroll', handleScroll, { passive: true })
    }

    // ResizeObserver monitora o elemento resolvido e sua primeira child
    let resizeObserver: ResizeObserver | null = null
    const setupObservers = (target: HTMLElement | null) => {
      if (typeof ResizeObserver === 'undefined') return
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      resizeObserver = new ResizeObserver(() => {
        const nextResolved = resolveScrollElement(rootEl)
        if (nextResolved !== activeScrollEl) {
          if (activeScrollEl && activeScrollEl !== rootEl) {
            activeScrollEl.removeEventListener('scroll', handleScroll)
          }
          activeScrollEl = nextResolved
          if (activeScrollEl && activeScrollEl !== rootEl) {
            activeScrollEl.addEventListener('scroll', handleScroll, { passive: true })
          }
          setupObservers(activeScrollEl)
        }
        updateMetrics()
      })

      if (rootEl) {
        resizeObserver.observe(rootEl)
      }
      if (target && target !== rootEl) {
        resizeObserver.observe(target)
      }
      if (target?.firstElementChild) {
        resizeObserver.observe(target.firstElementChild)
      }
    }

    setupObservers(activeScrollEl)

    const handleWindowResize = () => updateMetrics()
    window.addEventListener('resize', handleWindowResize)

    return () => {
      rootEl.removeEventListener('scroll', handleScroll)
      if (activeScrollEl && activeScrollEl !== rootEl) {
        activeScrollEl.removeEventListener('scroll', handleScroll)
      }
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [targetRef, updateMetrics])

  const { scrollWidth, clientWidth, scrollLeft, hasOverflow } = metrics

  if (!hasOverflow || clientWidth <= 0 || scrollWidth <= 0) {
    return null
  }

  const maxScrollLeft = Math.max(1, scrollWidth - clientWidth)
  const clampedScrollLeft = Math.min(Math.max(0, scrollLeft), maxScrollLeft)

  // Thumb width proporcional, com mínimo de 24px para usabilidade
  const thumbRatio = Math.min(1, clientWidth / scrollWidth)
  const thumbWidthPercent = Math.max(thumbRatio * 100, 3)

  // Deslocamento do thumb em porcentagem do espaço disponível no trilho
  const scrollFraction = clampedScrollLeft / maxScrollLeft
  const leftPercent = scrollFraction * (100 - thumbWidthPercent)

  const handlePointerDownThumb = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const el = resolveScrollElement(targetRef.current)
    if (!el) return

    isDraggingRef.current = true
    setIsDragging(true)
    dragStartRef.current = {
      pointerX: e.clientX,
      scrollLeft: el.scrollLeft,
    }

    const currentThumb = e.currentTarget
    currentThumb.setPointerCapture(e.pointerId)
  }

  const handlePointerMoveThumb = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const el = resolveScrollElement(targetRef.current)
    const track = trackRef.current
    if (!el || !track) return

    const trackRect = track.getBoundingClientRect()
    const availableTrackWidth = trackRect.width * (1 - thumbWidthPercent / 100)
    if (availableTrackWidth <= 0) return

    const deltaX = e.clientX - dragStartRef.current.pointerX
    const deltaScroll = (deltaX / availableTrackWidth) * (el.scrollWidth - el.clientWidth)
    el.scrollLeft = dragStartRef.current.scrollLeft + deltaScroll
  }

  const handlePointerUpThumb = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Ignora erro se ponteiro já tiver sido liberado
    }
  }

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Se o clique foi diretamente no polegar, o handler do polegar já faz e.stopPropagation()
    const el = resolveScrollElement(targetRef.current)
    const track = trackRef.current
    if (!el || !track) return

    const trackRect = track.getBoundingClientRect()
    if (trackRect.width <= 0) return

    const clickX = e.clientX - trackRect.left
    const clickRatio = Math.min(Math.max(0, clickX / trackRect.width), 1)

    // Centralizar o thumb no clique:
    // leftFraction = clickRatio - (thumbRatio / 2)
    const thumbFrac = thumbWidthPercent / 100
    const desiredLeftRatio = Math.min(
      Math.max(0, (clickRatio - thumbFrac / 2) / (1 - thumbFrac)),
      1,
    )

    el.scrollLeft = desiredLeftRatio * (el.scrollWidth - el.clientWidth)
  }

  return (
    <div
      ref={trackRef}
      role="scrollbar"
      aria-orientation="horizontal"
      aria-valuenow={Math.round(clampedScrollLeft)}
      aria-valuemin={0}
      aria-valuemax={Math.round(maxScrollLeft)}
      data-testid="frame-horizontal-scrollbar"
      onPointerDown={handleTrackPointerDown}
      className={cn(
        // Só renderiza no breakpoint desktop md: (moldura estilo Supabase)
        'hidden md:block shrink-0 relative select-none cursor-pointer',
        'h-[10px] w-full',
        // Fundo no mesmo tom do track da classe table-scroll-container
        'bg-slate-100/90 dark:bg-neutral-800/80',
        'transition-colors',
        className,
      )}
    >
      <div
        data-testid="frame-horizontal-scrollbar-thumb"
        onPointerDown={handlePointerDownThumb}
        onPointerMove={handlePointerMoveThumb}
        onPointerUp={handlePointerUpThumb}
        onPointerCancel={handlePointerUpThumb}
        style={{
          left: `${leftPercent}%`,
          width: `${thumbWidthPercent}%`,
        }}
        className={cn(
          'absolute top-0 bottom-0 h-full rounded-full transition-[background-color] duration-150',
          // Tons correspondentes ao thumb de table-scroll-container (slate-400 no light, zinc/neutral no dark)
          'bg-slate-400/70 hover:bg-slate-500/90 dark:bg-neutral-500/70 dark:hover:bg-neutral-400/90',
          isDragging ? 'bg-slate-500/95 dark:bg-neutral-400/95 cursor-grabbing' : 'cursor-grab',
        )}
      />
    </div>
  )
}

export default FrameHorizontalScrollbar
