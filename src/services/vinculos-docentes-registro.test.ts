import { describe, it, expect } from 'vitest'
import { criarClienteFake } from '@/test/fake-supabase'
import { criarServicoVinculosDocentes } from './vinculos-docentes-registro'

describe('Vínculos docente ↔ registro (patentes e produção técnica)', () => {
  function cenario(vinculos: any[] = []) {
    const fake = criarClienteFake({ patentes_docentes: vinculos })
    const servico = criarServicoVinculosDocentes('patentes_docentes', 'patente_id', fake.client)
    return { ...fake, servico }
  }

  it('listarTodos devolve todos os vínculos', async () => {
    const { servico } = cenario([{ id: 1, patente_id: 5, docente_id: 10 }])
    expect(await servico.listarTodos()).toEqual([{ id: 1, patente_id: 5, docente_id: 10 }])
  })

  it('coordenação: sincroniza a lista inteira (insere os novos e remove os que saíram)', async () => {
    const { servico, tabelas } = cenario([
      { id: 1, patente_id: 5, docente_id: 10 },
      { id: 2, patente_id: 5, docente_id: 20 },
      { id: 3, patente_id: 9, docente_id: 20 }, // outro registro: não pode ser tocado
    ])
    await servico.sincronizarDocentes(5, [10, 30])
    const doReg5 = tabelas.patentes_docentes
      .filter((v) => v.patente_id === 5)
      .map((v) => v.docente_id)
    expect(doReg5.sort()).toEqual([10, 30])
    expect(tabelas.patentes_docentes.some((v) => v.patente_id === 9 && v.docente_id === 20)).toBe(
      true,
    )
  })

  it('é idempotente: repetir não duplica', async () => {
    const { servico, tabelas } = cenario()
    await servico.sincronizarDocentes(5, [10])
    await servico.sincronizarDocentes(5, [10])
    expect(tabelas.patentes_docentes).toHaveLength(1)
  })

  it('docente: só garante o PRÓPRIO vínculo e não mexe nos dos outros (a RLS só permite isso)', async () => {
    const { servico, tabelas } = cenario([{ id: 1, patente_id: 5, docente_id: 20 }])
    await servico.sincronizarDocentes(5, [20, 30], { somenteDocenteId: 10 })
    const ids = tabelas.patentes_docentes.filter((v) => v.patente_id === 5).map((v) => v.docente_id)
    expect(ids.sort()).toEqual([10, 20]) // incluiu o 10; manteve o 20; ignorou o 30
  })

  it('docente que já está vinculado não duplica', async () => {
    const { servico, tabelas } = cenario([{ id: 1, patente_id: 5, docente_id: 10 }])
    await servico.sincronizarDocentes(5, [], { somenteDocenteId: 10 })
    expect(tabelas.patentes_docentes).toHaveLength(1)
  })

  it('propaga o erro do banco', async () => {
    const fake = criarClienteFake(
      { patentes_docentes: [] },
      { erroEm: { tabela: 'patentes_docentes', op: 'insert', mensagem: 'falha simulada' } },
    )
    const servico = criarServicoVinculosDocentes('patentes_docentes', 'patente_id', fake.client)
    await expect(servico.sincronizarDocentes(5, [10])).rejects.toMatchObject({
      message: 'falha simulada',
    })
  })
})
