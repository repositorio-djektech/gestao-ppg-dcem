import { describe, it, expect } from 'vitest'
import { filtrarDadosLacunasParaDocente } from './escopo-docente'
import { consolidarRelatorioLacunas } from './regras'

// Dados fictícios. Eu = docente 1 (Ledjane Silva Barreto); outro = docente 2.
const EU = 1
function dados() {
  return {
    docentes: [
      { id: 1, nome: 'Ledjane Silva Barreto' },
      { id: 2, nome: 'Mario Ernesto Valerio' },
    ],
    discentes: [
      { id: 10, nome: 'Discente Meu', docente_orientador_id: 1 },
      { id: 11, nome: 'Discente Coorientado', docente_orientador_id: 2 },
      { id: 12, nome: 'Discente Alheio', docente_orientador_id: 2 },
      { id: 13, nome: 'Discente Sem Orientador', docente_orientador_id: null },
    ],
    orientacoes: [
      { id: 100, docente_id: 1, discente_id: 10 },
      { id: 101, docente_id: 1, discente_id: 11 },
      { id: 102, docente_id: 2, discente_id: 11 },
      { id: 103, docente_id: 2, discente_id: 12 },
    ],
    publicacoes: [
      { id: 200, titulo: 'Pub minha' },
      { id: 201, titulo: 'Pub compartilhada' },
      { id: 202, titulo: 'Pub alheia' },
    ],
    publicacoes_docentes: [
      { publicacao_id: 200, docente_id: 1 },
      { publicacao_id: 201, docente_id: 1 },
      { publicacao_id: 201, docente_id: 2 },
      { publicacao_id: 202, docente_id: 2 },
    ],
    projetos_pesquisa: [
      { id: 300, titulo: 'Coordeno', coordenador_id: 1 },
      { id: 301, titulo: 'Participo', coordenador_id: 2 },
      { id: 302, titulo: 'Alheio', coordenador_id: 2 },
    ],
    projetos_participantes: [
      { projeto_id: 301, docente_id: 1 },
      { projeto_id: 302, docente_id: 2 },
    ],
    projetos_discentes: [
      { projeto_id: 300, discente_id: 10 },
      { projeto_id: 302, discente_id: 12 },
    ],
    docentes_linhas: [
      { docente_id: 1, linha_id: 1 },
      { docente_id: 2, linha_id: 1 },
    ],
    eventos: [
      { id: 400, docente: 'Ledjane Silva Barreto' },
      { id: 401, docente: 'Mario Ernesto Valerio' },
      { id: 402, docente: 'Barreto, L. S.' }, // só sobrenome + inicial: não vincula (H-06)
    ],
    mobilidade_docente: [
      { id: 500, tipo: 'docente', nome: 'Ledjane Silva Barreto' },
      { id: 501, tipo: 'discente', nome: 'Ledjane Silva Barreto' },
      { id: 502, tipo: 'docente', nome: 'Mario Ernesto Valerio' },
    ],
    patentes: [
      { id: 600, autores: 'Barreto, Ledjane Silva; Valerio, Mario Ernesto' },
      { id: 601, autores: 'Valerio, Mario Ernesto' },
    ],
    premiacoes: [
      { id: 700, nome_premiado: 'Ledjane Silva Barreto' },
      { id: 701, nome_premiado: 'Mario Ernesto Valerio' },
    ],
    producao_tecnica: [
      { id: 800, autores: 'Ledjane Silva Barreto' },
      { id: 801, autores: 'Mario Ernesto Valerio' },
    ],
  } as any
}
const ids = (arr: any[] | undefined) => (arr ?? []).map((x) => x.id)

describe('Lacunas: dados restritos ao docente (D-25)', () => {
  const f = filtrarDadosLacunasParaDocente(dados(), EU)

  it('docentes: só o próprio', () => expect(ids(f.docentes)).toEqual([1]))

  it('discentes: orientados e coorientados por ele, sem os de outros e sem os órfãos', () => {
    expect(ids(f.discentes)).toEqual([10, 11])
  })

  it('orientações: só as dele', () => expect(ids(f.orientacoes)).toEqual([100, 101]))

  it('publicações: as vinculadas a ele; o vínculo das compartilhadas mantém os demais docentes', () => {
    expect(ids(f.publicacoes)).toEqual([200, 201])
    expect(f.publicacoes_docentes).toEqual([
      { publicacao_id: 200, docente_id: 1 },
      { publicacao_id: 201, docente_id: 1 },
      { publicacao_id: 201, docente_id: 2 },
    ])
  })

  it('projetos: os que coordena ou em que participa; apoio filtrado junto', () => {
    expect(ids(f.projetos_pesquisa)).toEqual([300, 301])
    expect(f.projetos_participantes).toEqual([{ projeto_id: 301, docente_id: 1 }])
    expect(f.projetos_discentes).toEqual([{ projeto_id: 300, discente_id: 10 }])
    expect(f.docentes_linhas).toEqual([{ docente_id: 1, linha_id: 1 }])
  })

  it('tabelas por texto (eventos, mobilidade, patentes, premiações, produção técnica): por nome, com o casamento estrito', () => {
    expect(ids(f.eventos)).toEqual([400]) // "Barreto, L. S." não casa (H-06)
    expect(ids(f.mobilidade_docente)).toEqual([500]) // só tipo docente
    expect(ids(f.patentes)).toEqual([600])
    expect(ids(f.premiacoes)).toEqual([700])
    expect(ids(f.producao_tecnica)).toEqual([800])
  })

  it('docente sem cadastro vinculado ou inexistente não vê nada', () => {
    for (const id of [null, undefined, 99]) {
      const vazio = filtrarDadosLacunasParaDocente(dados(), id as any)
      for (const lista of Object.values(vazio)) if (Array.isArray(lista)) expect(lista).toEqual([])
    }
  })

  it('não altera os dados originais', () => {
    const base = dados()
    filtrarDadosLacunasParaDocente(base, EU)
    expect(base.discentes).toHaveLength(4)
  })

  it('os números do relatório passam a refletir só o docente (todos os cards)', () => {
    const completo = consolidarRelatorioLacunas(dados())
    const restrito = consolidarRelatorioLacunas(filtrarDadosLacunasParaDocente(dados(), EU))
    const totalRegistros = (r: typeof completo, tabela: string) =>
      r.resumo
        .filter((x) => x.tabela === tabela)
        .reduce((m, x) => Math.max(m, x.total_registros), 0)

    expect(totalRegistros(completo, 'docentes')).toBe(2)
    expect(totalRegistros(restrito, 'docentes')).toBe(1)
    expect(totalRegistros(completo, 'discentes')).toBe(4)
    expect(totalRegistros(restrito, 'discentes')).toBe(2)
    expect(totalRegistros(restrito, 'publicacoes')).toBe(2)
    expect(totalRegistros(restrito, 'projetos_pesquisa')).toBe(2)
  })
})
