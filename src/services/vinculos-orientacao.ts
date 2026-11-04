import { supabase } from '@/lib/supabase/client'
import { discenteSemOrientador } from '@/services/permissoes'
import { calcularStatusEfetivoOrientacao } from '@/lib/orientacoes/status'

/**
 * Vínculo docente–discente (D-11):
 * - H-01: docente se define orientador de discente sem orientador.
 * - H-03: só a coordenação altera o orientador principal (formulário do discente + RLS; ver
 *   `lib/discentes/orientador-form.ts` e `podeAlterarOrientadorPrincipal`).
 *
 * As funções recebem o cliente por parâmetro para serem testáveis sem banco.
 */

export type MotivoRecusaVinculo =
  | 'ja_possui_orientador'
  | 'sem_orientador'
  | 'discente_nao_encontrado'
  | 'erro'

export type ResultadoVinculo =
  | { ok: true }
  | { ok: false; motivo: Exclude<MotivoRecusaVinculo, 'erro'> }
  | { ok: false; motivo: 'erro'; mensagem: string }

type Cliente = typeof supabase

/**
 * H-01 + P-14. O docente vira orientador do discente E fica registrado como orientador PRINCIPAL
 * em `orientacoes` (`flag_orientador_principal = true`), que é o que alimenta indicadores e Recondução.
 *
 * O UPDATE de `discentes` é condicional (`docente_orientador_id IS NULL`): se outro vínculo entrou
 * antes, ou se a RLS não permitir, nenhuma linha é afetada e nada é sobrescrito. Se a orientação
 * principal não puder ser gravada, o vínculo no discente é desfeito (melhor esforço).
 */
export async function assumirOrientacao(
  params: { discenteId: number; docenteId: number; docenteNome: string },
  client: Cliente = supabase,
): Promise<ResultadoVinculo> {
  const { data: atual, error: errLeitura } = await (client as any)
    .from('discentes')
    .select('id, orientador, docente_orientador_id, tipo_curso, data_ingresso')
    .eq('id', params.discenteId)
    .maybeSingle()
  if (errLeitura) {
    return { ok: false, motivo: 'erro', mensagem: errLeitura.message || 'Erro ao ler o discente.' }
  }
  if (!atual) return { ok: false, motivo: 'discente_nao_encontrado' }
  if (!discenteSemOrientador(atual)) return { ok: false, motivo: 'ja_possui_orientador' }

  const { data, error } = await (client as any)
    .from('discentes')
    .update({ docente_orientador_id: params.docenteId, orientador: params.docenteNome })
    .eq('id', params.discenteId)
    .is('docente_orientador_id', null)
    .select('id')
  if (error) return { ok: false, motivo: 'erro', mensagem: error.message || 'Erro ao vincular.' }
  if (!data || data.length === 0) return { ok: false, motivo: 'ja_possui_orientador' }

  const falhaOrientacao = await garantirOrientacaoPrincipal(
    { discenteId: params.discenteId, docenteId: params.docenteId, discente: atual },
    client,
  )
  if (falhaOrientacao) {
    await (client as any)
      .from('discentes')
      .update({ docente_orientador_id: null, orientador: atual.orientador || '' })
      .eq('id', params.discenteId)
      .eq('docente_orientador_id', params.docenteId)
    return { ok: false, motivo: 'erro', mensagem: falhaOrientacao }
  }
  return { ok: true }
}

/** Promove a orientação existente do docente a principal ou cria uma. Devolve a mensagem de erro, se houver. */
async function garantirOrientacaoPrincipal(
  params: {
    discenteId: number
    docenteId: number
    discente: { tipo_curso?: string | null; data_ingresso?: string | null }
  },
  client: Cliente,
): Promise<string | null> {
  const { data: existentes, error: errBusca } = await (client as any)
    .from('orientacoes')
    .select('id')
    .eq('docente_id', params.docenteId)
    .eq('discente_id', params.discenteId)
  if (errBusca) return errBusca.message || 'Erro ao ler orientações.'

  if (existentes && existentes.length > 0) {
    const { error } = await (client as any)
      .from('orientacoes')
      .update({ flag_orientador_principal: true })
      .eq('id', existentes[0].id)
    return error ? error.message || 'Erro ao atualizar a orientação.' : null
  }

  const { error } = await (client as any).from('orientacoes').insert({
    docente_id: params.docenteId,
    discente_id: params.discenteId,
    tipo: params.discente.tipo_curso || 'Mestrado',
    inicio: params.discente.data_ingresso || '',
    fim: '',
    status: 'ativo',
    flag_orientador_principal: true,
    link_comprovacao: '',
    observacoes: 'Orientador principal (assumiu a orientação pelo sistema)',
  })
  return error ? error.message || 'Erro ao registrar a orientação.' : null
}

function hojeIso(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/**
 * P-19 (H-03). Depois que a coordenação troca o orientador principal do discente:
 * - o novo orientador ganha a orientação principal (promove a de coorientador, se houver);
 * - a orientação EM ANDAMENTO do orientador anterior com este discente é encerrada como
 *   CANCELADA (`cancelado = true`, datas preservadas). Não pode ser "concluída": uma data de fim
 *   passada viraria titulação em ORI e PSA. Orientação já concluída ou defendida não é tocada.
 */
export async function sincronizarTrocaDeOrientador(
  params: {
    discenteId: number
    anteriorDocenteId: number | null | undefined
    novoDocenteId: number | null | undefined
  },
  client: Cliente = supabase,
): Promise<ResultadoVinculo> {
  const anterior = params.anteriorDocenteId || null
  const novo = params.novoDocenteId || null
  if (anterior === novo) return { ok: true }

  if (novo) {
    const { data: discente, error } = await (client as any)
      .from('discentes')
      .select('id, tipo_curso, data_ingresso')
      .eq('id', params.discenteId)
      .maybeSingle()
    if (error)
      return { ok: false, motivo: 'erro', mensagem: error.message || 'Erro ao ler o discente.' }
    if (!discente) return { ok: false, motivo: 'discente_nao_encontrado' }
    const falha = await garantirOrientacaoPrincipal(
      { discenteId: params.discenteId, docenteId: novo, discente },
      client,
    )
    if (falha) return { ok: false, motivo: 'erro', mensagem: falha }
  }

  if (anterior) {
    const { data: antigas, error } = await (client as any)
      .from('orientacoes')
      .select('id, status, fim, cancelado, data_defesa, observacoes')
      .eq('docente_id', anterior)
      .eq('discente_id', params.discenteId)
    if (error)
      return { ok: false, motivo: 'erro', mensagem: error.message || 'Erro ao ler orientações.' }

    const hoje = hojeIso()
    for (const o of antigas || []) {
      const emAndamento =
        !o.data_defesa &&
        calcularStatusEfetivoOrientacao({
          status: o.status,
          fim: o.fim,
          cancelado: o.cancelado,
        }) === 'em_andamento'
      if (!emAndamento) continue
      const nota = `Encerrada em ${hoje}: troca de orientador principal.`
      const { error: errUpd } = await (client as any)
        .from('orientacoes')
        .update({
          cancelado: true,
          status: 'cancelado',
          fim: hoje,
          observacoes: o.observacoes ? `${o.observacoes} | ${nota}` : nota,
        })
        .eq('id', o.id)
      if (errUpd) {
        return {
          ok: false,
          motivo: 'erro',
          mensagem: errUpd.message || 'Erro ao encerrar a orientação.',
        }
      }
    }
  }
  return { ok: true }
}
