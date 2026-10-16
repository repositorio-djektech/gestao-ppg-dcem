import { describe, it, expect } from 'vitest'
import {
  mapearPercentilParaQualis,
  mapearCitednessParaQualis,
  mapearSjrParaQualis,
  mapearJcrParaQualis,
  verificarElegibilidadePublicacao,
  estimarEstratoQualis,
  MetricasColetadas,
} from './estimativa-qualis'
import { Publicacao } from '@/types/database'

describe('Motor de Estimativa Qualis (Etapa D2)', () => {
  describe('mapearPercentilParaQualis (Percentis Limítrofes)', () => {
    it('deve mapear percentil 90 ou superior para A1', () => {
      expect(mapearPercentilParaQualis(90).estrato).toBe('A1')
      expect(mapearPercentilParaQualis(95).estrato).toBe('A1')
      expect(mapearPercentilParaQualis(100).estrato).toBe('A1')
    })

    it('deve mapear percentil 75 a 89.99 para A2', () => {
      expect(mapearPercentilParaQualis(89.9).estrato).toBe('A2')
      expect(mapearPercentilParaQualis(75).estrato).toBe('A2')
      expect(mapearPercentilParaQualis(80).estrato).toBe('A2')
    })

    it('deve mapear percentil 60 a 74.99 para A3', () => {
      expect(mapearPercentilParaQualis(74.9).estrato).toBe('A3')
      expect(mapearPercentilParaQualis(60).estrato).toBe('A3')
      expect(mapearPercentilParaQualis(65).estrato).toBe('A3')
    })

    it('deve mapear percentil 40 a 59.99 para A4', () => {
      expect(mapearPercentilParaQualis(59.9).estrato).toBe('A4')
      expect(mapearPercentilParaQualis(40).estrato).toBe('A4')
      expect(mapearPercentilParaQualis(50).estrato).toBe('A4')
    })

    it('deve mapear percentil abaixo de 40 para B1', () => {
      expect(mapearPercentilParaQualis(39.9).estrato).toBe('B1')
      expect(mapearPercentilParaQualis(20).estrato).toBe('B1')
      expect(mapearPercentilParaQualis(0).estrato).toBe('B1')
    })
  })

  describe('Mapeamentos complementares (Citedness, SJR, JCR)', () => {
    it('deve mapear citedness OpenAlex nos limiares definidos', () => {
      expect(mapearCitednessParaQualis(6.5).estrato).toBe('A1')
      expect(mapearCitednessParaQualis(4.5).estrato).toBe('A2')
      expect(mapearCitednessParaQualis(3.0).estrato).toBe('A3')
      expect(mapearCitednessParaQualis(1.8).estrato).toBe('A4')
      expect(mapearCitednessParaQualis(0.8).estrato).toBe('B1')
    })

    it('deve mapear SJR Scopus nos limiares definidos', () => {
      expect(mapearSjrParaQualis(1.6).estrato).toBe('A1')
      expect(mapearSjrParaQualis(1.1).estrato).toBe('A2')
      expect(mapearSjrParaQualis(0.8).estrato).toBe('A3')
      expect(mapearSjrParaQualis(0.4).estrato).toBe('A4')
      expect(mapearSjrParaQualis(0.2).estrato).toBe('B1')
    })

    it('deve mapear JCR nos limiares definidos', () => {
      expect(mapearJcrParaQualis(5.5).estrato).toBe('A1')
      expect(mapearJcrParaQualis(3.8).estrato).toBe('A2')
      expect(mapearJcrParaQualis(2.2).estrato).toBe('A3')
      expect(mapearJcrParaQualis(1.2).estrato).toBe('A4')
      expect(mapearJcrParaQualis(0.5).estrato).toBe('B1')
    })
  })

  describe('Regra de Ouro: Preservação estrita e Inelegibilidade', () => {
    const pubBase: Publicacao = {
      id: 1,
      titulo: 'Síntese de Nanocompósitos',
      autores: 'Silva, J.; Santos, A.',
      periodico: 'Ceramics International',
      ano: 2025,
      doi: '10.1016/j.ceramint.2025.01.001',
      justificativa: '',
      link_comprovacao: '',
      observacoes: '',
      tipo_producao: 'Artigo em periódico',
      estrato_qualis: null,
    }

    it('deve rejeitar reprocessamento se publicação já tiver estrato_qualis (estrato manual preservado)', () => {
      const pubComQualisManual: Publicacao = {
        ...pubBase,
        estrato_qualis: 'A2',
        qualis_origem: 'manual',
      }
      const elegivel = verificarElegibilidadePublicacao(pubComQualisManual)
      expect(elegivel.elegivel).toBe(false)
      expect(elegivel.motivo).toContain('Preservação estrita')

      // Estimativa também não deve sugerir nem tocar
      const sugestao = estimarEstratoQualis(pubComQualisManual, {
        openalexWork: { percentileValue: 95 },
      })
      expect(sugestao.elegivel).toBe(false)
      expect(sugestao.estratoSugerido).toBeNull()
      expect(sugestao.estratoAtual).toBe('A2')
    })

    it('deve rejeitar reprocessamento se publicação já tiver estrato atribuído anteriormente (sugerido_confirmado)', () => {
      const pubJaConfirmada: Publicacao = {
        ...pubBase,
        estrato_qualis: 'A1',
        qualis_origem: 'sugerido_confirmado',
      }
      const elegivel = verificarElegibilidadePublicacao(pubJaConfirmada)
      expect(elegivel.elegivel).toBe(false)
    })

    it('deve marcar trabalhos em anais como inelegíveis para estimativa automática de periódico', () => {
      const pubAnais: Publicacao = {
        ...pubBase,
        tipo_producao: 'Trabalho em anais',
      }
      const elegivel = verificarElegibilidadePublicacao(pubAnais)
      expect(elegivel.elegivel).toBe(false)
      expect(elegivel.motivo).toContain('Trabalho em anais')

      const sugestao = estimarEstratoQualis(pubAnais)
      expect(sugestao.estratoSugerido).toBeNull()
      expect(sugestao.grauConfianca).toBe('baixa')
    })

    it('deve marcar capítulos de livro como inelegíveis para estimativa de periódico', () => {
      const pubCapitulo: Publicacao = {
        ...pubBase,
        tipo_producao: 'Capítulo',
      }
      const elegivel = verificarElegibilidadePublicacao(pubCapitulo)
      expect(elegivel.elegivel).toBe(false)
      expect(elegivel.motivo).toContain('Capítulo')
    })

    it('deve marcar publicação sem periódico como inelegível', () => {
      const pubSemPeriodico: Publicacao = {
        ...pubBase,
        periodico: '',
      }
      const elegivel = verificarElegibilidadePublicacao(pubSemPeriodico)
      expect(elegivel.elegivel).toBe(false)
    })
  })

  describe('Estimativa com métricas reais e prioridades', () => {
    const pub: Publicacao = {
      id: 2,
      titulo: 'Effects of nano-fillers',
      autores: 'Santos, H. C.; Barreto, L. S.',
      periodico: 'Journal of Building Engineering',
      ano: 2025,
      doi: '10.1016/j.jobe.2025.112391',
      justificativa: '',
      link_comprovacao: '',
      observacoes: '',
      estrato_qualis: null,
    }

    it('deve priorizar percentil CiteScore Scopus se disponível com alta confiança', () => {
      const metricas: MetricasColetadas = {
        scopusSerial: {
          percentileCiteScore: 92,
          sjr: 1.4,
        },
        openalexSource: {
          citedness2yr: 4.5,
        },
      }
      const res = estimarEstratoQualis(pub, metricas)
      expect(res.estratoSugerido).toBe('A1')
      expect(res.grauConfianca).toBe('alta')
      expect(res.justificativa).toContain('Scopus')
      expect(res.justificativa).toContain('percentil 92')
    })

    it('deve utilizar percentil do artigo no OpenAlex quando Scopus não disponível', () => {
      const metricas: MetricasColetadas = {
        openalexWork: {
          percentileValue: 88,
        },
      }
      const res = estimarEstratoQualis(pub, metricas)
      expect(res.estratoSugerido).toBe('A2')
      expect(res.grauConfianca).toBe('alta')
      expect(res.justificativa).toContain('OpenAlex')
      expect(res.justificativa).toContain('percentil 88')
    })

    it('deve utilizar citedness da fonte do OpenAlex se percentil do artigo ausente', () => {
      const metricas: MetricasColetadas = {
        openalexSource: {
          displayName: 'Journal of Building Engineering',
          citedness2yr: 6.2,
          hIndex: 90,
        },
      }
      const res = estimarEstratoQualis(pub, metricas)
      expect(res.estratoSugerido).toBe('A1')
      expect(res.grauConfianca).toBe('media')
      expect(res.justificativa).toContain('6.20 citações/2 anos')
    })

    it('deve fallback para JCR se nenhuma outra métrica externa for obtida', () => {
      const pubComJcr: Publicacao = {
        ...pub,
        fator_impacto_jcr: 3.2,
      }
      const res = estimarEstratoQualis(pubComJcr, {})
      expect(res.estratoSugerido).toBe('A3')
      expect(res.grauConfianca).toBe('media')
      expect(res.justificativa).toContain('JCR cadastrado')
    })

    it('NUNCA deve inventar estrato quando nenhuma métrica for encontrada', () => {
      const res = estimarEstratoQualis(pub, {})
      expect(res.estratoSugerido).toBeNull()
      expect(res.grauConfianca).toBe('baixa')
      expect(res.justificativa).toContain('Nenhuma métrica de periódicos identificada')
    })
  })
})
