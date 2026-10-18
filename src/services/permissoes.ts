import type { Role } from '@/types/database'

export type TabelaMapeada =
  | 'docentes'
  | 'discentes'
  | 'egressos'
  | 'orientacoes'
  | 'disciplinas'
  | 'projetos_pesquisa'
  | 'publicacoes'
  | 'iniciacao_cientifica'
  | 'bancas'
  | 'eventos'
  | 'impacto_social'
  | 'linhas_pesquisa'
  | 'mobilidade_docente'
  | 'patentes'
  | 'premiacoes'
  | 'producao_tecnica'
  | 'ppg'
  | 'usuarios'
  | string

export interface ContextoPermissaoRegistro {
  /** Lista de docente_ids vinculados à publicação via publicacoes_docentes */
  publicacoesDocentesIds?: number[]
  /** Se o docente logado é participante do projeto de pesquisa */
  isParticipanteProjeto?: boolean
  /** Se o docente logado orienta o discente por orientacoes */
  isOrientadorVinculado?: boolean
}

/**
 * Determina se o usuário pode criar um novo registro na tabela indicada.
 * - suporte, coordenador, auxiliar: pode criar em tudo.
 * - capes: não pode criar em nada.
 * - docente:
 *   - Não pode criar em docentes, discentes, egressos, bancas, eventos, impacto_social,
 *     linhas_pesquisa, mobilidade_docente, patentes, premiacoes, producao_tecnica, ppg, usuarios.
 *   - Pode criar em orientacoes, disciplinas, projetos_pesquisa, publicacoes, iniciacao_cientifica (onde a RLS permite vinculando ao docente).
 */
export function podeCriarNaTabela(
  role: Role | null | undefined,
  tabela: TabelaMapeada,
  docenteId?: number | null,
): boolean {
  if (!role || role === 'capes') return false
  if (role === 'suporte' || role === 'coordenador' || role === 'auxiliar') return true

  if (role === 'docente') {
    if (!docenteId) return false
    const tabelasCriacaoDocente: string[] = [
      'orientacoes',
      'disciplinas',
      'projetos_pesquisa',
      'publicacoes',
      'iniciacao_cientifica',
    ]
    return tabelasCriacaoDocente.includes(tabela)
  }

  return false
}

/**
 * Determina se o usuário pode editar um registro específico na tabela indicada.
 * - suporte, coordenador, auxiliar: pode editar qualquer registro.
 * - capes: não pode editar nenhum registro.
 * - docente: pode editar APENAS registros vinculados a ele conforme mapeado e suportado pela RLS.
 */
export function podeEditarRegistro(
  role: Role | null | undefined,
  docenteId: number | null | undefined,
  tabela: TabelaMapeada,
  registro?: any,
  contexto?: ContextoPermissaoRegistro,
): boolean {
  if (!role || role === 'capes') return false
  if (role === 'suporte' || role === 'coordenador' || role === 'auxiliar') return true

  if (role === 'docente') {
    if (!docenteId || !registro) return false

    const docIdNum = Number(docenteId)

    switch (tabela) {
      case 'docentes':
        // Apenas o próprio registro
        return Number(registro.id) === docIdNum

      case 'discentes':
        // Discentes onde é o docente_orientador_id ou tem vínculo confirmado
        return (
          Number(registro.docente_orientador_id) === docIdNum ||
          Boolean(contexto?.isOrientadorVinculado)
        )

      case 'egressos':
        // Egressos onde é o docente_orientador_id
        return Number(registro.docente_orientador_id) === docIdNum

      case 'orientacoes':
        // Orientações onde docente_id é ele
        return Number(registro.docente_id) === docIdNum

      case 'disciplinas':
        // Disciplinas onde docente_id é ele
        return Number(registro.docente_id) === docIdNum

      case 'iniciacao_cientifica':
        // IC/IT onde docente_orientador_id é ele
        return Number(registro.docente_orientador_id) === docIdNum

      case 'projetos_pesquisa':
        // Coordenador do projeto ou participante (projetos_participantes)
        return (
          Number(registro.coordenador_id) === docIdNum || Boolean(contexto?.isParticipanteProjeto)
        )

      case 'publicacoes':
        // Vinculado via publicacoes_docentes
        if (Array.isArray(contexto?.publicacoesDocentesIds)) {
          return contexto.publicacoesDocentesIds.includes(docIdNum)
        }
        return false

      default:
        // Tabelas institucionais sem política RLS de UPDATE para docente (bancas, eventos, etc.)
        return false
    }
  }

  return false
}

/**
 * Determina se o usuário pode excluir um registro específico na tabela indicada.
 * - suporte, coordenador: pode excluir qualquer registro.
 * - auxiliar: não pode excluir (política global do sistema).
 * - capes: não pode excluir.
 * - docente: só pode excluir onde a RLS do banco permite e o registro está vinculado a ele.
 */
export function podeExcluirRegistro(
  role: Role | null | undefined,
  docenteId: number | null | undefined,
  tabela: TabelaMapeada,
  registro?: any,
  contexto?: ContextoPermissaoRegistro,
): boolean {
  if (!role || role === 'capes') return false
  if (role === 'suporte' || role === 'coordenador') return true
  if (role === 'auxiliar') return false

  if (role === 'docente') {
    if (!docenteId || !registro) return false

    const docIdNum = Number(docenteId)

    switch (tabela) {
      case 'docentes':
        // RLS docentes_delete_staff: docente NUNCA pode excluir docente
        return false

      case 'discentes':
        // RLS discentes_delete_staff: docente NUNCA pode excluir discente
        return false

      case 'egressos':
        // RLS egressos_delete_staff: docente NUNCA pode excluir egresso
        return false

      case 'orientacoes':
        // RLS orientacoes_delete: pode se docente_id = docenteId
        return Number(registro.docente_id) === docIdNum

      case 'disciplinas':
        // RLS disciplinas_delete: pode se docente_id = docenteId
        return Number(registro.docente_id) === docIdNum

      case 'iniciacao_cientifica':
        // RLS iniciacao_cientifica_delete: pode se docente_orientador_id = docenteId
        return Number(registro.docente_orientador_id) === docIdNum

      case 'projetos_pesquisa':
        // RLS projetos_pesquisa_delete: apenas se coordenador_id = docenteId
        return Number(registro.coordenador_id) === docIdNum

      case 'publicacoes':
        // RLS publicacoes_delete: se existe vinculo em publicacoes_docentes
        if (Array.isArray(contexto?.publicacoesDocentesIds)) {
          return contexto.publicacoesDocentesIds.includes(docIdNum)
        }
        return false

      default:
        return false
    }
  }

  return false
}
