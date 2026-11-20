import { describe, it, expect } from 'vitest'
import { criarClienteFake } from '@/test/fake-supabase'
import { criarServicoVinculosDiscentes } from './vinculos-discentes-registro'

describe('discentes ligados à produção (P-35)', () => {
  it('lista o mapa registro → discentes', async () => {
    const { client } = criarClienteFake({
      patentes_discentes: [
        { id: 1, patente_id: 3, discente_id: 7 },
        { id: 2, patente_id: 3, discente_id: 8 },
        { id: 3, patente_id: 4, discente_id: 7 },
      ],
    })
    const s = criarServicoVinculosDiscentes('patentes_discentes', 'patente_id', client)
    expect(await s.listarPorRegistro()).toEqual({ 3: [7, 8], 4: [7] })
  })

  it('sincronizar insere os novos e remove os que saíram, sem tocar em outros registros', async () => {
    const { client, tabelas } = criarClienteFake({
      eventos_discentes: [
        { id: 1, evento_id: 5, discente_id: 7 },
        { id: 2, evento_id: 5, discente_id: 8 },
        { id: 3, evento_id: 9, discente_id: 8 },
      ],
    })
    const s = criarServicoVinculosDiscentes('eventos_discentes', 'evento_id', client)
    await s.sincronizar(5, [8, '9', 10])
    const doEvento5 = tabelas.eventos_discentes.filter((r) => r.evento_id === 5)
    expect(doEvento5.map((r) => r.discente_id).sort((a, b) => a - b)).toEqual([8, 9, 10])
    expect(tabelas.eventos_discentes.find((r) => r.evento_id === 9)).toBeTruthy() // outro registro intacto
  })

  it('lista vazia remove todos os vínculos do registro', async () => {
    const { client, tabelas } = criarClienteFake({
      producao_tecnica_discentes: [{ id: 1, producao_tecnica_id: 2, discente_id: 7 }],
    })
    const s = criarServicoVinculosDiscentes(
      'producao_tecnica_discentes',
      'producao_tecnica_id',
      client,
    )
    await s.sincronizar(2, [])
    expect(tabelas.producao_tecnica_discentes).toHaveLength(0)
  })

  it('erro do banco (ex.: RLS) é propagado, não engolido', async () => {
    const { client } = criarClienteFake(
      { patentes_discentes: [] },
      { erroEm: { tabela: 'patentes_discentes', op: 'insert', mensagem: 'RLS' } },
    )
    const s = criarServicoVinculosDiscentes('patentes_discentes', 'patente_id', client)
    await expect(s.sincronizar(1, [7])).rejects.toMatchObject({ message: 'RLS' })
  })
})
