import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, cleanup, screen, waitFor } from '@testing-library/react'

const obter = vi.fn()
let papel = 'coordenador'
let docenteId: number | null = null

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ role: papel, profile: { docente_id: docenteId } }),
}))
vi.mock('@/services/reconducao', () => ({ obterAvaliacaoReconducao: (...a: any[]) => obter(...a) }))

import DesempenhoDocentes from './DesempenhoDocentes'

const pdq = (extra: Record<string, unknown> = {}) => ({
  np: 1,
  np_teto: 3,
  np_pendente: 2,
  msc: 1,
  dsc: 0,
  titulacoes_total: 1,
  precondicao_atendida: true,
  pdq: 2.5,
  meta_atingida: true,
  observacao_simplificacao_coautoria: '',
  atd: 1,
  atd_calculavel: true,
  dpide1: 0.5,
  dptde1: 1,
  nota_corte: 1,
  ...extra,
})
const av = (id: number, nome: string, p: any = pdq()) => ({
  docente_id: id,
  nome,
  categoria: 'permanente',
  pdq_detalhes: p,
})

beforeEach(() => {
  papel = 'coordenador'
  docenteId = null
  obter.mockReset().mockResolvedValue({
    sucesso: true,
    dados: {
      avaliacoes: [
        av(1, 'Zélia Ficticia'),
        av(2, 'Álvaro Ficticio', pdq({ pdq: 0.5, meta_atingida: false })),
        av(3, 'Bia Ficticia'),
      ],
    },
  })
})
afterEach(cleanup)

const montar = () =>
  render(
    <MemoryRouter>
      <DesempenhoDocentes />
    </MemoryRouter>,
  )

describe('Desempenho dos Docentes (H-32)', () => {
  it('lista os docentes em ordem alfabética, com PDQ e nota de corte', async () => {
    montar()
    await screen.findByText('Álvaro Ficticio')
    const nomes = screen.getAllByRole('row').map((r) => r.textContent || '')
    const posAlvaro = nomes.findIndex((t) => t.includes('Álvaro'))
    const posBia = nomes.findIndex((t) => t.includes('Bia'))
    const posZelia = nomes.findIndex((t) => t.includes('Zélia'))
    expect(posAlvaro).toBeLessThan(posBia)
    expect(posBia).toBeLessThan(posZelia)
    // PDQ 2,50 (atinge a nota de corte) para Zélia e Bia; 0,50 para Álvaro, com nota de corte 1,0
    expect(nomes[posZelia]).toContain('2.50')
    expect(nomes[posAlvaro]).toContain('0.50')
    expect(nomes[posAlvaro]).toContain('1.0')
  })

  it('pede a avaliação do ano corrente e explica a separação do programa', async () => {
    montar()
    await screen.findByText('Álvaro Ficticio')
    expect(obter).toHaveBeenCalledWith({ anoAvaliacao: new Date().getFullYear() })
    expect(screen.getByText(/separados dos/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Indicadores' }).getAttribute('href')).toBe(
      '/indicadores',
    )
  })

  it('o docente vê só o próprio desempenho (D-25)', async () => {
    papel = 'docente'
    docenteId = 3
    montar()
    await screen.findByText('Bia Ficticia')
    expect(screen.queryByText('Zélia Ficticia')).toBeNull()
    expect(screen.queryByText('Álvaro Ficticio')).toBeNull()
  })

  it('mostra o erro quando a avaliação não carrega', async () => {
    obter.mockResolvedValue({ sucesso: false, mensagemErro: 'Falha simulada' })
    montar()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Falha simulada'))
  })
})
