/**
 * Cliente Supabase em memória para testes unitários de serviços (dados fictícios).
 * Suporta só o necessário: select/insert/update, eq, is, maybeSingle, single.
 * Não toca em banco nenhum.
 */
type Linha = Record<string, any>

export interface OpcoesClienteFake {
  /** Simula uma RLS que bloqueia UPDATE (0 linhas afetadas, sem erro). */
  bloquearUpdateEm?: string[]
  /** Simula erro do banco em uma operação. */
  erroEm?: { tabela: string; op: 'select' | 'insert' | 'update' | 'upsert'; mensagem: string }
}

export interface ChamadaFake {
  tabela: string
  op: 'select' | 'insert' | 'update' | 'upsert'
  payload?: any
}

export function criarClienteFake(tabelas: Record<string, Linha[]>, opcoes: OpcoesClienteFake = {}) {
  const chamadas: ChamadaFake[] = []

  function from(tabela: string) {
    if (!tabelas[tabela]) tabelas[tabela] = []
    const estado: {
      op: 'select' | 'insert' | 'update' | 'upsert'
      onConflict: string
      filtros: Array<(r: Linha) => boolean>
      payload: any
    } = { op: 'select', onConflict: 'id', filtros: [], payload: undefined }

    const executar = async (): Promise<{ data: any; error: any }> => {
      chamadas.push({ tabela, op: estado.op, payload: estado.payload })
      if (opcoes.erroEm && opcoes.erroEm.tabela === tabela && opcoes.erroEm.op === estado.op) {
        return { data: null, error: { message: opcoes.erroEm.mensagem } }
      }
      const linhas = tabelas[tabela]
      if (estado.op === 'upsert') {
        const p = estado.payload as Linha
        const existente = linhas.find((r) => r[estado.onConflict] === p[estado.onConflict])
        if (existente) Object.assign(existente, p)
        else linhas.push({ id: linhas.length + 1, ...p })
        return { data: [p], error: null }
      }
      if (estado.op === 'insert') {
        const novos = (Array.isArray(estado.payload) ? estado.payload : [estado.payload]).map(
          (p: Linha) => ({ id: linhas.length + 1, ...p }),
        )
        linhas.push(...novos)
        return { data: novos, error: null }
      }
      const alvo = linhas.filter((r) => estado.filtros.every((f) => f(r)))
      if (estado.op === 'update') {
        if (opcoes.bloquearUpdateEm?.includes(tabela)) return { data: [], error: null }
        alvo.forEach((r) => Object.assign(r, estado.payload))
        return { data: alvo.map((r) => ({ ...r })), error: null }
      }
      return { data: alvo.map((r) => ({ ...r })), error: null }
    }

    const builder: any = {
      select: () => builder,
      insert: (p: any) => {
        estado.op = 'insert'
        estado.payload = p
        return builder
      },
      upsert: (p: any, opts?: { onConflict?: string }) => {
        estado.op = 'upsert'
        estado.payload = p
        estado.onConflict = opts?.onConflict || 'id'
        return builder
      },
      update: (p: any) => {
        estado.op = 'update'
        estado.payload = p
        return builder
      },
      eq: (coluna: string, valor: any) => {
        estado.filtros.push((r) => r[coluna] === valor)
        return builder
      },
      is: (coluna: string, valor: any) => {
        estado.filtros.push((r) => (r[coluna] ?? null) === valor)
        return builder
      },
      maybeSingle: async () => {
        const res = await executar()
        return { data: res.data?.[0] ?? null, error: res.error }
      },
      single: async () => {
        const res = await executar()
        return { data: res.data?.[0] ?? null, error: res.error }
      },
      then: (resolve: any, reject: any) => executar().then(resolve, reject),
    }
    return builder
  }

  return { client: { from } as any, chamadas, tabelas }
}
