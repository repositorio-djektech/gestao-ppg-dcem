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

  it('calcula ORI com titulações anuais e consolidação pela MMA', () => {
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

    // 2025: M=1, D=1 => Numerador = 1 + 3 = 4; Denominador = 4 - 1 = 3 => 4/3 = 1.333
    // 2026: M=1, D=0 => Numerador = 1; Denominador = 3 => 1/3 = 0.333
    // 2027 e 2028: sem defesas cadastradas => status 'indefinido' (aguardando insumo), NÃO zeram
    // MMA dos anos com insumo (2025 e 2026): (1.333 + 0.333) / 2 = 0.833
    const rel = calcularTodosIndicadores(dadosComOrientacoes)
    const ori = rel.todosIndicadores.find((i) => i.codigo === 'ORI')

    expect(ori?.status).toBe('calculado')
    expect(ori?.valorCalculado).toBe(0.833)
    expect(ori?.anos?.[2025].status).toBe('calculado')
    expect(ori?.anos?.[2025].valorCalculado).toBe(1.333)
    expect(ori?.anos?.[2026].status).toBe('calculado')
    expect(ori?.anos?.[2026].valorCalculado).toBe(0.333)
    expect(ori?.anos?.[2027].status).toBe('indefinido')
    expect(ori?.anos?.[2028].status).toBe('indefinido')
    expect(ori?.mma?.completo).toBe(false)
  })

  it('calcula DPI ano a ano com MMA e saturação min(B1, DP)', () => {
    // DP = 4, JDP = 1 => DP - JDP = 3
    // Em 2025: 2 A1 (2.0) + 2 B1 (sat: min(2,4)=2 => 1.0) = 3.0 => DPI 2025 = 3.0 / 3 = 1.0
    // Em 2026: 1 A2 (0.875) + 1 A3 (0.75) + 2 B1 (1.0) = 2.625 => DPI 2026 = 2.625 / 3 = 0.875
    // Em 2027: 1 A4 (0.675) + 2 B1 (1.0) = 1.675 => DPI 2027 = 1.675 / 3 = 0.558
    // 2028: sem publicações => indefinido
    // MMA (2025, 2026, 2027) = (1.0 + 0.875 + 0.558) / 3 = 0.811
    const pubs: any[] = [
      { id: 1, ano: 2025, estrato_qualis: 'A1', autores: 'Docente Um' },
      { id: 2, ano: 2025, estrato_qualis: 'A1', autores: 'Docente Um' },
      { id: 6, ano: 2025, estrato_qualis: 'B1', autores: 'Docente Um' },
      { id: 7, ano: 2025, estrato_qualis: 'B1', autores: 'Docente Um' },

      { id: 3, ano: 2026, estrato_qualis: 'A2', autores: 'Docente Dois' },
      { id: 4, ano: 2026, estrato_qualis: 'A3', autores: 'Docente Tres' },
      { id: 8, ano: 2026, estrato_qualis: 'B1', autores: 'Docente Um' },
      { id: 9, ano: 2026, estrato_qualis: 'B1', autores: 'Docente Um' },

      { id: 5, ano: 2027, estrato_qualis: 'A4', autores: 'Docente Um' },
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
    expect(dpi?.anos?.[2025].valorCalculado).toBe(1.0)
    expect(dpi?.anos?.[2026].valorCalculado).toBe(0.875)
    expect(dpi?.anos?.[2027].valorCalculado).toBe(0.558)
    expect(dpi?.anos?.[2028].status).toBe('indefinido')
    expect(dpi?.mma?.valor).toBe(0.811)
  })

  it('calcula ATD ano a ano e agrega via MMA', () => {
    // 2025: 1 artigo A1 c/ coautoria; Mestrado 2025: 1 => ATD 2025 = 1 / 1 = 1.0
    // 2026: 1 artigo A2 c/ coautoria; Doutorado 2026: 1 => ATD 2026 = 1 / 2 = 0.5
    // 2027 e 2028: sem titulações no ano => aguardando insumo
    // MMA (2025, 2026) = (1.0 + 0.5) / 2 = 0.75
    const pubs: any[] = [
      { id: 1, ano: 2025, estrato_qualis: 'A1', autores: 'Docente Um' },
      { id: 2, ano: 2026, estrato_qualis: 'A2', autores: 'Docente Um' },
    ]
    const coautores: any[] = [
      { publicacao_id: 1, tipo: 'orientando', nome_citado: 'Aluno 1' },
      { publicacao_id: 2, tipo: 'egresso', nome_citado: 'Egresso 1' },
    ]
    const oris: any[] = [
      {
        id: 1,
        tipo: 'Mestrado',
        status: 'concluido',
        fim: '2025',
        data_defesa: '2025-05-10',
        docente_id: 1,
      },
      {
        id: 2,
        tipo: 'Doutorado',
        status: 'concluido',
        fim: '2026',
        data_defesa: '2026-06-15',
        docente_id: 1,
      },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      publicacoes: pubs,
      publicacoesCoautores: coautores,
      orientacoes: oris,
    })

    const atd = rel.todosIndicadores.find((i) => i.codigo === 'ATD')
    expect(atd?.status).toBe('calculado')
    expect(atd?.anos?.[2025].valorCalculado).toBe(1.0)
    expect(atd?.anos?.[2026].valorCalculado).toBe(0.5)
    expect(atd?.valorCalculado).toBe(0.75)
  })

  it('calcula DPT ano a ano com MMA para periódicos, anais e capítulos', () => {
    // DP - JDP = 3
    // 2025: 2 periódicos + 1 anais + 1 capítulo = 4 produções => DPT 2025 = 4 / 3 = 1.333
    // 2026: 2 periódicos + 1 anais + 1 capítulo = 4 produções => DPT 2026 = 4 / 3 = 1.333
    // 2027: 1 capítulo = 1 produção => DPT 2027 = 1 / 3 = 0.333
    // 2028: sem produções => indefinido
    // MMA (2025, 2026, 2027) = (1.333 + 1.333 + 0.333) / 3 = 1.0
    const pubs: any[] = [
      { id: 1, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Um' },
      { id: 2, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Dois' },
      { id: 5, ano: 2025, tipo_producao: 'Trabalho em anais', autores: 'Docente Um' },
      { id: 7, ano: 2025, tipo_producao: 'Capítulo', autores: 'Docente Um' },

      { id: 3, ano: 2026, tipo_producao: 'Artigo em periódico', autores: 'Docente Tres' },
      { id: 4, ano: 2026, tipo_producao: 'Artigo em periódico', autores: 'Docente Um' },
      { id: 6, ano: 2026, tipo_producao: 'Trabalho em anais', autores: 'Docente Dois' },
      { id: 8, ano: 2026, tipo_producao: 'Capítulo', autores: 'Docente Um' },

      { id: 9, ano: 2027, tipo_producao: 'Capítulo', autores: 'Docente Tres' },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      publicacoes: pubs,
    })

    const dpt = rel.todosIndicadores.find((i) => i.codigo === 'DPT')
    expect(dpt?.status).toBe('calculado')
    expect(dpt?.anos?.[2025].valorCalculado).toBe(1.333)
    expect(dpt?.anos?.[2026].valorCalculado).toBe(1.333)
    expect(dpt?.anos?.[2027].valorCalculado).toBe(0.333)
    expect(dpt?.valorCalculado).toBe(1.0)
  })

  it('calcula SO, PSA, DP4A, ATI, NICT e NDISC ano a ano com agregação MMA', () => {
    const dadosCompletos: DadosEntradaIndicadores = {
      ...dadosMinimos,
      orientacoes: [
        { id: 1, status: 'ativo', docente_id: 1, tipo: 'Mestrado', inicio: '2025-01-01' } as any,
        { id: 2, status: 'ativo', docente_id: 2, tipo: 'Doutorado', inicio: '2025-01-01' } as any,
      ],
      disciplinas: [
        {
          id: 1,
          docente_id: 1,
          nivel: 'pos_graduacao',
          nome: 'Ciência dos Materiais',
          ano_semestre: '2025.1',
        } as any,
        {
          id: 2,
          docente_id: 2,
          nivel: 'pos_graduacao',
          nome: 'Termodinâmica',
          ano_semestre: '2025.2',
        } as any,
        {
          id: 3,
          docente_id: 1,
          nivel: 'graduacao',
          nome: 'Química Geral',
          ano_semestre: '2025.1',
        } as any,
      ],
      projetos: [
        { id: 1, coordenador_id: 1, titulo: 'Projeto A', inicio: '2025-01-01' } as any,
        { id: 2, coordenador_id: 2, titulo: 'Projeto B', inicio: '2025-01-01' } as any,
      ],
      projetosParticipantes: [],
      publicacoes: [
        { id: 1, ano: 2025, autores: 'Docente Um', estrato_qualis: 'A1' } as any,
        { id: 2, ano: 2026, autores: 'Docente Dois', estrato_qualis: 'A2' } as any,
      ],
      iniciacoesCientificas: [
        { id: 1, tipo: 'iniciacao_cientifica', docente_orientador_id: 1, ano: 2025 } as any,
        { id: 2, tipo: 'iniciacao_tecnologica', docente_orientador_id: 2, ano: 2025 } as any,
      ],
    }

    const rel = calcularTodosIndicadores(dadosCompletos)

    // SO em 2025: 2 de 4 DP com orientações ativas = 50%
    const so = rel.todosIndicadores.find((i) => i.codigo === 'SO')
    expect(so?.anos?.[2025].valorCalculado).toBe(50)
    expect(so?.valorCalculado).toBe(50)

    // ATI em 2025: 2 disciplinas de PG / 4 DP = 0.5
    const ati = rel.todosIndicadores.find((i) => i.codigo === 'ATI')
    expect(ati?.anos?.[2025].valorCalculado).toBe(0.5)
    expect(ati?.valorCalculado).toBe(0.5)

    // NICT em 2025: (1 IC + 1 IT) / 4 DP = 2 / 4 = 0.5
    const nict = rel.todosIndicadores.find((i) => i.codigo === 'NICT')
    expect(nict?.anos?.[2025].valorCalculado).toBe(0.5)
    expect(nict?.valorCalculado).toBe(0.5)

    // NDISC em 2025: Docente 1 tem graduação. Docentes 2, 3 e 4 não têm => 3 de 4 = 75%
    const ndisc = rel.todosIndicadores.find((i) => i.codigo === 'NDISC')
    expect(ndisc?.anos?.[2025].valorCalculado).toBe(75)
    expect(ndisc?.valorCalculado).toBe(75)

    // DP4A em 2025: Docente 1 cumpre as 4 atividades simultâneas em 2025 (orientação, PG, projeto, pub 2025)
    // 1 de 4 DP = 25%
    const dp4a = rel.todosIndicadores.find((i) => i.codigo === 'DP4A')
    expect(dp4a?.anos?.[2025].valorCalculado).toBe(25)
    expect(dp4a?.valorCalculado).toBe(25)
  })

  it('calcula Patentes (DPPn e DPPi) com pesos e agregação MMA', () => {
    // DP - JDP = 3
    // Patente Nacional 1: Concedida (0.6) em 2025
    // Patente Nacional 2: Pendente (0.3) em 2026
    // 2025: 0.6 / 3 = 0.2
    // 2026: 0.3 / 3 = 0.1
    // MMA (2025, 2026) = (0.2 + 0.1) / 2 = 0.15
    const patentes: any[] = [
      {
        id: 1,
        titulo: 'Patente BR 1',
        status: 'Concessão',
        ambito: 'nacional',
        inpi: 'BR123',
        created_at: '2025-03-01',
      },
      {
        id: 2,
        titulo: 'Patente BR 2',
        status: 'Pendente',
        ambito: 'nacional',
        inpi: 'BR456',
        created_at: '2026-05-01',
      },
      {
        id: 3,
        titulo: 'Patente US 1',
        status: 'Licenciamento',
        ambito: 'internacional',
        inpi: 'US789',
        created_at: '2025-08-01',
      },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      patentes,
    })

    const dppn = rel.todosIndicadores.find((i) => i.codigo === 'DPPn')
    expect(dppn?.status).toBe('calculado')
    expect(dppn?.anos?.[2025].valorCalculado).toBe(0.2)
    expect(dppn?.anos?.[2026].valorCalculado).toBe(0.1)
    expect(dppn?.valorCalculado).toBe(0.15)

    // DPPi: 1 licenciada internacional em 2025 = 1.0 / 3 = 0.333
    const dppi = rel.todosIndicadores.find((i) => i.codigo === 'DPPi')
    expect(dppi?.status).toBe('calculado')
    expect(dppi?.anos?.[2025].valorCalculado).toBe(0.333)
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

  it('calcula pesos dos estratos A1 a C no DPI e soma por docentes permanentes vinculados ano a ano', () => {
    // DP = 4, JDP = 1 => DP - JDP = 3
    // 2025:
    // Pub 101: A1, vinculada a Doc 1 e Doc 2 (2 DPs) => 2 * 1.0 = 2.0
    // Pub 102: A2, vinculada a Doc 1 => 1 * 0.875 = 0.875
    // Numerador 2025 = 2.875 => DPI 2025 = 2.875 / 3 = 0.958
    // 2026:
    // Pub 103: A3, vinculada a Doc 3 => 1 * 0.75 = 0.75
    // Pub 104: A4, vinculada a Doc 1 => 1 * 0.675 = 0.675
    // Numerador 2026 = 1.425 => DPI 2026 = 1.425 / 3 = 0.475
    // 2027:
    // Pub 105: B1, Doc 1 => 1 * 0.5 = 0.5; Pubs 106 a 109: B2-C => 0.0
    // Numerador 2027 = 0.5 => DPI 2027 = 0.5 / 3 = 0.167
    // MMA (2025, 2026, 2027) = (0.958 + 0.475 + 0.167) / 3 = 0.533
    const pubs: any[] = [
      { id: 101, ano: 2025, estrato_qualis: 'A1', tipo_producao: 'Artigo em periódico' },
      { id: 102, ano: 2025, estrato_qualis: 'A2', tipo_producao: 'Artigo em periódico' },
      { id: 103, ano: 2026, estrato_qualis: 'A3', tipo_producao: 'Artigo em periódico' },
      { id: 104, ano: 2026, estrato_qualis: 'A4', tipo_producao: 'Artigo em periódico' },
      { id: 105, ano: 2027, estrato_qualis: 'B1', tipo_producao: 'Artigo em periódico' },
      { id: 106, ano: 2027, estrato_qualis: 'B2', tipo_producao: 'Artigo em periódico' },
      { id: 107, ano: 2027, estrato_qualis: 'B3', tipo_producao: 'Artigo em periódico' },
      { id: 108, ano: 2027, estrato_qualis: 'B4', tipo_producao: 'Artigo em periódico' },
      { id: 109, ano: 2027, estrato_qualis: 'C', tipo_producao: 'Artigo em periódico' },
    ]

    const pubsDocentes: any[] = [
      { publicacao_id: 101, docente_id: 1 },
      { publicacao_id: 101, docente_id: 2 }, // 2 permanentes vinculados na pub 101
      { publicacao_id: 102, docente_id: 1 },
      { publicacao_id: 103, docente_id: 3 },
      { publicacao_id: 104, docente_id: 1 },
      { publicacao_id: 105, docente_id: 1 },
      { publicacao_id: 106, docente_id: 1 },
      { publicacao_id: 107, docente_id: 1 },
      { publicacao_id: 108, docente_id: 1 },
      { publicacao_id: 109, docente_id: 1 },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      publicacoes: pubs,
      publicacoesDocentes: pubsDocentes,
    })

    const dpi = rel.todosIndicadores.find((i) => i.codigo === 'DPI')
    expect(dpi?.status).toBe('calculado')
    expect(dpi?.anos?.[2025].valorCalculado).toBe(0.958)
    expect(dpi?.anos?.[2026].valorCalculado).toBe(0.475)
    expect(dpi?.anos?.[2027].valorCalculado).toBe(0.167)
    expect(dpi?.valorCalculado).toBe(0.533)

    // DPT anual:
    // 2025: pub 101 (2 DPs) + pub 102 (1 DP) = 3 produções => 3 / 3 = 1.0
    // 2026: pub 103 (1) + pub 104 (1) = 2 produções => 2 / 3 = 0.667
    // 2027: 5 pubs = 5 produções => 5 / 3 = 1.667
    // MMA = (1.0 + 0.667 + 1.667) / 3 = 1.111
    const dpt = rel.todosIndicadores.find((i) => i.codigo === 'DPT')
    expect(dpt?.status).toBe('calculado')
    expect(dpt?.anos?.[2025].valorCalculado).toBe(1.0)
    expect(dpt?.anos?.[2026].valorCalculado).toBe(0.667)
    expect(dpt?.anos?.[2027].valorCalculado).toBe(1.667)
    expect(dpt?.valorCalculado).toBe(1.111)
  })

  it('exibe "aguardando insumo" quando publicações não têm estrato Qualis definido, nunca zero', () => {
    const pubsSemQualis: any[] = [
      {
        id: 201,
        ano: 2025,
        autores: 'Docente Um',
        estrato_qualis: null,
        tipo_producao: 'Artigo em periódico',
      },
      {
        id: 202,
        ano: 2026,
        autores: 'Docente Dois',
        estrato_qualis: '',
        tipo_producao: 'Artigo em periódico',
      },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      publicacoes: pubsSemQualis,
      publicacoesDocentes: [
        { publicacao_id: 201, docente_id: 1 },
        { publicacao_id: 202, docente_id: 2 },
      ],
    })

    const dpi = rel.todosIndicadores.find((i) => i.codigo === 'DPI')
    expect(dpi?.status).toBe('indefinido')
    expect(dpi?.motivoIndefinido).toContain('aguardando insumo')
    expect(dpi?.valorCalculado).toBeNull()
  })

  // Novos testes específicos da especificação MMA:
  it('produção concentrada em 1 ano (10 publicações A1 em 2025, nada em 2026-2028): MMA não zera anos sem insumo', () => {
    // DP = 4, JDP = 1 => DP - JDP = 3
    // 10 publicações A1 em 2025 vinculadas ao Docente Um
    // Pontuação 2025 = 10 * 1.0 = 10.0 => DPI 2025 = 10 / 3 = 3.333
    // Anos 2026, 2027, 2028: sem publicações cadastradas => aguardando insumo (não entram como 0)
    // MMA reflete os anos com insumo preenchido = 3.333
    const pubs1Ano: any[] = Array.from({ length: 10 }, (_, i) => ({
      id: 300 + i,
      ano: 2025,
      autores: 'Docente Um',
      estrato_qualis: 'A1',
      tipo_producao: 'Artigo em periódico',
    }))

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      publicacoes: pubs1Ano,
    })

    const dpi = rel.todosIndicadores.find((i) => i.codigo === 'DPI')
    expect(dpi?.status).toBe('calculado')
    expect(dpi?.anos?.[2025].status).toBe('calculado')
    expect(dpi?.anos?.[2025].valorCalculado).toBe(3.333)
    expect(dpi?.anos?.[2026].status).toBe('indefinido')
    expect(dpi?.anos?.[2027].status).toBe('indefinido')
    expect(dpi?.anos?.[2028].status).toBe('indefinido')
    // Não é dividido por 4 com zeros, é a média dos anos com insumo
    expect(dpi?.valorCalculado).toBe(3.333)
    expect(dpi?.mma?.completo).toBe(false)
    expect(dpi?.mma?.anosConsiderados).toEqual([2025])
    expect(dpi?.mma?.anosAguardando).toEqual([2026, 2027, 2028])
  })

  it('quadriênio 100% preenchido fecha MMA completa', () => {
    // 1 publicação A1 em cada ano: 2025, 2026, 2027, 2028
    // DP - JDP = 3
    // Cada ano tem 1 A1 => DPI_ano = 1 / 3 = 0.333
    // MMA = (0.333 * 4) / 4 = 0.333
    const pubs4Anos: any[] = [
      { id: 401, ano: 2025, autores: 'Docente Um', estrato_qualis: 'A1' },
      { id: 402, ano: 2026, autores: 'Docente Um', estrato_qualis: 'A1' },
      { id: 403, ano: 2027, autores: 'Docente Um', estrato_qualis: 'A1' },
      { id: 404, ano: 2028, autores: 'Docente Um', estrato_qualis: 'A1' },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      publicacoes: pubs4Anos,
    })

    const dpi = rel.todosIndicadores.find((i) => i.codigo === 'DPI')
    expect(dpi?.status).toBe('calculado')
    expect(dpi?.mma?.completo).toBe(true)
    expect(dpi?.mma?.anosConsiderados).toEqual([2025, 2026, 2027, 2028])
    expect(dpi?.mma?.anosAguardando).toEqual([])
    expect(dpi?.valorCalculado).toBe(0.333)
  })

  it('indicadores de estoque (ADE, H2) não possuem decomposição anual ou MMA', () => {
    const rel = calcularTodosIndicadores(dadosMinimos)

    const ade = rel.todosIndicadores.find((i) => i.codigo === 'ADE')
    expect(ade?.metodologia).toBe('estoque')
    expect(ade?.anos).toBeUndefined()
    expect(ade?.mma).toBeUndefined()
    expect(ade?.valorCalculado).toBe(80)

    const h2 = rel.todosIndicadores.find((i) => i.codigo === 'H2')
    expect(h2?.metodologia).toBe('estoque')
    expect(h2?.anos).toBeUndefined()
    expect(h2?.mma).toBeUndefined()
    expect(h2?.valorCalculado).toBe(4)
  })
})
