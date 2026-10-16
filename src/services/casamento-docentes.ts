import { supabase } from '@/lib/supabase/client'
import type { Docente, Publicacao, PublicacaoDocente } from '@/types/database'
import {
  analisarCasamentosEmLote,
  type RelatorioCasamentoGeral,
} from '@/lib/publicacoes/matching-docentes'
import { publicacoesDocentesService } from '@/services/publicacoes-docentes'
import { sugestoesRejeitadasService } from '@/services/sugestoes-rejeitadas'
import { registrarLog } from '@/services/logs'

export interface ItemConfirmacaoCasamento {
  publicacaoId: number
  docenteId: number
}

export interface ResultadoConfirmacaoCasamento {
  sucessos: number
  erros: number
  detalhes: {
    publicacaoId: number
    docenteId: number
    sucesso: boolean
    mensagem?: string
  }[]
}

export const casamentoDocentesService = {
  /**
   * Obtém os dados e roda a análise completa de casamento automático autor->docente em lote.
   */
  async gerarSugestoesCasamento(): Promise<RelatorioCasamentoGeral> {
    // 1. Carrega todas as publicações, docentes, vínculos existentes e sugestões rejeitadas em paralelo
    const [pubsRes, docsRes, vincRes, rejRes] = await Promise.all([
      (supabase.from as any)('publicacoes')
        .select('id, titulo, autores, ano')
        .order('ano', { ascending: false }),
      (supabase.from as any)('docentes')
        .select('id, nome, categoria, status')
        .order('nome', { ascending: true }),
      publicacoesDocentesService.listarTodos(),
      sugestoesRejeitadasService.listarTodas(),
    ])

    const publicacoes = (pubsRes.data || []) as Publicacao[]
    const docentes = (docsRes.data || []) as Docente[]
    const vinculosExistentes = (vincRes || []) as PublicacaoDocente[]
    const rejeitadas = (rejRes || []).filter((r: any) => r.tipo_vinculo === 'publicacao_docente')

    return analisarCasamentosEmLote({
      publicacoes,
      docentes,
      vinculosExistentes,
      rejeitados: rejeitadas,
    })
  },

  /**
   * Confirma um único vínculo de casamento (1 clique) de forma estritamente idempotente.
   * Não duplica vínculos e não remove nenhum vínculo manual existente.
   */
  async confirmarIndividual(params: {
    publicacaoId: number
    docenteId: number
    usuarioNome?: string
    justificativa?: string
  }): Promise<boolean> {
    const { publicacaoId, docenteId, usuarioNome, justificativa } = params

    // Idempotência: vincularDocente no publicacoesDocentesService já checa se existe
    await publicacoesDocentesService.vincularDocente(publicacaoId, docenteId)

    // Se estava na lista de rejeitadas por engano, remove a rejeição
    await sugestoesRejeitadasService.removerRejeicao({
      tipoVinculo: 'publicacao_docente',
      origemIdentificador: String(publicacaoId),
      alvoIdentificador: String(docenteId),
    })

    // Log de auditoria
    registrarLog({
      acao: 'vincular_docente_autor',
      entidade: 'publicacoes_docentes',
      entidade_id: `${publicacaoId}_${docenteId}`,
      detalhes: {
        publicacao_id: publicacaoId,
        docente_id: docenteId,
        origem: 'casamento_automatico_etapa_d1',
        confirmado_por: usuarioNome || 'Usuário',
        justificativa: justificativa || 'Confirmação individual autor→docente',
      },
    })

    return true
  },

  /**
   * Confirma múltiplos vínculos selecionados em lote.
   * Idempotente, preservando todos os vínculos manuais e sem duplicar.
   */
  async confirmarEmLote(params: {
    itens: ItemConfirmacaoCasamento[]
    usuarioNome?: string
  }): Promise<ResultadoConfirmacaoCasamento> {
    const { itens, usuarioNome } = params
    let sucessos = 0
    let erros = 0
    const detalhes: ResultadoConfirmacaoCasamento['detalhes'] = []

    if (!itens || itens.length === 0) {
      return { sucessos: 0, erros: 0, detalhes: [] }
    }

    // Carrega todos os vínculos existentes atuais para garantir idempotência em memória antes do insert
    const vinculosAtuais = await publicacoesDocentesService.listarTodos()
    const setExistentes = new Set<string>()
    for (const v of vinculosAtuais) {
      setExistentes.add(`${v.publicacao_id}_${v.docente_id}`)
    }

    // Filtra apenas itens que ainda não existem
    const novosItens = itens.filter(
      (item) => !setExistentes.has(`${item.publicacaoId}_${item.docenteId}`),
    )

    // Se já estavam todos gravados, idempotência total
    if (novosItens.length === 0) {
      return {
        sucessos: itens.length,
        erros: 0,
        detalhes: itens.map((i) => ({
          publicacaoId: i.publicacaoId,
          docenteId: i.docenteId,
          sucesso: true,
          mensagem: 'Já vinculado previamente',
        })),
      }
    }

    // Inserção em batch para eficiência
    const rows = novosItens.map((i) => ({
      publicacao_id: i.publicacaoId,
      docente_id: i.docenteId,
    }))

    const { error: insError } = await (supabase.from as any)('publicacoes_docentes').insert(rows)

    if (insError) {
      // Se deu erro de lote (ex: race condition), tenta individualmente
      for (const item of itens) {
        try {
          await publicacoesDocentesService.vincularDocente(item.publicacaoId, item.docenteId)
          sucessos++
          detalhes.push({
            publicacaoId: item.publicacaoId,
            docenteId: item.docenteId,
            sucesso: true,
          })
        } catch (e: any) {
          erros++
          detalhes.push({
            publicacaoId: item.publicacaoId,
            docenteId: item.docenteId,
            sucesso: false,
            mensagem: e?.message || 'Erro ao vincular',
          })
        }
      }
    } else {
      sucessos = itens.length
      for (const item of itens) {
        detalhes.push({
          publicacaoId: item.publicacaoId,
          docenteId: item.docenteId,
          sucesso: true,
        })
      }
    }

    // Log de auditoria do lote
    registrarLog({
      acao: 'vincular_docente_autor_lote',
      entidade: 'publicacoes_docentes',
      detalhes: {
        total_selecionado: itens.length,
        novos_inseridos: novosItens.length,
        sucessos,
        erros,
        origem: 'casamento_automatico_etapa_d1',
        confirmado_por: usuarioNome || 'Usuário',
      },
    })

    return { sucessos, erros, detalhes }
  },

  /**
   * Rejeita uma sugestão individual para que não volte a ser exibida / gravada.
   */
  async rejeitarSugestao(params: {
    publicacaoId: number
    docenteId: number
    usuarioNome?: string
    motivo?: string
  }): Promise<boolean> {
    const { publicacaoId, docenteId, usuarioNome, motivo } = params

    return sugestoesRejeitadasService.rejeitarSugestao({
      tipoVinculo: 'publicacao_docente',
      origemIdentificador: String(publicacaoId),
      alvoIdentificador: String(docenteId),
      motivo: motivo || 'Rejeitado pelo usuário no casamento automático Etapa D1',
      rejeitadoPor: usuarioNome || 'Usuário',
    })
  },
}
