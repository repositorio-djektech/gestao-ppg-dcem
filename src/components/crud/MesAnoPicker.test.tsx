import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import { MesAnoPicker } from './MesAnoPicker'

afterEach(cleanup)

describe('Seletor de mês e ano (D-29)', () => {
  it('mostra MM/AAAA do valor gravado; só o ano (dado antigo) aparece como fevereiro', () => {
    const { rerender } = render(<MesAnoPicker id="x" value="2025-03" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /03\/2025/ })).toBeTruthy()
    rerender(<MesAnoPicker id="x" value="2025" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /02\/2025/ })).toBeTruthy()
  })

  it('vazio mostra o texto de ajuda', () => {
    render(
      <MesAnoPicker id="x" value="" placeholder="Selecione mês e ano..." onChange={() => {}} />,
    )
    expect(screen.getByText('Selecione mês e ano...')).toBeTruthy()
  })

  it('escolher um mês devolve AAAA-MM do ano exibido, e dá para navegar entre os anos', () => {
    const onChange = vi.fn()
    render(<MesAnoPicker id="x" value="2025-03" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /03\/2025/ }))
    fireEvent.click(screen.getByTitle('Ano anterior'))
    expect(screen.getByText('2024')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Set' }))
    expect(onChange).toHaveBeenCalledWith('2024-09')
  })

  it('limpar devolve vazio quando o campo não é obrigatório; obrigatório não oferece limpar', () => {
    const onChange = vi.fn()
    const { rerender } = render(<MesAnoPicker id="x" value="2025-03" onChange={onChange} />)
    fireEvent.click(screen.getByTitle('Limpar'))
    expect(onChange).toHaveBeenCalledWith('')
    rerender(<MesAnoPicker id="x" value="2025-03" required onChange={onChange} />)
    expect(screen.queryByTitle('Limpar')).toBeNull()
  })
})
