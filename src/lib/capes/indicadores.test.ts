import { describe, it, expect } from 'vitest'
import { calcularTodosIndicadores } from './indicadores'
import type { DadosEntradaIndicadores } from './types'

function criarDocente(
  id: number,
  nome: string,
  categoria: string = 'permanente',
  extra: Record<string, any> = {},
) {
  return {
    id,
    nome,
    categoria,
    jdp: false,
    jdp_desde: null,
    ano_doutorado: null,
    indice_h: 10,
    scopus_id: `scopus_${id}`,
    ...extra,
  } as any
}

describe('Motor de Cálculo de Indicadores CAPES (Ficha Engenharias II)', () => {
  const baseDocentes = [
    criarDocente(1, 'Docente Um', 'permanente', { indice_h: 20 }),
    criarDocente(2, 'Docente Dois', 'permanente', { indice_h: 15 }),
    criarDocente(3, 'Docente Tres', 'permanente', { indice_h: 12 }),
    criarDocente(4, 'Docente Quatro', 'permanente', {
      jdp: true,
      jdp_desde: 2024,
      ano_doutorado: 2020,
      indice_h: 8,
    }), // JDP válido!
    criarDocente(5, 'Docente Cinco', 'colaborador', { indice_h: 6 }),
    criarDocente(6, 'Docente Seis', 'visitante', { indice_h: 5 }),
  ]

  const dadosMinimos: DadosEntradaIndicadores = {
    anoReferencia: 2025,
    anoInicio: 2025,
    anoFim: 2028,
    docentes: baseDocentes,
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
  }

  it('calcula ADE corretamente (DP / (DP + DC + DV)) com inclusão de JDP válido', () => {
    // DP: 4 (Docente 1, 2, 3 e 4), DC: 1, DV: 1 => Total = 6
    // ADE = 4 / 6 * 100 = 66.67%
    const rel = calcularTodosIndicadores(dadosMinimos)
    const ade = rel.todosIndicadores.find((i) => i.codigo === 'ADE')

    expect(ade).toBeDefined()
    expect(ade?.status).toBe('calculado')
    expect(ade?.valorCalculado).toBe(66.67)
    expect(rel.resumoGeral.totalDP).toBe(4)
    expect(rel.resumoGeral.totalJdpValidos).toBe(1)
    expect(rel.resumoGeral.denominadorEfetivo).toBe(3) // 4 - 1
  })

  it('marca indicadores como "indefinido" quando insumos essenciais faltam', () => {
    const rel = calcularTodosIndicadores(dadosMinimos)
    const ori = rel.todosIndicadores.find((i) => i.codigo === 'ORI')
    const dpi = rel.todosIndicadores.find((i) => i.codigo === 'DPI')
    const nict = rel.todosIndicadores.find((i) => i.codigo === 'NICT')
    const ati = rel.todosIndicadores.find((i) => i.codigo === 'ATI')

    expect(ori?.status).toBe('indefinido')
    expect(ori?.motivoIndefinido).toContain('aguardando insumo')

    expect(dpi?.status).toBe('indefinido')
    expect(dpi?.motivoIndefinido).toContain('aguardando insumo')

    expect(nict?.status).toBe('indefinido')
    expect(nict?.motivoIndefinido).toContain('aguardando insumo')

    expect(ati?.status).toBe('indefinido')
    expect(ati?.motivoIndefinido).toContain('aguardando insumo')
  })

  it('calcula ORI = (M + 3D) / (DP - JDP) com titulações no quadriênio', () => {
    const dadosComOrientacoes: DadosEntradaIndicadores = {
      ...dadosMinimos,
      orientacoes: [
        {
          id: 101,
          tipo: 'Mestrado',
          status: 'concluido',
          docente_id: 1,
          fim: '2025',
          data_defesa: '2025-04-10',
        } as any,
        {
          id: 102,
          tipo: 'Mestrado',
          status: 'concluido',
          docente_id: 2,
          fim: '2026',
          data_defesa: '2026-06-20',
        } as any,
        {
          id: 103,
          tipo: 'Doutorado',
          status: 'titulado',
          docente_id: 1,
          fim: '2025',
          data_defesa: '2025-11-15',
        } as any,
      ],
    }

    // M = 2, D = 1 => Numerador = 2 + 3*1 = 5
    // Denominador = DP (4) - JDP (1) = 3
    // ORI = 5 / 3 = 1.667
    const rel = calcularTodosIndicadores(dadosComOrientacoes)
    const ori = rel.todosIndicadores.find((i) => i.codigo === 'ORI')

    expect(ori?.status).toBe('calculado')
    expect(ori?.valorCalculado).toBe(1.667)
  })

  it('calcula DPI com fórmula com saturação em min(B1, DP) e pesos Qualis', () => {
    // DP = 4, JDP = 1 => DP - JDP = 3
    // 2 artigos A1 (2 * 1.0 = 2)
    // 1 artigo A2 (1 * 0.875 = 0.875)
    // 1 artigo A3 (1 * 0.75 = 0.75)
    // 1 artigo A4 (1 * 0.675 = 0.675)
    // 6 artigos B1 => satura em min(6, 4) = 4 * 0.5 = 2.0
    // Numerador = 2 + 0.875 + 0.75 + 0.675 + 2.0 = 6.3
    // DPI = 6.3 / 3 = 2.1
    const pubs: any[] = [
      { id: 1, ano: 2025, estrato_qualis: 'A1', autores: 'Docente Um' },
      { id: 2, ano: 2025, estrato_qualis: 'A1', autores: 'Docente Um' },
      { id: 3, ano: 2026, estrato_qualis: 'A2', autores: 'Docente Dois' },
      { id: 4, ano: 2026, estrato_qualis: 'A3', autores: 'Docente Tres' },
      { id: 5, ano: 2027, estrato_qualis: 'A4', autores: 'Docente Um' },
      // 6 artigos B1
      { id: 6, ano: 2025, estrato_qualis: 'B1', autores: 'Docente Um' },
      { id: 7, ano: 2025, estrato_qualis: 'B1', autores: 'Docente Um' },
      { id: 8, ano: 2026, estrato_qualis: 'B1', autores: 'Docente Um' },
      { id: 9, ano: 2026, estrato_qualis: 'B1', autores: 'Docente Um' },
      { id: 10, ano: 2027, estrato_qualis: 'B1', autores: 'Docente Um' },
      { id: 11, ano: 2027, estrato_qualis: 'B1', autores: 'Docente Um' },
    ]

    const dadosPubs: DadosEntradaIndicadores = {
      ...dadosMinimos,
      publicacoes: pubs,
    }

    const rel = calcularTodosIndicadores(dadosPubs)
    const dpi = rel.todosIndicadores.find((i) => i.codigo === 'DPI')

    expect(dpi?.status).toBe('calculado')
    expect(dpi?.valorCalculado).toBe(2.1)
  })

  it('calcula ATD com coautorias confirmadas / (M + 2D)', () => {
    // M = 1, D = 1 => M + 2D = 3
    // 3 artigos A1 com coautoria de discente confirmada
    const pubs: any[] = [
      { id: 1, ano: 2025, estrato_qualis: 'A1', autores: 'Docente Um' },
      { id: 2, ano: 2026, estrato_qualis: 'A2', autores: 'Docente Um' },
      { id: 3, ano: 2027, estrato_qualis: 'A3', autores: 'Docente Um' },
    ]
    const coautores: any[] = [
      { publicacao_id: 1, tipo: 'orientando', nome_citado: 'Aluno 1' },
      { publicacao_id: 2, tipo: 'egresso', nome_citado: 'Egresso 1' },
      { publicacao_id: 3, tipo: 'orientando', nome_citado: 'Aluno 2' },
    ]
    const oris: any[] = [
      { id: 1, tipo: 'Mestrado', status: 'concluido', fim: '2025', docente_id: 1 },
      { id: 2, tipo: 'Doutorado', status: 'concluido', fim: '2026', docente_id: 1 },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      publicacoes: pubs,
      publicacoesCoautores: coautores,
      orientacoes: oris,
    })

    const atd = rel.todosIndicadores.find((i) => i.codigo === 'ATD')
    expect(atd?.status).toBe('calculado')
    // 3 / 3 = 1.0
    expect(atd?.valorCalculado).toBe(1.0)
  })

  it('calcula DPT com periódicos, anais e capítulos', () => {
    // DP - JDP = 3
    // 4 artigos em periódicos, 2 em anais, 3 capítulos = 9 produções
    // DPT = 9 / 3 = 3.0
    const pubs: any[] = [
      { id: 1, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Um' },
      { id: 2, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Dois' },
      { id: 3, ano: 2026, tipo_producao: 'Artigo em periódico', autores: 'Docente Tres' },
      { id: 4, ano: 2026, tipo_producao: 'Artigo em periódico', autores: 'Docente Um' },
      { id: 5, ano: 2025, tipo_producao: 'Trabalho em anais', autores: 'Docente Um' },
      { id: 6, ano: 2026, tipo_producao: 'Trabalho em anais', autores: 'Docente Dois' },
      { id: 7, ano: 2025, tipo_producao: 'Capítulo', autores: 'Docente Um' },
      { id: 8, ano: 2026, tipo_producao: 'Capítulo', autores: 'Docente Um' },
      { id: 9, ano: 2027, tipo_producao: 'Capítulo', autores: 'Docente Tres' },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      publicacoes: pubs,
    })

    const dpt = rel.todosIndicadores.find((i) => i.codigo === 'DPT')
    expect(dpt?.status).toBe('calculado')
    expect(dpt?.valorCalculado).toBe(3.0)
  })

  it('calcula SO, PSA, DP4A, ATI, NICT e NDISC corretamente', () => {
    const dadosCompletos: DadosEntradaIndicadores = {
      ...dadosMinimos,
      orientacoes: [
        { id: 1, status: 'ativo', docente_id: 1, tipo: 'Mestrado' } as any,
        { id: 2, status: 'ativo', docente_id: 2, tipo: 'Doutorado' } as any,
      ],
      disciplinas: [
        { id: 1, docente_id: 1, nivel: 'pos_graduacao', nome: 'Ciência dos Materiais' } as any,
        { id: 2, docente_id: 2, nivel: 'pos_graduacao', nome: 'Termodinâmica' } as any,
        { id: 3, docente_id: 1, nivel: 'graduacao', nome: 'Química Geral' } as any,
      ],
      projetos: [
        { id: 1, coordenador_id: 1, titulo: 'Projeto A' } as any,
        { id: 2, coordenador_id: 2, titulo: 'Projeto B' } as any,
      ],
      projetosParticipantes: [],
      publicacoes: [
        { id: 1, ano: 2025, autores: 'Docente Um', estrato_qualis: 'A1' } as any,
        { id: 2, ano: 2026, autores: 'Docente Dois', estrato_qualis: 'A2' } as any,
      ],
      iniciacoesCientificas: [
        { id: 1, tipo: 'iniciacao_cientifica', docente_orientador_id: 1 } as any,
        { id: 2, tipo: 'iniciacao_tecnologica', docente_orientador_id: 2 } as any,
      ],
    }

    const rel = calcularTodosIndicadores(dadosCompletos)

    // SO: 2 de 4 DP com orientações ativas = 50%
    const so = rel.todosIndicadores.find((i) => i.codigo === 'SO')
    expect(so?.valorCalculado).toBe(50)

    // ATI: 2 disciplinas de PG / 4 DP = 0.5
    const ati = rel.todosIndicadores.find((i) => i.codigo === 'ATI')
    expect(ati?.valorCalculado).toBe(0.5)

    // NICT: (1 IC + 1 IT) / 4 DP = 2 / 4 = 0.5
    const nict = rel.todosIndicadores.find((i) => i.codigo === 'NICT')
    expect(nict?.valorCalculado).toBe(0.5)

    // NDISC: Docente 1 tem graduação. Docentes 2, 3 e 4 não têm => 3 de 4 = 75%
    const ndisc = rel.todosIndicadores.find((i) => i.codigo === 'NDISC')
    expect(ndisc?.valorCalculado).toBe(75)

    // DP4A: Docentes 1 e 2 cumprem as 4 atividades (orientações ativas, PG, projeto, publicações)
    // 2 de 4 DP = 50%
    const dp4a = rel.todosIndicadores.find((i) => i.codigo === 'DP4A')
    expect(dp4a?.valorCalculado).toBe(50)
  })

  it('calcula Patentes (DPPn e DPPi) com pesos 1.0 (licenciada), 0.6 (concedida) e 0.3 (depositada)', () => {
    // DP - JDP = 3
    // Patente Nacional 1: Concedida (0.6)
    // Patente Nacional 2: Pendente (0.3)
    // Pontos = 0.9 => DPPn = 0.9 / 3 = 0.3
    const patentes: any[] = [
      { id: 1, titulo: 'Patente BR 1', status: 'Concessão', ambito: 'nacional', inpi: 'BR123' },
      { id: 2, titulo: 'Patente BR 2', status: 'Pendente', ambito: 'nacional', inpi: 'BR456' },
      {
        id: 3,
        titulo: 'Patente US 1',
        status: 'Licenciamento',
        ambito: 'internacional',
        inpi: 'US789',
      },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      patentes,
    })

    const dppn = rel.todosIndicadores.find((i) => i.codigo === 'DPPn')
    expect(dppn?.status).toBe('calculado')
    expect(dppn?.valorCalculado).toBe(0.3)

    // DPPi: 1 licenciada internacional = 1.0 / 3 = 0.333
    const dppi = rel.todosIndicadores.find((i) => i.codigo === 'DPPi')
    expect(dppi?.status).toBe('calculado')
    expect(dppi?.valorCalculado).toBe(0.333)
  })

  it('calcula o bloco bibliométrico (H2, H médio, H mediano) com base no índice H dos permanentes', () => {
    // Índices H dos permanentes: [20, 15, 12, 8]
    // Rank 1: 20 >= 1
    // Rank 2: 15 >= 2
    // Rank 3: 12 >= 3
    // Rank 4: 8 >= 4
    // Logo H2 = 4 (todos os 4 têm H >= 4)
    // Média = (20 + 15 + 12 + 8) / 4 = 55 / 4 = 13.75
    // Mediana = (15 + 12) / 2 = 13.5
    const rel = calcularTodosIndicadores(dadosMinimos)
    const h2 = rel.todosIndicadores.find((i) => i.codigo === 'H2')

    expect(h2?.status).toBe('calculado')
    expect(h2?.valorCalculado).toBe(4)

    const termoMedio = h2?.decomposicao.find((d) => d.termo === 'H Médio')
    expect(termoMedio?.valor).toBe(13.75)

    const termoMediano = h2?.decomposicao.find((d) => d.termo === 'H Mediano')
    expect(termoMediano?.valor).toBe(13.5)
  })
})
