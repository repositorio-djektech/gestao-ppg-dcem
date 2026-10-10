import { describe, it, expect } from 'vitest'
import {
  normalizarTextoNome,
  decomporNome,
  calcularSimilaridadeNome,
  sugerirCoautoresPublicacao,
  dividirAutoresTexto,
} from './matching-coautoria'

describe('Matching Tolerante de Coautoria com Discentes/Egressos (Item 1)', () => {
  describe('Normalização e divisão de nomes', () => {
    it('normaliza acentos, maiúsculas e caracteres especiais', () => {
      expect(normalizarTextoNome('Élvia Soraya dos Santos')).toBe('elvia soraya santos')
      expect(normalizarTextoNome('FÉLIX RAMAN SILVA SILVEIRA')).toBe('felix raman silva silveira')
      expect(normalizarTextoNome('Jander Lopes Fonseca')).toBe('jander lopes fonseca')
    })

    it('divide corretamente autores em string separada por ponto-e-vírgula', () => {
      const autores =
        'SANTOS, HERICLES CAMPOS DOS; PRUDENTE, ISIS NAYRA ROLEMBERG; FONSECA, JANDER LOPES; Barreto, Ledjane Silva'
      const lista = dividirAutoresTexto(autores)
      expect(lista).toHaveLength(4)
      expect(lista[2]).toBe('FONSECA, JANDER LOPES')
    })

    it('divide autores separados por vírgula direta', () => {
      const autores = 'Carlos Roberto, João Silva'
      const lista = dividirAutoresTexto(autores)
      expect(lista).toContain('Carlos Roberto')
      expect(lista).toContain('João Silva')
    })
  })

  describe('Decomposição e comparação tolerante', () => {
    it('reconhece formato "Sobrenome, Nome" e "Sobrenome, Iniciais"', () => {
      const dec1 = decomporNome('Silva, J.')
      expect(dec1.ultimoSobrenome).toBe('silva')
      expect(dec1.primeiroNome).toBe('j')

      const dec2 = decomporNome('João Silva')
      expect(dec2.ultimoSobrenome).toBe('silva')
      expect(dec2.primeiroNome).toBe('joao')
    })

    it('identifica match entre "Silva, J." e "João Silva" (sobrenome + iniciais)', () => {
      const sim = calcularSimilaridadeNome('Silva, J.', 'João Silva')
      expect(sim.match).toBe(true)
      expect(sim.score).toBeGreaterThanOrEqual(0.7)
      expect(sim.motivo).toContain('inicial compatível')
    })

    it('identifica match com acentos e maiúsculas diferentes: "SILVEIRA, FÉLIX RAMAN SILVA" vs "Félix Raman Silva Silveira"', () => {
      const sim = calcularSimilaridadeNome(
        'SILVEIRA, FÉLIX RAMAN SILVA',
        'Félix Raman Silva Silveira',
      )
      expect(sim.match).toBe(true)
      expect(sim.score).toBeGreaterThanOrEqual(0.9)
    })

    it('identifica match em ordem trocada: "FONSECA, JANDER LOPES" vs "Jander Lopes Fonseca"', () => {
      const sim = calcularSimilaridadeNome('FONSECA, JANDER LOPES', 'JANDER LOPES FONSECA')
      expect(sim.match).toBe(true)
      expect(sim.score).toBeGreaterThanOrEqual(0.9)
    })

    it('não dá match em nomes sem relação', () => {
      const sim = calcularSimilaridadeNome('Santos, Carlos Alberto', 'Jander Lopes Fonseca')
      expect(sim.match).toBe(false)
      expect(sim.score).toBe(0)
    })
  })

  describe('Sugestão de coautores em publicação real', () => {
    const discentes = [
      { id: 4, nome: 'JANDER LOPES FONSECA', status: 'ativo' as const },
      { id: 8, nome: 'FÉLIX RAMAN SILVA SILVEIRA', status: 'ativo' as const },
      { id: 10, nome: 'TAcontroller test', status: 'ativo' as const },
    ]

    const egressos = [{ id: 1, nome: 'Carlos Eduardo Lima' }]

    it('sugere Jander Lopes Fonseca para a publicação real de cimento', () => {
      const autoresTexto =
        'SANTOS, HERICLES CAMPOS DOS; PRUDENTE, ISIS NAYRA ROLEMBERG; FONSECA, JANDER LOPES; Barreto, Ledjane Silva'
      const sugestoes = sugerirCoautoresPublicacao({
        autoresTexto,
        discentes,
        egressos,
      })

      expect(sugestoes.length).toBeGreaterThanOrEqual(1)
      const jander = sugestoes.find((s) => s.discenteId === 4)
      expect(jander).toBeDefined()
      expect(jander?.nome).toBe('JANDER LOPES FONSECA')
      expect(jander?.grauConfianca).toBeGreaterThanOrEqual(0.9)
    })

    it('sugere Félix Raman para a publicação de bioactive glass', () => {
      const autoresTexto =
        'SILVEIRA, FÉLIX RAMAN SILVA; OLIVEIRA, JÉSSICA FERNANDA RIBEIRO; ROSA, MARIA DE LOURDES DA SILVA; Barreto, Ledjane Silva'
      const sugestoes = sugerirCoautoresPublicacao({
        autoresTexto,
        discentes,
        egressos,
      })

      const felix = sugestoes.find((s) => s.discenteId === 8)
      expect(felix).toBeDefined()
      expect(felix?.nome).toBe('FÉLIX RAMAN SILVA SILVEIRA')
    })

    it('retorna lista vazia quando nenhum autor do programa participa', () => {
      const autoresTexto = 'Newton, Isaac; Einstein, Albert'
      const sugestoes = sugerirCoautoresPublicacao({
        autoresTexto,
        discentes,
        egressos,
      })
      expect(sugestoes).toHaveLength(0)
    })
  })
})
