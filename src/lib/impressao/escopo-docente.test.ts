import { describe, it, expect, vi } from 'vitest'
import { restringirItensDeImpressaoParaDocente } from './escopo-docente'

// Dados fictícios. O docente logado é o 10.
const fontes = () => ({
  orientacoes: vi.fn().mockResolvedValue([
    { docente_id: 10, discente_id: 2 }, // coorienta o discente 2
    { docente_id: 20, discente_id: 3 },
  ]),
  participacoesProjetos: vi.fn().mockResolvedValue([{ projeto_id: 2, docente_id: 10 }]),
  vinculosPublicacoes: vi.fn().mockResolvedValue([{ publicacao_id: 1, docente_id: 10 }]),
  vinculosPatentes: vi.fn().mockResolvedValue([{ patente_id: 1, docente_id: 10 }]),
  vinculosProducao: vi.fn().mockResolvedValue([{ producao_tecnica_id: 1, docente_id: 10 }]),
})
const ids = (a: any[]) => a.map((x) => x.id)

describe('Impressão: o docente imprime só o que vê na tela (D-25, D-27)', () => {
  it('discentes: orientados, coorientados e sem orientador', async () => {
    const itens = [
      { id: 1, docente_orientador_id: 10 },
      { id: 2, docente_orientador_id: 20 }, // coorientado
      { id: 3, docente_orientador_id: 20 }, // alheio
      { id: 4, docente_orientador_id: null }, // sem orientador
    ]
    const r = await restringirItensDeImpressaoParaDocente('discentes', itens, 10, fontes())
    expect(ids(r)).toEqual([1, 2, 4])
  })

  it('orientações: só as dele', async () => {
    const itens = [
      { id: 1, docente_id: 10 },
      { id: 2, docente_id: 20 },
    ]
    expect(
      ids(await restringirItensDeImpressaoParaDocente('orientacoes', itens, 10, fontes())),
    ).toEqual([1])
  })

  it('projetos: coordena ou participa', async () => {
    const itens = [
      { id: 1, coordenador_id: 10 },
      { id: 2, coordenador_id: 20 },
      { id: 3, coordenador_id: 20 },
    ]
    expect(
      ids(await restringirItensDeImpressaoParaDocente('projetos-pesquisa', itens, 10, fontes())),
    ).toEqual([1, 2])
  })

  it('publicações, patentes e produção técnica: só as vinculadas', async () => {
    const itens = [{ id: 1 }, { id: 2 }]
    for (const modulo of ['publicacoes', 'patentes', 'producao-tecnica']) {
      expect(ids(await restringirItensDeImpressaoParaDocente(modulo, itens, 10, fontes()))).toEqual(
        [1],
      )
    }
  })

  it('docente sem cadastro vinculado imprime lista vazia nesses módulos', async () => {
    for (const modulo of [
      'discentes',
      'orientacoes',
      'projetos-pesquisa',
      'publicacoes',
      'patentes',
      'producao-tecnica',
    ]) {
      expect(
        await restringirItensDeImpressaoParaDocente(
          modulo,
          [{ id: 1, docente_id: 10 }],
          null,
          fontes(),
        ),
      ).toEqual([])
    }
  })

  it('outros módulos (docentes, egressos, disciplinas...) não são alterados', async () => {
    const itens = [{ id: 1 }, { id: 2 }]
    expect(await restringirItensDeImpressaoParaDocente('egressos', itens, 10, fontes())).toBe(itens)
    expect(await restringirItensDeImpressaoParaDocente('docentes', itens, 10, fontes())).toBe(itens)
  })

  it('só busca as fontes de que o módulo precisa', async () => {
    const f = fontes()
    await restringirItensDeImpressaoParaDocente('publicacoes', [{ id: 1 }], 10, f)
    expect(f.vinculosPublicacoes).toHaveBeenCalledTimes(1)
    expect(f.orientacoes).not.toHaveBeenCalled()
    expect(f.vinculosPatentes).not.toHaveBeenCalled()
  })
})
