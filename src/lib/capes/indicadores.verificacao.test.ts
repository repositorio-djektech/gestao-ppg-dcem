/**
 * Testes de verificação das hipóteses V1–V9: afirmam o comportamento correto esperado e
 * agora servem de regressão para as correções aplicadas.
 */
import { describe, it, expect } from 'vitest'
import { calcularTodosIndicadores } from './indicadores'
import { textoContemDocente, extrairTermosDocente } from '../reconducao/calculo'
import type { DadosEntradaIndicadores } from './types'

const doc = (id: number, nome: string, categoria = 'permanente', extra: Record<string, any> = {}) =>
  ({ id, nome, categoria, jdp: false, indice_h: 10, ...extra }) as any

const pub = (id: number, ano: number, estrato: string, extra: Record<string, any> = {}) =>
  ({
    id,
    titulo: `Artigo ${id}`,
    autores: 'Autores Quaisquer',
    periodico: 'Revista X',
    ano,
    estrato_qualis: estrato,
    tipo_producao: 'Artigo em periódico',
    fator_impacto_jcr: 2,
    ...extra,
  }) as any

function dados(extra: Partial<DadosEntradaIndicadores>): DadosEntradaIndicadores {
  return {
    anoReferencia: 2026,
    anoInicio: 2025,
    anoFim: 2028,
    docentes: [
      doc(1, 'Docente Um'),
      doc(2, 'Docente Dois'),
      doc(3, 'Docente Tres'),
    ],
    orientacoes: [],
    disciplinas: [],
    projetos: [],
    projetosParticipantes: [],
    publicacoes: [],
    publicacoesDocentes: [],
    publicacoesCoautores: [],
    patentes: [],
    egressos: [],
    discentes: [],
    iniciacoesCientificas: [],
    ...extra,
  }
}

const ind = (rel: ReturnType<typeof calcularTodosIndicadores>, codigo: string) =>
  rel.todosIndicadores.find((i) => i.codigo === codigo)!

describe('V9 — publicação deve ser contada apenas 1 vez (regra confirmada pelo usuário)', () => {
  // DP = 3, JDP = 0 => denominador 3. 1 artigo A1 em 2025 => DPI 2025 = 1 / 3
  const base = {
    publicacoes: [pub(1, 2025, 'A1')],
    publicacoesDocentes: [
      { id: 1, publicacao_id: 1, docente_id: 1 },
      { id: 2, publicacao_id: 1, docente_id: 2 },
    ],
  }

  it('DPI: artigo A1 vinculado a 2 permanentes conta 1 vez', () => {
    const dpi = ind(calcularTodosIndicadores(dados(base)), 'DPI')
    expect(dpi.anos?.[2025].valorCalculado).toBe(0.333)
  })

  it('DPT: artigo vinculado a 2 permanentes conta 1 vez', () => {
    const dpt = ind(calcularTodosIndicadores(dados(base)), 'DPT')
    expect(dpt.anos?.[2025].valorCalculado).toBe(0.333)
  })

  it('DPIDE1: artigo com coautoria discente e 2 permanentes conta 1 vez', () => {
    const rel = calcularTodosIndicadores(
      dados({
        ...base,
        publicacoesCoautores: [
          { id: 1, publicacao_id: 1, tipo: 'orientando', discente_id: 9, egresso_id: null },
        ] as any,
      }),
    )
    expect(ind(rel, 'DPIDE1').anos?.[2025].valorCalculado).toBe(0.333)
  })

  it('DPI2: artigo nível 2 vinculado a 2 permanentes conta 1 vez', () => {
    const rel = calcularTodosIndicadores(
      dados({ ...base, publicacoes: [pub(1, 2025, 'A1', { indicacao_nivel: 2 })] }),
    )
    expect(ind(rel, 'DPI2').anos?.[2025].valorCalculado).toBe(0.333)
  })
})

describe('V1/V7 — patentes', () => {
  const patente = (extra: Record<string, any>) =>
    ({
      id: 1,
      titulo: 'Patente',
      status: 'Concessão',
      inpi: 'BR 10 2025 000001',
      ambito: 'nacional',
      created_at: '2026-05-01T12:00:00Z',
      observacoes: '',
      ...extra,
    }) as any

  it('V1: ano_deposito prevalece sobre o ano de cadastro (created_at)', () => {
    const rel = calcularTodosIndicadores(dados({ patentes: [patente({ ano_deposito: 2025 })] }))
    const dppn = ind(rel, 'DPPn')
    expect(dppn.anos?.[2025].status).toBe('calculado')
    expect(dppn.anos?.[2026].status).toBe('indefinido')
  })

  it('V1b: sem ano_deposito, registro legado cai no ano de cadastro', () => {
    const rel = calcularTodosIndicadores(dados({ patentes: [patente({})] }))
    expect(ind(rel, 'DPPn').anos?.[2026].status).toBe('calculado')
  })

  it('V7a: status desconhecido não deve ser pontuado como depositada', () => {
    const rel = calcularTodosIndicadores(
      dados({ patentes: [patente({ status: 'Arquivada' })] }),
    )
    const dec = ind(rel, 'DPPn').anos?.[2026].decomposicao.find((t) =>
      t.termo.startsWith('Depositadas'),
    )
    expect(dec?.valor ?? 0).toBe(0)
  })

  it('V7b: patente internacional (sem ambito, prefixo US) não conta como nacional', () => {
    const rel = calcularTodosIndicadores(
      dados({ patentes: [patente({ ambito: null, inpi: 'US 1234567' })] }),
    )
    expect(ind(rel, 'DPPn').anos?.[2026].status).toBe('indefinido')
    expect(ind(rel, 'DPPi').anos?.[2026].status).toBe('calculado')
  })

  it('V7c: patente BR sem ambito (caso real do banco) conta só como nacional', () => {
    const rel = calcularTodosIndicadores(
      dados({ patentes: [patente({ ambito: null, inpi: 'BR 10 2025 000001' })] }),
    )
    expect(ind(rel, 'DPPn').anos?.[2026].status).toBe('calculado')
    expect(ind(rel, 'DPPi').anos?.[2026].status).toBe('indefinido')
  })
})

describe('V2 — DP4A: projetos só contam no ano em que estão vigentes', () => {
  // Docente 1 tem orientação ativa, disciplina PG e publicação em 2026.
  const atividadesSemProjeto = {
    orientacoes: [
      { id: 1, docente_id: 1, discente_id: 1, tipo: 'Mestrado', inicio: '2024', fim: '', status: 'ativo' },
    ] as any,
    disciplinas: [
      { id: 1, nome: 'Disc', docente_id: 1, ano_semestre: '2026/1', nivel: 'pos_graduacao' },
    ] as any,
    publicacoes: [pub(1, 2026, 'A1')],
    publicacoesDocentes: [{ id: 1, publicacao_id: 1, docente_id: 1 }],
  }

  it('projeto que só começa em 2030 (sem fim) não conta em 2026', () => {
    const rel = calcularTodosIndicadores(
      dados({
        ...atividadesSemProjeto,
        projetos: [{ id: 1, titulo: 'P', inicio: '2030', fim: '', coordenador_id: 1 }] as any,
      }),
    )
    expect(ind(rel, 'DP4A').anos?.[2026].valorCalculado).toBe(0)
  })

  it('participante de projeto encerrado em 2022 não conta em 2026', () => {
    const rel = calcularTodosIndicadores(
      dados({
        ...atividadesSemProjeto,
        projetos: [{ id: 1, titulo: 'P', inicio: '2020', fim: '2022', coordenador_id: null }] as any,
        projetosParticipantes: [{ projeto_id: 1, docente_id: 1, papel: 'Pesquisador' }] as any,
      }),
    )
    expect(ind(rel, 'DP4A').anos?.[2026].valorCalculado).toBe(0)
  })
})

describe('V3 — casamento textual de autores (fallback)', () => {
  it('sobrenome comum isolado não deve casar com outro docente', () => {
    const termos = extrairTermosDocente('Maria Silva Santos')
    expect(textoContemDocente('João Silva', termos)).toBe(false)
  })

  it('publicação sem vínculo estruturado não vira de DP só por sobrenome comum', () => {
    const rel = calcularTodosIndicadores(
      dados({
        docentes: [doc(1, 'Maria Silva Santos'), doc(2, 'Docente Dois'), doc(3, 'Docente Tres')],
        publicacoes: [pub(1, 2025, 'A1', { autores: 'João Silva; Ana Souza' })],
      }),
    )
    // Nenhum DP é autor: DPI não deveria ter insumo calculado.
    expect(ind(rel, 'DPI').anos?.[2025].status).toBe('indefinido')
  })
})

describe('V5 — ORI conta titulações do programa (ficha: "total de dissertações e teses")', () => {
  it('orientação concluída de docente colaborador entra no ORI', () => {
    const rel = calcularTodosIndicadores(
      dados({
        docentes: [
          doc(1, 'Docente Um'),
          doc(2, 'Docente Dois'),
          doc(3, 'Docente Tres'),
          doc(4, 'Colaborador', 'colaborador'),
        ],
        orientacoes: [
          {
            id: 1,
            docente_id: 4,
            discente_id: 1,
            tipo: 'Mestrado',
            inicio: '2024',
            fim: '2025',
            status: 'concluido',
            data_defesa: '2025-06-01',
          },
        ] as any,
      }),
    )
    // M=1, D=0, DP-JDP=3 => 1/3
    expect(ind(rel, 'ORI').anos?.[2025].valorCalculado).toBe(0.333)
  })
})

describe('V10 — orientação em andamento e anos futuros (SO e DP4A)', () => {
  const ori = (extra: Record<string, any>) =>
    ({ id: 1, docente_id: 1, discente_id: 1, tipo: 'Mestrado', inicio: '2025', ...extra }) as any

  it('sem data de fim conta como em andamento no SO', () => {
    const rel = calcularTodosIndicadores(dados({ orientacoes: [ori({ fim: '', status: 'ativo' })] }))
    expect(ind(rel, 'SO').anos?.[2026].valorCalculado).toBe(33.33)
  })

  it('com data de fim futura conta como em andamento no SO', () => {
    const rel = calcularTodosIndicadores(
      dados({ orientacoes: [ori({ fim: '2099-12-31', status: 'em_andamento' })] }),
    )
    expect(ind(rel, 'SO').anos?.[2026].valorCalculado).toBe(33.33)
  })

  it.each(['ativo', 'em_andamento'])(
    'fim já passado não conta como em andamento, qualquer que seja o rótulo gravado (%s)',
    (status) => {
      const rel = calcularTodosIndicadores(
        dados({ orientacoes: [ori({ fim: '2025-06-30', status })] }),
      )
      expect(ind(rel, 'SO').anos?.[2026].status).toBe('indefinido')
      expect(ind(rel, 'SO').anos?.[2025].status).toBe('indefinido')
    },
  )

  it('anos posteriores ao ano de referência ficam indefinidos e fora da MMA', () => {
    const rel = calcularTodosIndicadores(
      dados({
        orientacoes: [ori({ fim: '', status: 'ativo' })],
        disciplinas: [
          { id: 1, nome: 'Disc', docente_id: 1, ano_semestre: '2026/1', nivel: 'pos_graduacao' },
        ] as any,
        projetos: [{ id: 1, titulo: 'P', inicio: '2025', fim: '', coordenador_id: 1 }] as any,
        publicacoes: [pub(1, 2026, 'A1')],
        publicacoesDocentes: [{ id: 1, publicacao_id: 1, docente_id: 1 }],
      }),
    )
    for (const codigo of ['SO', 'DP4A']) {
      const i = ind(rel, codigo)
      expect(i.anos?.[2027].status, `${codigo} 2027`).toBe('indefinido')
      expect(i.anos?.[2028].status, `${codigo} 2028`).toBe('indefinido')
      expect(i.mma?.anosConsiderados, codigo).toEqual([2025, 2026])
      expect(i.mma?.completo, codigo).toBe(false)
    }
    // 2026: o DP 1 cumpre as 4 atividades => 1 de 3 DP
    expect(ind(rel, 'DP4A').anos?.[2026].valorCalculado).toBe(33.33)
  })
})
