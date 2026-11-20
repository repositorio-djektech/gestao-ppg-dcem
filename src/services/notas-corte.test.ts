import { describe, it, expect } from 'vitest'
import { criarClienteFake } from '@/test/fake-supabase'
import {
  listarNotasCorte,
  obterNotaCorte,
  salvarNotaCorte,
  excluirNotaCorte,
  validarNotaCorte,
  NOTA_CORTE_PADRAO,
} from './notas-corte'

describe('Nota de corte do PDQ por ano da avaliação (D-36)', () => {
  it('ano sem nota cadastrada usa o padrão 1,0', async () => {
    const { client } = criarClienteFake({ avaliacao_notas_corte: [] })
    expect(await obterNotaCorte(2030, client)).toBe(NOTA_CORTE_PADRAO)
    expect(NOTA_CORTE_PADRAO).toBe(1)
  })

  it('lê a nota cadastrada do ano e lista as notas', async () => {
    const { client } = criarClienteFake({
      avaliacao_notas_corte: [
        { ano_avaliacao: 2026, nota_corte: 1, observacao: '' },
        { ano_avaliacao: 2027, nota_corte: 1.75, observacao: 'Colegiado' },
      ],
    })
    expect(await obterNotaCorte(2027, client)).toBe(1.75)
    const lista = await listarNotasCorte(client)
    expect(lista.map((n) => n.anoAvaliacao).sort()).toEqual([2026, 2027])
  })

  it('só suporte e coordenador gravam; auxiliar e docente são barrados antes de tocar no banco', async () => {
    const { client, chamadas } = criarClienteFake({ avaliacao_notas_corte: [] })
    const nota = { anoAvaliacao: 2027, notaCorte: 1.2, observacao: '' }
    for (const role of ['auxiliar', 'docente', 'capes'] as const) {
      expect(await salvarNotaCorte({ role, nota }, client)).toEqual({
        ok: false,
        motivo: 'sem_permissao',
      })
    }
    expect(chamadas).toHaveLength(0)
    expect((await salvarNotaCorte({ role: 'coordenador', nota }, client)).ok).toBe(true)
  })

  it('valida ano e nota (negativa ou não numérica é recusada)', async () => {
    expect(validarNotaCorte(2026, 1)).toBeNull()
    expect(validarNotaCorte(2026, -1)).toBeTruthy()
    expect(validarNotaCorte(2026, NaN)).toBeTruthy()
    expect(validarNotaCorte(1800, 1)).toBeTruthy()
    const { client } = criarClienteFake({ avaliacao_notas_corte: [] })
    const r = await salvarNotaCorte(
      { role: 'coordenador', nota: { anoAvaliacao: 2026, notaCorte: -2, observacao: '' } },
      client,
    )
    expect(r.ok).toBe(false)
  })

  it('apagar uma nota barrada pela RLS não conta como sucesso', async () => {
    const { client } = criarClienteFake({
      avaliacao_notas_corte: [{ ano_avaliacao: 2026, nota_corte: 1, observacao: '' }],
    })
    // o fake devolve a linha apagada; sem linha afetada devolveria vazio → sem_permissao
    const ok = await excluirNotaCorte({ role: 'coordenador', anoAvaliacao: 2026 }, client)
    expect(ok.ok).toBe(true)
    const nada = await excluirNotaCorte({ role: 'coordenador', anoAvaliacao: 1999 }, client)
    expect(nada.ok).toBe(false)
  })
})
