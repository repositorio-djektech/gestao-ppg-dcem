import { describe, it, expect } from 'vitest'
import { criarClienteFake } from '@/test/fake-supabase'
import { obterTextoPoliticasAfirmativas, salvarTextoPoliticasAfirmativas } from './ppg-textos'

describe('H-10 — serviço do texto do item 1.3', () => {
  it('obtém o texto gravado', async () => {
    const { client } = criarClienteFake({
      ppg_textos: [{ chave: 'item_1_3_politicas_afirmativas', texto: 'Texto ficticio.' }],
    })
    expect(await obterTextoPoliticasAfirmativas(client)).toBe('Texto ficticio.')
  })

  it('devolve vazio quando ainda não há texto', async () => {
    const { client } = criarClienteFake({ ppg_textos: [] })
    expect(await obterTextoPoliticasAfirmativas(client)).toBe('')
  })

  it('coordenador salva: grava uma única linha por chave (upsert) e atualiza em novas gravações', async () => {
    const { client, tabelas } = criarClienteFake({ ppg_textos: [] })
    const r1 = await salvarTextoPoliticasAfirmativas(
      { role: 'coordenador', texto: ' Versão 1 ' },
      client,
    )
    const r2 = await salvarTextoPoliticasAfirmativas(
      { role: 'coordenador', texto: 'Versão 2' },
      client,
    )
    expect(r1).toEqual({ ok: true })
    expect(r2).toEqual({ ok: true })
    expect(tabelas.ppg_textos).toHaveLength(1)
    expect(tabelas.ppg_textos[0]).toMatchObject({
      chave: 'item_1_3_politicas_afirmativas',
      texto: 'Versão 2',
    })
  })

  it('não coordenação é recusada antes de qualquer acesso ao banco', async () => {
    const { client, chamadas } = criarClienteFake({ ppg_textos: [] })
    for (const role of ['auxiliar', 'docente', 'capes', null] as const) {
      const r = await salvarTextoPoliticasAfirmativas({ role, texto: 'x' }, client)
      expect(r).toEqual({ ok: false, motivo: 'sem_permissao' })
    }
    expect(chamadas).toHaveLength(0)
  })

  it('texto acima do limite é recusado sem gravar', async () => {
    const { client, chamadas } = criarClienteFake({ ppg_textos: [] })
    const r = await salvarTextoPoliticasAfirmativas(
      { role: 'coordenador', texto: 'a'.repeat(5000) },
      client,
    )
    expect(r).toEqual({ ok: false, motivo: 'muito_longo' })
    expect(chamadas).toHaveLength(0)
  })

  it('devolve o erro do banco sem lançar exceção', async () => {
    const { client } = criarClienteFake(
      { ppg_textos: [] },
      { erroEm: { tabela: 'ppg_textos', op: 'upsert', mensagem: 'falha simulada' } },
    )
    const r = await salvarTextoPoliticasAfirmativas({ role: 'coordenador', texto: 'ok' }, client)
    expect(r).toEqual({ ok: false, motivo: 'erro', mensagem: 'falha simulada' })
  })
})
