import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import { PeriodoFiltro, PERIODO_FILTRO_VAZIO, filtroDoValor } from './PeriodoFiltro'

afterEach(cleanup)

describe('PeriodoFiltro', () => {
  it('digitar os anos devolve o valor ao pai', () => {
    const onChange = vi.fn()
    render(<PeriodoFiltro valor={PERIODO_FILTRO_VAZIO} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/ano inicial/i), { target: { value: '2021' } })
    expect(onChange).toHaveBeenCalledWith({ inicio: '2021', fim: '' })
  })

  it('o atalho usa o período de avaliação ativo (padrão 2025–2028)', () => {
    const onChange = vi.fn()
    render(<PeriodoFiltro valor={PERIODO_FILTRO_VAZIO} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /avaliação 2025–2028/i }))
    expect(onChange).toHaveBeenCalledWith({ inicio: '2025', fim: '2028' })
  })

  it('"Tudo" limpa e só aparece com filtro', () => {
    const onChange = vi.fn()
    const { rerender } = render(<PeriodoFiltro valor={PERIODO_FILTRO_VAZIO} onChange={onChange} />)
    expect(screen.queryByRole('button', { name: /tudo/i })).toBeNull()
    rerender(<PeriodoFiltro valor={{ inicio: '2021', fim: '2023' }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /tudo/i }))
    expect(onChange).toHaveBeenCalledWith(PERIODO_FILTRO_VAZIO)
  })

  it('intervalo invertido mostra aviso e não filtra', () => {
    const valor = { inicio: '2024', fim: '2022' }
    render(<PeriodoFiltro valor={valor} onChange={() => {}} />)
    expect(screen.getByRole('alert').textContent).toMatch(/maior/)
    expect(filtroDoValor(valor)).toBeNull()
  })
})
