import { describe, it, expect } from 'vitest'
import { restringirRelatorioReconducaoAoDocente } from './escopo-docente'

// Dados fictícios.
function relatorio() {
  return {
    sucesso: true,
    gerado_em: '2026-11-04T12:00:00.000Z',
    quadrienio: { ano_inicio: 2025, ano_fim: 2028 },
    nota_metodologica: { criterio_iv_np_coautoria: 'x', criterio_ii_disciplinas_temporais: 'y' },
    resumo: {
      ano_inicio: 2025,
      ano_fim: 2028,
      total_docentes: 3,
      total_permanentes: 2,
      total_colaboradores: 1,
      total_sem_categoria: 0,
      reconduzidos: 1,
      nao_atendem: 1,
      pdq_insuficiente: 0,
      nao_aplicavel: 1,
    },
    avaliacoes: [
      { docente_id: 1, nome: 'Docente Um Ficticio' },
      { docente_id: 2, nome: 'Docente Dois Ficticio' },
      { docente_id: 3, nome: 'Docente Tres Ficticio' },
    ],
  } as any
}

describe('Credenciamento: visão restrita do docente (D-25)', () => {
  it('docente vê só o próprio nome na lista e mantém os cards gerais', () => {
    const base = relatorio()
    const res = restringirRelatorioReconducaoAoDocente(base, 'docente', 2)
    expect(res.avaliacoes.map((a: any) => a.docente_id)).toEqual([2])
    expect(res.resumo).toEqual(base.resumo)
  })

  it('docente sem cadastro vinculado não vê nenhum nome (nunca a lista inteira)', () => {
    expect(restringirRelatorioReconducaoAoDocente(relatorio(), 'docente', null).avaliacoes).toEqual(
      [],
    )
    expect(
      restringirRelatorioReconducaoAoDocente(relatorio(), 'docente', undefined).avaliacoes,
    ).toEqual([])
  })

  it('docente que não aparece na avaliação vê a lista vazia, com os cards', () => {
    const res = restringirRelatorioReconducaoAoDocente(relatorio(), 'docente', 99)
    expect(res.avaliacoes).toEqual([])
    expect(res.resumo.total_docentes).toBe(3)
  })

  it('suporte, coordenador, auxiliar e capes veem tudo (mesma referência)', () => {
    for (const role of ['suporte', 'coordenador', 'auxiliar', 'capes'] as const) {
      const base = relatorio()
      expect(restringirRelatorioReconducaoAoDocente(base, role, null)).toBe(base)
    }
  })

  it('sem papel carregado, por segurança, também não mostra nomes', () => {
    expect(restringirRelatorioReconducaoAoDocente(relatorio(), null, null).avaliacoes).toEqual([])
    expect(restringirRelatorioReconducaoAoDocente(relatorio(), undefined, 1).avaliacoes).toEqual([])
  })

  it('não altera o relatório original', () => {
    const base = relatorio()
    restringirRelatorioReconducaoAoDocente(base, 'docente', 2)
    expect(base.avaliacoes).toHaveLength(3)
  })
})
