/**
 * P-34 (IN 02/2026): atribuição de publicação a um só docente (art. 8º, §7º), desempate (arts. 10 e
 * 11), limite de colaboradores e ciclo de reprovações (art. 11). Módulo puro compartilhado.
 */
import { describe, it, expect } from 'vitest'
import {
  atribuirPublicacao,
  aplicarAtribuicao,
  montarOrientadores,
  nivelBolsaCnpq,
  mesesDeCurso,
  dadosDesempate,
  compararDesempate,
  limiteColaboradores,
  reprovacoesNoCiclo,
} from '../../../supabase/functions/avaliacao-reconducao/pdq'

const orientadores = montarOrientadores(
  [
    { id: 1, docente_orientador_id: 10 },
    { id: 2, docente_orientador_id: 20 },
    { id: 3, docente_orientador_id: null },
  ],
  [{ id: 5, docente_orientador_id: 10 }],
)

describe('atribuição da publicação a um só docente (§7º)', () => {
  it('publicação de um só docente do programa conta para ele', () => {
    const r = atribuirPublicacao({ docentesVinculados: [10], coautores: [], orientadores })
    expect(r).toEqual({ creditados: [10], regra: 'unico' })
  })

  it('I: o docente indicado na publicação fica com ela', () => {
    const r = atribuirPublicacao({
      docentesVinculados: [10, 20],
      atribuidoId: 20,
      coautores: [{ publicacao_id: 1, tipo: 'orientando', discente_id: 1 }],
      orientadores,
    })
    // a indicação vale mesmo contra o orientador do aluno (10)
    expect(r).toEqual({ creditados: [20], regra: 'indicado' })
  })

  it('indicação de quem não assina a publicação é ignorada', () => {
    const r = atribuirPublicacao({
      docentesVinculados: [10, 20],
      atribuidoId: 99,
      coautores: [{ publicacao_id: 1, tipo: 'orientando', discente_id: 1 }],
      orientadores,
    })
    expect(r).toEqual({ creditados: [10], regra: 'orientador' })
  })

  it('II: sem indicação, vale o orientador do discente coautor (e do egresso)', () => {
    expect(
      atribuirPublicacao({
        docentesVinculados: [10, 20],
        coautores: [{ publicacao_id: 1, tipo: 'orientando', discente_id: 2 }],
        orientadores,
      }),
    ).toEqual({ creditados: [20], regra: 'orientador' })
    expect(
      atribuirPublicacao({
        docentesVinculados: [10, 20],
        coautores: [{ publicacao_id: 1, tipo: 'egresso', egresso_id: 5 }],
        orientadores,
      }),
    ).toEqual({ creditados: [10], regra: 'orientador' })
  })

  it('sem indicação e sem orientador que resolva: vale para todos e fica em conflito', () => {
    for (const coautores of [
      [], // sem coautor
      [{ publicacao_id: 1, tipo: 'orientando', discente_id: 3 }], // aluno sem orientador
      [
        { publicacao_id: 1, tipo: 'orientando', discente_id: 1 },
        { publicacao_id: 1, tipo: 'orientando', discente_id: 2 },
      ], // dois orientadores diferentes
    ]) {
      const r = atribuirPublicacao({ docentesVinculados: [10, 20], coautores, orientadores })
      expect(r.regra).toBe('sem_regra')
      expect(r.creditados.sort()).toEqual([10, 20])
    }
  })

  it('aplicarAtribuicao separa o que conta, o que foi cedido a outro autor e os conflitos', () => {
    const pubs = [
      { id: 1, ano: 2024 }, // dos dois; orientador do aluno = 10
      { id: 2, ano: 2024 }, // dos dois; sem como decidir
      { id: 3, ano: 2024 }, // só do docente 10
    ]
    const vinculos = [
      { publicacao_id: 1, docente_id: 10 },
      { publicacao_id: 1, docente_id: 20 },
      { publicacao_id: 2, docente_id: 10 },
      { publicacao_id: 2, docente_id: 20 },
      { publicacao_id: 3, docente_id: 10 },
    ]
    const coautores = [{ publicacao_id: 1, tipo: 'orientando', discente_id: 1 }]
    const d10 = aplicarAtribuicao({
      docenteId: 10,
      publicacoes: pubs,
      vinculos,
      coautores,
      orientadores,
    })
    expect(d10.contam.map((p) => p.id)).toEqual([1, 2, 3])
    expect(d10.conflitos.map((p) => p.id)).toEqual([2])
    expect(d10.cedidas).toEqual([])
    const d20 = aplicarAtribuicao({
      docenteId: 20,
      publicacoes: [pubs[0], pubs[1]],
      vinculos,
      coautores,
      orientadores,
    })
    expect(d20.contam.map((p) => p.id)).toEqual([2]) // a 1 é do orientador (10)
    expect(d20.cedidas.map((p) => p.id)).toEqual([1])
    expect(d20.cedidas[0].creditados).toEqual([10])
  })
})

describe('desempate (arts. 10 e 11)', () => {
  it('nível da bolsa: só PQ e DT contam; SR é o mais alto', () => {
    expect(nivelBolsaCnpq('PQ-SR')).toBeGreaterThan(nivelBolsaCnpq('PQ-1A'))
    expect(nivelBolsaCnpq('PQ-1A')).toBeGreaterThan(nivelBolsaCnpq('DT-1B'))
    expect(nivelBolsaCnpq('PQ 2')).toBe(1)
    expect(nivelBolsaCnpq('DT-2')).toBe(1)
    for (const v of ['', null, 'CAPES', 'PQ', 'IC-1A']) expect(nivelBolsaCnpq(v)).toBe(0)
  })

  it('tempo de curso em meses; início provisório (zero) e datas ausentes não entram', () => {
    expect(mesesDeCurso('2024-03', '2026-02')).toBe(23)
    expect(mesesDeCurso('2024', '2025-02')).toBe(12) // só o ano vale fevereiro
    expect(mesesDeCurso('2025-02', '2025-02')).toBeNull() // provisório do Lattes (P-33)
    expect(mesesDeCurso('2024-03', '', '2026-01-15')).toBe(22) // sem término, vale a defesa
    expect(mesesDeCurso('', '2026-02')).toBeNull()
    expect(mesesDeCurso('03/2024', '02/2026')).toBe(23)
  })

  it('dadosDesempate pega o menor tempo entre as orientações concluídas', () => {
    const d = dadosDesempate({
      bolsaCnpq: 'PQ-1B',
      ingressoUfs: ' 2010-03 ',
      concluidas: [
        { inicio: '2022-03', fim: '2024-02' },
        { inicio: '2020-03', fim: '2023-02' },
        { inicio: '2025-02', fim: '2025-02' },
      ],
    })
    expect(d).toEqual({
      bolsa_cnpq: 'PQ-1B',
      nivel_bolsa: 4,
      menor_tempo_conclusao_meses: 23,
      ingresso_ufs: '2010-03',
    })
  })

  it('ordem: maior PDQ, depois bolsa, depois menor tempo de conclusão, depois mais tempo de UFS', () => {
    const base = {
      bolsa_cnpq: '',
      nivel_bolsa: 0,
      menor_tempo_conclusao_meses: null,
      ingresso_ufs: '',
    }
    const x = (pdq: number | null, extra: Partial<typeof base> = {}) => ({
      pdq,
      desempate: { ...base, ...extra },
    })
    const lista = [
      x(2, { ingresso_ufs: '2015-03' }),
      x(3),
      x(2, { nivel_bolsa: 4 }),
      x(2, { menor_tempo_conclusao_meses: 20 }),
      x(2, { ingresso_ufs: '2005-03' }),
      x(null),
    ]
    const ordenada = [...lista].sort(compararDesempate)
    expect(ordenada[0].pdq).toBe(3)
    expect(ordenada[1].desempate.nivel_bolsa).toBe(4) // bolsa vence tempo e UFS
    expect(ordenada[2].desempate.menor_tempo_conclusao_meses).toBe(20)
    expect(ordenada[3].desempate.ingresso_ufs).toBe('2005-03') // mais antigo na UFS antes
    expect(ordenada[4].desempate.ingresso_ufs).toBe('2015-03')
    expect(ordenada[5].pdq).toBeNull()
  })
})

describe('colaboradores e visitantes (art. 11)', () => {
  it('colaboradores até 20% dos permanentes; acima disso excede', () => {
    expect(limiteColaboradores(10, 2)).toMatchObject({ limite: 2, percentual: 20, excede: false })
    expect(limiteColaboradores(10, 3)).toMatchObject({ limite: 2, percentual: 30, excede: true })
    expect(limiteColaboradores(12, 3)).toMatchObject({ limite: 2, excede: true })
    expect(limiteColaboradores(15, 3).excede).toBe(false)
    expect(limiteColaboradores(0, 1)).toMatchObject({ percentual: null, excede: true })
    expect(limiteColaboradores(0, 0).excede).toBe(false)
  })

  it('3 reprovações no ciclo de 4 avaliações descredenciam (art. 11, §4º)', () => {
    const r = reprovacoesNoCiclo(2026, (ano) => ano === 2024)
    expect(r.anos).toEqual([2023, 2024, 2025, 2026])
    expect(r.reprovacoes).toBe(3)
    expect(r.descredenciar).toBe(true)
    expect(reprovacoesNoCiclo(2026, (ano) => ano >= 2025).descredenciar).toBe(false) // 2 reprovações
    expect(reprovacoesNoCiclo(2026, () => true).reprovacoes).toBe(0)
  })
})
