import { describe, it, expect } from 'vitest'
import { criarClienteFake } from '@/test/fake-supabase'
import {
  listarPeriodos,
  obterConfiguracao,
  salvarPeriodo,
  ativarPeriodo,
  excluirPeriodo,
  salvarConfiguracao,
} from './periodos'

const P1 = {
  id: 1,
  nome: 'Quadriênio 2025–2028',
  ano_inicio: 2025,
  ano_fim: 2028,
  ativo: true,
  ano_referencia: null,
}
const P2 = {
  id: 2,
  nome: 'Quadriênio 2029–2031',
  ano_inicio: 2029,
  ano_fim: 2031,
  ativo: false,
  ano_referencia: null,
}

describe('Serviço de períodos de avaliação (D-32)', () => {
  it('lista e converte os períodos', async () => {
    const { client } = criarClienteFake({ periodos_avaliacao: [P1, P2] })
    const lista = await listarPeriodos(client)
    expect(lista.map((p) => [p.anoInicio, p.anoFim, p.ativo])).toEqual([
      [2025, 2028, true],
      [2029, 2031, false],
    ])
  })

  it('configuração: lê a linha, ou usa o padrão (Lattes desde 2020) se não existir', async () => {
    const { client } = criarClienteFake({
      ppg_configuracoes: [{ id: 1, lattes_ano_inicio: 2021, lattes_ano_fim: 2024 }],
    })
    expect(await obterConfiguracao(client)).toEqual({ lattesAnoInicio: 2021, lattesAnoFim: 2024 })
    const { client: vazio } = criarClienteFake({ ppg_configuracoes: [] })
    expect(await obterConfiguracao(vazio)).toEqual({ lattesAnoInicio: 2020, lattesAnoFim: null })
  })

  it('só suporte e coordenador editam; docente e auxiliar são barrados antes do banco', async () => {
    const { client, chamadas } = criarClienteFake({ periodos_avaliacao: [P1] })
    const novo = { nome: 'Quadriênio 2029–2031', anoInicio: 2029, anoFim: 2031 }
    for (const role of ['docente', 'auxiliar', 'capes', null] as const) {
      expect(await salvarPeriodo({ role, periodo: novo }, client)).toEqual({
        ok: false,
        motivo: 'sem_permissao',
      })
      expect(await ativarPeriodo({ role, id: 1 }, client)).toEqual({
        ok: false,
        motivo: 'sem_permissao',
      })
      expect(await excluirPeriodo({ role, id: 1 }, client)).toEqual({
        ok: false,
        motivo: 'sem_permissao',
      })
      expect(
        await salvarConfiguracao(
          { role, configuracao: { lattesAnoInicio: 2020, lattesAnoFim: null } },
          client,
        ),
      ).toEqual({ ok: false, motivo: 'sem_permissao' })
    }
    expect(chamadas).toEqual([])
  })

  it('coordenador cadastra período de 3 anos (nasce inativo) e edita um existente', async () => {
    const { client, tabelas } = criarClienteFake({ periodos_avaliacao: [P1] })
    const r = await salvarPeriodo(
      {
        role: 'coordenador',
        periodo: { nome: ' Quadriênio 2029–2031 ', anoInicio: 2029, anoFim: 2031 },
      },
      client,
    )
    expect(r).toEqual({ ok: true })
    expect(tabelas.periodos_avaliacao[1]).toMatchObject({
      nome: 'Quadriênio 2029–2031',
      ano_inicio: 2029,
      ano_fim: 2031,
      ativo: false,
    })
    await salvarPeriodo(
      { role: 'suporte', periodo: { id: 2, nome: 'Renomeado', anoInicio: 2029, anoFim: 2032 } },
      client,
    )
    expect(tabelas.periodos_avaliacao[1]).toMatchObject({ nome: 'Renomeado', ano_fim: 2032 })
  })

  it('recusa período inválido sem tocar no banco', async () => {
    const { client, chamadas } = criarClienteFake({ periodos_avaliacao: [] })
    const r = await salvarPeriodo(
      { role: 'coordenador', periodo: { nome: 'X', anoInicio: 2031, anoFim: 2029 } },
      client,
    )
    expect(r).toMatchObject({ ok: false, motivo: 'invalido' })
    expect(chamadas).toEqual([])
  })

  it('ativar chama a função atômica do banco e devolve o erro dela', async () => {
    const { client, chamadas } = criarClienteFake(
      {},
      { rpc: { ativar_periodo_avaliacao: () => undefined } },
    )
    expect(await ativarPeriodo({ role: 'coordenador', id: 2 }, client)).toEqual({ ok: true })
    expect(chamadas[0]).toMatchObject({
      tabela: 'rpc:ativar_periodo_avaliacao',
      payload: { p_id: 2 },
    })

    const { client: ruim } = criarClienteFake(
      {},
      { rpc: { ativar_periodo_avaliacao: () => ({ error: { message: 'Sem permissão' } }) } },
    )
    expect(await ativarPeriodo({ role: 'coordenador', id: 2 }, ruim)).toEqual({
      ok: false,
      motivo: 'erro',
      mensagem: 'Sem permissão',
    })
  })

  it('apagar: remove o inativo; o ativo (barrado pela RLS, 0 linhas) vira mensagem clara', async () => {
    const { client, tabelas } = criarClienteFake({ periodos_avaliacao: [P1, P2] })
    expect(await excluirPeriodo({ role: 'coordenador', id: 2 }, client)).toEqual({ ok: true })
    expect(tabelas.periodos_avaliacao.map((p: any) => p.id)).toEqual([1])

    const { client: barrado } = criarClienteFake(
      { periodos_avaliacao: [P1] },
      { bloquearUpdateEm: [] },
    )
    // simula o ativo: a RLS não deixa apagar, então nenhuma linha é afetada
    ;(barrado as any).from = (t: string) => {
      const b: any = {
        delete: () => b,
        eq: () => b,
        select: () => Promise.resolve({ data: [], error: null }),
      }
      return t === 'periodos_avaliacao' ? b : undefined
    }
    expect(await excluirPeriodo({ role: 'coordenador', id: 1 }, barrado)).toMatchObject({
      ok: false,
      mensagem: expect.stringMatching(/ativo/i),
    })
  })

  it('configuração: valida e grava a linha única', async () => {
    const { client, tabelas } = criarClienteFake({ ppg_configuracoes: [] })
    expect(
      await salvarConfiguracao(
        { role: 'coordenador', configuracao: { lattesAnoInicio: 2024, lattesAnoFim: 2020 } },
        client,
      ),
    ).toMatchObject({ ok: false, motivo: 'invalido' })
    expect(
      await salvarConfiguracao(
        { role: 'coordenador', configuracao: { lattesAnoInicio: 2021, lattesAnoFim: null } },
        client,
      ),
    ).toEqual({ ok: true })
    expect(tabelas.ppg_configuracoes[0]).toMatchObject({
      id: 1,
      lattes_ano_inicio: 2021,
      lattes_ano_fim: null,
    })
  })
})
