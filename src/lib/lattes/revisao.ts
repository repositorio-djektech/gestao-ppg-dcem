import type { ResultadoProcessamentoLattes } from './processor'
import type {
  LattesDocente,
  LattesPublicacao,
  LattesOrientacao,
  LattesBanca,
  LattesProjeto,
  LattesPremiacao,
  LattesProducaoTecnica,
  LattesPatente,
  LattesEvento,
  TabelaAlvoId,
} from './types'

export interface ItemAmostraDocente {
  id: string
  nome: string
  id_lattes: string
  orcid: string
  instituicao: string
  email: string
  totalFormacoes: number
}

export interface ItemAmostraPublicacao {
  id: string
  docenteNome: string
  tipo: string
  titulo: string
  ano: number
  autores: string
  veiculo: string
  doi: string
  fator_impacto_jcr?: number | null
}

export interface ItemAmostraOrientacao {
  id: string
  docenteNome: string
  tipo: string
  titulo: string
  orientando: string
  instituicao: string
  ano: number | string
  status: string
  tipo_orientacao: string
}

export interface ItemAmostraBanca {
  id: string
  docenteNome: string
  nivel: string
  titulo: string
  candidato: string
  instituicao: string
  ano: number
}

export interface ItemAmostraProjeto {
  id: string
  docenteNome: string
  nome: string
  ano_inicio: number | string
  ano_fim: number | string
  situacao: string
  responsavel: string
  financiadores: string
}

export interface ItemAmostraPremiacao {
  id: string
  docenteNome: string
  nome: string
  ano: number
  entidade: string
}

export interface ItemAmostraProducaoTecnica {
  id: string
  docenteNome: string
  tipo: string
  titulo: string
  ano: number
  autores: string
  finalidade: string
}

export interface ItemAmostraPatente {
  id: string
  docenteNome: string
  titulo: string
  ano: number | string
  numero_registro: string
  instituicao_deposito: string
  autores: string
  categoria: string
}

export interface ItemAmostraEvento {
  id: string
  docenteNome: string
  tipo: string
  nome_evento: string
  titulo_trabalho: string
  ano: number
  classificacao: string
  cidade: string
}

export type ItemAmostraGenerico =
  | ItemAmostraDocente
  | ItemAmostraPublicacao
  | ItemAmostraOrientacao
  | ItemAmostraBanca
  | ItemAmostraProjeto
  | ItemAmostraPremiacao
  | ItemAmostraProducaoTecnica
  | ItemAmostraPatente
  | ItemAmostraEvento

export interface TabelaRevisaoAgrupada {
  id: TabelaAlvoId
  titulo: string
  descricao: string
  inseridos: number
  atualizados: number
  ignorados: number
  itens: ItemAmostraGenerico[]
}

export function mapearDadosParaRevisao(
  resultado: ResultadoProcessamentoLattes,
): Record<TabelaAlvoId, TabelaRevisaoAgrupada> {
  const tabelas: Record<TabelaAlvoId, TabelaRevisaoAgrupada> = {
    docentes: {
      id: 'docentes',
      titulo: 'Docentes',
      descricao: 'Cadastros de docentes extraídos dos currículos Lattes importados',
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      itens: [],
    },
    publicacoes: {
      id: 'publicacoes',
      titulo: 'Publicações',
      descricao: 'Artigos em periódicos, livros e capítulos no quadriênio',
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      itens: [],
    },
    orientacoes: {
      id: 'orientacoes',
      titulo: 'Orientações',
      descricao: 'Orientações concluídas e em andamento (Mestrado, Doutorado, etc.)',
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      itens: [],
    },
    bancas: {
      id: 'bancas',
      titulo: 'Bancas',
      descricao: 'Participações em bancas de mestrado, doutorado e exames de qualificação',
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      itens: [],
    },
    projetos_pesquisa: {
      id: 'projetos_pesquisa',
      titulo: 'Projetos de Pesquisa',
      descricao: 'Projetos de pesquisa ativos ou vigentes no período avaliado',
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      itens: [],
    },
    premiacoes: {
      id: 'premiacoes',
      titulo: 'Premiações',
      descricao: 'Prêmios e títulos honoríficos recebidos pelos docentes',
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      itens: [],
    },
    producao_tecnica: {
      id: 'producao_tecnica',
      titulo: 'Produção Técnica',
      descricao: 'Trabalhos técnicos, softwares, produtos e processos desenvolvidos',
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      itens: [],
    },
    patentes: {
      id: 'patentes',
      titulo: 'Patentes',
      descricao: 'Patentes depositadas, concedidas ou registradas',
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      itens: [],
    },
    eventos: {
      id: 'eventos',
      titulo: 'Eventos',
      descricao: 'Trabalhos publicados e apresentados em eventos e participações em congressos',
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      itens: [],
    },
  }

  // Itera pelos arquivos de resultado
  const docentesVistos = new Set<string>()

  resultado.resultados.forEach((resArq) => {
    const nomeDocente = resArq.nome_docente || 'Docente'

    // 1. Docente
    if (resArq.docente) {
      const chaveDoc = resArq.id_lattes || resArq.docente.nome_completo
      if (!docentesVistos.has(chaveDoc)) {
        docentesVistos.add(chaveDoc)
        tabelas.docentes.inseridos += 1
        tabelas.docentes.itens.push({
          id: `doc-${resArq.id_lattes || resArq.docente.nome_completo}`,
          nome: resArq.docente.nome_completo,
          id_lattes: resArq.docente.id_lattes || '-',
          orcid: resArq.docente.orcid || '-',
          instituicao: resArq.docente.instituicao || '-',
          email: resArq.docente.email || '-',
          totalFormacoes: resArq.docente.formacao_academica?.length || 0,
        } as ItemAmostraDocente)
      } else {
        tabelas.docentes.ignorados += 1
      }
    }

    // 2. Publicações (Artigos, Livros, Capítulos)
    resArq.publicacoes.forEach((pub, idx) => {
      tabelas.publicacoes.itens.push({
        id: `pub-${resArq.id_lattes}-${idx}`,
        docenteNome: nomeDocente,
        tipo: pub.tipo,
        titulo: pub.titulo,
        ano: pub.ano,
        autores: pub.autores || '-',
        veiculo: pub.veiculo || '-',
        doi: pub.doi || '-',
        fator_impacto_jcr: null,
      } as ItemAmostraPublicacao)
    })
    tabelas.publicacoes.inseridos += resArq.estatisticas.publicacoes.a_inserir
    tabelas.publicacoes.ignorados += resArq.estatisticas.publicacoes.ignorados

    // 3. Orientações
    resArq.orientacoes.forEach((ori, idx) => {
      tabelas.orientacoes.itens.push({
        id: `ori-${resArq.id_lattes}-${idx}`,
        docenteNome: nomeDocente,
        tipo: ori.tipo,
        titulo: ori.titulo_trabalho || '(Sem título informado)',
        orientando: ori.orientando,
        instituicao: ori.instituicao || '-',
        ano: ori.ano_conclusao || ori.ano_inicio || '-',
        status: ori.situacao === 'CONCLUIDA' ? 'Concluída' : 'Em andamento',
        tipo_orientacao:
          ori.tipo_orientacao === 'CO_ORIENTADOR' ? 'Co-orientador' : 'Orientador principal',
      } as ItemAmostraOrientacao)
    })
    tabelas.orientacoes.inseridos += resArq.estatisticas.orientacoes.a_inserir
    tabelas.orientacoes.ignorados += resArq.estatisticas.orientacoes.ignorados

    // 4. Bancas
    resArq.bancas.forEach((banca, idx) => {
      tabelas.bancas.itens.push({
        id: `banca-${resArq.id_lattes}-${idx}`,
        docenteNome: nomeDocente,
        nivel: banca.tipo,
        titulo: banca.titulo_trabalho,
        candidato: banca.candidato || '-',
        instituicao: banca.instituicao || '-',
        ano: banca.ano,
      } as ItemAmostraBanca)
    })
    tabelas.bancas.inseridos += resArq.estatisticas.bancas.a_inserir
    tabelas.bancas.ignorados += resArq.estatisticas.bancas.ignorados

    // 5. Projetos de Pesquisa
    resArq.projetos.forEach((proj, idx) => {
      tabelas.projetos_pesquisa.itens.push({
        id: `proj-${resArq.id_lattes}-${idx}`,
        docenteNome: nomeDocente,
        nome: proj.nome,
        ano_inicio: proj.ano_inicio || '-',
        ano_fim: proj.ano_fim || (proj.situacao === 'EM_ANDAMENTO' ? 'Atual' : '-'),
        situacao: proj.situacao || '-',
        responsavel: proj.responsavel ? 'Sim (Coord.)' : 'Integrante',
        financiadores:
          proj.financiadores && proj.financiadores.length > 0 ? proj.financiadores.join(', ') : '-',
      } as ItemAmostraProjeto)
    })
    tabelas.projetos_pesquisa.inseridos += resArq.estatisticas.projetos.a_inserir
    tabelas.projetos_pesquisa.ignorados += resArq.estatisticas.projetos.ignorados

    // 6. Premiações
    resArq.premiacoes.forEach((prem, idx) => {
      tabelas.premiacoes.itens.push({
        id: `prem-${resArq.id_lattes}-${idx}`,
        docenteNome: nomeDocente,
        nome: prem.nome,
        ano: prem.ano,
        entidade: prem.entidade || '-',
      } as ItemAmostraPremiacao)
    })
    tabelas.premiacoes.inseridos += resArq.estatisticas.premiacoes.a_inserir
    tabelas.premiacoes.ignorados += resArq.estatisticas.premiacoes.ignorados

    // 7. Produção Técnica
    resArq.producoes_tecnicas.forEach((pt, idx) => {
      tabelas.producao_tecnica.itens.push({
        id: `pt-${resArq.id_lattes}-${idx}`,
        docenteNome: nomeDocente,
        tipo: pt.tipo,
        titulo: pt.titulo,
        ano: pt.ano,
        autores: pt.autores || '-',
        finalidade: pt.finalidade || pt.instituicao_promotora || '-',
      } as ItemAmostraProducaoTecnica)
    })
    tabelas.producao_tecnica.inseridos += resArq.estatisticas.producoes_tecnicas.a_inserir
    tabelas.producao_tecnica.ignorados += resArq.estatisticas.producoes_tecnicas.ignorados

    // 8. Patentes
    resArq.patentes.forEach((pat, idx) => {
      tabelas.patentes.itens.push({
        id: `pat-${resArq.id_lattes}-${idx}`,
        docenteNome: nomeDocente,
        titulo: pat.titulo,
        ano: pat.ano_concessao || pat.ano_deposito || pat.ano_desenvolvimento || '-',
        numero_registro: pat.numero_registro || '-',
        instituicao_deposito: pat.instituicao_deposito || '-',
        autores: pat.autores || '-',
        categoria: pat.categoria || '-',
      } as ItemAmostraPatente)
    })
    tabelas.patentes.inseridos += resArq.estatisticas.patentes.a_inserir
    tabelas.patentes.ignorados += resArq.estatisticas.patentes.ignorados

    // 9. Eventos
    resArq.eventos.forEach((eve, idx) => {
      tabelas.eventos.itens.push({
        id: `eve-${resArq.id_lattes}-${idx}`,
        docenteNome: nomeDocente,
        tipo: eve.tipo === 'TRABALHO' ? 'Trabalho em Evento' : 'Participação em Evento',
        nome_evento: eve.nome,
        titulo_trabalho: eve.titulo_trabalho || '-',
        ano: eve.ano,
        classificacao: eve.classificacao || eve.natureza || '-',
        cidade: [eve.cidade, eve.pais].filter(Boolean).join(' - ') || '-',
      } as ItemAmostraEvento)
    })
    tabelas.eventos.inseridos += resArq.estatisticas.eventos.a_inserir
    tabelas.eventos.ignorados += resArq.estatisticas.eventos.ignorados
  })

  return tabelas
}
