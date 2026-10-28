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

  const scrollbarRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [contentWidth, setContentWidth] = useState(0)
  const isSyncingRef = useRef(false)

  // Mede e sincroniza dimensões do elemento alvo
  const updateMetrics = useCallback(() => {
    const el = targetRef?.current
    if (!el) {
      setHasOverflow(false)
      setContentWidth(0)
      return
    }

    const { scrollWidth, clientWidth } = el
    const overflow = scrollWidth > clientWidth + 2
    setHasOverflow(overflow)
    setContentWidth(scrollWidth)

    // Sincroniza posição do scrollbar customizado com a tabela
    if (scrollbarRef.current && !isSyncingRef.current) {
      scrollbarRef.current.scrollLeft = el.scrollLeft
    }
  }, [targetRef])

  useEffect(() => {
    const el = targetRef?.current
    if (!el) return

    updateMetrics()

    const handleTargetScroll = () => {
      if (isSyncingRef.current) return
      isSyncingRef.current = true
      if (scrollbarRef.current) {
        scrollbarRef.current.scrollLeft = el.scrollLeft
      }
      requestAnimationFrame(() => {
        isSyncingRef.current = false
      })
    }

    el.addEventListener('scroll', handleTargetScroll, { passive: true })

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateMetrics()
      })
      ro.observe(el)
      const firstChild = el.firstElementChild
      if (firstChild) ro.observe(firstChild)
    }

    const handleWindowResize = () => updateMetrics()
    window.addEventListener('resize', handleWindowResize)

    return () => {
      el.removeEventListener('scroll', handleTargetScroll)
      window.removeEventListener('resize', handleWindowResize)
      if (ro) ro.disconnect()
    }
  }, [targetRef, updateMetrics])

  const handleScrollbarScroll = () => {
    const el = targetRef?.current
    const bar = scrollbarRef.current
    if (!el || !bar || isSyncingRef.current) return

    isSyncingRef.current = true
    el.scrollLeft = bar.scrollLeft
    requestAnimationFrame(() => {
      isSyncingRef.current = false
    })
  }

  return (
    <div
      className={cn(
        'border-t border-slate-200 bg-slate-50/70 shrink-0 select-none relative flex flex-col',
        className,
      )}
      data-testid="table-pagination-footer"
    >
      {/* Barra de rolagem horizontal COLADA no topo da div de paginação (visível no desktop se houver overflow horizontal) */}
      {hasOverflow && (
        <div
          ref={scrollbarRef}
          onScroll={handleScrollbarScroll}
          className="hidden md:block w-full overflow-x-auto overflow-y-hidden table-footer-scrollbar h-[10px] relative z-10 shrink-0 border-b border-slate-200/60"
          style={{ willChange: 'scroll-position' }}
          aria-hidden="true"
          data-testid="table-horizontal-scrollbar"
        >
          <div style={{ width: `${contentWidth}px`, height: '1px' }} />
        </div>
      )}

      {/* Paginação padronizada: <Anterior    Página X de Y    Próxima> */}
      <div className="py-2.5 px-3">
        <Pagination>
          <PaginationContent className="gap-2 sm:gap-4">
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
      </div>
    </div>
  )
}

export default TablePaginationFooter
