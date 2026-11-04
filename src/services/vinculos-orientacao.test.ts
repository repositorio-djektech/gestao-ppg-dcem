import { describe, it, expect, vi, afterEach } from 'vitest'
import { criarClienteFake } from '@/test/fake-supabase'
import { assumirOrientacao, sincronizarTrocaDeOrientador } from './vinculos-orientacao'

// Dados 100% fictícios.
const DOCENTE_A = { id: 10, nome: 'Docente Alfa Teste' }
const DOCENTE_B = { id: 20, nome: 'Docente Beta Teste' }

function discente(extra: Record<string, any> = {}) {
  return {
    id: 1,
    nome: 'Discente Ficticio Um',
    orientador: '',
    docente_orientador_id: null,
    tipo_curso: 'Mestrado',
    data_ingresso: '2025-03-01',
    ...extra,
  }
}

describe('H-01 — assumirOrientacao (docente se define orientador de discente sem orientador)', () => {
  it('define docente_orientador_id e o texto do orientador quando o discente não tem orientador', async () => {
    const { client, tabelas } = criarClienteFake({ discentes: [discente()] })

    const res = await assumirOrientacao(
      { discenteId: 1, docenteId: DOCENTE_A.id, docenteNome: DOCENTE_A.nome },
      client,
    )

    expect(res).toEqual({ ok: true })
    expect(tabelas.discentes[0].docente_orientador_id).toBe(DOCENTE_A.id)
    expect(tabelas.discentes[0].orientador).toBe(DOCENTE_A.nome)
  })

  it('recusa quando o discente já tem orientador e não altera nada (orientador principal é da coordenação)', async () => {
    const { client, tabelas } = criarClienteFake({
      discentes: [discente({ docente_orientador_id: DOCENTE_B.id, orientador: DOCENTE_B.nome })],
    })

    const res = await assumirOrientacao(
      { discenteId: 1, docenteId: DOCENTE_A.id, docenteNome: DOCENTE_A.nome },
      client,
    )

    expect(res).toEqual({ ok: false, motivo: 'ja_possui_orientador' })
    expect(tabelas.discentes[0].docente_orientador_id).toBe(DOCENTE_B.id)
    expect(tabelas.discentes[0].orientador).toBe(DOCENTE_B.nome)
  })

  it('segunda tentativa de outro docente é recusada e não sobrescreve o primeiro vínculo', async () => {
    const { client, tabelas } = criarClienteFake({ discentes: [discente()], orientacoes: [] })
    await assumirOrientacao(
      { discenteId: 1, docenteId: DOCENTE_A.id, docenteNome: DOCENTE_A.nome },
      client,
    )
    const res2 = await assumirOrientacao(
      { discenteId: 1, docenteId: DOCENTE_B.id, docenteNome: DOCENTE_B.nome },
      client,
    )
    expect(res2).toEqual({ ok: false, motivo: 'ja_possui_orientador' })
    expect(tabelas.discentes[0].docente_orientador_id).toBe(DOCENTE_A.id)
    expect(tabelas.orientacoes).toHaveLength(1)
  })

  it('devolve erro do banco sem lançar exceção', async () => {
    const { client } = criarClienteFake(
      { discentes: [discente()] },
      { erroEm: { tabela: 'discentes', op: 'update', mensagem: 'falha simulada' } },
    )
    const res = await assumirOrientacao(
      { discenteId: 1, docenteId: DOCENTE_A.id, docenteNome: DOCENTE_A.nome },
      client,
    )
    expect(res).toEqual({ ok: false, motivo: 'erro', mensagem: 'falha simulada' })
  })

  it('discente inexistente ou bloqueado pela RLS resulta em recusa clara, não em sucesso falso', async () => {
    const { client } = criarClienteFake(
      { discentes: [discente()] },
      { bloquearUpdateEm: ['discentes'] },
    )
    const res = await assumirOrientacao(
      { discenteId: 1, docenteId: DOCENTE_A.id, docenteNome: DOCENTE_A.nome },
      client,
    )
    expect(res.ok).toBe(false)
  })
})

describe('P-14 — assumir a orientação também registra a orientação PRINCIPAL (conta nos indicadores)', () => {
  it('cria a orientação do docente com flag_orientador_principal = true', async () => {
    const { client, tabelas } = criarClienteFake({ discentes: [discente()], orientacoes: [] })
    const res = await assumirOrientacao(
      { discenteId: 1, docenteId: DOCENTE_A.id, docenteNome: DOCENTE_A.nome },
      client,
    )
    expect(res).toEqual({ ok: true })
    expect(tabelas.orientacoes).toHaveLength(1)
    expect(tabelas.orientacoes[0]).toMatchObject({
      docente_id: DOCENTE_A.id,
      discente_id: 1,
      flag_orientador_principal: true,
      tipo: 'Mestrado',
      inicio: '2025-03-01',
      status: 'ativo',
    })
  })

  it('se o docente já tinha orientação com o discente, promove a principal em vez de duplicar', async () => {
    const { client, tabelas } = criarClienteFake({
      discentes: [discente()],
      orientacoes: [
        { id: 7, docente_id: DOCENTE_A.id, discente_id: 1, flag_orientador_principal: false },
      ],
    })
    await assumirOrientacao(
      { discenteId: 1, docenteId: DOCENTE_A.id, docenteNome: DOCENTE_A.nome },
      client,
    )
    expect(tabelas.orientacoes).toHaveLength(1)
    expect(tabelas.orientacoes[0].flag_orientador_principal).toBe(true)
  })

  it('recusa por já ter orientador: não cria orientação nenhuma', async () => {
    const { client, tabelas } = criarClienteFake({
      discentes: [discente({ docente_orientador_id: DOCENTE_B.id })],
      orientacoes: [],
    })
    await assumirOrientacao(
      { discenteId: 1, docenteId: DOCENTE_A.id, docenteNome: DOCENTE_A.nome },
      client,
    )
    expect(tabelas.orientacoes).toHaveLength(0)
  })

  it('se não conseguir gravar a orientação, desfaz o vínculo no discente e avisa o erro', async () => {
    const { client, tabelas } = criarClienteFake(
      { discentes: [discente({ orientador: 'Texto livre anterior' })], orientacoes: [] },
      { erroEm: { tabela: 'orientacoes', op: 'insert', mensagem: 'falha simulada' } },
    )
    const res = await assumirOrientacao(
      { discenteId: 1, docenteId: DOCENTE_A.id, docenteNome: DOCENTE_A.nome },
      client,
    )
    expect(res).toEqual({ ok: false, motivo: 'erro', mensagem: 'falha simulada' })
    expect(tabelas.discentes[0].docente_orientador_id).toBeNull()
    expect(tabelas.discentes[0].orientador).toBe('Texto livre anterior')
  })
})

describe('P-19 — troca do orientador principal pela coordenação sincroniza `orientacoes`', () => {
  afterEach(() => vi.useRealTimers())

  function cenario(orientacoes: any[]) {
    return criarClienteFake({
      discentes: [discente({ docente_orientador_id: DOCENTE_B.id, orientador: DOCENTE_B.nome })],
      orientacoes,
    })
  }
  const antigaEmAndamento = {
    id: 1,
    docente_id: DOCENTE_A.id,
    discente_id: 1,
    flag_orientador_principal: true,
    status: 'em_andamento',
    cancelado: false,
    fim: '',
    data_defesa: null,
    observacoes: 'Obs anterior',
  }

  it('encerra a orientação do orientador anterior como CANCELADA (não "concluída", que contaria titulação) e preserva as datas', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 4, 12, 0, 0))
    const { client, tabelas } = cenario([{ ...antigaEmAndamento, inicio: '2025-03-01' }])

    const res = await sincronizarTrocaDeOrientador(
      { discenteId: 1, anteriorDocenteId: DOCENTE_A.id, novoDocenteId: DOCENTE_B.id },
      client,
    )

    expect(res).toEqual({ ok: true })
    const antiga = tabelas.orientacoes.find((o) => o.id === 1)!
    expect(antiga.cancelado).toBe(true)
    expect(antiga.status).toBe('cancelado')
    expect(antiga.fim).toBe('2026-11-04')
    expect(antiga.inicio).toBe('2025-03-01')
    expect(antiga.observacoes).toContain('Obs anterior')
    expect(antiga.observacoes).toMatch(/troca de orientador/i)
  })

  it('o novo orientador ganha a orientação principal', async () => {
    const { client, tabelas } = cenario([{ ...antigaEmAndamento }])
    await sincronizarTrocaDeOrientador(
      { discenteId: 1, anteriorDocenteId: DOCENTE_A.id, novoDocenteId: DOCENTE_B.id },
      client,
    )
    const nova = tabelas.orientacoes.find((o) => o.docente_id === DOCENTE_B.id)!
    expect(nova).toMatchObject({
      discente_id: 1,
      flag_orientador_principal: true,
      tipo: 'Mestrado',
    })
  })

  it('se o novo orientador já era coorientador, promove a principal sem duplicar', async () => {
    const { client, tabelas } = cenario([
      { ...antigaEmAndamento },
      { id: 2, docente_id: DOCENTE_B.id, discente_id: 1, flag_orientador_principal: false },
    ])
    await sincronizarTrocaDeOrientador(
      { discenteId: 1, anteriorDocenteId: DOCENTE_A.id, novoDocenteId: DOCENTE_B.id },
      client,
    )
    expect(tabelas.orientacoes.filter((o) => o.docente_id === DOCENTE_B.id)).toHaveLength(1)
    expect(tabelas.orientacoes.find((o) => o.id === 2)!.flag_orientador_principal).toBe(true)
  })

  it('não mexe em orientação já concluída/defendida do orientador anterior (seria correção de dado, não troca)', async () => {
    const concluida = {
      ...antigaEmAndamento,
      status: 'concluido',
      fim: '2025-12-10',
      data_defesa: '2025-12-10',
    }
    const { client, tabelas } = cenario([concluida])
    await sincronizarTrocaDeOrientador(
      { discenteId: 1, anteriorDocenteId: DOCENTE_A.id, novoDocenteId: DOCENTE_B.id },
      client,
    )
    const antiga = tabelas.orientacoes.find((o) => o.id === 1)!
    expect(antiga.cancelado).toBe(false)
    expect(antiga.status).toBe('concluido')
  })

  it('não mexe em orientações do mesmo docente com OUTROS discentes nem já canceladas', async () => {
    const outroDiscente = { ...antigaEmAndamento, id: 5, discente_id: 99 }
    const jaCancelada = {
      ...antigaEmAndamento,
      id: 6,
      status: 'cancelado',
      cancelado: true,
      fim: '2024-01-01',
    }
    const { client, tabelas } = cenario([{ ...antigaEmAndamento }, outroDiscente, jaCancelada])
    await sincronizarTrocaDeOrientador(
      { discenteId: 1, anteriorDocenteId: DOCENTE_A.id, novoDocenteId: DOCENTE_B.id },
      client,
    )
    expect(tabelas.orientacoes.find((o) => o.id === 5)!.cancelado).toBe(false)
    expect(tabelas.orientacoes.find((o) => o.id === 6)!.fim).toBe('2024-01-01')
  })

  it('discente sem orientador anterior: só cria a orientação principal do novo', async () => {
    const { client, tabelas } = cenario([])
    const res = await sincronizarTrocaDeOrientador(
      { discenteId: 1, anteriorDocenteId: null, novoDocenteId: DOCENTE_B.id },
      client,
    )
    expect(res).toEqual({ ok: true })
    expect(tabelas.orientacoes).toHaveLength(1)
    expect(tabelas.orientacoes[0].docente_id).toBe(DOCENTE_B.id)
  })

  it('orientador removido (novo = null): só encerra a anterior', async () => {
    const { client, tabelas } = cenario([{ ...antigaEmAndamento }])
    await sincronizarTrocaDeOrientador(
      { discenteId: 1, anteriorDocenteId: DOCENTE_A.id, novoDocenteId: null },
      client,
    )
    expect(tabelas.orientacoes).toHaveLength(1)
    expect(tabelas.orientacoes[0].cancelado).toBe(true)
  })

  it('sem troca (mesmo docente ou ambos vazios) não faz nada', async () => {
    const { client, chamadas } = cenario([{ ...antigaEmAndamento }])
    await sincronizarTrocaDeOrientador(
      { discenteId: 1, anteriorDocenteId: DOCENTE_A.id, novoDocenteId: DOCENTE_A.id },
      client,
    )
    await sincronizarTrocaDeOrientador(
      { discenteId: 1, anteriorDocenteId: null, novoDocenteId: null },
      client,
    )
    expect(chamadas).toHaveLength(0)
  })

  it('devolve erro do banco sem lançar exceção', async () => {
    const { client } = criarClienteFake(
      { discentes: [discente()], orientacoes: [{ ...antigaEmAndamento }] },
      { erroEm: { tabela: 'orientacoes', op: 'update', mensagem: 'falha simulada' } },
    )
    const res = await sincronizarTrocaDeOrientador(
      { discenteId: 1, anteriorDocenteId: DOCENTE_A.id, novoDocenteId: null },
      client,
    )
    expect(res).toEqual({ ok: false, motivo: 'erro', mensagem: 'falha simulada' })
  })
})
