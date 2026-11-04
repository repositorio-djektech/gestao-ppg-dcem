import type { Role } from '@/types/database'

export type TabelaMapeada =
  | 'docentes'
  | 'discentes'
  | 'egressos'
  | 'disciplinas'
  | 'projetos_pesquisa'
  | 'publicacoes'
  | 'iniciacao_cientifica'
  | 'eventos'
  | 'impacto_social'
  | 'linhas_pesquisa'
  | 'mobilidade_docente'
  | 'patentes'
  | 'premiacoes'
  | 'producao_tecnica'
  | 'ppg'
  | 'usuarios'
  | 'qualis'
  | string

export interface ContextoPermissaoRegistro {
  /** Lista de docente_ids vinculados à publicação via publicacoes_docentes */
  publicacoesDocentesIds?: number[]
  /** Docentes vinculados ao registro (patentes e produção técnica, via tabela de vínculo) */
  docentesVinculadosIds?: number[]
  /** Se o docente logado orienta o discente por orientacoes */
  isOrientadorVinculado?: boolean
}

/**
 * Determina se o usuário pode criar um novo registro na tabela indicada.
 * - suporte, coordenador, auxiliar: pode criar em tudo.
 * - capes: não pode criar em nada.
 * - docente:
 *   - Não pode criar em docentes, eventos, impacto_social, linhas_pesquisa, mobilidade_docente,
 *     premiacoes, ppg, usuarios, qualis.
 *   - Pode criar em discentes, egressos, orientacoes, disciplinas, projetos_pesquisa, publicacoes,
 *     iniciacao_cientifica, patentes e producao_tecnica (a RLS exige vincular ao próprio docente;
 *     em patentes e produção técnica o vínculo é gravado logo depois, D-27).
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
      'discentes',
      'egressos',
      'orientacoes',
      'disciplinas',
      'projetos_pesquisa',
      'publicacoes',
      'iniciacao_cientifica',
      'patentes',
      'producao_tecnica',
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
        // D-27: só o coordenador do projeto edita; participante apenas visualiza
        return Number(registro.coordenador_id) === docIdNum

      case 'publicacoes':
        // Vinculado via publicacoes_docentes
        if (Array.isArray(contexto?.publicacoesDocentesIds)) {
          return contexto.publicacoesDocentesIds.includes(docIdNum)
        }
        return false

      case 'patentes':
      case 'producao_tecnica':
        // D-27: só quando está vinculado ao registro (tabelas patentes_docentes / producao_tecnica_docentes)
        return Boolean(contexto?.docentesVinculadosIds?.some((id) => Number(id) === docIdNum))

      default:
        // Tabelas institucionais sem política RLS de UPDATE para docente (eventos, premiações, etc.)
        return false
    }
  }

  return false
}

// -----------------------------------------------------------------------------
// Vínculo docente–discente (D-11, H-01, H-02, H-03)
// -----------------------------------------------------------------------------

/** Parte do discente que importa para as regras de vínculo. */
export type DiscenteParaVinculo = { id?: number; docente_orientador_id?: number | null }

/** Discente sem orientador principal: null, undefined, 0 ou negativo (mesmo critério da regra de Lacunas). */
export function discenteSemOrientador(discente: DiscenteParaVinculo | null | undefined): boolean {
  const id = Number(discente?.docente_orientador_id)
  return !Number.isFinite(id) || id <= 0
}

/**
 * H-01: o docente pode se definir orientador de um discente que ainda não tem orientador.
 * Depois disso ele é o orientador e `podeEditarRegistro` libera a edição.
 * Só vale para o papel docente: a coordenação define o orientador pela própria edição.
 */
export function podeAssumirOrientacao(
  role: Role | null | undefined,
  docenteId: number | null | undefined,
  discente: DiscenteParaVinculo | null | undefined,
): boolean {
  if (role !== 'docente' || !docenteId || !discente) return false
  return discenteSemOrientador(discente)
}

/**
 * H-03 / D-11: só a coordenação altera o orientador principal.
 * Mantém o conjunto que já edita discentes na RLS (`is_admin_staff`: suporte, coordenador, auxiliar).
 * Ver pergunta pendente sobre o auxiliar em docs/po/00-decisoes-e-pendencias.md.
 */
export function podeAlterarOrientadorPrincipal(role: Role | null | undefined): boolean {
  return role === 'suporte' || role === 'coordenador' || role === 'auxiliar'
}

/**
 * D-25: CPF e SIAPE de docente. O papel docente só vê os do próprio registro; suporte, coordenador,
 * auxiliar e capes seguem vendo todos. Sem papel carregado, não mostra. É restrição de interface:
 * a RLS ainda deixa qualquer autenticado ler a tabela (P-20).
 */
export function podeVerDadosPessoaisDocente(
  role: Role | null | undefined,
  docenteIdLogado: number | null | undefined,
  docente: { id: number } | null | undefined,
): boolean {
  if (!role) return false
  if (role !== 'docente') return true
  return Boolean(docenteIdLogado) && Number(docente?.id) === Number(docenteIdLogado)
}

/**
 * H-10 / D-12: o texto do item 1.3 (políticas afirmativas) é editável pela coordenação.
 * Leitura é de todos os usuários autenticados. O auxiliar fica de fora por ser recurso novo e a
 * D-04 tratar "coordenação" e "auxiliares" como grupos distintos; ampliar é uma linha aqui e na RLS.
 */
export function podeEditarTextoItem13(role: Role | null | undefined): boolean {
  return role === 'suporte' || role === 'coordenador'
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

      case 'patentes':
      case 'producao_tecnica':
        // D-27: só quando está vinculado ao registro
        return Boolean(contexto?.docentesVinculadosIds?.some((id) => Number(id) === docIdNum))

      default:
        return false
    }
  }

  return false
}
