import { describe, it, expect, vi } from 'vitest'
import {
  gravarDocentes,
  gravarPublicacoes,
  gravarOrientacoes,
  gravarBancas,
  gravarProjetosPesquisa,
  gravarPremiacoes,
  gravarProducaoTecnica,
  gravarPatentes,
  gravarEventos,
  gravarDadosLattes,
  converterLattesDocente,
  converterLattesPublicacao,
  converterLattesOrientacao,
  converterLattesBanca,
  converterLattesProjeto,
  converterLattesPremiacao,
  converterLattesProducaoTecnica,
  converterLattesPatente,
  converterLattesEvento,
  type DocenteParaGravar,
  type PublicacaoParaGravar,
  type OrientacaoParaGravar,
  type BancaParaGravar,
  type ProjetoPesquisaParaGravar,
  type PremiacaoParaGravar,
  type ProducaoTecnicaParaGravar,
  type PatenteParaGravar,
  type EventoParaGravar,
  type SupabaseClientLike,
} from './gravar'
import type {
  LattesDocente,
  LattesPublicacao,
  LattesOrientacao,
  LattesBanca,
  LattesProjeto,
  LattesPremiacao,
  LattesProducaoTecnica,
  LattesPatente,
  LattesEvento,
} from './types'

/**
 * Cria um mock completo em memória do cliente Supabase para todas as 9 tabelas + discentes.
 * Não acessa rede nem banco real.
 */
function createMockSupabaseClient(initialState?: {
  docentes?: Array<{ id: number; nome: string; id_lattes: string | null; [key: string]: unknown }>
  publicacoes?: Array<{ id: number; titulo: string; ano: number; [key: string]: unknown }>
  discentes?: Array<{ id: number; nome: string; link_lattes?: string; [key: string]: unknown }>
  orientacoes?: Array<{
    id: number
    docente_id?: number | null
    discente_id?: number | null
    tipo: string
    inicio: string
    [key: string]: unknown
  }>
  bancas?: Array<{
    id: number
    titulo_trabalho: string
    data: string
    tipo: string
    [key: string]: unknown
  }>
  projetos_pesquisa?: Array<{ id: number; titulo: string; inicio: string; [key: string]: unknown }>
  premiacoes?: Array<{ id: number; titulo: string; ano?: number | null; [key: string]: unknown }>
  producao_tecnica?: Array<{
    id: number
    titulo: string
    ano?: number | null
    tipo: string
    [key: string]: unknown
  }>
  patentes?: Array<{
    id: number
    titulo: string
    inpi: string
    status: string
    [key: string]: unknown
  }>
  eventos?: Array<{
    id: number
    docente: string
    evento: string
    local_data: string
    papel: string
    [key: string]: unknown
  }>
}) {
  let nextId = 500

  const database: Record<string, any[]> = {
    docentes: [...(initialState?.docentes || [])],
    publicacoes: [...(initialState?.publicacoes || [])],
    discentes: [...(initialState?.discentes || [])],
    orientacoes: [...(initialState?.orientacoes || [])],
    bancas: [...(initialState?.bancas || [])],
    projetos_pesquisa: [...(initialState?.projetos_pesquisa || [])],
    premiacoes: [...(initialState?.premiacoes || [])],
    producao_tecnica: [...(initialState?.producao_tecnica || [])],
    patentes: [...(initialState?.patentes || [])],
    eventos: [...(initialState?.eventos || [])],
  }

  const insertCalls: Record<string, any[]> = {
    docentes: [],
    publicacoes: [],
    discentes: [],
    orientacoes: [],
    bancas: [],
    projetos_pesquisa: [],
    premiacoes: [],
    producao_tecnica: [],
    patentes: [],
    eventos: [],
  }

  const updateCalls: Record<string, any[]> = {
    docentes: [],
    publicacoes: [],
    discentes: [],
    orientacoes: [],
    bancas: [],
    projetos_pesquisa: [],
    premiacoes: [],
    producao_tecnica: [],
    patentes: [],
    eventos: [],
  }

  const mockClient = {
    from: vi.fn((table: string) => {
      const store = database[table] || []
      return {
        select: vi.fn((_cols?: string) => {
          return Promise.resolve({
            data: store.map((item) => ({ ...item })),
            error: null,
          })
        }),
        insert: vi.fn((rows: Array<Record<string, unknown>>) => {
          insertCalls[table]?.push(...rows)
          const created = rows.map((r) => {
            const item = {
              id: ++nextId,
              ...r,
            }
            store.push(item)
            return item
          })
          return {
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: created[0], error: null })),
            })),
          }
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          return {
            eq: vi.fn((col: string, val: unknown) => {
              updateCalls[table]?.push({ payload, col, val })
              const target = store.find((item) => item[col] === val)
              if (target) {
                Object.assign(target, payload)
              }
              return Promise.resolve({ error: null })
            }),
          }
        }),
      }
    }),
  }

  return {
    client: mockClient as unknown as SupabaseClientLike,
    database,
    insertCalls,
    updateCalls,
  }
}

describe('Serviço de Gravação Lattes - Subetapa 2A (Offline / Mocks)', () => {
  describe('Funções de conversão', () => {
    it('converte LattesOrientacao, LattesBanca, LattesProjeto, Premiacao, ProducaoTecnica, Patente e Evento corretamente', () => {
      // 1. Orientação
      const ori: LattesOrientacao = {
        tipo: 'MESTRADO',
        orientando: 'Fulano de Tal',
        titulo_trabalho: 'Tese Teste',
        ano_inicio: 2022,
        ano_conclusao: 2024,
        situacao: 'CONCLUIDA',
        tipo_orientacao: 'ORIENTADOR_PRINCIPAL',
        instituicao: 'UFS',
        curso: 'DCEM',
      }
      const oriConv = converterLattesOrientacao(ori, { id_lattes: '123', nome: 'Prof Orientador' })
      expect(oriConv.tipo).toBe('Mestrado')
      expect(oriConv.status).toBe('concluido')
      expect(oriConv.discente_nome).toBe('Fulano de Tal')
      expect(oriConv.inicio).toBe('2022')
      expect(oriConv.fim).toBe('2024')
      expect(oriConv.docente_identificador).toBe('123')

      // 2. Banca
      const banca: LattesBanca = {
        tipo: 'DOUTORADO',
        titulo_trabalho: 'Defesa de Doutorado em Materiais',
        ano: 2023,
        candidato: 'Candidato A',
        participantes: 'Prof A, Prof B',
      }
      const bancaConv = converterLattesBanca(banca)
      expect(bancaConv.tipo).toBe('Doutorado')
      expect(bancaConv.titulo_trabalho).toBe('Defesa de Doutorado em Materiais')
      expect(bancaConv.candidato_nome).toBe('Candidato A')

      // 3. Projeto
      const proj: LattesProjeto = {
        nome: 'Desenvolvimento de Sensores',
        ano_inicio: 2022,
        ano_fim: 2025,
        situacao: 'EM_ANDAMENTO',
        financiadores: ['CNPq', 'FAPITEC'],
        responsavel: true,
      }
      const projConv = converterLattesProjeto(proj, { id_lattes: '123', nome: 'Prof' })
      expect(projConv.titulo).toBe('Desenvolvimento de Sensores')
      expect(projConv.financiamento).toBe(true)
      expect(projConv.orgao_fomento).toBe('CNPq, FAPITEC')

      // 4. Premiação
      const prem: LattesPremiacao = {
        nome: 'Menção Honrosa',
        ano: 2023,
        entidade: 'CAPES',
      }
      const premConv = converterLattesPremiacao(prem, { nome: 'Prof Premiado' })
      expect(premConv.titulo).toBe('Menção Honrosa')
      expect(premConv.nome_premiado).toBe('Prof Premiado')
      expect(premConv.instituicao).toBe('CAPES')

      // 5. Produção Técnica
      const pt: LattesProducaoTecnica = {
        tipo: 'SOFTWARE',
        titulo: 'Simulador Termomecânico',
        ano: 2023,
        autores: 'Silva; Barreto',
      }
      const ptConv = converterLattesProducaoTecnica(pt)
      expect(ptConv.tipo).toBe('Software')
      expect(ptConv.titulo).toBe('Simulador Termomecânico')

      // 6. Patente
      const pat: LattesPatente = {
        titulo: 'Biopolímero Antimicrobiano',
        numero_registro: 'BR 10 2023 0005',
        ano_deposito: 2023,
      }
      const patConv = converterLattesPatente(pat)
      expect(patConv.status).toBe('Pendente')
      expect(patConv.inpi).toBe('BR 10 2023 0005')

      // 7. Evento
      const eve: LattesEvento = {
        nome: 'Encontro Nacional de Materiais',
        ano: 2024,
        cidade: 'Natal',
        tipo: 'TRABALHO',
      }
      const eveConv = converterLattesEvento(eve, { nome: 'Prof Ledjane' })
      expect(eveConv.evento).toBe('Encontro Nacional de Materiais')
      expect(eveConv.papel).toBe('Apresentador de Trabalho')
      expect(eveConv.docente).toBe('Prof Ledjane')
    })

    it('converte LattesDocente para DocenteParaGravar limpando id_lattes e nome', () => {
      const lattesDoc: LattesDocente = {
        id_lattes: '3104369029830651',
        nome_completo: 'Ledjane Silva Barreto',
      }
      const convertido = converterLattesDocente(lattesDoc)
      expect(convertido).toEqual({
        id_lattes: '3104369029830651',
        nome: 'Ledjane Silva Barreto',
      })
    })

    it('converte LattesPublicacao para PublicacaoParaGravar mapeando periodico, autores e doi', () => {
      const lattesPub: LattesPublicacao = {
        tipo: 'ARTIGO',
        titulo: 'Síntese de novos nanocompósitos',
        ano: 2023,
        veiculo: 'Journal of Materials Chemistry A',
        doi: '10.1039/c3ta12345a',
        autores: 'Silva, A. B.; Barreto, L. S.',
      }
      const convertido = converterLattesPublicacao(lattesPub)
      expect(convertido).toEqual({
        titulo: 'Síntese de novos nanocompósitos',
        autores: 'Silva, A. B.; Barreto, L. S.',
        periodico: 'Journal of Materials Chemistry A',
        ano: 2023,
        doi: '10.1039/c3ta12345a',
        link_comprovacao: '',
        observacoes: '',
      })
    })
  })

  describe('Gravação de docentes', () => {
    it('cenário 1: docente novo por id_lattes -> realiza INSERT', async () => {
      const mock = createMockSupabaseClient({
        docentes: [{ id: 1, nome: 'Professor Existente', id_lattes: '1111222233334444' }],
      })

      const novosDocentes: DocenteParaGravar[] = [
        {
          id_lattes: '3104369029830651',
          nome: 'Ledjane Silva Barreto',
        },
      ]

      const resultado = await gravarDocentes(novosDocentes, mock.client)

      expect(resultado.contagem.inseridos).toBe(1)
      expect(resultado.contagem.atualizados).toBe(0)
      expect(resultado.contagem.ignorados).toBe(0)
      expect(resultado.erros).toHaveLength(0)

      expect(mock.insertCalls.docentes).toHaveLength(1)
      expect(mock.updateCalls.docentes).toHaveLength(0)
      expect(mock.database.docentes.some((d) => d.id_lattes === '3104369029830651')).toBe(true)
    })

    it('cenário 2: docente existente por id_lattes -> realiza UPDATE (nome e campos)', async () => {
      const mock = createMockSupabaseClient({
        docentes: [
          {
            id: 42,
            nome: 'Ledjane S. Barreto (Nome Antigo)',
            id_lattes: '3104369029830651',
          },
        ],
      })

      const docenteAtualizado: DocenteParaGravar[] = [
        {
          id_lattes: '3104369029830651',
          nome: 'Ledjane Silva Barreto',
        },
      ]

      const resultado = await gravarDocentes(docenteAtualizado, mock.client)

      expect(resultado.contagem.inseridos).toBe(0)
      expect(resultado.contagem.atualizados).toBe(1)
      expect(resultado.contagem.ignorados).toBe(0)
      expect(resultado.erros).toHaveLength(0)

      expect(mock.insertCalls.docentes).toHaveLength(0)
      expect(mock.updateCalls.docentes).toHaveLength(1)
      const alvo = mock.database.docentes.find((d) => d.id === 42)
      expect(alvo?.nome).toBe('Ledjane Silva Barreto')
    })

    it('cenário 3: id_lattes ausente -> casa por nome exato e realiza UPDATE', async () => {
      const mock = createMockSupabaseClient({
        docentes: [
          {
            id: 10,
            nome: 'Carlos Eduardo',
            id_lattes: null,
          },
        ],
      })

      const docenteSemId: DocenteParaGravar[] = [
        {
          id_lattes: null,
          nome: 'Carlos Eduardo',
        },
      ]

      const resultado = await gravarDocentes(docenteSemId, mock.client)

      expect(resultado.contagem.atualizados).toBe(1)
      expect(resultado.contagem.inseridos).toBe(0)
      expect(mock.insertCalls.docentes).toHaveLength(0)
      expect(mock.updateCalls.docentes).toHaveLength(1)
    })

    it('cenário 4: id_lattes ausente e nome não encontrado -> realiza INSERT', async () => {
      const mock = createMockSupabaseClient({
        docentes: [],
      })

      const docenteNovoSemId: DocenteParaGravar[] = [
        {
          id_lattes: null,
          nome: 'Novo Docente Sem Lattes',
        },
      ]

      const resultado = await gravarDocentes(docenteNovoSemId, mock.client)

      expect(resultado.contagem.inseridos).toBe(1)
      expect(resultado.contagem.atualizados).toBe(0)
      expect(mock.insertCalls.docentes).toHaveLength(1)
    })

    it('cenário Zélia: docente existente sem id_lattes + XML com id_lattes e nome que casa normalizado -> UPDATE com preenchimento de id_lattes, NUNCA INSERT', async () => {
      const mock = createMockSupabaseClient({
        docentes: [
          {
            id: 3,
            nome: 'Zélia Soares Macedo',
            id_lattes: null,
            scopus_id: '6602984180',
            indice_h: 18,
            bolsa_cnpq: 'PQ-2',
          },
        ],
      })

      const docenteImportadoLattes: DocenteParaGravar[] = [
        {
          id_lattes: '4820658428841295',
          nome: 'Zelia Soares Macedo',
        },
      ]

      const resultado = await gravarDocentes(docenteImportadoLattes, mock.client)

      expect(resultado.contagem.inseridos).toBe(0)
      expect(resultado.contagem.atualizados).toBe(1)
      expect(resultado.contagem.ignorados).toBe(0)
      expect(resultado.erros).toHaveLength(0)

      expect(mock.insertCalls.docentes).toHaveLength(0)
      expect(mock.updateCalls.docentes).toHaveLength(1)

      const alvo = mock.database.docentes.find((d) => d.id === 3)
      expect(alvo).toBeDefined()
      expect(alvo?.id_lattes).toBe('4820658428841295')
      expect(alvo?.nome).toBe('Zelia Soares Macedo')
      // Preserva dados preexistentes se não sobrescritos
      expect(alvo?.scopus_id).toBe('6602984180')
      expect(alvo?.indice_h).toBe(18)
      expect(alvo?.bolsa_cnpq).toBe('PQ-2')
    })

    it('cenário id_lattes novo e nome que NÃO casa normalizado -> preserva comportamento de INSERT', async () => {
      const mock = createMockSupabaseClient({
        docentes: [
          {
            id: 3,
            nome: 'Zélia Soares Macedo',
            id_lattes: null,
          },
        ],
      })

      const docenteInedito: DocenteParaGravar[] = [
        {
          id_lattes: '9999888877776666',
          nome: 'Outro Professor Diferente',
        },
      ]

      const resultado = await gravarDocentes(docenteInedito, mock.client)

      expect(resultado.contagem.inseridos).toBe(1)
      expect(resultado.contagem.atualizados).toBe(0)
      expect(resultado.contagem.ignorados).toBe(0)
      expect(mock.insertCalls.docentes).toHaveLength(1)
      expect(mock.updateCalls.docentes).toHaveLength(0)
      expect(mock.database.docentes).toHaveLength(2)
      expect(mock.database.docentes.some((d) => d.id_lattes === '9999888877776666')).toBe(true)
    })
  })

  describe('Gravação de publicações', () => {
    it('cenário 5: publicação nova -> realiza INSERT', async () => {
      const mock = createMockSupabaseClient({
        publicacoes: [
          {
            id: 1,
            titulo: 'Outro Artigo Já Existente',
            ano: 2022,
          },
        ],
      })

      const novaPub: PublicacaoParaGravar[] = [
        {
          titulo: 'Development of Magnetic Nanoparticles for Drug Delivery',
          autores: 'Silva, M.; Barreto, L. S.',
          periodico: 'Ceramics International',
          ano: 2024,
          doi: '10.1016/j.ceramint.2024.01.001',
        },
      ]

      const resultado = await gravarPublicacoes(novaPub, mock.client)

      expect(resultado.contagem.inseridos).toBe(1)
      expect(resultado.contagem.atualizados).toBe(0)
      expect(resultado.contagem.ignorados).toBe(0)
      expect(mock.insertCalls.publicacoes).toHaveLength(1)
      expect(mock.updateCalls.publicacoes).toHaveLength(0)

      const inserida = mock.database.publicacoes.find((p) => p.ano === 2024)
      expect(inserida?.titulo).toBe('Development of Magnetic Nanoparticles for Drug Delivery')
    })

    it('cenário 6: publicação duplicada por título normalizado + ano -> realiza UPDATE e NÃO insert duplo', async () => {
      const mock = createMockSupabaseClient({
        publicacoes: [
          {
            id: 88,
            titulo: 'Development of Magnetic Nanoparticles for Drug Delivery', // versão original
            ano: 2024,
            autores: 'Silva, M.',
            periodico: 'Versão antiga da revista',
          },
        ],
      })

      // Mesma publicação com variações de acentuação/pontuação/espaços no título e mesmo ano
      const pubDuplicada: PublicacaoParaGravar[] = [
        {
          titulo: 'development of   magnetic  nanoparticles for drug delivery!',
          autores: 'Silva, M.; Barreto, L. S.',
          periodico: 'Ceramics International (Atualizada)',
          ano: 2024,
          doi: '10.1016/j.ceramint.2024.01.001',
        },
      ]

      const resultado = await gravarPublicacoes(pubDuplicada, mock.client)

      expect(resultado.contagem.inseridos).toBe(0)
      expect(resultado.contagem.atualizados).toBe(1)
      expect(resultado.contagem.ignorados).toBe(0)
      expect(mock.insertCalls.publicacoes).toHaveLength(0) // NENHUM insert duplo
      expect(mock.updateCalls.publicacoes).toHaveLength(1) // Houve UPDATE

      const atualizada = mock.database.publicacoes.find((p) => p.id === 88)
      expect(atualizada?.periodico).toBe('Ceramics International (Atualizada)')
      expect(atualizada?.autores).toBe('Silva, M.; Barreto, L. S.')
    })

    it('cenário 7: mesmo título com anos diferentes -> são registros distintos (INSERT)', async () => {
      const mock = createMockSupabaseClient({
        publicacoes: [
          {
            id: 50,
            titulo: 'Estudo Comparativo de Materiais',
            ano: 2022,
          },
        ],
      })

      const pubAnoDiferente: PublicacaoParaGravar[] = [
        {
          titulo: 'Estudo Comparativo de Materiais',
          autores: 'Autor Teste',
          periodico: 'Revista Teste',
          ano: 2024,
        },
      ]

      const resultado = await gravarPublicacoes(pubAnoDiferente, mock.client)

      expect(resultado.contagem.inseridos).toBe(1)
      expect(resultado.contagem.atualizados).toBe(0)
      expect(mock.insertCalls.publicacoes).toHaveLength(1)
    })
  })

  describe('Gravação das 7 tabelas adicionais (Subetapa 2C)', () => {
    it('cenário 8: orientações -> resolve docente e discente (cria discente se inexistente) e faz dedupe', async () => {
      const mock = createMockSupabaseClient({
        docentes: [{ id: 1, nome: 'Prof Orientador', id_lattes: '1234567890123456' }],
        discentes: [{ id: 10, nome: 'Aluno Ja Existente' }],
        orientacoes: [
          {
            id: 100,
            docente_id: 1,
            discente_id: 10,
            tipo: 'Mestrado',
            inicio: '2023',
            status: 'ativo',
          },
        ],
      })

      const listaOri: OrientacaoParaGravar[] = [
        // 1. Orientação existente -> deve dar UPDATE
        {
          docente_identificador: '1234567890123456',
          discente_nome: 'Aluno Ja Existente',
          tipo: 'Mestrado',
          inicio: '2023',
          fim: '2025',
          status: 'concluido',
        },
        // 2. Nova orientação com novo aluno -> deve criar discente e INSERT na orientação
        {
          docente_identificador: '1234567890123456',
          discente_nome: 'Aluno Novo Inedito',
          tipo: 'Doutorado',
          inicio: '2024',
          status: 'ativo',
        },
      ]

      const res = await gravarOrientacoes(listaOri, mock.client)

      expect(res.contagem.atualizados).toBe(1)
      expect(res.contagem.inseridos).toBe(1)
      expect(res.contagem.ignorados).toBe(0)

      // Verifica criação do aluno novo
      expect(mock.database.discentes.some((d) => d.nome === 'Aluno Novo Inedito')).toBe(true)
    })

    it('cenário 9: bancas -> dedupe por título e ano, mapeamento estrito de tipo', async () => {
      const mock = createMockSupabaseClient({
        bancas: [
          {
            id: 1,
            titulo_trabalho: 'Banca Original de Mestrado',
            data: '2023',
            tipo: 'Mestrado',
          },
        ],
      })

      const listaBancas: BancaParaGravar[] = [
        // Atualiza banca existente
        {
          titulo_trabalho: 'Banca Original de Mestrado',
          data: '2023',
          tipo: 'Mestrado',
          membros: 'Prof A; Prof B',
        },
        // Insere nova banca
        {
          titulo_trabalho: 'Nova Banca Doutorado 2024',
          data: '2024',
          tipo: 'Doutorado',
          membros: 'Prof C',
        },
      ]

      const res = await gravarBancas(listaBancas, mock.client)

      expect(res.contagem.atualizados).toBe(1)
      expect(res.contagem.inseridos).toBe(1)
      expect(mock.database.bancas).toHaveLength(2)
    })

    it('cenário 10: projetos de pesquisa -> vincula coordenador e dedupe por título + início', async () => {
      const mock = createMockSupabaseClient({
        docentes: [{ id: 5, nome: 'Coordenador Teste', id_lattes: '9999999999999999' }],
        projetos_pesquisa: [
          {
            id: 20,
            titulo: 'Projeto Antigo',
            inicio: '2022',
          },
        ],
      })

      const listaProjetos: ProjetoPesquisaParaGravar[] = [
        // Update
        {
          titulo: 'Projeto Antigo',
          inicio: '2022',
          fim: '2024',
          financiamento: true,
          orgao_fomento: 'FAPESP',
          coordenador_identificador: '9999999999999999',
        },
        // Insert
        {
          titulo: 'Projeto Novo 2023',
          inicio: '2023',
          financiamento: false,
          coordenador_identificador: 'Coordenador Teste',
        },
      ]

      const res = await gravarProjetosPesquisa(listaProjetos, mock.client)

      expect(res.contagem.atualizados).toBe(1)
      expect(res.contagem.inseridos).toBe(1)
      const projetoAtualizado = mock.database.projetos_pesquisa.find((p) => p.id === 20)
      expect(projetoAtualizado?.coordenador_id).toBe(5)
      expect(projetoAtualizado?.orgao_fomento).toBe('FAPESP')
    })

    it('cenário 11: premiações -> dedupe por título + ano', async () => {
      const mock = createMockSupabaseClient({
        premiacoes: [{ id: 1, titulo: 'Prêmio Melhor Artigo', ano: 2023, instituicao: 'SBC' }],
      })

      const lista: PremiacaoParaGravar[] = [
        // Update
        {
          titulo: 'prêmio melhor artigo',
          ano: 2023,
          instituicao: 'SBC Atualizada',
          nome_premiado: 'Prof',
        },
        // Insert
        { titulo: 'Medalha de Honra', ano: 2024, instituicao: 'MEC', nome_premiado: 'Prof' },
      ]

      const res = await gravarPremiacoes(lista, mock.client)

      expect(res.contagem.atualizados).toBe(1)
      expect(res.contagem.inseridos).toBe(1)
    })

    it('cenário 12: produção técnica -> tipo Software/Patente/Relatório e dedupe por título+ano', async () => {
      const mock = createMockSupabaseClient({
        producao_tecnica: [{ id: 1, titulo: 'Sistema Web PPG', ano: 2023, tipo: 'Software' }],
      })

      const lista: ProducaoTecnicaParaGravar[] = [
        { titulo: 'sistema web ppg', ano: 2023, tipo: 'Software', autores: 'Silva' },
        { titulo: 'Relatório Técnico Final', ano: 2024, tipo: 'Relatório', autores: 'Silva' },
      ]

      const res = await gravarProducaoTecnica(lista, mock.client)

      expect(res.contagem.atualizados).toBe(1)
      expect(res.contagem.inseridos).toBe(1)
    })

    it('cenário 13: patentes -> dedupe por INPI ou título, status estrito', async () => {
      const mock = createMockSupabaseClient({
        patentes: [
          { id: 1, titulo: 'Nanopartículas', inpi: 'BR 10 2022 0001', status: 'Pendente' },
        ],
      })

      const lista: PatenteParaGravar[] = [
        // Mesma patente com mesmo INPI -> update
        {
          titulo: 'Nanopartículas Magnéticas',
          inpi: 'br 10 2022 0001',
          status: 'Concessão',
          autores: 'Barreto',
        },
        // Nova patente -> insert
        {
          titulo: 'Nova Tecnologia 2024',
          inpi: 'BR 10 2024 0002',
          status: 'Pendente',
          autores: 'Barreto',
        },
      ]

      const res = await gravarPatentes(lista, mock.client)

      expect(res.contagem.atualizados).toBe(1)
      expect(res.contagem.inseridos).toBe(1)
    })

    it('cenário 14: eventos -> dedupe por docente + evento + local_data', async () => {
      const mock = createMockSupabaseClient({
        eventos: [
          {
            id: 1,
            docente: 'Prof Ledjane',
            evento: 'Encontro de Materiais',
            local_data: 'Aracaju - 2023',
            papel: 'Participante',
          },
        ],
      })

      const lista: EventoParaGravar[] = [
        // Update
        {
          docente: 'Prof Ledjane',
          evento: 'encontro de materiais',
          local_data: 'Aracaju - 2023',
          papel: 'Palestrante',
        },
        // Insert
        {
          docente: 'Prof Ledjane',
          evento: 'Congresso Internacional',
          local_data: 'Paris - 2024',
          papel: 'Apresentador de Trabalho',
        },
      ]

      const res = await gravarEventos(lista, mock.client)

      expect(res.contagem.atualizados).toBe(1)
      expect(res.contagem.inseridos).toBe(1)
    })
  })

  describe('gravarDadosLattes (coordenação geral 9 tabelas)', () => {
    it('executa em lote todas as 9 tabelas e retorna relatório consolidado', async () => {
      const mock = createMockSupabaseClient({
        docentes: [{ id: 1, nome: 'Docente Cadastrado', id_lattes: '1111111111111111' }],
        publicacoes: [{ id: 10, titulo: 'Artigo Existente', ano: 2023 }],
      })

      const relatorio = await gravarDadosLattes(
        {
          docentes: [
            // Existente -> update
            { id_lattes: '1111111111111111', nome: 'Docente Cadastrado Atualizado' },
            // Novo -> insert
            { id_lattes: '2222222222222222', nome: 'Novo Docente' },
          ],
          publicacoes: [
            // Existente -> update
            { titulo: 'artigo existente', ano: 2023, autores: 'Autor', periodico: 'Rev' },
            // Nova -> insert
            {
              titulo: 'Nova Publicacao Inedita',
              ano: 2024,
              autores: 'Autor 2',
              periodico: 'Rev 2',
            },
          ],
          orientacoes: [
            {
              discente_nome: 'Aluno Teste',
              tipo: 'Mestrado',
              inicio: '2023',
              status: 'ativo',
            },
          ],
          bancas: [
            {
              titulo_trabalho: 'Banca Teste',
              data: '2023',
              tipo: 'Mestrado',
              membros: 'Prof',
            },
          ],
          projetos_pesquisa: [
            {
              titulo: 'Projeto Teste',
              inicio: '2023',
              financiamento: false,
            },
          ],
          premiacoes: [
            {
              titulo: 'Prêmio Teste',
              ano: 2023,
              instituicao: 'Inst',
              nome_premiado: 'Docente',
            },
          ],
          producao_tecnica: [
            {
              titulo: 'Software Teste',
              ano: 2023,
              tipo: 'Software',
              autores: 'Docente',
            },
          ],
          patentes: [
            {
              titulo: 'Patente Teste',
              status: 'Pendente',
              autores: 'Docente',
              inpi: 'BR123',
            },
          ],
          eventos: [
            {
              docente: 'Docente Teste',
              evento: 'Evento Teste',
              local_data: '2023',
              papel: 'Participante',
            },
          ],
        },
        mock.client,
      )

      expect(relatorio.docentes).toEqual({
        inseridos: 1,
        atualizados: 1,
        ignorados: 0,
      })

      expect(relatorio.publicacoes).toEqual({
        inseridos: 1,
        atualizados: 1,
        ignorados: 0,
      })

      expect(relatorio.orientacoes.inseridos).toBe(1)
      expect(relatorio.bancas.inseridos).toBe(1)
      expect(relatorio.projetos_pesquisa.inseridos).toBe(1)
      expect(relatorio.premiacoes.inseridos).toBe(1)
      expect(relatorio.producao_tecnica.inseridos).toBe(1)
      expect(relatorio.patentes.inseridos).toBe(1)
      expect(relatorio.eventos.inseridos).toBe(1)

      expect(relatorio.erros).toHaveLength(0)
    })
  })
})
