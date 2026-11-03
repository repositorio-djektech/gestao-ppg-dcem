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
    const rel = calcularTodosIndicadores({ ...dadosComOrientacoes, anoReferencia: 2028 })
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

    const rel = calcularTodosIndicadores({ ...dadosPubs, anoReferencia: 2028 })
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
      anoReferencia: 2028,
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
      anoReferencia: 2028,
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
      anoReferencia: 2028,
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

  it('calcula pesos dos estratos A1 a C no DPI contando cada publicação uma única vez, ano a ano', () => {
    // DP = 4, JDP = 1 => DP - JDP = 3
    // 2025:
    // Regra do produto: cada publicação conta uma única vez, mesmo com vários DPs vinculados.
    // Pub 101: A1, vinculada a Doc 1 e Doc 2 (2 DPs) => 1 * 1.0 = 1.0
    // Pub 102: A2, vinculada a Doc 1 => 1 * 0.875 = 0.875
    // Numerador 2025 = 1.875 => DPI 2025 = 1.875 / 3 = 0.625
    // 2026:
    // Pub 103: A3, vinculada a Doc 3 => 1 * 0.75 = 0.75
    // Pub 104: A4, vinculada a Doc 1 => 1 * 0.675 = 0.675
    // Numerador 2026 = 1.425 => DPI 2026 = 1.425 / 3 = 0.475
    // 2027:
    // Pub 105: B1, Doc 1 => 1 * 0.5 = 0.5; Pubs 106 a 109: B2-C => 0.0
    // Numerador 2027 = 0.5 => DPI 2027 = 0.5 / 3 = 0.167
    // MMA (2025, 2026, 2027) = (0.625 + 0.475 + 0.167) / 3 = 0.422
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
      anoReferencia: 2028,
      publicacoes: pubs,
      publicacoesDocentes: pubsDocentes,
    })

    const dpi = rel.todosIndicadores.find((i) => i.codigo === 'DPI')
    expect(dpi?.status).toBe('calculado')
    expect(dpi?.anos?.[2025].valorCalculado).toBe(0.625)
    expect(dpi?.anos?.[2026].valorCalculado).toBe(0.475)
    expect(dpi?.anos?.[2027].valorCalculado).toBe(0.167)
    expect(dpi?.valorCalculado).toBe(0.422)

    // DPT anual:
    // 2025: pub 101 + pub 102 = 2 produções (cada uma conta 1 vez) => 2 / 3 = 0.667
    // 2026: pub 103 (1) + pub 104 (1) = 2 produções => 2 / 3 = 0.667
    // 2027: 5 pubs = 5 produções => 5 / 3 = 1.667
    // MMA = (0.667 + 0.667 + 1.667) / 3 = 1.0
    const dpt = rel.todosIndicadores.find((i) => i.codigo === 'DPT')
    expect(dpt?.status).toBe('calculado')
    expect(dpt?.anos?.[2025].valorCalculado).toBe(0.667)
    expect(dpt?.anos?.[2026].valorCalculado).toBe(0.667)
    expect(dpt?.anos?.[2027].valorCalculado).toBe(1.667)
    expect(dpt?.valorCalculado).toBe(1)
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
    // O JDP (Docente Quatro, desde 2024) completa 4 anos em 2028 e volta ao denominador:
    // DP - JDP = 3 em 2025-2027 e 4 em 2028
    // DPI_ano = 1 / 3 = 0.333 (2025-2027) e 1 / 4 = 0.25 (2028)
    // MMA = (0.333 * 3 + 0.25) / 4 = 0.312
    const pubs4Anos: any[] = [
      { id: 401, ano: 2025, autores: 'Docente Um', estrato_qualis: 'A1' },
      { id: 402, ano: 2026, autores: 'Docente Um', estrato_qualis: 'A1' },
      { id: 403, ano: 2027, autores: 'Docente Um', estrato_qualis: 'A1' },
      { id: 404, ano: 2028, autores: 'Docente Um', estrato_qualis: 'A1' },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      anoReferencia: 2028,
      publicacoes: pubs4Anos,
    })

    const dpi = rel.todosIndicadores.find((i) => i.codigo === 'DPI')
    expect(dpi?.status).toBe('calculado')
    expect(dpi?.mma?.completo).toBe(true)
    expect(dpi?.mma?.anosConsiderados).toEqual([2025, 2026, 2027, 2028])
    expect(dpi?.mma?.anosAguardando).toEqual([])
    expect(dpi?.anos?.[2027].valorCalculado).toBe(0.333)
    expect(dpi?.anos?.[2028].valorCalculado).toBe(0.25)
    expect(dpi?.valorCalculado).toBe(0.312)
  })

  it('indicadores de estoque (ADE, H2) não possuem decomposição anual ou MMA', () => {
    const rel = calcularTodosIndicadores(dadosMinimos)

    const ade = rel.todosIndicadores.find((i) => i.codigo === 'ADE')
    expect(ade?.metodologia).toBe('estoque')
    expect(ade?.anos).toBeUndefined()
    expect(ade?.mma).toBeUndefined()
    expect(ade?.valorCalculado).toBe(66.67) // DP 4 / (4 + 1 + 1), igual ao primeiro teste do arquivo

    const h2 = rel.todosIndicadores.find((i) => i.codigo === 'H2')
    expect(h2?.metodologia).toBe('estoque')
    expect(h2?.anos).toBeUndefined()
    expect(h2?.mma).toBeUndefined()
    expect(h2?.valorCalculado).toBe(4)
  })
  it('calcula DPTDE1 apenas com publicações com coautoria de discente ou egresso', () => {
    // DP - JDP = 3; em 2025: periódico + anais + capítulo com coautoria = 3; o periódico sem coautoria não conta
    // DPTDE1 2025 = 3 / 3 = 1.0; demais anos sem insumo (aguardando)
    const pubs: any[] = [
      { id: 1, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Um' },
      { id: 2, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Dois' },
      { id: 3, ano: 2025, tipo_producao: 'Trabalho em anais', autores: 'Docente Um' },
      { id: 4, ano: 2025, tipo_producao: 'Capítulo', autores: 'Docente Tres' },
    ]
    const coautores: any[] = [
      { publicacao_id: 1, tipo: 'orientando' },
      { publicacao_id: 3, tipo: 'orientando' },
      { publicacao_id: 4, tipo: 'egresso' },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      anoReferencia: 2028,
      publicacoes: pubs,
      publicacoesCoautores: coautores,
    })

    const dptde1 = rel.todosIndicadores.find((i) => i.codigo === 'DPTDE1')
    expect(dptde1?.itemFicha).toBe('2.2.1')
    expect(dptde1?.status).toBe('calculado')
    expect(dptde1?.anos?.[2025].valorCalculado).toBe(1.0)
    expect(dptde1?.anos?.[2026].status).toBe('indefinido')
    expect(dptde1?.valorCalculado).toBe(1.0)

    // Sem coautorias registradas, o indicador fica aguardando insumo (nunca zero)
    const semCoautoria = calcularTodosIndicadores({
      ...dadosMinimos,
      anoReferencia: 2028,
      publicacoes: pubs,
    })
    expect(semCoautoria.todosIndicadores.find((i) => i.codigo === 'DPTDE1')?.status).toBe(
      'indefinido',
    )
  })

  it('calcula FOR (% de DP com bolsa PQ ou DT) separando níveis 1 e 2', () => {
    const docentes = [
      criarDocente(1, 'Docente Um', 'permanente', { bolsa_cnpq: 'PQ-1A' }),
      criarDocente(2, 'Docente Dois', 'permanente', { bolsa_cnpq: 'PQ 2' }),
      criarDocente(3, 'Docente Tres', 'permanente', { bolsa_cnpq: '' }),
      criarDocente(4, 'Docente Quatro', 'permanente', { bolsa_cnpq: 'DT-2' }),
      criarDocente(5, 'Docente Cinco', 'colaborador', { bolsa_cnpq: 'PQ-1A' }),
    ]

    const rel = calcularTodosIndicadores({ ...dadosMinimos, docentes })
    const forInd = rel.todosIndicadores.find((i) => i.codigo === 'FOR')

    expect(forInd?.quesito).toBe('3.3')
    expect(forInd?.itemFicha).toBe('3.3.2')
    expect(forInd?.metodologia).toBe('estoque')
    expect(forInd?.valorCalculado).toBe(75) // 3 de 4 DP; colaborador não conta
    const termo = (t: string) => forInd?.decomposicao.find((d) => d.termo === t)?.valor
    expect(termo('Nível 1')).toBe(1)
    expect(termo('Nível 2')).toBe(2)
    expect(termo('dos quais DT')).toBe(1)
    expect(rel.quesitos.map((q) => q.quesito)).toContain('3.3')
  })
  it('aplica a janela de 5 anos aos egressos coautores (ano da publicação ≤ titulação + 5)', () => {
    // Egresso 1 titulado em 2018 (janela até 2023): fora em 2025
    // Egresso 2 titulado em 2022 (janela até 2027): dentro
    // Egresso 3 sem ano de titulação: conta, mas gera aviso de insumo
    // Pub 3 tem orientando (discente em formação): sempre vale
    const pubs: any[] = [
      { id: 1, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Um' },
      { id: 2, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Um' },
      { id: 3, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Dois' },
      { id: 4, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Tres' },
    ]
    const coautores: any[] = [
      { publicacao_id: 1, tipo: 'egresso', egresso_id: 1 },
      { publicacao_id: 2, tipo: 'egresso', egresso_id: 2 },
      { publicacao_id: 3, tipo: 'orientando', discente_id: 9 },
      { publicacao_id: 4, tipo: 'egresso', egresso_id: 3 },
    ]
    const egressos: any[] = [
      { id: 1, nome: 'Egresso Antigo', ano_titulacao: 2018 },
      { id: 2, nome: 'Egresso Recente', ano_titulacao: 2022 },
      { id: 3, nome: 'Egresso Sem Ano', ano_titulacao: null },
    ]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      anoReferencia: 2028,
      publicacoes: pubs,
      publicacoesCoautores: coautores,
      egressos,
    })

    const dptde1 = rel.todosIndicadores.find((i) => i.codigo === 'DPTDE1')
    // pubs 2, 3 e 4 contam (3 de 3 = 1.0); a pub 1 (egresso titulado há mais de 5 anos) fica de fora
    expect(dptde1?.anos?.[2025].valorCalculado).toBe(1.0)
    expect(dptde1?.insumos.some((i) => i.descricao.includes('sem ano de titulação'))).toBe(true)
    expect(dptde1?.observacoes).toContain('até 5 anos')
  })
  it('divide a produção sem coautoria discente pelo nº de programas do DP (DPI e DPT)', () => {
    // Docente Um é permanente em 2 programas: sua produção sem coautoria discente conta 1/2
    // Docente Dois é permanente só aqui. DP - JDP = 3.
    const docentes = baseDocentes.map((d) =>
      d.id === 1 ? { ...d, programas_permanente: 2 } : d,
    )
    const pubs: any[] = [
      // só do Docente Um, sem coautoria: 0.5
      { id: 1, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Um', estrato_qualis: 'A1' },
      // Docente Um + Docente Dois, sem coautoria: vale o mais exclusivo (1), conta uma vez
      { id: 2, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Um; Docente Dois', estrato_qualis: 'A1' },
      // Docente Um com coautoria de orientando: exceção da ficha, conta 1
      { id: 3, ano: 2025, tipo_producao: 'Artigo em periódico', autores: 'Docente Um', estrato_qualis: 'A1' },
    ]
    const coautores: any[] = [{ publicacao_id: 3, tipo: 'orientando', discente_id: 9 }]

    const rel = calcularTodosIndicadores({
      ...dadosMinimos,
      anoReferencia: 2025,
      docentes,
      publicacoes: pubs,
      publicacoesCoautores: coautores,
    })

    const dpi = rel.todosIndicadores.find((i) => i.codigo === 'DPI')
    // (0.5 + 1 + 1) A1 / 3 = 0.833
    expect(dpi?.anos?.[2025].valorCalculado).toBe(0.833)
    const dpt = rel.todosIndicadores.find((i) => i.codigo === 'DPT')
    expect(dpt?.anos?.[2025].valorCalculado).toBe(0.833)
    expect(dpi?.observacoes).toContain('nº de programas')

    // Sem o campo (ou com 1), nada muda: 3 publicações / 3 = 1
    const semCampo = calcularTodosIndicadores({
      ...dadosMinimos,
      anoReferencia: 2025,
      publicacoes: pubs,
      publicacoesCoautores: coautores,
    })
    expect(semCampo.todosIndicadores.find((i) => i.codigo === 'DPI')?.anos?.[2025].valorCalculado).toBe(1)
  })
  it('calcula DPPDE só com patentes com discente ou egresso, sem separar nacional/internacional', () => {
    // DP - JDP = 3 em 2025: (0,6 concedida + 0,3 depositada) / 3 = 0.3; a patente sem marcação não entra
    const patentes: any[] = [
      { id: 1, status: 'Concessão', ano_deposito: 2025, com_discente_egresso: true, inpi: 'BR 1' },
      { id: 2, status: 'Pendente', ano_deposito: 2025, com_discente_egresso: true, inpi: 'PCT/US 2' },
      { id: 3, status: 'Concessão', ano_deposito: 2025, com_discente_egresso: false, inpi: 'BR 3' },
    ]
    const rel = calcularTodosIndicadores({ ...dadosMinimos, anoReferencia: 2025, patentes })
    const dppde = rel.todosIndicadores.find((i) => i.codigo === 'DPPDE')

    expect(dppde?.itemFicha).toBe('2.2.3')
    expect(dppde?.pesoPercentual).toBe(3)
    expect(dppde?.anos?.[2025].valorCalculado).toBe(0.3)
    expect(dppde?.valorCalculado).toBe(0.3)

    const semMarcacao = calcularTodosIndicadores({
      ...dadosMinimos,
      anoReferencia: 2025,
      patentes: patentes.map((p) => ({ ...p, com_discente_egresso: false })),
    })
    expect(semMarcacao.todosIndicadores.find((i) => i.codigo === 'DPPDE')?.status).toBe('indefinido')
  })

  it('calcula os indicadores de egressos (2.3.1 a 2.3.3) sobre os titulados nos últimos 10 anos', () => {
    // Referência 2026: janela 2017-2026. Egresso de 2010 fica fora.
    const egressos: any[] = [
      { id: 1, tipo_curso: 'Mestrado', ano_titulacao: 2020, atuacao_setor: 'ensino_superior', atuacao_pais: 'brasil' },
      { id: 2, tipo_curso: 'Doutorado', ano_titulacao: 2018, atuacao_setor: 'industria_servicos', atuacao_pais: 'exterior' },
      { id: 3, tipo_curso: 'Mestrado', ano_titulacao: 2022, atuacao_setor: 'nao_atua_na_area', atuacao_pais: 'brasil' },
      { id: 4, tipo_curso: 'Mestrado', ano_titulacao: 2024, atuacao_setor: '', atuacao_pais: '' },
      { id: 5, tipo_curso: 'Mestrado', ano_titulacao: 2010, atuacao_setor: 'ensino_superior', atuacao_pais: 'brasil' },
    ]
    const rel = calcularTodosIndicadores({ ...dadosMinimos, anoReferencia: 2026, egressos })
    const valor = (cod: string) => rel.todosIndicadores.find((i) => i.codigo === cod)

    // 4 titulados na janela (ids 1 a 4); 3 com atuação informada; 2 na área
    expect(valor('EGR-AREA')?.valorCalculado).toBe(50)
    expect(valor('EGR-BR')?.valorCalculado).toBe(25)
    expect(valor('EGR-EXT')?.valorCalculado).toBe(25)
    expect(valor('EGR-AREA')?.itemFicha).toBe('2.3.1')
    expect(valor('EGR-AREA')?.observacoes).toContain('Cobertura parcial')
    expect(valor('EGR-AREA')?.insumos[0].atendido).toBe(false)

    // Nenhuma atuação informada: aguardando insumo, nunca 0%
    const semAtuacao = calcularTodosIndicadores({
      ...dadosMinimos,
      anoReferencia: 2026,
      egressos: egressos.map((e) => ({ ...e, atuacao_setor: '', atuacao_pais: '' })),
    })
    expect(semAtuacao.todosIndicadores.find((i) => i.codigo === 'EGR-AREA')?.status).toBe('indefinido')
  })

  it('limita os destaques de egressos a 5 por faixa e exige justificativa (2.3.4)', () => {
    const mk = (id: number, ano: number, just: string) => ({
      id,
      ano_titulacao: ano,
      destaque: true,
      destaque_justificativa: just,
    })
    const egressos: any[] = [
      ...[1, 2, 3, 4, 5, 6].map((n) => mk(n, 2021, 'Pesquisador na área')), // 6 na faixa 2020-24: conta 5
      mk(7, 2022, ''), // sem justificativa: não conta
      mk(8, 2016, 'Professor na UFS'), // faixa 2015-19: 1
      mk(9, 2005, 'Fora das faixas'), // não conta
    ]
    const rel = calcularTodosIndicadores({ ...dadosMinimos, anoReferencia: 2026, egressos })
    const dest = rel.todosIndicadores.find((i) => i.codigo === 'EGR-DEST')

    expect(dest?.itemFicha).toBe('2.3.4')
    expect(dest?.valorCalculado).toBe(6) // 5 + 1 + 0
    expect(dest?.decomposicao.find((d) => d.termo === 'Faixa 2020–2024')?.valor).toBe('5/5')
    expect(dest?.decomposicao.find((d) => d.termo === 'Fora das faixas')?.valor).toBe(1)
  })
  it('calcula DPEX (% de DP só neste programa) e compara com o mínimo de 50% para MB', () => {
    // DP = 4 (Docentes 1 a 4, o 4 é JDP): 2 em dois programas => 2 de 4 = 50%
    const docentes = baseDocentes.map((d) =>
      d.id === 1 || d.id === 2 ? { ...d, programas_permanente: 2 } : d,
    )
    const rel = calcularTodosIndicadores({ ...dadosMinimos, docentes })
    const dpex = rel.todosIndicadores.find((i) => i.codigo === 'DPEX')

    expect(dpex?.quesito).toBe('1')
    expect(dpex?.itemFicha).toBe('1.2.2')
    expect(dpex?.metodologia).toBe('estoque')
    expect(dpex?.valorCalculado).toBe(50)
    expect(dpex?.decomposicao.find((d) => d.termo === 'Meta MB')?.descricao).toContain('Atinge')

    // 3 de 4 em dois programas => 25%, abaixo da meta
    const abaixo = calcularTodosIndicadores({
      ...dadosMinimos,
      docentes: baseDocentes.map((d) =>
        d.id <= 3 ? { ...d, programas_permanente: 2 } : d,
      ),
    })
    const dpexAbaixo = abaixo.todosIndicadores.find((i) => i.codigo === 'DPEX')
    expect(dpexAbaixo?.valorCalculado).toBe(25)
    expect(dpexAbaixo?.decomposicao.find((d) => d.termo === 'Meta MB')?.descricao).toContain('Abaixo')

    // Sem o campo, todos contam como exclusivos
    expect(
      calcularTodosIndicadores(dadosMinimos).todosIndicadores.find((i) => i.codigo === 'DPEX')
        ?.valorCalculado,
    ).toBe(100)
  })
})
