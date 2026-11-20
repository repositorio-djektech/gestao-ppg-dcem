import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { render, cleanup, screen, waitFor } from '@testing-library/react'

const listar = vi.fn()
vi.mock('@/services/producao-discente', async (orig) => ({
  ...(await orig<typeof import('@/services/producao-discente')>()),
  listarProducaoDoDiscente: (...a: any[]) => listar(...a),
}))

import { DetalhesOrientacaoDialog } from './DetalhesOrientacaoDialog'

afterEach(() => {
  cleanup()
  listar.mockReset()
})

const orientacao = {
  id: 1,
  docente_id: 5,
  discente_id: 7,
  tipo: 'Doutorado',
  inicio: '2024-03',
  fim: '2028-02',
  titulo_trabalho: 'Tese sobre vidros bioativos ficticios',
} as any

describe('Detalhes da orientação (TCC e produção)', () => {
  it('mostra o título da tese, a linha, o projeto e a produção do discente', async () => {
    listar.mockResolvedValue({
      publicacoes: [{ id: 10, titulo: 'Artigo do aluno', ano: 2025, detalhe: 'Revista X' }],
      patentes: [],
      producaoTecnica: [],
      eventos: [{ id: 6, titulo: 'Congresso C', detalhe: 'Aracaju' }],
    })
    render(
      <DetalhesOrientacaoDialog
        orientacao={orientacao}
        docenteNome="Docente Ficticia"
        discenteNome="Aluno Ficticio"
        projetoTitulo="Projeto Ficticio"
        linhaNome="Linha Ficticia"
        onClose={() => {}}
      />,
    )
    expect(screen.getByTestId('titulo-tcc').textContent).toContain('Tese sobre vidros bioativos')
    expect(screen.getByText('Linha: Linha Ficticia')).toBeTruthy()
    expect(screen.getByText('Projeto: Projeto Ficticio')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Artigo do aluno')).toBeTruthy())
    expect(screen.getByText('Congresso C')).toBeTruthy()
    expect(listar).toHaveBeenCalledWith(7)
  })

  it('sem título e sem produção, avisa o que falta', async () => {
    listar.mockResolvedValue({ publicacoes: [], patentes: [], producaoTecnica: [], eventos: [] })
    render(
      <DetalhesOrientacaoDialog
        orientacao={{ ...orientacao, titulo_trabalho: '' }}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('Não informado')).toBeTruthy()
    await waitFor(() => expect(screen.getByText(/Nenhuma produção ligada/)).toBeTruthy())
  })

  it('fechado (sem orientação) não renderiza nem consulta', () => {
    render(<DetalhesOrientacaoDialog orientacao={null} onClose={() => {}} />)
    expect(screen.queryByTestId('titulo-tcc')).toBeNull()
    expect(listar).not.toHaveBeenCalled()
  })
})
