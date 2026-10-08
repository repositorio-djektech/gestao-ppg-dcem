import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extrairScopusId,
  normalizarNomeParaScopus,
  montarScopusQuery,
  extrairDocumentIdsDeBusca,
  extrairAutoresDeAbstractRetrieval,
  agregarAutoresDeAbstracts,
  mapearEntradasScopus,
} from './buscar'
import { buscarAutoresScopus } from '@/services/scopus'

describe('Serviço Scopus - Pipeline em Duas Etapas (Search → Abstract Retrieval → Agregação)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Utilitários de normalização e extração', () => {
    it('extrai ID limpo apenas com dígitos a partir de formatos variados de ID e URL', () => {
      expect(extrairScopusId('SCOPUS_ID:55490763400')).toBe('55490763400')
      expect(extrairScopusId('AUTHOR_ID:57201234567')).toBe('57201234567')
      expect(extrairScopusId('author_id/55490763400')).toBe('55490763400')
      expect(extrairScopusId('https://api.elsevier.com/content/author/author_id/55490763400')).toBe(
        '55490763400',
      )
      expect(extrairScopusId('2-s2.0-85123456789')).toBe('85123456789')
      expect(extrairScopusId('85123456789')).toBe('85123456789')
      expect(extrairScopusId('')).toBe('')
      expect(extrairScopusId(null)).toBe('')
      expect(extrairScopusId(undefined)).toBe('')
    })

    it('normaliza o nome para busca mantendo padrão sem acentos', () => {
      expect(normalizarNomeParaScopus('Zélia Soares Macedo')).toBe('zelia soares macedo')
      expect(normalizarNomeParaScopus('  Ledjane   Silva   Barreto  ')).toBe(
        'ledjane silva barreto',
      )
      expect(normalizarNomeParaScopus('')).toBe('')
      expect(normalizarNomeParaScopus(null)).toBe('')
    })

    it('monta query com AU-ID para termos puramente numéricos', () => {
      expect(montarScopusQuery('55490763400')).toBe('AU-ID(55490763400)')
      expect(montarScopusQuery('57201234567')).toBe('AU-ID(57201234567)')
    })

    it('monta query de autor para Scopus Search com AUTHOR-NAME e nome completo', () => {
      expect(montarScopusQuery('Ledjane Silva Barreto')).toBe('AUTHOR-NAME(ledjane silva barreto)')
    })

    it('reordena formato "Sobrenome, Nome" para "Nome Sobrenome" na query AUTHOR-NAME', () => {
      expect(montarScopusQuery('Barreto, Ledjane Silva')).toBe('AUTHOR-NAME(ledjane silva barreto)')
      expect(montarScopusQuery('Barreto, Ledjane')).toBe('AUTHOR-NAME(ledjane barreto)')
    })

    it('monta query de fallback para AUTHLASTNAME sozinho', () => {
      expect(
        montarScopusQuery('Ledjane Silva Barreto', undefined, { usarFallbackSobrenome: true }),
      ).toBe('AUTHLASTNAME(barreto)')
      expect(
        montarScopusQuery('Barreto, Ledjane Silva', undefined, { usarFallbackSobrenome: true }),
      ).toBe('AUTHLASTNAME(barreto)')
      expect(montarScopusQuery('Einstein', undefined, { usarFallbackSobrenome: true })).toBe(
        'AUTHLASTNAME(einstein)',
      )
    })

    it('adiciona cláusula AFFIL quando informado filtro de afiliação', () => {
      expect(montarScopusQuery('Ledjane Silva Barreto', 'Sergipe')).toBe(
        'AUTHOR-NAME(ledjane silva barreto) and AFFIL("sergipe")',
      )
      expect(
        montarScopusQuery('Ledjane Silva Barreto', 'Sergipe', { usarFallbackSobrenome: true }),
      ).toBe('AUTHLASTNAME(barreto) and AFFIL("sergipe")')
    })
  })

  describe('Etapa A: extrairDocumentIdsDeBusca', () => {
    it('extrai os scopus IDs dos documentos do Scopus Search', () => {
      const entries = [
        {
          'dc:identifier': 'SCOPUS_ID:85123456789',
          'dc:title': 'Photocatalytic properties of zinc oxide',
          'citedby-count': '42',
        },
        {
          eid: '2-s2.0-85987654321',
          'dc:title': 'Nanomaterials for wastewater treatment',
          'citedby-count': '15',
        },
        {
          // documento duplicado deve ser ignorado
          'dc:identifier': 'SCOPUS_ID:85123456789',
          'dc:title': 'Duplicata',
        },
      ]

      const docs = extrairDocumentIdsDeBusca(entries)
      expect(docs).toHaveLength(2)
      expect(docs[0]).toEqual({
        scopus_id: '85123456789',
        title: 'Photocatalytic properties of zinc oxide',
        cited_by_count: 42,
      })
      expect(docs[1]).toEqual({
        scopus_id: '85987654321',
        title: 'Nanomaterials for wastewater treatment',
        cited_by_count: 15,
      })
    })

    it('retorna lista vazia para entradas nulas ou vazias', () => {
      expect(extrairDocumentIdsDeBusca([])).toEqual([])
      expect(extrairDocumentIdsDeBusca(null as any)).toEqual([])
    })
  })

  describe('Etapa B: extrairAutoresDeAbstractRetrieval', () => {
    it('extrai autores com author_id e afiliação de resposta padrão da Elsevier', () => {
      const mockAbstract = {
        'abstracts-retrieval-response': {
          affiliation: [
            {
              '@id': '60008544',
              affilname: 'Universidade Federal de Sergipe',
              'affiliation-country': 'Brazil',
            },
          ],
          authors: {
            author: [
              {
                '@auid': '55490763400',
                'ce:given-name': 'Ledjane S.',
                'ce:surname': 'Barreto',
                'ce:indexed-name': 'Barreto L.S.',
                affiliation: { '@id': '60008544' },
              },
              {
                '@auid': '6602703039',
                'ce:given-name': 'Zélia S.',
                'ce:surname': 'Macedo',
                affiliation: { '@id': '60008544' },
              },
            ],
          },
        },
      }

      const autores = extrairAutoresDeAbstractRetrieval(mockAbstract)
      expect(autores).toHaveLength(2)
      expect(autores[0]).toEqual({
        scopus_id: '55490763400',
        nome: 'Ledjane S. Barreto',
        afiliacao: 'Universidade Federal de Sergipe',
        orcid: null,
      })
      expect(autores[1]).toEqual({
        scopus_id: '6602703039',
        nome: 'Zélia S. Macedo',
        afiliacao: 'Universidade Federal de Sergipe',
        orcid: null,
      })
    })

    it('extrai autores de formato alternativo coredata dc:creator', () => {
      const mockAbstract = {
        'abstracts-retrieval-response': {
          affiliation: [
            {
              afid: '12345',
              affilname: 'Federal University of Sergipe',
            },
          ],
          coredata: {
            'dc:creator': {
              author: [
                {
                  '@auid': '55490763400',
                  'preferred-name': {
                    'ce:given-name': 'Ledjane',
                    'ce:surname': 'Barreto',
                  },
                  affiliation: { afid: '12345' },
                },
              ],
            },
          },
        },
      }

      const autores = extrairAutoresDeAbstractRetrieval(mockAbstract)
      expect(autores).toHaveLength(1)
      expect(autores[0].scopus_id).toBe('55490763400')
      expect(autores[0].nome).toBe('Ledjane Barreto')
      expect(autores[0].afiliacao).toBe('Federal University of Sergipe')
    })
  })

  describe('Agregação de Autores (agregarAutoresDeAbstracts)', () => {
    it('agrega autor que aparece em múltiplos documentos, somando docs e citações', () => {
      const docs = [
        {
          scopus_id: 'doc1',
          cited_by_count: 30,
          autores: [
            {
              scopus_id: '55490763400',
              nome: 'Ledjane S. Barreto',
              afiliacao: 'Universidade Federal de Sergipe',
            },
            {
              scopus_id: '6602703039',
              nome: 'Zélia S. Macedo',
              afiliacao: 'Universidade Federal de Sergipe',
            },
          ],
        },
        {
          scopus_id: 'doc2',
          cited_by_count: 20,
          autores: [
            {
              scopus_id: '55490763400',
              nome: 'Ledjane Silva Barreto',
              afiliacao: 'Universidade Federal de Sergipe',
            },
            {
              scopus_id: '99999999999',
              nome: 'Outro Coautor',
              afiliacao: 'USP',
            },
          ],
        },
        {
          scopus_id: 'doc3',
          cited_by_count: 10,
          autores: [
            {
              scopus_id: '55490763400',
              nome: 'Ledjane Silva Barreto',
              afiliacao: 'Federal University of Sergipe',
            },
          ],
        },
      ]

      const candidatos = agregarAutoresDeAbstracts(docs, 'Ledjane Barreto')
      expect(candidatos.length).toBeGreaterThanOrEqual(3)

      const ledjane = candidatos[0]
      expect(ledjane.scopus_id).toBe('55490763400')
      // Nome preferido mais longo selecionado
      expect(ledjane.nome).toBe('Ledjane Silva Barreto')
      // Apareceu nos 3 documentos
      expect(ledjane.document_count).toBe(3)
      // Citações somadas: 30 + 20 + 10 = 60
      expect(ledjane.cited_by_count).toBe(60)
      // Afiliação principal mais frequente
      expect(ledjane.instituicao).toBe('Universidade Federal de Sergipe')
      // Afiliações deduplicadas registradas
      expect(ledjane.afiliacoes).toContain('Universidade Federal de Sergipe')
      expect(ledjane.afiliacoes).toContain('Federal University of Sergipe')
    })

    it('prioriza no ranking o candidato cujo nome casa com o termo pesquisado', () => {
      const docs = [
        {
          scopus_id: 'doc1',
          cited_by_count: 100,
          autores: [
            {
              scopus_id: '11111111111',
              nome: 'Joao da Silva',
              afiliacao: 'UFBA',
            },
            {
              scopus_id: '55490763400',
              nome: 'Ledjane Barreto',
              afiliacao: 'UFS',
            },
          ],
        },
      ]

      // Mesmo Joao tendo os mesmos docs, Ledjane deve vir primeiro quando buscamos "Ledjane Barreto"
      const candidatos = agregarAutoresDeAbstracts(docs, 'Ledjane Barreto')
      expect(candidatos[0].scopus_id).toBe('55490763400')
      expect(candidatos[0].nome).toBe('Ledjane Barreto')
    })
  })

  describe('Tolerância parcial e fallbacks (mapearEntradasScopus)', () => {
    it('funciona com entradas legadas ou quando o Abstract Retrieval falha', () => {
      const entries = [
        {
          'dc:identifier': 'AUTHOR_ID:55490763400',
          'preferred-name': {
            'given-name': 'Ledjane',
            surname: 'Barreto',
          },
          'affiliation-current': {
            'affiliation-name': 'Universidade Federal de Sergipe',
          },
          'document-count': '62',
          'cited-by-count': '1120',
        },
      ]

      const candidatos = mapearEntradasScopus(entries)
      expect(candidatos).toHaveLength(1)
      expect(candidatos[0].scopus_id).toBe('55490763400')
      expect(candidatos[0].nome).toBe('Ledjane Barreto')
      expect(candidatos[0].instituicao).toBe('Universidade Federal de Sergipe')
    })
  })

  describe('buscarAutoresScopus client service', () => {
    it('retorna lista vazia imediatamente se nome for vazio ou espaços', async () => {
      const mockInvoke = vi.fn()
      const res = await buscarAutoresScopus('   ', { invokeFn: mockInvoke })

      expect(res.sucesso).toBe(true)
      expect(res.candidatos).toEqual([])
      expect(res.total).toBe(0)
      expect(mockInvoke).not.toHaveBeenCalled()
    })

    it('invoca a edge function scopus-buscar e retorna os candidatos do pipeline', async () => {
      const mockPayload = {
        sucesso: true,
        candidatos: [
          {
            scopus_id: '55490763400',
            nome: 'Ledjane Silva Barreto',
            instituicao: 'Universidade Federal de Sergipe',
            document_count: 5,
            cited_by_count: 120,
            afiliacoes: ['Universidade Federal de Sergipe'],
          },
        ],
        total: 15,
        termoBuscado: 'ledjane barreto',
      }

      const mockInvoke = vi.fn().mockResolvedValue({
        data: mockPayload,
        error: null,
      })

      const res = await buscarAutoresScopus('Ledjane Barreto', {
        invokeFn: mockInvoke,
        limite: 5,
        filtroAfiliacao: 'Sergipe',
      })

      expect(res.sucesso).toBe(true)
      expect(res.candidatos).toHaveLength(1)
      expect(res.candidatos[0].scopus_id).toBe('55490763400')
      expect(res.candidatos[0].document_count).toBe(5)
      expect(mockInvoke).toHaveBeenCalledWith('scopus-buscar', {
        body: {
          termo: 'ledjane barreto',
          filtroAfiliacao: 'sergipe',
          limite: 5,
        },
      })
    })

    it('trata erro retornado de forma graciosa sem quebrar a UI', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: {
          sucesso: false,
          candidatos: [],
          total: 0,
          mensagemErro: 'Chave da API Scopus inválida ou expirada. Verifique o cadastro no painel.',
        },
        error: null,
      })

      const res = await buscarAutoresScopus('Ledjane Barreto', { invokeFn: mockInvoke })
      expect(res.sucesso).toBe(false)
      expect(res.candidatos).toEqual([])
      expect(res.mensagemErro).toContain('Chave da API Scopus inválida ou expirada')
    })
  })
})
