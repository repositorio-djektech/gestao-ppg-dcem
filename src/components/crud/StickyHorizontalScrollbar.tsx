import * as React from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

export interface StickyHorizontalScrollbarProps {
  /**
   * Ref para o contêiner rolável (scroll container com overflow-x)
   * que contém a tabela ou conteúdo com largura maior que a tela.
   */
  targetRef: React.RefObject<HTMLElement | null>
  className?: string
}

/**
 * Componente que renderiza uma barra de rolagem horizontal flutuante (sticky)
 * sincronizada bidirecionalmente com o contêiner de rolagem da tabela.
 *
 * Características:
 * 1. Em desktop apenas (lg:block, hidden no mobile para respeitar o touch nativo).
 * 2. Permanece fixada no fundo visível da tabela enquanto houver overflow horizontal.
 * 3. Se a barra nativa do contêiner já estiver visível na tela, a barra sticky se oculta automaticamente.
 * 4. Desaparece completamente quando a tabela NÃO tiver overflow horizontal.
 * 5. Cores sutis padrão do sistema (cinza neutro) sem faixas forçadas.
 */
export function StickyHorizontalScrollbar({
  targetRef,
  className,
}: StickyHorizontalScrollbarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const isSyncingFromTarget = useRef(false)
  const isSyncingFromBar = useRef(false)

  const [hasOverflow, setHasOverflow] = useState(false)
  const [contentWidth, setContentWidth] = useState(0)
  const [isNativeBarVisible, setIsNativeBarVisible] = useState(false)

  // Mede dimensões e overflow do target
  const checkDimensions = useCallback(() => {
    const target = targetRef.current
    if (!target) {
      setHasOverflow(false)
      setContentWidth(0)
      return
    }

    const scrollW = target.scrollWidth
    const clientW = target.clientWidth
    const overflow = scrollW > clientW + 2 // margem de 2px para evitar falsos positivos de subpixel

    setHasOverflow(overflow)
    setContentWidth(scrollW)

    // Sincroniza a posição inicial da barra caso tenha overflow
    if (overflow && barRef.current) {
      if (Math.abs(barRef.current.scrollLeft - target.scrollLeft) > 1) {
        isSyncingFromTarget.current = true
        barRef.current.scrollLeft = target.scrollLeft
        requestAnimationFrame(() => {
          isSyncingFromTarget.current = false
        })
      }
    }
  }, [targetRef])

  // Checa se a base do target (onde fica a barra nativa) já está visível na viewport
  const checkVisibility = useCallback(() => {
    const target = targetRef.current
    if (!target) {
      setIsNativeBarVisible(false)
      return
    }

    const rect = target.getBoundingClientRect()
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight

    const bottomIsVisible = rect.bottom <= viewportHeight + 4
    const outOfView = rect.bottom <= 0 || rect.top >= viewportHeight

    setIsNativeBarVisible(bottomIsVisible || outOfView)
  }, [targetRef])

  // Sincronização do scroll do target -> bar
  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    const handleTargetScroll = () => {
      if (isSyncingFromBar.current) return
      if (!barRef.current) return

      isSyncingFromTarget.current = true
      barRef.current.scrollLeft = target.scrollLeft
      requestAnimationFrame(() => {
        isSyncingFromTarget.current = false
      })
    }

    target.addEventListener('scroll', handleTargetScroll, { passive: true })
    return () => {
      target.removeEventListener('scroll', handleTargetScroll)
    }
  }, [targetRef])

  // Sincronização do scroll da bar -> target
  const handleBarScroll = () => {
    if (isSyncingFromTarget.current) return
    const target = targetRef.current
    const bar = barRef.current
    if (!target || !bar) return

    isSyncingFromBar.current = true
    target.scrollLeft = bar.scrollLeft
    requestAnimationFrame(() => {
      isSyncingFromBar.current = false
    })
  }

  // Observer de redimensionamento e scroll da janela/layout
  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    checkDimensions()
    checkVisibility()

    const resizeObserver = new ResizeObserver(() => {
      checkDimensions()
      checkVisibility()
    })

    resizeObserver.observe(target)
    if (target.firstElementChild) {
      resizeObserver.observe(target.firstElementChild)
    }

    const handleWindowEvents = () => {
      checkDimensions()
      checkVisibility()
    }

    window.addEventListener('resize', handleWindowEvents)
    window.addEventListener('scroll', handleWindowEvents, { passive: true })

    const mainContainer = target.closest('main')
    if (mainContainer) {
      mainContainer.addEventListener('scroll', handleWindowEvents, { passive: true })
    }

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleWindowEvents)
      window.removeEventListener('scroll', handleWindowEvents)
      if (mainContainer) {
        mainContainer.removeEventListener('scroll', handleWindowEvents)
      }
    }
  }, [targetRef, checkDimensions, checkVisibility])

  // Se não houver overflow horizontal ou se a barra nativa já estiver visível na tela, não renderiza
  if (!hasOverflow || isNativeBarVisible) {
    return null
  }

  return (
    <div
      ref={barRef}
      onScroll={handleBarScroll}
      className={cn('hidden lg:block sticky-table-scrollbar shrink-0', className)}
      aria-hidden="true"
      title="Role horizontalmente para ver todas as colunas"
    >
      <div
        style={{
          width: `${contentWidth}px`,
          height: '1px',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
export default StickyHorizontalScrollbar
