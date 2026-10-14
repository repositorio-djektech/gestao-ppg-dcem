import { describe, it, expect, beforeEach } from 'vitest'
import {
  sugerirDocentesAutoresParaTexto,
  sugerirCoautoresParaTexto,
  resolverDocenteOrientador,
  LIMIAR_ALTA_CONFIANCA,
} from './resolucao-vinculos'

describe('Etapa R3: Auto-resolução de vínculos por nome', () => {
  const docentes = [
    { id: 1, nome: 'Ledjane Silva Barreto', categoria: 'permanente' as const, id_lattes: '1111' },
    { id: 2, nome: 'Carlos Alberto Santos', categoria: 'permanente' as const, id_lattes: '2222' },
    {
      id: 3,
      nome: 'Maria Oliveira de Souza',
      categoria: 'colaborador' as const,
      id_lattes: '3333',
    },
  ]

  const discentes = [
    { id: 10, nome: 'Ana Paula Costa', status: 'ativo' as const },
    { id: 11, nome: 'Lucas Ferreira Lima', status: 'ativo' as const },
  ]

  const egressos = [{ id: 20, nome: 'Juliana Mendes Silva' }]

  it('detecta docente autor em formato "Sobrenome, Iniciais" ou "Sobrenome, Nome"', () => {
    const texto = 'BARRETO, L. S.; SANTOS, C. A.; SILVA, J.'
    const sugestoes = sugerirDocentesAutoresParaTexto({
      autoresTexto: texto,
      docentes,
    })

    expect(sugestoes.length).toBe(2)
    expect(sugestoes[0].nome).toBe('Ledjane Silva Barreto')
    expect(sugestoes[0].grauConfianca).toBeGreaterThanOrEqual(LIMIAR_ALTA_CONFIANCA)
    expect(sugestoes[0].altaConfianca).toBe(true)
    expect(sugestoes[0].aceita).toBe(true)

    expect(sugestoes[1].nome).toBe('Carlos Alberto Santos')
    expect(sugestoes[1].altaConfianca).toBe(true)
  })

  it('detecta coautores discentes e egressos em publicações', () => {
    const texto = 'Barreto, L. S.; Costa, Ana Paula; Mendes Silva, J.'
    const sugestoes = sugerirCoautoresParaTexto({
      autoresTexto: texto,
      discentes,
      egressos,
    })

    expect(sugestoes.length).toBe(2)
    const discenteSug = sugestoes.find((s) => s.discenteId === 10)
    expect(discenteSug).toBeDefined()
    expect(discenteSug?.tipo).toBe('orientando')
    expect(discenteSug?.altaConfianca).toBe(true)

    const egressoSug = sugestoes.find((s) => s.egressoId === 20)
    expect(egressoSug).toBeDefined()
    expect(egressoSug?.tipo).toBe('egresso')
  })

  it('respeita alvos rejeitados para a mesma publicação/origem', () => {
    const texto = 'BARRETO, L. S.; SANTOS, C. A.'
    const rejeitados = new Set<string | number>([2]) // Rejeitou Carlos Alberto Santos

    const sugestoes = sugerirDocentesAutoresParaTexto({
      autoresTexto: texto,
      docentes,
      idsRejeitados: rejeitados,
    })

    const carlos = sugestoes.find((s) => s.docenteId === 2)
    expect(carlos).toBeDefined()
    expect(carlos?.rejeitada).toBe(true)
    expect(carlos?.aceita).toBe(false)
  })

  it('resolve docente orientador a partir de nome em texto livre', () => {
    const orientadorTexto = 'Profª. Drª. Ledjane Silva Barreto'
    const match = resolverDocenteOrientador({
      nomeOrientadorTexto: orientadorTexto,
      docentes,
    })

    expect(match).not.toBeNull()
    expect(match?.docenteId).toBe(1)
    expect(match?.altaConfianca).toBe(true)
    expect(match?.aceita).toBe(true)
  })

  it('resolve docente orientador a partir do contexto Lattes do orientador', () => {
    const match = resolverDocenteOrientador({
      docenteContexto: { id_lattes: '2222', nome: 'Carlos Alberto Santos' },
      docentes,
    })

    expect(match).not.toBeNull()
    expect(match?.docenteId).toBe(2)
    expect(match?.grauConfianca).toBe(1.0)
  })
})
