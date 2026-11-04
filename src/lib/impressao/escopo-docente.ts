import { discentesVisiveisAoDocente } from '@/lib/discentes/visibilidade'
import { filtrarOrientacoesDoDocente } from '@/lib/orientacoes/exibicao'
import { projetosVisiveisAoDocente } from '@/lib/projetos/visibilidade'
import { publicacoesVisiveisAoDocente } from '@/lib/publicacoes/visibilidade'
import { registrosVisiveisAoDocente } from '@/lib/registros/visibilidade'

/** Fontes de vínculo, buscadas só quando o módulo precisa. */
export interface FontesVinculoImpressao {
  orientacoes: () => Promise<Array<{ docente_id?: number | null; discente_id?: number | null }>>
  participacoesProjetos: () => Promise<Array<{ projeto_id: number; docente_id: number }>>
  vinculosPublicacoes: () => Promise<Array<{ publicacao_id: number; docente_id: number }>>
  vinculosPatentes: () => Promise<Array<{ patente_id: number; docente_id: number }>>
  vinculosProducao: () => Promise<Array<{ producao_tecnica_id: number; docente_id: number }>>
}

/**
 * A impressão (`/imprimir/<módulo>`) lê os serviços direto, então precisa aplicar a mesma visão
 * restrita das telas, senão o docente imprime a lista inteira (D-25, D-27). Módulos sem restrição
 * voltam inalterados (mesma referência). Restrição de interface (P-20).
 */
export async function restringirItensDeImpressaoParaDocente<T extends { id: number }>(
  modulo: string,
  itens: T[],
  docenteId: number | null | undefined,
  fontes: FontesVinculoImpressao,
): Promise<T[]> {
  switch (modulo) {
    case 'discentes': {
      if (!docenteId) return []
      const minhas = (await fontes.orientacoes()).filter(
        (o) => Number(o.docente_id) === Number(docenteId),
      )
      const idsCoorientados = minhas
        .map((o) => o.discente_id)
        .filter((id): id is number => id != null)
      return discentesVisiveisAoDocente(itens as any[], docenteId, idsCoorientados) as T[]
    }
    case 'orientacoes':
      return filtrarOrientacoesDoDocente(itens as any[], docenteId) as T[]
    case 'projetos-pesquisa':
      if (!docenteId) return []
      return projetosVisiveisAoDocente(
        itens as any[],
        docenteId,
        await fontes.participacoesProjetos(),
      ) as T[]
    case 'publicacoes':
      if (!docenteId) return []
      return publicacoesVisiveisAoDocente(itens, docenteId, await fontes.vinculosPublicacoes())
    case 'patentes':
      if (!docenteId) return []
      return registrosVisiveisAoDocente(
        itens,
        docenteId,
        await fontes.vinculosPatentes(),
        'patente_id',
      )
    case 'producao-tecnica':
      if (!docenteId) return []
      return registrosVisiveisAoDocente(
        itens,
        docenteId,
        await fontes.vinculosProducao(),
        'producao_tecnica_id',
      )
    default:
      return itens
  }
}
