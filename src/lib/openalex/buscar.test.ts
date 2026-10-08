import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buscarAutoresOpenAlex, extrairOpenAlexId, normalizarNomeParaBusca } from './buscar'

describe('Serviço OpenAlex - Subetapa O1 (Buscar Autores)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Utilitários de normalização e extração', () => {
    it('extrai ID curto do OpenAlex a partir da URL completa', () => {
      expect(extrairOpenAlexId('https://openalex.org/A5069892096')).toBe('A5069892096')
      expect(extrairOpenAlexId('https://openalex.org/a5069892096')).toBe('A5069892096')
      expect(extrairOpenAlexId('A5069892096')).toBe('A5069892096')
      expect(extrairOpenAlexId('')).toBe('')
      expect(extrairOpenAlexId(null)).toBe('')
      expect(extrairOpenAlexId(undefined)).toBe('')
    })

    it('normaliza o nome para busca mantendo padrão sem acentos', () => {
      expect(normalizarNomeParaBusca('Zélia Soares Macedo')).toBe('zelia soares macedo')
      expect(normalizarNomeParaBusca('  João  da   Silva   ')).toBe('joao da silva')
      expect(normalizarNomeParaBusca('')).toBe('')
      expect(normalizarNomeParaBusca(null)).toBe('')
    })
  })

  describe('buscarAutoresOpenAlex', () => {
    it('retorna lista vazia imediatamente se nome for vazio ou espaços', async () => {
      const mockFetch = vi.fn()
      const res = await buscarAutoresOpenAlex('   ', { fetchFn: mockFetch })

      expect(res.sucesso).toBe(true)
      expect(res.candidatos).toEqual([])
      expect(res.total).toBe(0)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('busca autores com sucesso e mapeia campos corretamente (h_index, works_count, instituição)', async () => {
      const mockPayload = {
        meta: { count: 2, page: 1, per_page: 10 },
        results: [
          {
            id: 'https://openalex.org/A5023888391',
            display_name: 'Zélia Soares Macedo',
            orcid: 'https://orcid.org/0000-0001-2345-6789',
            works_count: 142,
            cited_by_count: 3200,
            summary_stats: {
              h_index: 28,
              i10_index: 64,
            },
            last_known_institutions: [
              {
                id: 'https://openalex.org/I12345678',
                display_name: 'Universidade Federal de Sergipe',
                ror: 'https://ror.org/03yrm5c26',
                country_code: 'BR',
                type: 'education',
              },
            ],
          },
          {
            id: 'https://openalex.org/A9999999999',
            display_name: 'Zélia Macedo Silva',
            works_count: 15,
            cited_by_count: 45,
            h_index: 4, // h_index direto fora de summary_stats
            last_known_institution: {
              id: 'https://openalex.org/I87654321',
              display_name: 'Universidade de São Paulo',
            },
          },
        ],
      }

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload,
      })

      const res = await buscarAutoresOpenAlex('Zélia Soares Macedo', {
        fetchFn: mockFetch,
        limite: 5,
      })

      expect(res.sucesso).toBe(true)
      expect(res.total).toBe(2)
      expect(res.termoBuscado).toBe('zelia soares macedo')
      expect(res.candidatos).toHaveLength(2)

      const autor1 = res.candidatos[0]
      expect(autor1.id).toBe('https://openalex.org/A5023888391')
      expect(autor1.openalex_id).toBe('A5023888391')
      expect(autor1.display_name).toBe('Zélia Soares Macedo')
      expect(autor1.h_index).toBe(28)
      expect(autor1.works_count).toBe(142)
      expect(autor1.cited_by_count).toBe(3200)
      expect(autor1.orcid).toBe('https://orcid.org/0000-0001-2345-6789')
      expect(autor1.ultima_instituicao).toBe('Universidade Federal de Sergipe')
      expect(autor1.instituicao?.country_code).toBe('BR')

      const autor2 = res.candidatos[1]
      expect(autor2.openalex_id).toBe('A9999999999')
      expect(autor2.h_index).toBe(4)
      expect(autor2.ultima_instituicao).toBe('Universidade de São Paulo')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const chamadoUrl = mockFetch.mock.calls[0][0]
      expect(chamadoUrl).toContain('https://api.openalex.org/authors?')
      expect(chamadoUrl).toContain('search=zelia+soares+macedo')
      expect(chamadoUrl).toContain('per_page=5')
    })

    it('aplica filtro opcional de afiliação/instituição sobre os candidatos retornados', async () => {
      const mockPayload = {
        meta: { count: 2 },
        results: [
          {
            id: 'https://openalex.org/A1',
            display_name: 'Carlos Santos',
            last_known_institutions: [{ display_name: 'Universidade Federal de Sergipe' }],
          },
          {
            id: 'https://openalex.org/A2',
            display_name: 'Carlos Santos',
            last_known_institutions: [{ display_name: 'Universidade Estadual de Campinas' }],
          },
        ],
      }

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload,
      })

      const res = await buscarAutoresOpenAlex('Carlos Santos', {
        fetchFn: mockFetch,
        instituicaoFiltro: 'Sergipe',
      })

      expect(res.sucesso).toBe(true)
      expect(res.candidatos).toHaveLength(1)
      expect(res.candidatos[0].id).toBe('https://openalex.org/A1')
      expect(res.candidatos[0].ultima_instituicao).toBe('Universidade Federal de Sergipe')
    })

    it('retorna sucesso com lista vazia quando nenhum autor for encontrado', async () => {
      const mockPayload = {
        meta: { count: 0 },
        results: [],
      }

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload,
      })

      const res = await buscarAutoresOpenAlex('Nome Inexistente Que Nao Publicou', {
        fetchFn: mockFetch,
      })

      expect(res.sucesso).toBe(true)
      expect(res.candidatos).toEqual([])
      expect(res.total).toBe(0)
      expect(res.mensagemErro).toBeUndefined()
    })

    it('trata resposta HTTP não-200 amigavelmente sem estourar exceção', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      })

      const res = await buscarAutoresOpenAlex('Fulano de Tal', { fetchFn: mockFetch })

      expect(res.sucesso).toBe(false)
      expect(res.candidatos).toEqual([])
      expect(res.total).toBe(0)
      expect(res.mensagemErro).toContain('503')
      expect(res.mensagemErro).toContain('Service Unavailable')
    })

    it('trata erro de rede (fetch rejection) sem estourar exceção', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network request failed'))

      const res = await buscarAutoresOpenAlex('Fulano de Tal', { fetchFn: mockFetch })

      expect(res.sucesso).toBe(false)
      expect(res.candidatos).toEqual([])
      expect(res.mensagemErro).toContain('Erro de conexão ao consultar OpenAlex')
      expect(res.mensagemErro).toContain('Network request failed')
    })

    it('trata timeout (AbortError) amigavelmente com mensagem clara', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      const mockFetch = vi.fn().mockRejectedValue(abortError)

      const res = await buscarAutoresOpenAlex('Fulano de Tal', {
        fetchFn: mockFetch,
        timeoutMs: 5000,
      })

      expect(res.sucesso).toBe(false)
      expect(res.candidatos).toEqual([])
      expect(res.mensagemErro).toContain('excedeu o tempo limite de 5s')
    })
  })
})
