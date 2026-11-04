import { describe, it, expect } from 'vitest'
import { publicacoesVisiveisAoDocente, docentesParaVincularAoSalvar } from './visibilidade'

// Dados fictícios
const publicacoes = [
  { id: 1, titulo: 'Minha' },
  { id: 2, titulo: 'Compartilhada' },
  { id: 3, titulo: 'Alheia' },
  { id: 4, titulo: 'Sem vínculo' },
]
const vinculos = [
  { publicacao_id: 1, docente_id: 10 },
  { publicacao_id: 2, docente_id: 10 },
  { publicacao_id: 2, docente_id: 20 },
  { publicacao_id: 3, docente_id: 20 },
]

describe('Publicações visíveis ao docente (D-27)', () => {
  it('vê só as vinculadas a ele (próprias e as compartilhadas com coautores docentes)', () => {
    expect(publicacoesVisiveisAoDocente(publicacoes, 10, vinculos).map((p) => p.id)).toEqual([1, 2])
    expect(publicacoesVisiveisAoDocente(publicacoes, 20, vinculos).map((p) => p.id)).toEqual([2, 3])
  })

  it('não vê as sem vínculo nem as de outros', () => {
    const ids = publicacoesVisiveisAoDocente(publicacoes, 10, vinculos).map((p) => p.id)
    expect(ids).not.toContain(3)
    expect(ids).not.toContain(4)
  })

  it('docente sem cadastro vinculado não vê nenhuma', () => {
    expect(publicacoesVisiveisAoDocente(publicacoes, null, vinculos)).toEqual([])
    expect(publicacoesVisiveisAoDocente(publicacoes, undefined, vinculos)).toEqual([])
  })

  it('enquanto os vínculos não carregaram (lista vazia), o docente não vê nada', () => {
    expect(publicacoesVisiveisAoDocente(publicacoes, 10, [])).toEqual([])
  })
})

describe('Quem é vinculado ao salvar uma publicação', () => {
  it('docente sempre fica vinculado à própria publicação (senão ela some da lista dele)', () => {
    expect(docentesParaVincularAoSalvar('docente', 10, [20])).toEqual([20, 10])
    expect(docentesParaVincularAoSalvar('docente', 10, [])).toEqual([10])
  })

  it('não duplica quando o docente já está na seleção', () => {
    expect(docentesParaVincularAoSalvar('docente', 10, [10, 20])).toEqual([10, 20])
  })

  it('coordenação mantém exatamente a seleção feita', () => {
    for (const role of ['coordenador', 'suporte', 'auxiliar'] as const) {
      expect(docentesParaVincularAoSalvar(role, null, [20])).toEqual([20])
    }
  })

  it('docente sem cadastro vinculado: mantém a seleção (não inventa vínculo)', () => {
    expect(docentesParaVincularAoSalvar('docente', null, [20])).toEqual([20])
  })
})
