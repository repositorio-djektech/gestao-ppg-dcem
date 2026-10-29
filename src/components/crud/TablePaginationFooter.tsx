import React from 'react'
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
  className,
}: TablePaginationFooterProps) {
  const safeTotalPages = Math.max(1, totalPages || 1)
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages)

  return (
    <footer
      className={cn(
        'shrink-0 border-t border-slate-200 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-900/80 select-none px-3 flex items-center justify-center h-[52px]',
        className,
      )}
      data-testid="table-pagination-footer"
    >
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
                  : 'cursor-pointer hover:bg-white text-slate-700 dark:text-neutral-200'
              }
            >
              Anterior
            </PaginationPrevious>
          </PaginationItem>
          <PaginationItem>
            <span className="px-2 sm:px-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-neutral-200 whitespace-nowrap">
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
                  : 'cursor-pointer hover:bg-white text-slate-700 dark:text-neutral-200'
              }
            >
              Próxima
            </PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </footer>
  )
}

export default TablePaginationFooter
