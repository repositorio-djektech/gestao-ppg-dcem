/**
 * Testes de verificação das hipóteses V3–V6: afirmam o comportamento correto esperado e
 * agora servem de regressão para as correções aplicadas.
 */
import { describe, it, expect } from 'vitest'
import { avaliarDocente } from './calculo'

const docente = (id: number) =>
  ({ id, nome: `Docente ${id}`, categoria: 'permanente', status: true }) as any

const vazio = {
  orientacoes: [],
  disciplinas: [],
  projetos: [],
  participantesProjetos: [],
  publicacoes: [],
}

describe('V4 — Critério II considera a N:N disciplinas_docentes', () => {
  it('docente que só consta em docentes_ids (não é docente_id) cumpre o critério', () => {
    const r = avaliarDocente({
      docente: docente(2),
      ...vazio,
      disciplinas: [
        { id: 1, nome: 'Disc', docente_id: 1, docentes_ids: [1, 2], ano_semestre: '2026/1' },
      ] as any,
    })
    expect(r.criterio_ii.atendido).toBe(true)
  })
})

describe('V6 — Critério I com orientação em andamento iniciada antes do quadriênio', () => {
  it('orientação principal iniciada em 2022, sem fim, vigente em 2026, conta', () => {
    const r = avaliarDocente({
      docente: docente(1),
      ...vazio,
      orientacoes: [
        {
          id: 1,
          docente_id: 1,
          discente_id: 1,
          tipo: 'Doutorado',
          inicio: '2022',
          fim: '',
          status: 'em_andamento',
          flag_orientador_principal: true,
        },
      ] as any,
    })
    expect(r.criterio_i.atendido).toBe(true)
  })
})

describe('V3b — fallback textual na recondução', () => {
  it('publicação de outro autor com mesmo sobrenome comum não entra no NP teto', () => {
    const r = avaliarDocente({
      docente: { ...docente(1), nome: 'Maria Silva Santos' },
      ...vazio,
      publicacoes: [
        { id: 1, ano: 2025, autores: 'João Silva', fator_impacto_jcr: 3, titulo: 'T', periodico: 'P' },
      ] as any,
    })
    expect(r.np_teto).toBe(0)
  })
})

describe('Disciplina sem ano (consistência recondução x indicadores)', () => {
  it('registro sem ano_semestre é aceito na recondução (comportamento documentado)', () => {
    const r = avaliarDocente({
      docente: docente(1),
      ...vazio,
      disciplinas: [{ id: 1, nome: 'D', docente_id: 1, ano_semestre: '' }] as any,
    })
    expect(r.criterio_ii.atendido).toBe(true)
  })
})
