import { dividirAutoresTexto } from '@/lib/reconducao/matching-coautoria'
import { casarAutoresComDocente } from '@/lib/publicacoes/matching-docentes'
import type { DadosConsolidacaoLacunas } from './regras'

/**
 * Lacunas: restringe os dados ao docente logado antes de consolidar o relatório, para que TODOS os
 * cards mostrem só os números dele (D-25). Docente sem cadastro vinculado, ou inexistente, recebe
 * tudo vazio. Restrição de interface; a RLS continua aberta (P-20).
 *
 * - Tabelas estruturadas: pelos vínculos (orientações, publicacoes_docentes, projetos).
 * - Discentes: orientador ou coorientador (orientação dele com o discente). Os sem orientador não
 *   entram: são números de ninguém.
 * - Tabelas com nome em texto (eventos, mobilidade, patentes, premiações, produção técnica): pelo
 *   casamento ESTRITO de nome (H-06), que não aceita sobrenome + inicial.
 */
export function filtrarDadosLacunasParaDocente(
  dados: DadosConsolidacaoLacunas,
  docenteId: number | null | undefined,
): DadosConsolidacaoLacunas {
  const eu = docenteId ? Number(docenteId) : null
  const meuCadastro = eu ? (dados.docentes ?? []).find((d) => Number(d.id) === eu) : undefined
  if (!eu || !meuCadastro) {
    return {
      docentes: [],
      discentes: [],
      publicacoes: [],
      orientacoes: [],
      projetos_pesquisa: [],
      eventos: [],
      mobilidade_docente: [],
      patentes: [],
      premiacoes: [],
      producao_tecnica: [],
      docentes_linhas: [],
      projetos_participantes: [],
      projetos_discentes: [],
      publicacoes_docentes: [],
      dataGeracao: dados.dataGeracao,
    }
  }

  const citaMeuNome = (texto: string | null | undefined): boolean =>
    dividirAutoresTexto(texto).some(
      (trecho) =>
        casarAutoresComDocente(trecho, { id: meuCadastro.id, nome: meuCadastro.nome }).match,
    )

  const orientacoes = (dados.orientacoes ?? []).filter((o) => Number(o.docente_id) === eu)
  const idsDiscentesComOrientacao = new Set(orientacoes.map((o) => Number(o.discente_id)))
  const discentes = (dados.discentes ?? []).filter(
    (d) => Number(d.docente_orientador_id) === eu || idsDiscentesComOrientacao.has(Number(d.id)),
  )

  const idsPublicacoes = new Set(
    (dados.publicacoes_docentes ?? [])
      .filter((pd) => Number(pd.docente_id) === eu)
      .map((pd) => Number(pd.publicacao_id)),
  )
  const publicacoes = (dados.publicacoes ?? []).filter((p) => idsPublicacoes.has(Number(p.id)))

  const idsProjetosParticipo = new Set(
    (dados.projetos_participantes ?? [])
      .filter((pp) => Number(pp.docente_id) === eu)
      .map((pp) => Number(pp.projeto_id)),
  )
  const projetos = (dados.projetos_pesquisa ?? []).filter(
    (p) => Number(p.coordenador_id) === eu || idsProjetosParticipo.has(Number(p.id)),
  )
  const idsDiscentesVisiveis = new Set(discentes.map((d) => Number(d.id)))

  return {
    docentes: [meuCadastro],
    discentes,
    publicacoes,
    orientacoes,
    projetos_pesquisa: projetos,
    eventos: (dados.eventos ?? []).filter((e) => citaMeuNome(e.docente)),
    mobilidade_docente: (dados.mobilidade_docente ?? []).filter(
      (m) => m.tipo === 'docente' && citaMeuNome(m.nome),
    ),
    patentes: (dados.patentes ?? []).filter((p) => citaMeuNome(p.autores)),
    premiacoes: (dados.premiacoes ?? []).filter((p) => citaMeuNome(p.nome_premiado)),
    producao_tecnica: (dados.producao_tecnica ?? []).filter((p) => citaMeuNome(p.autores)),
    docentes_linhas: (dados.docentes_linhas ?? []).filter((dl) => Number(dl.docente_id) === eu),
    projetos_participantes: (dados.projetos_participantes ?? []).filter(
      (pp) => Number(pp.docente_id) === eu,
    ),
    projetos_discentes: (dados.projetos_discentes ?? []).filter((pd) =>
      idsDiscentesVisiveis.has(Number(pd.discente_id)),
    ),
    // Mantém todos os vínculos das publicações visíveis: a regra "JCR sem docente vinculado" conta
    // os docentes de cada publicação, inclusive coautores.
    publicacoes_docentes: (dados.publicacoes_docentes ?? []).filter((pd) =>
      idsPublicacoes.has(Number(pd.publicacao_id)),
    ),
    dataGeracao: dados.dataGeracao,
  }
}
