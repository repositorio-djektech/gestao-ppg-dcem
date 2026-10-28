import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { TablePaginationFooter } from './TablePaginationFooter'

describe('TablePaginationFooter', () => {
  it('renderiza corretamente com menos de 20 itens exibindo "Página 1 de 1"', () => {
    const handlePageChange = vi.fn()
    render(<TablePaginationFooter page={1} totalPages={1} onPageChange={handlePageChange} />)

    expect(screen.getByText('Página 1 de 1')).toBeDefined()
    expect(screen.getByText('Anterior')).toBeDefined()
    expect(screen.getByText('Próxima')).toBeDefined()
  })

  it('renderiza formato "Página 1 de 3" e lida com cliques em Próxima', () => {
    const handlePageChange = vi.fn()
    render(<TablePaginationFooter page={1} totalPages={3} onPageChange={handlePageChange} />)

    expect(screen.getByText('Página 1 de 3')).toBeDefined()

    const proximaBtn = screen.getByText('Próxima')
    fireEvent.click(proximaBtn)
    expect(handlePageChange).toHaveBeenCalledWith(2)
  })

  it('desabilita botão Anterior na primeira página', () => {
    const handlePageChange = vi.fn()
    render(<TablePaginationFooter page={1} totalPages={3} onPageChange={handlePageChange} />)

    const anteriorBtn = screen.getByText('Anterior').closest('a')
    expect(anteriorBtn?.className).toContain('pointer-events-none')
  })

  it('desabilita botão Próxima na última página', () => {
    const handlePageChange = vi.fn()
    render(<TablePaginationFooter page={3} totalPages={3} onPageChange={handlePageChange} />)

    const proximaBtn = screen.getByText('Próxima').closest('a')
    expect(proximaBtn?.className).toContain('pointer-events-none')
  })

  it('não renderiza barra de rolagem horizontal quando não há overflow', () => {
    const handlePageChange = vi.fn()
    render(<TablePaginationFooter page={1} totalPages={1} onPageChange={handlePageChange} />)

    expect(screen.queryByTestId('table-horizontal-scrollbar')).toBeNull()
  })
})
