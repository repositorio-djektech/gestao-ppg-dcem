import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

export interface TablePaginationFooterProps {
  page: number
  totalPages: number
  onPageChange: (newPage: number) => void
  targetRef?: React.RefObject<HTMLElement | null>
  totalItems?: number
  className?: string
}

export function TablePaginationFooter({
  page,
  totalPages,
  onPageChange,
  targetRef,
  className,
}: TablePaginationFooterProps) {
  const safeTotalPages = Math.max(1, totalPages || 1)
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages)

  const desktopScrollbarRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [contentWidth, setContentWidth] = useState(0)
  const isSyncingRef = useRef(false)

  // Mede o offset da área de conteúdo descontando a sidebar (acompanha colapso/abertura)
  const [sidebarOffset, setSidebarOffset] = useState({ left: 0, width: '100%' })

  // Mede e sincroniza dimensões do elemento alvo e da sidebar
  const updateMetrics = useCallback(() => {
    const el = targetRef?.current
    if (!el) {
      setHasOverflow(false)
      setContentWidth(0)
    } else {
      const { scrollWidth, clientWidth } = el
      const overflow = scrollWidth > clientWidth + 2
      setHasOverflow(overflow)
      setContentWidth(scrollWidth)

      // Sincroniza posição do scrollbar customizado com a tabela
      if (desktopScrollbarRef.current && !isSyncingRef.current) {
        desktopScrollbarRef.current.scrollLeft = el.scrollLeft
      }
    }

    // Calcula alinhamento horizontal com base na área de conteúdo/sidebar
    if (typeof window !== 'undefined') {
      const sidebarEl =
        document.querySelector('aside') ||
        document.querySelector('[data-sidebar="sidebar"]') ||
        document.querySelector('.hidden.lg\\:flex')
      const mainEl = document.querySelector('main')

      if (mainEl) {
        const mainRect = mainEl.getBoundingClientRect()
        setSidebarOffset({
          left: Math.max(0, mainRect.left),
          width: `${mainRect.width}px`,
        })
      } else if (sidebarEl && window.innerWidth >= 1024) {
        const sidebarRect = sidebarEl.getBoundingClientRect()
        const left = sidebarRect.right
        setSidebarOffset({
          left,
          width: `calc(100% - ${left}px)`,
        })
      } else {
        setSidebarOffset({ left: 0, width: '100%' })
      }
    }
  }, [targetRef])

  useEffect(() => {
    const el = targetRef?.current

    updateMetrics()

    const handleTargetScroll = () => {
      if (!el || isSyncingRef.current) return
      isSyncingRef.current = true
      if (desktopScrollbarRef.current) {
        desktopScrollbarRef.current.scrollLeft = el.scrollLeft
      }
      requestAnimationFrame(() => {
        isSyncingRef.current = false
      })
    }

    if (el) {
      el.addEventListener('scroll', handleTargetScroll, { passive: true })
    }

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateMetrics()
      })
      if (el) {
        ro.observe(el)
        const firstChild = el.firstElementChild
        if (firstChild) ro.observe(firstChild)
      }
      const mainEl = typeof document !== 'undefined' ? document.querySelector('main') : null
      if (mainEl) ro.observe(mainEl)
      const sidebarEl =
        typeof document !== 'undefined'
          ? document.querySelector('aside') || document.querySelector('.hidden.lg\\:flex')
          : null
      if (sidebarEl) ro.observe(sidebarEl)
    }

    const handleWindowResize = () => updateMetrics()
    window.addEventListener('resize', handleWindowResize)

    // Intervalo de backup para transições de mola da sidebar (spring transition)
    const interval = setInterval(updateMetrics, 100)
    const timeout = setTimeout(() => clearInterval(interval), 1000)

    return () => {
      if (el) el.removeEventListener('scroll', handleTargetScroll)
      window.removeEventListener('resize', handleWindowResize)
      clearInterval(interval)
      clearTimeout(timeout)
      if (ro) ro.disconnect()
    }
  }, [targetRef, updateMetrics])

  const handleScrollbarScroll = () => {
    const el = targetRef?.current
    const bar = desktopScrollbarRef.current
    if (!el || !bar || isSyncingRef.current) return

    isSyncingRef.current = true
    el.scrollLeft = bar.scrollLeft
    requestAnimationFrame(() => {
      isSyncingRef.current = false
    })
  }

  const paginationNav = (
    <Pagination className="justify-center">
      <PaginationContent className="gap-2 sm:gap-4 justify-center">
        <PaginationItem>
          <PaginationPrevious
            onClick={(e) => {
              e.preventDefault()
              if (safePage > 1) {
                onPageChange(safePage - 1)
              }
            }}
            className={
              safePage <= 1
                ? 'pointer-events-none opacity-40 cursor-not-allowed select-none'
                : 'cursor-pointer hover:bg-white text-slate-700'
            }
          >
            Anterior
          </PaginationPrevious>
        </PaginationItem>
        <PaginationItem>
          <span className="px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">
            Página {safePage} de {safeTotalPages}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            onClick={(e) => {
              e.preventDefault()
              if (safePage < safeTotalPages) {
                onPageChange(safePage + 1)
              }
            }}
            className={
              safePage >= safeTotalPages
                ? 'pointer-events-none opacity-40 cursor-not-allowed select-none'
                : 'cursor-pointer hover:bg-white text-slate-700'
            }
          >
            Próxima
          </PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )

  return (
    <>
      {/* Rodapé MOBILE (< md): no fluxo normal do documento, touch nativo preservado */}
      <div
        className={cn(
          'md:hidden border-t border-slate-200 bg-slate-50 shrink-0 select-none py-2.5 px-3 shadow-xs',
          className,
        )}
        data-testid="table-pagination-footer-mobile"
      >
        {paginationNav}
      </div>

      {/* Rodapé DESKTOP (>= md): FIXED na base da viewport, estilo editor de tabelas Supabase */}
      <div
        className={cn(
          'fixed bottom-0 z-40 hidden md:block bg-slate-50 border-t border-slate-200 shadow-md select-none transition-all duration-150 ease-out',
          className,
        )}
        style={{
          left: sidebarOffset.left > 0 ? `${sidebarOffset.left}px` : undefined,
          width: sidebarOffset.width !== '100%' ? sidebarOffset.width : undefined,
          right: sidebarOffset.left > 0 ? 0 : 0,
        }}
        data-testid="table-pagination-footer"
      >
        {/* Barra de rolagem horizontal COLADA na linha do topo do rodapé (mt-0, sem border-b) */}
        {hasOverflow && (
          <div
            ref={desktopScrollbarRef}
            onScroll={handleScrollbarScroll}
            className="w-full overflow-x-auto overflow-y-hidden table-footer-scrollbar h-[10px] relative z-10 shrink-0 mt-0"
            style={{ willChange: 'scroll-position' }}
            aria-hidden="true"
            data-testid="table-horizontal-scrollbar"
          >
            <div style={{ width: `${contentWidth}px`, height: '1px' }} />
          </div>
        )}

        {/* Paginação padronizada CENTRALIZADA: < Anterior   Página X de Y   Próxima > */}
        <div className="py-2.5 px-3 flex items-center justify-center">{paginationNav}</div>
      </div>
    </>
  )
}

export default TablePaginationFooter
