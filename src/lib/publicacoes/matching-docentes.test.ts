import { describe, it, expect } from 'vitest'
import {
  casarAutoresComDocente,
  sugerirCasamentosParaPublicacao,
  analisarCasamentosEmLote,
  classificarGrauConfianca,
} from './matching-docentes'
import type { Docente, Publicacao } from '@/types/database'

describe('Motor de Casamento Automático Autor→Docente (Etapa D1)', () => {
  const docentesExemplo: Docente[] = [
    {
      id: 4,
      nome: 'Ledjane Silva Barreto',
      categoria: 'permanente',
      status: true,
      scopus_id: '7005598575',
      indice_h: 21,
      bolsa_cnpq: '',
      jdp: false,
      licenca: '',
    },
    {
      id: 5,
      nome: 'Euler Araujo dos Santos',
      categoria: 'permanente',
      status: true,
      scopus_id: '',
      indice_h: 12,
      bolsa_cnpq: '',
      jdp: false,
      licenca: '',
    },
    {
      id: 6,
      nome: 'Iara de Fatima Gimenez',
      categoria: 'permanente',
      status: true,
      scopus_id: '',
      indice_h: 15,
      bolsa_cnpq: '',
      jdp: false,
      licenca: '',
    },
    {
      id: 7,
      nome: 'Ronaldo Santos da Silva',
      categoria: 'permanente',
      status: true,
      scopus_id: '',
      indice_h: 14,
      bolsa_cnpq: '',
      jdp: false,
      licenca: '',
    },
    {
      id: 8,
      nome: 'Zélia Soares Macedo',
      categoria: 'permanente',
      status: true,
      scopus_id: '',
      indice_h: 18,
      bolsa_cnpq: '',
      jdp: false,
      licenca: '',
    },
    {
      id: 14,
      nome: 'Mario Ernesto Giroldo Valerio',
      categoria: 'permanente',
      status: true,
      scopus_id: '',
      indice_h: 20,
      bolsa_cnpq: '',
      jdp: false,
      licenca: '',
    },
    {
      id: 18,
      nome: 'Sandro Griza',
      categoria: 'permanente',
      status: true,
      scopus_id: '',
      indice_h: 10,
      bolsa_cnpq: '',
      jdp: false,
      licenca: '',
    },
  ]

  describe('Casamento tolerante de nomes individuais', () => {
    it('reconhece nome exato com ordem invertida: "Barreto, Ledjane Silva" → Ledjane Silva Barreto', () => {
      const doc = docentesExemplo.find((d) => d.id === 4)!
      const res = casarAutoresComDocente('Barreto, Ledjane Silva', doc)

      expect(res.match).toBe(true)
      expect(res.score).toBeGreaterThanOrEqual(0.85)
      expect(classificarGrauConfianca(res.score)).toBe('alta')
    })

    it('reconhece acentuação diferente: "MACEDO, Zelia Soares" vs "Zélia Soares Macedo"', () => {
      const doc = docentesExemplo.find((d) => d.id === 8)!
      const res = casarAutoresComDocente('MACEDO, Zelia Soares', doc)

      expect(res.match).toBe(true)
      expect(res.score).toBeGreaterThanOrEqual(0.85)
      expect(classificarGrauConfianca(res.score)).toBe('alta')
    })

    it('reconhece iniciais abreviadas: "Macedo, Z.S." ou "MACEDO, ZELIA S."', () => {
      const doc = docentesExemplo.find((d) => d.id === 8)!
      const res1 = casarAutoresComDocente('MACEDO, ZELIA S.', doc)
      expect(res1.match).toBe(true)
      expect(res1.score).toBeGreaterThanOrEqual(0.7)

      const res2 = casarAutoresComDocente('Macedo, Z.S.', doc)
      expect(res2.match).toBe(true)
      expect(res2.score).toBeGreaterThanOrEqual(0.7)
    })

    it('reconhece sobrenome e múltiplas iniciais: "VALERIO, M. E. G." vs "Mario Ernesto Giroldo Valerio"', () => {
      const doc = docentesExemplo.find((d) => d.id === 14)!
      const res = casarAutoresComDocente('VALERIO, M. E. G.', doc)

      expect(res.match).toBe(true)
      expect(res.score).toBeGreaterThanOrEqual(0.85)
      expect(classificarGrauConfianca(res.score)).toBe('alta')
    })

    it('reconhece "VALERIO, Mario e G" com acentos e minúsculas', () => {
      const doc = docentesExemplo.find((d) => d.id === 14)!
      const res = casarAutoresComDocente('VALERIO, Mario e G', doc)

      expect(res.match).toBe(true)
      expect(res.score).toBeGreaterThanOrEqual(0.75)
    })

    it('reconhece "GRIZA, SANDRO" vs "Sandro Griza"', () => {
      const doc = docentesExemplo.find((d) => d.id === 18)!
      const res = casarAutoresComDocente('GRIZA, SANDRO', doc)

      expect(res.match).toBe(true)
      expect(res.score).toBeGreaterThanOrEqual(0.9)
      expect(classificarGrauConfianca(res.score)).toBe('alta')
    })

    it('não casa nomes completamente distintos: "Einstein, Albert" vs qualquer docente', () => {
      const doc = docentesExemplo.find((d) => d.id === 4)!
      const res = casarAutoresComDocente('Einstein, Albert', doc)

      expect(res.match).toBe(false)
      expect(res.score).toBe(0)
    })
  })

  describe('Sugestões por publicação', () => {
    it('identifica múltiplos docentes na mesma publicação real', () => {
      const pub: Publicacao = {
        id: 52,
        titulo: 'Fabrication and Characterization of 3D-Printed Polystyrene Scintillator Films',
        autores:
          'DOS SANTOS, MARIANE; ANDRADE, ADRIANO BORGES; GRIZA, SANDRO; VALERIO, Mário Ernesto Giroldo; MACEDO, Zélia Soares',
        periodico: 'Polymers',
        ano: 2025,
        doi: '10.3390/polym123',
        justificativa: '',
        link_comprovacao: '',
        observacoes: '',
      }

      const res = sugerirCasamentosParaPublicacao({
        publicacao: pub,
        docentes: docentesExemplo,
      })

      expect(res.publicacaoId).toBe(52)
      expect(res.sugestoes.length).toBeGreaterThanOrEqual(3)

      const ids = res.sugestoes.map((s) => s.docenteId)
      expect(ids).toContain(18) // Sandro Griza
      expect(ids).toContain(14) // Mario Valerio
      expect(ids).toContain(8) // Zélia Macedo

      // Devem ter justificativas bem formatadas
      const griza = res.sugestoes.find((s) => s.docenteId === 18)!
      expect(griza.justificativa).toContain('Sandro Griza')
      expect(griza.grauConfianca).toBe('alta')
      expect(griza.selecionadoPadrao).toBe(true)
    })

    it('respeita docentes já vinculados (não vem pré-selecionado para reinserção)', () => {
      const pub: Publicacao = {
        id: 2,
        titulo: 'Effects of ethylene glycol and nano-CaCO3 on carbonation',
        autores:
          'SANTOS, HERICLES CAMPOS DOS; PRUDENTE, ISIS NAYRA ROLEMBERG; Barreto, Ledjane Silva',
        periodico: 'Materials',
        ano: 2025,
        doi: '',
        justificativa: '',
        link_comprovacao: '',
        observacoes: '',
      }

      const jaVinculados = new Set<number>([4]) // Ledjane já vinculada manualmente

      const res = sugerirCasamentosParaPublicacao({
        publicacao: pub,
        docentes: docentesExemplo,
        docentesJaVinculadosIds: jaVinculados,
      })

      const ledjane = res.sugestoes.find((s) => s.docenteId === 4)!
      expect(ledjane).toBeDefined()
      expect(ledjane.jaVinculado).toBe(true)
      expect(ledjane.selecionadoPadrao).toBe(false)
    })

    it('respeita sugestões rejeitadas anteriormente', () => {
      const pub: Publicacao = {
        id: 2,
        titulo: 'Effects of ethylene glycol and nano-CaCO3 on carbonation',
        autores: 'Barreto, Ledjane Silva',
        periodico: 'Materials',
        ano: 2025,
        doi: '',
        justificativa: '',
        link_comprovacao: '',
        observacoes: '',
      }

      const rejeitados = new Set<string | number>([4])

      const res = sugerirCasamentosParaPublicacao({
        publicacao: pub,
        docentes: docentesExemplo,
        docentesRejeitadosIds: rejeitados,
      })

      const ledjane = res.sugestoes.find((s) => s.docenteId === 4)!
      expect(ledjane.rejeitadoAnteriormente).toBe(true)
      expect(ledjane.selecionadoPadrao).toBe(false)
    })
  })

  describe('Análise em lote e idempotência', () => {
    it('executa análise em lote calculando estatísticas gerais', () => {
      const publicacoes: Publicacao[] = [
        {
          id: 2,
          titulo: 'Artigo 1',
          autores: 'Barreto, Ledjane Silva; Santos, Euler Araujo dos',
          periodico: 'Revista A',
          ano: 2025,
          doi: '',
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 3,
          titulo: 'Artigo 2',
          autores: 'Newton, Isaac; Maxwell, James',
          periodico: 'Revista B',
          ano: 2025,
          doi: '',
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const relatorio = analisarCasamentosEmLote({
        publicacoes,
        docentes: docentesExemplo,
        vinculosExistentes: [{ publicacao_id: 2, docente_id: 4 }], // Ledjane já vinculada
      })

      expect(relatorio.publicacoesAnalisadas).toBe(2)
      expect(relatorio.publicacoesComSugestao).toBe(1) // Apenas pub 2 tem sugestões
      expect(relatorio.totalSugestoes).toBe(2) // Ledjane + Euler
      expect(relatorio.totalJaVinculadas).toBe(1) // Ledjane

      const pub2 = relatorio.itens.find((i) => i.publicacaoId === 2)!
      expect(pub2.sugestoes.find((s) => s.docenteId === 4)?.jaVinculado).toBe(true)
      expect(pub2.sugestoes.find((s) => s.docenteId === 5)?.jaVinculado).toBe(false)
      expect(pub2.sugestoes.find((s) => s.docenteId === 5)?.selecionadoPadrao).toBe(true)
    })
  })
})
