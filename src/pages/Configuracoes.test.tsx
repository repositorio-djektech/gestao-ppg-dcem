import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import React from 'react'
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'

const salvarPeriodo = vi.fn()
const salvarConfiguracao = vi.fn()
const ativarPeriodo = vi.fn()
const excluirPeriodo = vi.fn()
const recarregar = vi.fn()
let papel = 'coordenador'

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ role: papel }) }))
vi.mock('@/hooks/use-periodo', () => ({
  usePeriodo: () => ({
    periodo: {
      id: 1,
      nome: 'Quadriênio 2025–2028',
      anoInicio: 2025,
      anoFim: 2028,
      ativo: true,
      anoReferencia: null,
    },
    periodos: [
      {
        id: 2,
        nome: 'Triênio 2029–2031',
        anoInicio: 2029,
        anoFim: 2031,
        ativo: false,
        anoReferencia: null,
      },
      {
        id: 1,
        nome: 'Quadriênio 2025–2028',
        anoInicio: 2025,
        anoFim: 2028,
        ativo: true,
        anoReferencia: null,
      },
    ],
    configuracao: { lattesAnoInicio: 2020, lattesAnoFim: null },
    recarregar,
  }),
}))
vi.mock('@/services/periodos', () => ({
  salvarPeriodo: (...a: any[]) => salvarPeriodo(...a),
  salvarConfiguracao: (...a: any[]) => salvarConfiguracao(...a),
  ativarPeriodo: (...a: any[]) => ativarPeriodo(...a),
  excluirPeriodo: (...a: any[]) => excluirPeriodo(...a),
}))
vi.mock('@/services/logs', () => ({ registrarLog: vi.fn() }))

import Configuracoes from './Configuracoes'

beforeEach(() => {
  papel = 'coordenador'
  salvarPeriodo.mockReset().mockResolvedValue({ ok: true })
  salvarConfiguracao.mockReset().mockResolvedValue({ ok: true })
  ativarPeriodo.mockReset().mockResolvedValue({ ok: true })
  excluirPeriodo.mockReset().mockResolvedValue({ ok: true })
  recarregar.mockReset().mockResolvedValue(undefined)
})
afterEach(cleanup)

describe('Configurações', () => {
  it('lista os períodos e marca o ativo', () => {
    render(<Configuracoes />)
    expect(screen.getByText('Triênio 2029–2031')).toBeTruthy()
    expect(screen.getByText(/\(3 anos\)/)).toBeTruthy()
    expect(screen.getByText('Ativo')).toBeTruthy()
  })

  it('ativar um período chama o serviço e recarrega', async () => {
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('button', { name: /ativar/i }))
    await waitFor(() => expect(ativarPeriodo).toHaveBeenCalledWith({ role: 'coordenador', id: 2 }))
    await waitFor(() => expect(recarregar).toHaveBeenCalled())
  })

  it('novo período sugere o ano seguinte ao último e salva', async () => {
    render(<Configuracoes />)
    fireEvent.click(screen.getByRole('button', { name: /novo período/i }))
    expect((screen.getByLabelText(/ano inicial/i) as HTMLInputElement).value).toBe('2032')
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }))
    await waitFor(() => expect(salvarPeriodo).toHaveBeenCalled())
    expect(salvarPeriodo.mock.calls[0][0].periodo).toMatchObject({ anoInicio: 2032, anoFim: 2035 })
  })

  it('salva a janela do Lattes', async () => {
    render(<Configuracoes />)
    fireEvent.change(screen.getByLabelText(/importar a partir de/i), { target: { value: '2021' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar janela do lattes/i }))
    await waitFor(() => expect(salvarConfiguracao).toHaveBeenCalled())
    expect(salvarConfiguracao.mock.calls[0][0].configuracao).toEqual({
      lattesAnoInicio: 2021,
      lattesAnoFim: null,
    })
  })

  it('perfil sem permissão só lê', () => {
    papel = 'docente'
    render(<Configuracoes />)
    expect(screen.queryByRole('button', { name: /novo período/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /ativar/i })).toBeNull()
    expect(screen.getByText(/apenas leitura/i)).toBeTruthy()
  })
})
