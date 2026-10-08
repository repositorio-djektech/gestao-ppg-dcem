import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extrairScopusId,
  normalizarNomeParaScopus,
  montarScopusQuery,
  mapearEntradasScopus,
} from './buscar'
import { buscarAutoresScopus } from '@/services/scopus'

describe('Serviço Scopus - Subetapa S1 (Parser, Query Builder e Client)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Utilitários de normalização e extração', () => {
    it('extrai ID limpo apenas com dígitos a partir de formatos variados', () => {
      expect(extrairScopusId('SCOPUS_ID:6602703039')).toBe('6602703039')
      expect(extrairScopusId('AUTHOR_ID:57201234567')).toBe('57201234567')
      expect(extrairScopusId('6602703039')).toBe('6602703039')
      expect(extrairScopusId('ID_12345')).toBe('12345')
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
      expect(montarScopusQuery('6602703039')).toBe('AU-ID(6602703039)')
      expect(montarScopusQuery('57201234567')).toBe('AU-ID(57201234567)')
    })

    it('monta query de nome composto no formato AUTH-LAST-NAME e AUTH-FIRST', () => {
      expect(montarScopusQuery('Ledjane Silva Barreto')).toBe(
        'AUTH-LAST-NAME("barreto") AND AUTH-FIRST("ledjane")',
      )
      expect(montarScopusQuery('Barreto, Ledjane')).toBe(
        'AUTH-LAST-NAME("barreto") AND AUTH-FIRST("ledjane")',
      )
    })

    it('monta query para sobrenome simples ou único', () => {
      expect(montarScopusQuery('Einstein')).toBe('AUTH-LAST-NAME("einstein")')
    })

    it('adiciona cláusula AFFIL quando informado filtro de afiliação', () => {
      expect(montarScopusQuery('Ledjane Silva Barreto', 'Sergipe')).toBe(
        'AUTH-LAST-NAME("barreto") AND AUTH-FIRST("ledjane") AND AFFIL("sergipe")',
      )
    })
  })

  describe('mapearEntradasScopus', () => {
    it('mapeia entradas da resposta Elsevier ignorando campos nulos com tolerância', () => {
      const entradasBrutas = [
        {
          'dc:identifier': 'AUTHOR_ID:6602703039',
          'preferred-name': {
            'given-name': 'Ledjane',
            surname: 'Barreto',
          },
          'affiliation-current': {
            'affiliation-name': 'Universidade Federal de Sergipe',
          },
          'document-count': '62',
          'cited-by-count': '1120',
          orcid: '0000-0002-1234-5678',
        },
        {
          'dc:identifier': 'SCOPUS_ID:9999999999',
          'preferred-name': {
            surname: 'Macedo',
          },
          'affiliation-history': [
            {
              'affiliation-name': 'Universidade Federal da Bahia',
            },
          ],
          'document-count': 10,
        },
      ]

      const candidatos = mapearEntradasScopus(entradasBrutas)
      expect(candidatos).toHaveLength(2)

      const c1 = candidatos[0]
      expect(c1.scopus_id).toBe('6602703039')
      expect(c1.nome).toBe('Ledjane Barreto')
      expect(c1.instituicao).toBe('Universidade Federal de Sergipe')
      expect(c1.document_count).toBe(62)
      expect(c1.cited_by_count).toBe(1120)
      expect(c1.orcid).toBe('0000-0002-1234-5678')

      const c2 = candidatos[1]
      expect(c2.scopus_id).toBe('9999999999')
      expect(c2.nome).toBe('Macedo')
      expect(c2.instituicao).toBe('Universidade Federal da Bahia')
      expect(c2.document_count).toBe(10)
      expect(c2.cited_by_count).toBe(0)
    })

    it('ignora entradas inválidas sem scopus_id', () => {
      const entradasInvalidas = [null, undefined, {}, { 'dc:identifier': '' }]
      const candidatos = mapearEntradasScopus(entradasInvalidas)
      expect(candidatos).toEqual([])
    })
  })

  describe('buscarAutoresScopus (chamada ao Edge Function)', () => {
    it('retorna lista vazia imediatamente se nome for vazio ou espaços', async () => {
      const mockInvoke = vi.fn()
      const res = await buscarAutoresScopus('   ', { invokeFn: mockInvoke })

      expect(res.sucesso).toBe(true)
      expect(res.candidatos).toEqual([])
      expect(res.total).toBe(0)
      expect(mockInvoke).not.toHaveBeenCalled()
    })

    it('invoca a edge function scopus-buscar e retorna os candidatos', async () => {
      const mockPayload = {
        sucesso: true,
        candidatos: [
          {
            scopus_id: '6602703039',
            nome: 'Ledjane Barreto',
            instituicao: 'Universidade Federal de Sergipe',
            document_count: 62,
            cited_by_count: 1120,
          },
        ],
        total: 1,
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
      expect(res.candidatos[0].scopus_id).toBe('FAIL_EXPECTATION_TO_SEE_IF_TEST_RUNS')
      expect(mockInvoke).toHaveBeenCalledWith('scopus-buscar', {
        body: {
          termo: 'ledjane barreto',
          filtroAfiliacao: 'sergipe',
          limite: 5,
        },
      })
    })

    it('trata erro retornado pelo Supabase Functions de forma graciosa', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Function not found' },
      })

      const res = await buscarAutoresScopus('Carlos Santos', { invokeFn: mockInvoke })

      expect(res.sucesso).toBe(false)
      expect(res.candidatos).toEqual([])
      expect(res.mensagemErro).toContain('Function not found')
    })

    it('trata erro retornado no payload gracioso do backend (ex: quota 429)', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        data: {
          sucesso: false,
          candidatos: [],
          total: 0,
          mensagemErro: 'Limite de requisições semanais da API Scopus atingido (quota excedida).',
        },
        error: null,
      })

      const res = await buscarAutoresScopus('Carlos Santos', { invokeFn: mockInvoke })

      expect(res.sucesso).toBe(false)
      expect(res.mensagemErro).toContain('Limite de requisições semanais')
    })
  })
})
