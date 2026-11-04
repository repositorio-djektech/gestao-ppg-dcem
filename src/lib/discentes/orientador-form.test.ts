import { describe, it, expect } from 'vitest'
import { opcoesDeOrientador, aplicarOrientadorSelecionado } from './orientador-form'

// Dados fictícios.
const docentes = [
  { id: 10, nome: 'Docente Alfa Teste' },
  { id: 20, nome: 'Docente Beta Teste' },
]

describe('H-03 — campo "Orientador" do formulário de discente', () => {
  describe('opcoesDeOrientador', () => {
    it('coordenação vê todos os docentes', () => {
      for (const role of ['coordenador', 'suporte', 'auxiliar'] as const) {
        expect(opcoesDeOrientador(role, null, docentes)).toEqual([
          { value: '10', label: 'Docente Alfa Teste' },
          { value: '20', label: 'Docente Beta Teste' },
        ])
      }
    })

    it('docente só vê a si mesmo (não escolhe outro orientador principal)', () => {
      expect(opcoesDeOrientador('docente', 10, docentes)).toEqual([
        { value: '10', label: 'Docente Alfa Teste (Você)' },
      ])
    })
  })

  describe('aplicarOrientadorSelecionado', () => {
    const formAtual = {
      nome: 'Discente Ficticio',
      docente_orientador_id: '20',
      orientador: 'Docente Beta Teste',
    }

    it('coordenador altera o orientador principal: id e texto acompanham a escolha', () => {
      const novo = aplicarOrientadorSelecionado({
        role: 'coordenador',
        docenteIdLogado: null,
        valorSelecionado: '10',
        docentes,
        formAtual,
      })
      expect(novo.docente_orientador_id).toBe('10')
      expect(novo.orientador).toBe('Docente Alfa Teste')
      expect(novo.nome).toBe('Discente Ficticio')
    })

    it('coordenador pode limpar o orientador, mantendo o texto livre já existente', () => {
      const novo = aplicarOrientadorSelecionado({
        role: 'coordenador',
        docenteIdLogado: null,
        valorSelecionado: '',
        docentes,
        formAtual,
      })
      expect(novo.docente_orientador_id).toBe('')
      expect(novo.orientador).toBe('Docente Beta Teste')
    })

    it('docente NÃO consegue trocar o orientador: qualquer valor vira ele mesmo', () => {
      const novo = aplicarOrientadorSelecionado({
        role: 'docente',
        docenteIdLogado: 10,
        valorSelecionado: '20',
        docentes,
        formAtual,
      })
      expect(novo.docente_orientador_id).toBe('10')
      expect(novo.orientador).toBe('Docente Alfa Teste')
    })
  })
})
