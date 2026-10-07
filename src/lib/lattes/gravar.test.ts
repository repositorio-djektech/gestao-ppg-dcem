import { describe, it, expect, vi } from 'vitest'
import {
  gravarDocentes,
  gravarPublicacoes,
  gravarDadosLattes,
  converterLattesDocente,
  converterLattesPublicacao,
  type DocenteParaGravar,
  type PublicacaoParaGravar,
  type SupabaseClientLike,
} from './gravar'
import type { LattesDocente, LattesPublicacao } from './types'

/**
 * Cria um mock completo em memória do cliente Supabase para docentes e publicacoes.
 * Não acessa rede nem banco real.
 */
function createMockSupabaseClient(initialState?: {
  docentes?: Array<{ id: number; nome: string; id_lattes: string | null; [key: string]: unknown }>
  publicacoes?: Array<{
    id: number
    titulo: string
    ano: number
    autores?: string
    [key: string]: unknown
  }>
}) {
  let nextDocenteId = 100
  let nextPublicacaoId = 200

  const docentesDb = [...(initialState?.docentes || [])]
  const publicacoesDb = [...(initialState?.publicacoes || [])]

  const insertCallsDocentes: unknown[] = []
  const updateCallsDocentes: unknown[] = []
  const insertCallsPublicacoes: unknown[] = []
  const updateCallsPublicacoes: unknown[] = []

  const mockClient = {
    from: vi.fn((table: string) => {
      if (table === 'docentes') {
        return {
          select: vi.fn((_columns?: string) => {
            return Promise.resolve({
              data: docentesDb.map((d) => ({ ...d })),
              error: null,
            })
          }),
          insert: vi.fn((rows: Array<Record<string, unknown>>) => {
            insertCallsDocentes.push(...rows)
            const created = rows.map((r) => {
              const item = {
                id: ++nextDocenteId,
                nome: r.nome as string,
                id_lattes: (r.id_lattes as string) || null,
                ...r,
              }
              docentesDb.push(item)
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
                updateCallsDocentes.push({ payload, col, val })
                const target = docentesDb.find((d) => (d as any)[col] === val)
                if (target) {
                  Object.assign(target, payload)
                }
                return Promise.resolve({ error: null })
              }),
            }
          }),
        }
      }

      if (table === 'publicacoes') {
        return {
          select: vi.fn((_columns?: string) => {
            return Promise.resolve({
              data: publicacoesDb.map((p) => ({ ...p })),
              error: null,
            })
          }),
          insert: vi.fn((rows: Array<Record<string, unknown>>) => {
            insertCallsPublicacoes.push(...rows)
            const created = rows.map((r) => {
              const item = {
                id: ++nextPublicacaoId,
                titulo: r.titulo as string,
                ano: r.ano as number,
                ...r,
              }
              publicacoesDb.push(item)
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
                updateCallsPublicacoes.push({ payload, col, val })
                const target = publicacoesDb.find((p) => (p as any)[col] === val)
                if (target) {
                  Object.assign(target, payload)
                }
                return Promise.resolve({ error: null })
              }),
            }
          }),
        }
      }

      throw new Error(`Tabela não mockada: ${table}`)
    }),
  }

  return {
    client: mockClient as unknown as SupabaseClientLike,
    docentesDb,
    publicacoesDb,
    insertCallsDocentes,
    updateCallsDocentes,
    insertCallsPublicacoes,
    updateCallsPublicacoes,
  }
}

describe('Serviço de Gravação Lattes - Subetapa 2A (Offline / Mocks)', () => {
  describe('Funções de conversão', () => {
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

      expect(mock.insertCallsDocentes).toHaveLength(1)
      expect(mock.updateCallsDocentes).toHaveLength(0)
      expect(mock.docentesDb.some((d) => d.id_lattes === '3104369029830651')).toBe(true)
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

      expect(mock.insertCallsDocentes).toHaveLength(0)
      expect(mock.updateCallsDocentes).toHaveLength(1)
      const alvo = mock.docentesDb.find((d) => d.id === 42)
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
      expect(mock.insertCallsDocentes).toHaveLength(0)
      expect(mock.updateCallsDocentes).toHaveLength(1)
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
      expect(mock.insertCallsDocentes).toHaveLength(1)
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
      expect(mock.insertCallsPublicacoes).toHaveLength(1)
      expect(mock.updateCallsPublicacoes).toHaveLength(0)

      const inserida = mock.publicacoesDb.find((p) => p.ano === 2024)
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
      expect(mock.insertCallsPublicacoes).toHaveLength(0) // NENHUM insert duplo
      expect(mock.updateCallsPublicacoes).toHaveLength(1) // Houve UPDATE

      const atualizada = mock.publicacoesDb.find((p) => p.id === 88)
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
      expect(mock.insertCallsPublicacoes).toHaveLength(1)
    })
  })

  describe('gravarDadosLattes (coordenação geral)', () => {
    it('executa em lote e retorna relatório consolidado por tabela', async () => {
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

      expect(relatorio.erros).toHaveLength(0)
    })
  })
})
