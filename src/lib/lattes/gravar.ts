import { supabase } from '@/lib/supabase/client'
import { normalizarTitulo } from './dedupe'
import { anoDeMesAno, normalizarMesAno } from '@/lib/datas/mes-ano'
import { prepararDiscenteParaGravar } from '@/lib/discentes/status'
import { normalizarNomePessoa, normalizarTituloAcademico } from '@/lib/normalizacao'

/** O Lattes só traz o ano: vira fevereiro daquele ano (`AAAA-02`, D-29). Texto sem formato fica como está. */
function mesAnoDoLattes(valor: unknown): string {
  return normalizarMesAno(valor) ?? String(valor ?? '')
}

/** Chave de dedupe pelo ANO: o mês pode variar entre o que está no banco e o que o Lattes traz. */
function anoParaChave(valor: unknown): string {
  return String(anoDeMesAno(valor) ?? valor ?? '')
}
import type {
  LattesDocente,
  LattesPublicacao,
  LattesOrientacao,
  LattesProjeto,
  LattesPremiacao,
  LattesProducaoTecnica,
  LattesPatente,
  LattesEvento,
  TabelaAlvoId,
} from './types'

export interface RelatorioContagemTabela {
  inseridos: number
  atualizados: number
  ignorados: number
}

export interface RelatorioGravacaoLattes {
  docentes: RelatorioContagemTabela
  publicacoes: RelatorioContagemTabela
  orientacoes: RelatorioContagemTabela
  projetos_pesquisa: RelatorioContagemTabela
  premiacoes: RelatorioContagemTabela
  producao_tecnica: RelatorioContagemTabela
  patentes: RelatorioContagemTabela
  eventos: RelatorioContagemTabela
  disciplinas?: RelatorioContagemTabela
  /** Egressos criados a partir de orientações concluídas de mestrado e doutorado (D-31). */
  egressos?: RelatorioContagemTabela
  vinculos?: {
    publicacoes_docentes: number
    publicacoes_coautores: number
    orientadores_discentes: number
    disciplinas_docentes?: number
    /** Linhas gravadas em projetos_participantes (D-33). */
    projetos_participantes?: number
  }
  erros: Array<{
    tabela:
      | TabelaAlvoId
      | 'discentes'
      | 'egressos'
      | 'projetos_participantes'
      | 'publicacoes_docentes'
      | 'publicacoes_coautores_programa'
      | 'disciplinas'
      | 'disciplinas_docentes'
    item: string
    mensagem: string
  }>
}

export interface DocenteParaGravar {
  id_lattes?: string | null
  nome: string
  scopus_id?: string | null
  indice_h?: number | null
  bolsa_cnpq?: string | null
  jdp?: boolean | null
  licenca?: string | null
  categoria?: 'permanente' | 'colaborador' | 'visitante' | 'jdp' | null
}

export interface PublicacaoParaGravar {
  titulo: string
  autores: string
  periodico: string
  ano: number
  doi?: string | null
  link_comprovacao?: string | null
  observacoes?: string | null
  fator_impacto_jcr?: number | null
  estrato_qualis?: string | null
  tipo_producao?: string | null
  indicacao_nivel?: number | null
  justificativa_indicacao?: string | null
  docentes_autores_ids?: number[]
  coautores_programa?: Array<{
    tipo: 'orientando' | 'egresso'
    discente_id?: number | null
    egresso_id?: number | null
    nome: string
    grau_confianca?: number
  }>
}

export interface OrientacaoParaGravar {
  docente_id?: number | null
  docente_identificador?: string | null // id_lattes ou nome para resolução
  /** Nome do dono do currículo: segunda chance de resolver o docente quando o ID Lattes não está no banco. */
  docente_nome?: string | null
  discente_id?: number | null
  discente_nome: string
  tipo: string
  inicio: string
  fim?: string | null
  status: 'ativo' | 'concluido' | 'cancelado' | 'em_andamento'
  link_comprovacao?: string | null
  observacoes?: string | null
  titulo_trabalho?: string | null
  ano_referencia?: number | null
  data_defesa?: string | null
  flag_orientador_principal?: boolean
}

export interface ProjetoPesquisaParaGravar {
  titulo: string
  descricao?: string | null
  inicio: string
  fim?: string | null
  coordenador_id?: number | null
  coordenador_identificador?: string | null // id_cnpq ou nome do coordenador
  financiamento: boolean
  orgao_fomento?: string | null
  link_comprovacao?: string | null
  observacoes?: string | null
  /** Equipe do projeto no Lattes, para registrar os docentes cadastrados como participantes (D-33). */
  equipe?: Array<{ id_cnpq?: string | null; nome: string; responsavel?: boolean }>
  /** Dono do currículo: sempre vira participante (ou coordenador, se for o responsável). */
  importador_identificador?: string | null
  importador_nome?: string | null
  importador_responsavel?: boolean
}

/** Contexto de quem está importando; limita o que a RLS deixaria gravar (docente só grava o próprio). */
export interface OpcoesGravacao {
  papelUsuario?: string | null
  docenteIdUsuario?: number | null
}

export interface PremiacaoParaGravar {
  titulo: string
  ano?: number | null
  nome_premiado: string
  instituicao: string
  link_comprovacao?: string | null
  observacoes?: string | null
}

export interface ProducaoTecnicaParaGravar {
  titulo: string
  ano?: number | null
  autores: string
  tipo: 'Software' | 'Patente' | 'Relatório'
  link_comprovacao?: string | null
  observacoes?: string | null
}

export interface PatenteParaGravar {
  titulo: string
  status: 'Concessão' | 'Licenciamento' | 'Pendente'
  autores: string
  inpi: string
  ano_referencia?: number | null
  link_comprovacao?: string | null
  observacoes?: string | null
}

export interface EventoParaGravar {
  docente: string
  evento: string
  local_data: string
  papel: string
  ano_referencia?: number | null
  link_comprovacao?: string | null
  observacoes?: string | null
}

export interface DisciplinaParaGravar {
  nome: string
  codigo?: string | null
  carga_horaria?: number | null
  nivel?: string | null
  ano?: number | null
  docente_id?: number | null
  docente_nome?: string | null
}

interface DocenteExistenteBanco {
  id: number
  nome: string
  id_lattes: string | null
  categoria?: 'permanente' | 'colaborador' | 'visitante' | 'jdp' | null
}

interface PublicacaoExistenteBanco {
  id: number
  titulo: string
  ano: number
  fator_impacto_jcr?: number | null
  estrato_qualis?: string | null
  tipo_producao?: string | null
  indicacao_nivel?: number | null
  justificativa_indicacao?: string | null
}

// Tipo flexível para permitir injeção de dependência / mock do Supabase nos testes unitários
export type SupabaseClientLike = typeof supabase

/**
 * Converte um LattesDocente extraído pelo parser Lattes para o formato de persistência.
 */
export function converterLattesDocente(d: LattesDocente): DocenteParaGravar {
  return {
    id_lattes: d.id_lattes && d.id_lattes.trim() !== '' ? d.id_lattes.trim() : null,
    nome: d.nome_completo ? normalizarNomePessoa(d.nome_completo) : '',
  }
}

/**
 * Converte um LattesPublicacao extraído pelo parser Lattes para o formato da tabela publicacoes.
 * Mapeia: titulo, autores (lista de nomes separados por vírgula), periodico, ano, doi.
 * Campos sem origem no XML (link_comprovacao, observacoes) ficam como string vazia / nulo.
 */
export function converterLattesPublicacao(p: LattesPublicacao): PublicacaoParaGravar {
  return {
    titulo: p.titulo ? normalizarTituloAcademico(p.titulo) : '',
    autores: p.autores ? p.autores.trim() : '',
    periodico: p.veiculo ? p.veiculo.trim() : '',
    ano: typeof p.ano === 'number' ? p.ano : parseInt(String(p.ano), 10) || 0,
    doi: p.doi ? p.doi.trim() : '',
    link_comprovacao: '',
    observacoes: '',
  }
}

/**
 * Converte LattesOrientacao para o formato da tabela orientacoes.
 */
export function converterLattesOrientacao(
  o: LattesOrientacao,
  docenteContexto?: { id_lattes?: string | null; nome?: string | null },
): OrientacaoParaGravar {
  let tipoDb = 'Mestrado'
  if (o.tipo === 'MESTRADO') tipoDb = 'Mestrado'
  else if (o.tipo === 'DOUTORADO') tipoDb = 'Doutorado'
  else if (o.tipo === 'POS-DOUTORADO') tipoDb = 'Pós-Doutorado'
  else if (o.tipo === 'INICIACAO_CIENTIFICA') tipoDb = 'Iniciação Científica'
  else if (o.tipo === 'GRADUACAO') tipoDb = 'TCC / Graduação'
  else tipoDb = o.tipo || 'Mestrado'

  const statusDb: 'ativo' | 'concluido' | 'cancelado' | 'em_andamento' =
    o.status || (o.situacao === 'CONCLUIDA' ? 'concluido' : 'em_andamento')

  const flagOrientadorPrincipal =
    typeof o.flag_orientador_principal === 'boolean'
      ? o.flag_orientador_principal
      : o.tipo_orientacao !== 'CO_ORIENTADOR'

  const anoRef = o.ano_conclusao || o.ano_inicio || null
  const inicioStr = o.ano_inicio
    ? mesAnoDoLattes(o.ano_inicio)
    : anoRef
      ? mesAnoDoLattes(anoRef)
      : ''
  const fimStr = o.ano_conclusao ? mesAnoDoLattes(o.ano_conclusao) : ''

  const obsPartes: string[] = []
  if (o.titulo_trabalho) obsPartes.push(`Título: ${o.titulo_trabalho.trim()}`)
  if (!flagOrientadorPrincipal || o.tipo_orientacao === 'CO_ORIENTADOR') {
    obsPartes.push('Co-orientador')
  }
  if (o.instituicao) obsPartes.push(`Instituição: ${o.instituicao}`)
  if (o.curso) obsPartes.push(`Curso: ${o.curso}`)
  if (o.agencia_fomento) obsPartes.push(`Fomento: ${o.agencia_fomento}`)

  return {
    docente_identificador: docenteContexto?.id_lattes || docenteContexto?.nome || null,
    docente_nome: docenteContexto?.nome || null,
    discente_nome: o.orientando ? o.orientando.trim() : '',
    tipo: tipoDb,
    inicio: inicioStr,
    fim: fimStr,
    status: statusDb,
    link_comprovacao: '',
    observacoes: obsPartes.join(' | '),
    titulo_trabalho: o.titulo_trabalho ? o.titulo_trabalho.trim() : null,
    ano_referencia: anoRef,
    data_defesa: o.data_defesa ?? null,
    flag_orientador_principal: flagOrientadorPrincipal,
  }
}

/**
 * Converte LattesProjeto para o formato da tabela projetos_pesquisa.
 */
export function converterLattesProjeto(
  p: LattesProjeto,
  docenteContexto?: { id_lattes?: string | null; nome?: string | null },
): ProjetoPesquisaParaGravar {
  const coordenador = p.equipe?.find((e) => e.responsavel)
  // Coordenador só quando o Lattes aponta um responsável (ou o dono do CV é o responsável). Antes,
  // sem responsável na equipe, o docente que importava virava coordenador de projeto alheio (D-33).
  const coordenadorIdentificador =
    coordenador?.id_cnpq ||
    coordenador?.nome ||
    (p.responsavel ? docenteContexto?.id_lattes || docenteContexto?.nome || null : null)

  const orgaoFomento =
    p.financiadores && p.financiadores.length > 0 ? p.financiadores.join(', ') : ''
  const financiamento = Boolean(p.financiadores && p.financiadores.length > 0)

  const inicioStr = p.ano_inicio ? mesAnoDoLattes(p.ano_inicio) : ''
  const fimStr = p.ano_fim
    ? mesAnoDoLattes(p.ano_fim)
    : p.situacao === 'EM_ANDAMENTO'
      ? 'Atual'
      : ''

  const obsPartes: string[] = []
  if (p.situacao) obsPartes.push(`Situação: ${p.situacao}`)
  if (p.natureza) obsPartes.push(`Natureza: ${p.natureza}`)
  if (p.equipe && p.equipe.length > 0) {
    obsPartes.push(`Equipe: ${p.equipe.map((e) => e.nome).join(', ')}`)
  }

  return {
    titulo: p.nome ? p.nome.trim() : '',
    descricao: p.descricao ? p.descricao.trim() : '',
    inicio: inicioStr,
    fim: fimStr,
    coordenador_identificador: coordenadorIdentificador,
    financiamento,
    orgao_fomento: orgaoFomento,
    link_comprovacao: '',
    observacoes: obsPartes.join(' | '),
    equipe: (p.equipe || []).map((e) => ({
      id_cnpq: e.id_cnpq || null,
      nome: e.nome,
      responsavel: Boolean(e.responsavel),
    })),
    importador_identificador: docenteContexto?.id_lattes || docenteContexto?.nome || null,
    importador_nome: docenteContexto?.nome || null,
    importador_responsavel: Boolean(p.responsavel),
  }
}

/**
 * Converte LattesPremiacao para o formato da tabela premiacoes.
 */
export function converterLattesPremiacao(
  pr: LattesPremiacao,
  docenteContexto?: { nome?: string | null },
): PremiacaoParaGravar {
  const anoNum = typeof pr.ano === 'number' ? pr.ano : parseInt(String(pr.ano), 10) || null
  return {
    titulo: pr.nome ? normalizarTituloAcademico(pr.nome) : '',
    ano: anoNum,
    nome_premiado: docenteContexto?.nome ? normalizarNomePessoa(docenteContexto.nome) : '',
    instituicao: pr.entidade ? pr.entidade.trim() : '',
    link_comprovacao: '',
    observacoes: '',
  }
}

/**
 * Converte LattesProducaoTecnica para o formato da tabela producao_tecnica.
 * Mapeia tipo para 'Software' | 'Patente' | 'Relatório'.
 */
export function converterLattesProducaoTecnica(
  pt: LattesProducaoTecnica,
): ProducaoTecnicaParaGravar {
  let tipoDb: 'Software' | 'Patente' | 'Relatório' = 'Software'
  const tipoUpper = (pt.tipo || '').toUpperCase()
  if (tipoUpper.includes('SOFTWARE')) {
    tipoDb = 'Software'
  } else if (tipoUpper.includes('PATENTE') || tipoUpper.includes('PROPRIEDADE')) {
    tipoDb = 'Patente'
  } else {
    // TRABALHO_TECNICO, PRODUTO-TECNOLOGICO, PROCESSOS-OU-TECNICAS -> Relatório
    tipoDb = 'Relatório'
  }

  const anoNum = typeof pt.ano === 'number' ? pt.ano : parseInt(String(pt.ano), 10) || null
  const obsPartes: string[] = []
  if (pt.tipo && pt.tipo !== tipoDb) obsPartes.push(`Tipo original: ${pt.tipo}`)
  if (pt.finalidade) obsPartes.push(`Finalidade: ${pt.finalidade}`)
  if (pt.instituicao_promotora) obsPartes.push(`Promotora: ${pt.instituicao_promotora}`)

  return {
    titulo: pt.titulo ? pt.titulo.trim() : '',
    ano: anoNum,
    autores: pt.autores ? pt.autores.trim() : '',
    tipo: tipoDb,
    link_comprovacao: '',
    observacoes: obsPartes.join(' | '),
  }
}

/**
 * Converte LattesPatente para o formato da tabela patentes.
 * Status mapeado para 'Concessão' | 'Licenciamento' | 'Pendente'.
 */
export function converterLattesPatente(pat: LattesPatente): PatenteParaGravar {
  let statusDb: 'Concessão' | 'Licenciamento' | 'Pendente' = 'Pendente'
  if (pat.ano_concessao) {
    statusDb = 'Concessão'
  } else if (pat.categoria && pat.categoria.toUpperCase().includes('LICENC')) {
    statusDb = 'Licenciamento'
  } else {
    statusDb = 'Pendente'
  }

  const anoRef = pat.ano_concessao || pat.ano_deposito || pat.ano_desenvolvimento || null
  const inpi = pat.numero_registro ? pat.numero_registro.trim() : 'Não informado'

  const obsPartes: string[] = []
  if (pat.instituicao_deposito) obsPartes.push(`Depósito: ${pat.instituicao_deposito}`)
  if (pat.categoria) obsPartes.push(`Categoria: ${pat.categoria}`)
  if (pat.ano_deposito) obsPartes.push(`Ano Depósito: ${pat.ano_deposito}`)
  if (pat.ano_concessao) obsPartes.push(`Ano Concessão: ${pat.ano_concessao}`)

  return {
    titulo: pat.titulo ? pat.titulo.trim() : '',
    status: statusDb,
    autores: pat.autores ? pat.autores.trim() : '',
    inpi,
    ano_referencia: anoRef,
    link_comprovacao: '',
    observacoes: obsPartes.join(' | '),
  }
}

/**
 * Converte LattesEvento para o formato da tabela eventos.
 */
export function converterLattesEvento(
  e: LattesEvento,
  docenteContexto?: { nome?: string | null },
): EventoParaGravar {
  const anoNum = typeof e.ano === 'number' ? e.ano : parseInt(String(e.ano), 10) || null
  const docenteNome = docenteContexto?.nome ? normalizarNomePessoa(docenteContexto.nome) : ''

  let papelDb = 'Participante'
  if (e.tipo === 'TRABALHO') {
    papelDb = 'Apresentador de Trabalho'
  } else {
    const natUpper = (e.natureza || '').toUpperCase()
    if (natUpper.includes('ORGANIZ')) papelDb = 'Organizador / Comitê'
    else if (natUpper.includes('PALESTR') || natUpper.includes('CONFERENC'))
      papelDb = 'Palestrante Convidado'
    else papelDb = 'Participante'
  }

  const localPartes: string[] = []
  if (e.cidade) localPartes.push(e.cidade)
  if (anoNum) localPartes.push(String(anoNum))
  const localDataStr = localPartes.join(' - ') || (anoNum ? String(anoNum) : 'Não informado')

  const obsPartes: string[] = []
  if (e.titulo_trabalho) obsPartes.push(`Trabalho: ${e.titulo_trabalho}`)
  if (e.autores) obsPartes.push(`Autores: ${e.autores}`)
  if (e.classificacao) obsPartes.push(`Classificação: ${e.classificacao}`)

  return {
    docente: docenteNome,
    evento: e.nome ? normalizarTituloAcademico(e.nome) : '',
    local_data: localDataStr,
    papel: papelDb,
    ano_referencia: anoNum,
    link_comprovacao: '',
    observacoes: obsPartes.join(' | '),
  }
}

/**
 * Grava docentes no Supabase:
 * - Casar primeiro por `id_lattes` se presente.
 * - Se busca por id_lattes não encontrar (ou id_lattes ausente), tentar casar por nome
 *   (exato e normalizado: minúsculas, sem acentos, trim, colapsar espaços) ANTES do INSERT.
 * - Se encontrar por nome -> UPDATE (preenchendo id_lattes e demais campos extraídos).
 * - Só fazer INSERT se nem id_lattes nem nome casarem.
 * - Retorna contagem { inseridos, atualizados, ignorados }.
 */
export async function gravarDocentes(
  docentes: DocenteParaGravar[],
  client: SupabaseClientLike = (globalThis as any).__SUPABASE_CLIENT__ || supabase,
): Promise<{ contagem: RelatorioContagemTabela; erros: RelatorioGravacaoLattes['erros'] }> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []

  if (!docentes || docentes.length === 0) {
    return { contagem, erros }
  }

  // 1. Carrega todos os docentes existentes no banco para matching em memória
  const { data: existentes, error: buscaErro } = await (client as any)
    .from('docentes')
    .select('id, nome, id_lattes')

  if (buscaErro) {
    erros.push({
      tabela: 'docentes',
      item: 'listagem_inicial',
      mensagem: buscaErro.message || 'Erro ao consultar docentes existentes.',
    })
    contagem.ignorados += docentes.length
    return { contagem, erros }
  }

  const listaExistentes: DocenteExistenteBanco[] = existentes || []

  // Mapas para busca rápida
  const porIdLattes = new Map<string, DocenteExistenteBanco>()
  const porNomeExato = new Map<string, DocenteExistenteBanco>()
  const porNomeNormalizado = new Map<string, DocenteExistenteBanco>()

  for (const d of listaExistentes) {
    if (d.id_lattes && d.id_lattes.trim() !== '') {
      porIdLattes.set(d.id_lattes.trim(), d)
    }
    if (d.nome && d.nome.trim() !== '') {
      porNomeExato.set(d.nome.trim(), d)
      porNomeNormalizado.set(normalizarTitulo(d.nome), d)
    }
  }

  for (const doc of docentes) {
    const nomeLimpo = doc.nome?.trim()
    const idLattesLimpo = doc.id_lattes?.trim() || null

    if (!nomeLimpo) {
      contagem.ignorados++
      continue
    }

    // Procura match:
    // 1. Por id_lattes se informado
    let encontrado: DocenteExistenteBanco | undefined
    if (idLattesLimpo) {
      encontrado = porIdLattes.get(idLattesLimpo)
    }

    // 2. Se não encontrou por id_lattes (ou não tinha id_lattes),
    // tenta casar por nome ANTES do INSERT:
    // primeiro nome exato, depois nome normalizado (minúsculas, sem acentos, trim, colapsar espaços)
    if (!encontrado) {
      encontrado =
        porNomeExato.get(nomeLimpo) || porNomeNormalizado.get(normalizarTitulo(nomeLimpo))
    }

    if (encontrado) {
      // UPDATE
      const payload: Record<string, unknown> = {
        nome: nomeLimpo,
      }
      if (idLattesLimpo) {
        payload.id_lattes = idLattesLimpo
      }
      if (doc.scopus_id !== undefined && doc.scopus_id !== null) {
        payload.scopus_id = doc.scopus_id
      }
      if (doc.indice_h !== undefined && doc.indice_h !== null) {
        payload.indice_h = doc.indice_h
      }
      if (doc.bolsa_cnpq !== undefined && doc.bolsa_cnpq !== null) {
        payload.bolsa_cnpq = doc.bolsa_cnpq
      }
      if (doc.jdp !== undefined && doc.jdp !== null) {
        payload.jdp = doc.jdp
      }
      if (doc.licenca !== undefined && doc.licenca !== null) {
        payload.licenca = doc.licenca
      }
      if (doc.categoria !== undefined) {
        payload.categoria = doc.categoria
      }

      const { error: updErr } = await (client as any)
        .from('docentes')
        .update(payload)
        .eq('id', encontrado.id)

      if (updErr) {
        erros.push({
          tabela: 'docentes',
          item: nomeLimpo,
          mensagem: updErr.message || 'Erro no update de docente.',
        })
        contagem.ignorados++
      } else {
        contagem.atualizados++
        // Atualiza os mapas em memória
        if (idLattesLimpo) {
          encontrado.id_lattes = idLattesLimpo
          porIdLattes.set(idLattesLimpo, encontrado)
        }
        encontrado.nome = nomeLimpo
        porNomeExato.set(nomeLimpo, encontrado)
        porNomeNormalizado.set(normalizarTitulo(nomeLimpo), encontrado)
      }
    } else {
      // INSERT
      const payload: Record<string, unknown> = {
        nome: nomeLimpo,
        id_lattes: idLattesLimpo,
      }
      if (doc.scopus_id !== undefined && doc.scopus_id !== null) {
        payload.scopus_id = doc.scopus_id
      }
      if (doc.indice_h !== undefined && doc.indice_h !== null) {
        payload.indice_h = doc.indice_h
      }
      if (doc.bolsa_cnpq !== undefined && doc.bolsa_cnpq !== null) {
        payload.bolsa_cnpq = doc.bolsa_cnpq
      }
      if (doc.jdp !== undefined && doc.jdp !== null) {
        payload.jdp = doc.jdp
      }
      if (doc.licenca !== undefined && doc.licenca !== null) {
        payload.licenca = doc.licenca
      }
      if (doc.categoria !== undefined) {
        payload.categoria = doc.categoria
      }

      const { data: inserido, error: insErr } = await (client as any)
        .from('docentes')
        .insert([payload])
        .select('id, nome, id_lattes')
        .single()

      if (insErr) {
        erros.push({
          tabela: 'docentes',
          item: nomeLimpo,
          mensagem: insErr.message || 'Erro no insert de docente.',
        })
        contagem.ignorados++
      } else {
        contagem.inseridos++
        const rec = inserido as DocenteExistenteBanco
        if (rec) {
          if (rec.id_lattes) {
            porIdLattes.set(rec.id_lattes, rec)
          }
          if (rec.nome) {
            porNomeExato.set(rec.nome, rec)
            porNomeNormalizado.set(normalizarTitulo(rec.nome), rec)
          }
        }
      }
    }
  }

  return { contagem, erros }
}

/**
 * Grava publicações no Supabase seguindo as regras da Subetapa 2A:
 * - Colunas reais: titulo, autores, periodico, ano, doi, link_comprovacao, observacoes.
 * - Dedupe por título normalizado + ano:
 *   se existir publicação com mesmo título normalizado e mesmo ano -> UPDATE;
 *   senão INSERT.
 * - Mapear: titulo, autores (lista de nomes separados por vírgula), periodico, ano, doi.
 *   Campos sem origem no XML ficam como estão / nulos / vazios.
 * - Retorna contagem { inseridos, atualizados, ignorados }.
 */
export async function gravarPublicacoes(
  publicacoes: PublicacaoParaGravar[],
  client: SupabaseClientLike = (globalThis as any).__SUPABASE_CLIENT__ || supabase,
): Promise<{ contagem: RelatorioContagemTabela; erros: RelatorioGravacaoLattes['erros'] }> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []

  if (!publicacoes || publicacoes.length === 0) {
    return { contagem, erros }
  }

  // 1. Carrega todas as publicações existentes no banco para comparação por título normalizado + ano
  const { data: existentes, error: buscaErro } = await (client as any)
    .from('publicacoes')
    .select(
      'id, titulo, ano, fator_impacto_jcr, estrato_qualis, tipo_producao, indicacao_nivel, justificativa_indicacao',
    )

  if (buscaErro) {
    erros.push({
      tabela: 'publicacoes',
      item: 'listagem_inicial',
      mensagem: buscaErro.message || 'Erro ao consultar publicações existentes.',
    })
    contagem.ignorados += publicacoes.length
    return { contagem, erros }
  }

  const listaExistentes: PublicacaoExistenteBanco[] = existentes || []

  // Mapa de chave normalizada -> registro no banco
  // chave = normalizarTitulo(titulo) + '_' + ano
  const mapaPorChave = new Map<string, PublicacaoExistenteBanco>()
  for (const pub of listaExistentes) {
    const chave = `${normalizarTitulo(pub.titulo)}_${pub.ano}`
    mapaPorChave.set(chave, pub)
  }

  for (const pub of publicacoes) {
    const tituloLimpo = pub.titulo?.trim()
    const anoNum = typeof pub.ano === 'number' ? pub.ano : parseInt(String(pub.ano), 10)

    if (!tituloLimpo || !anoNum) {
      contagem.ignorados++
      continue
    }

    const chave = `${normalizarTitulo(tituloLimpo)}_${anoNum}`
    const encontrado = mapaPorChave.get(chave)

    if (encontrado) {
      // UPDATE
      const payload: Record<string, unknown> = {
        titulo: tituloLimpo,
        autores: pub.autores || '',
        periodico: pub.periodico || '',
        ano: anoNum,
        doi: pub.doi || '',
      }

      if (pub.link_comprovacao !== undefined && pub.link_comprovacao !== null) {
        payload.link_comprovacao = pub.link_comprovacao
      }
      if (pub.observacoes !== undefined && pub.observacoes !== null) {
        payload.observacoes = pub.observacoes
      }
      // Se a publicação já tiver fator_impacto_jcr no banco e a importação trouxer null/undefined,
      // preserva o valor manual existente do banco sem sobrescrever
      if (pub.fator_impacto_jcr !== undefined && pub.fator_impacto_jcr !== null) {
        payload.fator_impacto_jcr = pub.fator_impacto_jcr
      } else if (
        encontrado.fator_impacto_jcr !== undefined &&
        encontrado.fator_impacto_jcr !== null
      ) {
        payload.fator_impacto_jcr = encontrado.fator_impacto_jcr
      }

      // Preservação de campos manuais da Ficha CAPES (Etapa Q1):
      // estrato_qualis, tipo_producao, indicacao_nivel, justificativa_indicacao
      if (pub.estrato_qualis !== undefined && pub.estrato_qualis !== null) {
        payload.estrato_qualis = pub.estrato_qualis
      } else if (encontrado.estrato_qualis !== undefined && encontrado.estrato_qualis !== null) {
        payload.estrato_qualis = encontrado.estrato_qualis
      }

      if (pub.tipo_producao !== undefined && pub.tipo_producao !== null) {
        payload.tipo_producao = pub.tipo_producao
      } else if (encontrado.tipo_producao !== undefined && encontrado.tipo_producao !== null) {
        payload.tipo_producao = encontrado.tipo_producao
      }

      if (pub.indicacao_nivel !== undefined && pub.indicacao_nivel !== null) {
        payload.indicacao_nivel = pub.indicacao_nivel
      } else if (encontrado.indicacao_nivel !== undefined && encontrado.indicacao_nivel !== null) {
        payload.indicacao_nivel = encontrado.indicacao_nivel
      }

      if (pub.justificativa_indicacao !== undefined && pub.justificativa_indicacao !== null) {
        payload.justificativa_indicacao = pub.justificativa_indicacao
      } else if (
        encontrado.justificativa_indicacao !== undefined &&
        encontrado.justificativa_indicacao !== null
      ) {
        payload.justificativa_indicacao = encontrado.justificativa_indicacao
      }

      const { error: updErr } = await (client as any)
        .from('publicacoes')
        .update(payload)
        .eq('id', encontrado.id)

      if (updErr) {
        erros.push({
          tabela: 'publicacoes',
          item: `${tituloLimpo} (${anoNum})`,
          mensagem: updErr.message || 'Erro no update de publicação.',
        })
        contagem.ignorados++
      } else {
        contagem.atualizados++
        // Grava vínculos estruturados (docentes autores e coautores) para publicação atualizada
        await gravarVinculosPublicacao(encontrado.id, pub, client, erros)
      }
    } else {
      // INSERT
      const payload: Record<string, unknown> = {
        titulo: tituloLimpo,
        autores: pub.autores || '',
        periodico: pub.periodico || '',
        ano: anoNum,
        doi: pub.doi || '',
        link_comprovacao: pub.link_comprovacao ?? '',
        observacoes: pub.observacoes ?? '',
        fator_impacto_jcr: pub.fator_impacto_jcr ?? null,
        estrato_qualis: pub.estrato_qualis ?? null,
        tipo_producao: pub.tipo_producao ?? null,
        indicacao_nivel: pub.indicacao_nivel ?? null,
        justificativa_indicacao: pub.justificativa_indicacao ?? null,
      }

      const { data: inserido, error: insErr } = await (client as any)
        .from('publicacoes')
        .insert([payload])
        .select('id, titulo, ano')
        .single()

      if (insErr) {
        erros.push({
          tabela: 'publicacoes',
          item: `${tituloLimpo} (${anoNum})`,
          mensagem: insErr.message || 'Erro no insert de publicação.',
        })
        contagem.ignorados++
      } else {
        contagem.inseridos++
        const rec = inserido as PublicacaoExistenteBanco
        if (rec) {
          const novaChave = `${normalizarTitulo(rec.titulo)}_${rec.ano}`
          mapaPorChave.set(novaChave, rec)
          // Grava vínculos estruturados (docentes autores e coautores) para nova publicação
          await gravarVinculosPublicacao(rec.id, pub, client, erros)
        }
      }
    }
  }

  return { contagem, erros }
}

/**
 * Grava vínculos de docentes autores e coautores do programa de forma idempotente,
 * preservando vínculos já existentes e rejeições gravadas.
 */
async function gravarVinculosPublicacao(
  publicacaoId: number,
  pub: PublicacaoParaGravar,
  client: SupabaseClientLike,
  erros: RelatorioGravacaoLattes['erros'],
): Promise<void> {
  // 1. Docentes autores em publicacoes_docentes
  if (Array.isArray(pub.docentes_autores_ids) && pub.docentes_autores_ids.length > 0) {
    try {
      // Carrega vínculos atuais para não duplicar nem apagar vínculos manuais
      const { data: atuaisDoc } = await (client as any)
        .from('publicacoes_docentes')
        .select('docente_id')
        .eq('publicacao_id', publicacaoId)

      const jaVinculados = new Set<number>((atuaisDoc || []).map((r: any) => Number(r.docente_id)))
      const paraInserir = pub.docentes_autores_ids.filter((id) => !jaVinculados.has(Number(id)))

      if (paraInserir.length > 0) {
        const rows = paraInserir.map((docente_id) => ({
          publicacao_id: publicacaoId,
          docente_id: Number(docente_id),
        }))
        const { error: insDocErr } = await (client as any).from('publicacoes_docentes').insert(rows)

        if (insDocErr && insDocErr.code !== '23505') {
          erros.push({
            tabela: 'publicacoes_docentes',
            item: `pub_${publicacaoId}`,
            mensagem: insDocErr.message || 'Erro ao vincular docente autor.',
          })
        }
      }
    } catch (e: any) {
      erros.push({
        tabela: 'publicacoes_docentes',
        item: `pub_${publicacaoId}`,
        mensagem: e?.message || 'Falha ao processar publicacoes_docentes.',
      })
    }
  }

  // 2. Coautores do programa em publicacoes_coautores_programa
  if (Array.isArray(pub.coautores_programa) && pub.coautores_programa.length > 0) {
    try {
      const { data: atuaisCoaut } = await (client as any)
        .from('publicacoes_coautores_programa')
        .select('id, discente_id, egresso_id, tipo')
        .eq('publicacao_id', publicacaoId)

      // Se já está marcado como "sem_coautoria" manualmente, não sobrescreve
      const temSemCoautoria = (atuaisCoaut || []).some((c: any) => c.tipo === 'sem_coautoria')
      if (!temSemCoautoria) {
        for (const coaut of pub.coautores_programa) {
          const jaExiste = (atuaisCoaut || []).some((c: any) => {
            if (coaut.discente_id && c.discente_id === coaut.discente_id) return true
            if (coaut.egresso_id && c.egresso_id === coaut.egresso_id) return true
            return false
          })

          if (!jaExiste) {
            const { error: insCoautErr } = await (client as any)
              .from('publicacoes_coautores_programa')
              .insert({
                publicacao_id: publicacaoId,
                discente_id: coaut.discente_id || null,
                egresso_id: coaut.egresso_id || null,
                tipo: coaut.tipo,
                nome_citado: coaut.nome,
                grau_confianca: coaut.grau_confianca ?? 1.0,
                confirmado_por: 'Auto-importação Lattes (confiança verificada)',
                confirmado_em: new Date().toISOString(),
              })

            if (insCoautErr) {
              erros.push({
                tabela: 'publicacoes_coautores_programa',
                item: `pub_${publicacaoId}_${coaut.nome}`,
                mensagem: insCoautErr.message || 'Erro ao gravar coautoria.',
              })
            }
          }
        }
      }
    } catch (e: any) {
      erros.push({
        tabela: 'publicacoes_coautores_programa',
        item: `pub_${publicacaoId}`,
        mensagem: e?.message || 'Falha ao processar coautores do programa.',
      })
    }
  }
}

interface DiscenteExistenteBanco {
  id: number
  nome: string
  link_lattes?: string | null
  docente_orientador_id?: number | null
  ano_conclusao?: string | null
  tipo_curso?: string | null
  status?: string | null
}

/**
 * Atualiza uma linha e CONFIRMA que algo mudou. O PostgREST não devolve erro quando a RLS filtra
 * todas as linhas do UPDATE; sem o `.select()`, essa falha era contada como sucesso.
 */
async function atualizarLinha(
  client: SupabaseClientLike,
  tabela: string,
  id: number,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; semPermissao?: boolean; mensagem?: string }> {
  const { data, error } = await (client as any)
    .from(tabela)
    .update(payload)
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, mensagem: error.message || 'Erro ao atualizar o registro.' }
  if (!data || data.length === 0) {
    return {
      ok: false,
      semPermissao: true,
      mensagem: 'Sem permissão para alterar este registro (nenhuma linha foi atualizada).',
    }
  }
  return { ok: true }
}

type MapasDocentes = {
  porIdLattes: Map<string, DocenteExistenteBanco>
  porNomeNormalizado: Map<string, DocenteExistenteBanco>
}

/** Resolve um docente por ID Lattes e, depois, por nome, olhando todos os identificadores informados. */
function resolverDocente(
  identificadores: Array<string | null | undefined>,
  mapas: MapasDocentes,
): DocenteExistenteBanco | null {
  const lista = identificadores.map((i) => (i || '').trim()).filter(Boolean)
  for (const ident of lista) {
    const achado = mapas.porIdLattes.get(ident)
    if (achado) return achado
  }
  for (const ident of lista) {
    const achado = mapas.porNomeNormalizado.get(normalizarTitulo(ident))
    if (achado) return achado
  }
  return null
}

/** Dados para criar (ou completar) o discente de uma orientação importada (D-31). */
export interface ExtrasDiscenteImportado {
  /** Orientação concluída: o discente nasce Titulado, com o mês de conclusão. */
  concluida?: boolean
  /** Conclusão em `AAAA-MM` (só o ano vale como fevereiro, D-29). */
  anoConclusaoMesAno?: string | null
  tipoCurso?: string | null
  /** Ingresso em `AAAA-MM`; só quando o Lattes informa o início (orientação em andamento). */
  dataIngresso?: string | null
  docenteOrientadorId?: number | null
  orientadorNome?: string | null
}

const TIPOS_CURSO_DISCENTE = ['Mestrado', 'Doutorado', 'Pós-Doutorado']

/**
 * Resolve ou cria um discente pelo nome no banco Supabase.
 * Matching: nome normalizado (sem acentos, minúsculo, trim).
 * Se não encontrar, insere o discente:
 * - orientação em andamento: status em andamento, com o ingresso quando o Lattes informa o início;
 * - orientação concluída: status Titulado, com o mês de conclusão (D-26/D-29), sem inventar ingresso;
 * - orientador principal: já grava o docente que importa como orientador (a RLS de INSERT permite).
 * Se o discente já existe e ainda não tem conclusão, tenta completá-lo (sem erro se a RLS barrar).
 */
export async function resolverOuCriarDiscente(
  nomeDiscente: string,
  cacheDiscentes: {
    porNomeNormalizado: Map<string, DiscenteExistenteBanco>
    lista: DiscenteExistenteBanco[]
  },
  client: SupabaseClientLike = (globalThis as any).__SUPABASE_CLIENT__ || supabase,
  extras: ExtrasDiscenteImportado = {},
): Promise<{ id: number; criado: boolean } | null> {
  const nomeLimpo = nomeDiscente.trim()
  if (!nomeLimpo) return null

  const chave = normalizarTitulo(nomeLimpo)
  const existente = cacheDiscentes.porNomeNormalizado.get(chave)
  if (existente) {
    // Completa o que o Lattes sabe e o cadastro ainda não: conclusão e nível. Melhor esforço.
    const completar: Record<string, unknown> = {}
    if (extras.concluida && extras.anoConclusaoMesAno && !(existente.ano_conclusao || '').trim()) {
      const prep = prepararDiscenteParaGravar({
        status: existente.status || 'em_andamento',
        ano_conclusao: extras.anoConclusaoMesAno,
      })
      completar.ano_conclusao = prep.ano_conclusao
      completar.status = prep.status
    }
    if (extras.tipoCurso && !(existente.tipo_curso || '').trim())
      completar.tipo_curso = extras.tipoCurso
    if (Object.keys(completar).length > 0) {
      const res = await atualizarLinha(client, 'discentes', existente.id, completar)
      if (res.ok) Object.assign(existente, completar)
    }
    return { id: existente.id, criado: false }
  }

  const prep =
    extras.concluida && extras.anoConclusaoMesAno
      ? prepararDiscenteParaGravar({
          status: 'em_andamento',
          ano_conclusao: extras.anoConclusaoMesAno,
        })
      : null

  const novoPayload = {
    nome: nomeLimpo,
    cpf: '',
    data_ingresso: extras.dataIngresso ? mesAnoDoLattes(extras.dataIngresso) : '',
    status: prep?.status ?? 'em_andamento',
    ano_conclusao: prep?.ano_conclusao ?? '',
    tipo_curso: extras.tipoCurso || '',
    link_lattes: '',
    link_comprovacao: '',
    orientador: extras.orientadorNome || '',
    docente_orientador_id: extras.docenteOrientadorId ?? null,
    observacoes: 'Cadastrado automaticamente via importação Lattes',
  }

  const { data, error } = await (client as any)
    .from('discentes')
    .insert([novoPayload])
    .select('id, nome')
    .single()

  if (error || !data) {
    // P-15: antes devolvia null e a falha sumia (ex.: RLS barrando o INSERT feito por docente).
    throw new Error(error?.message || 'Não foi possível criar o discente.')
  }

  const rec: DiscenteExistenteBanco = {
    id: data.id,
    nome: data.nome,
    docente_orientador_id: novoPayload.docente_orientador_id,
    ano_conclusao: novoPayload.ano_conclusao,
    tipo_curso: novoPayload.tipo_curso,
    status: novoPayload.status,
  }
  cacheDiscentes.lista.push(rec)
  cacheDiscentes.porNomeNormalizado.set(chave, rec)
  return { id: rec.id, criado: true }
}

/**
 * Mês de conclusão (`AAAA-MM`) de uma orientação concluída. O parser preenche `data_defesa` com
 * 31/12 quando o Lattes só traz o ano; essa data inventada não vale: nesse caso usa o término
 * (só ano = fevereiro, D-29).
 */
function mesConclusaoDaOrientacao(ori: OrientacaoParaGravar): string | null {
  const defesaReal = ori.data_defesa && !/-12-31$/.test(ori.data_defesa) ? ori.data_defesa : null
  return (
    normalizarMesAno(defesaReal) ||
    normalizarMesAno(ori.fim) ||
    normalizarMesAno(ori.ano_referencia) ||
    null
  )
}

/**
 * Grava orientações no Supabase:
 * - Resolve docente_id via id_lattes ou nome (do orientador e do dono do currículo);
 * - Resolve/cria discente_id via nome (concluída = Titulado; em andamento = ingresso conhecido);
 * - Concluída de mestrado/doutorado como orientador principal também cria o Egresso (D-31);
 * - Dedupe: mesmo docente_id + mesmo discente_id + mesmo ano de início/referência + tipo
 *   (ou discente_id + ano_referencia quando docente não vinculado);
 *   se existir -> UPDATE (confirmado: RLS que barra o UPDATE aparece como erro), senão INSERT.
 */
export async function gravarOrientacoes(
  orientacoes: OrientacaoParaGravar[],
  client: SupabaseClientLike = (globalThis as any).__SUPABASE_CLIENT__ || supabase,
  mapaDocentesPrecarregado?: MapasDocentes,
): Promise<{
  contagem: RelatorioContagemTabela
  erros: RelatorioGravacaoLattes['erros']
  egressos: RelatorioContagemTabela
}> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const egressos: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []

  if (!orientacoes || orientacoes.length === 0) {
    return { contagem, erros, egressos }
  }

  // 1. Carrega orientações existentes
  const { data: existentesOri, error: errOri } = await (client as any)
    .from('orientacoes')
    .select('id, docente_id, discente_id, tipo, inicio, status')

  if (errOri) {
    erros.push({
      tabela: 'orientacoes',
      item: 'listagem_inicial',
      mensagem: errOri.message || 'Erro ao consultar orientações existentes.',
    })
    contagem.ignorados += orientacoes.length
    return { contagem, erros, egressos }
  }

  // 2. Carrega discentes para cache em memória
  const { data: existentesDisc, error: errDisc } = await (client as any)
    .from('discentes')
    .select('id, nome, link_lattes, docente_orientador_id, ano_conclusao, tipo_curso, status')

  if (errDisc) {
    erros.push({
      tabela: 'orientacoes',
      item: 'discentes_cache',
      mensagem: errDisc.message || 'Erro ao carregar discentes para vinculo de orientação.',
    })
    contagem.ignorados += orientacoes.length
    return { contagem, erros, egressos }
  }

  const cacheDiscentes = {
    lista: (existentesDisc || []) as DiscenteExistenteBanco[],
    porNomeNormalizado: new Map<string, DiscenteExistenteBanco>(),
  }
  for (const d of cacheDiscentes.lista) {
    if (d.nome) cacheDiscentes.porNomeNormalizado.set(normalizarTitulo(d.nome), d)
  }

  // 3. Egressos já cadastrados (para não duplicar)
  const egressosPorNome = new Set<string>()
  const { data: existentesEgr, error: errEgr } = await (client as any)
    .from('egressos')
    .select('id, nome')
  const egressosDisponiveis = !errEgr
  if (errEgr) {
    erros.push({
      tabela: 'egressos',
      item: 'listagem_inicial',
      mensagem: errEgr.message || 'Erro ao consultar egressos; nenhum egresso será criado.',
    })
  }
  for (const e of existentesEgr || []) {
    if (e.nome) egressosPorNome.add(normalizarTitulo(e.nome))
  }

  // 4. Carrega docentes se não fornecido
  let docMapas = mapaDocentesPrecarregado
  if (!docMapas) {
    const { data: existentesDoc } = await (client as any)
      .from('docentes')
      .select('id, nome, id_lattes')
    const porIdLattes = new Map<string, DocenteExistenteBanco>()
    const porNome = new Map<string, DocenteExistenteBanco>()
    for (const d of existentesDoc || []) {
      if (d.id_lattes) porIdLattes.set(d.id_lattes.trim(), d)
      if (d.nome) porNome.set(normalizarTitulo(d.nome), d)
    }
    docMapas = { porIdLattes, porNomeNormalizado: porNome }
  }
  const docentePorId = new Map<number, DocenteExistenteBanco>()
  for (const d of [...docMapas.porIdLattes.values(), ...docMapas.porNomeNormalizado.values()]) {
    docentePorId.set(d.id, d)
  }

  // Mapa de orientações existentes para dedupe: `docenteId_discenteId_tipo_inicio`
  interface OriExistente {
    id: number
    docente_id: number | null
    discente_id: number | null
    tipo: string
    inicio: string
  }
  const listaExistentesOri: OriExistente[] = existentesOri || []
  const mapaOriExistentes = new Map<string, OriExistente>()
  for (const o of listaExistentesOri) {
    const chave = `${o.docente_id || 0}_${o.discente_id || 0}_${normalizarTitulo(o.tipo || '')}_${anoParaChave(o.inicio)}`
    mapaOriExistentes.set(chave, o)
  }

  for (const ori of orientacoes) {
    // Resolver docente_id: ID Lattes ou nome, do orientador e do dono do currículo
    const docenteId: number | null =
      ori.docente_id ??
      resolverDocente([ori.docente_identificador, ori.docente_nome], docMapas)?.id ??
      null
    const nomeDocente =
      (docenteId ? docentePorId.get(docenteId)?.nome : null) || ori.docente_nome || ''

    const tipoFinal = ori.tipo || 'Mestrado'
    const concluida = ori.status === 'concluido'
    const principal = ori.flag_orientador_principal !== false
    const mesConclusao = concluida ? mesConclusaoDaOrientacao(ori) : null
    const tipoCurso = TIPOS_CURSO_DISCENTE.includes(tipoFinal) ? tipoFinal : ''

    // Resolver discente_id
    let discenteId: number | null = ori.discente_id ?? null
    if (!discenteId && ori.discente_nome) {
      try {
        const resDisc = await resolverOuCriarDiscente(ori.discente_nome, cacheDiscentes, client, {
          concluida,
          anoConclusaoMesAno: mesConclusao,
          tipoCurso,
          dataIngresso: concluida ? null : ori.inicio || null,
          docenteOrientadorId: principal && docenteId ? docenteId : null,
          orientadorNome: principal ? nomeDocente : '',
        })
        if (resDisc) discenteId = resDisc.id
      } catch (e) {
        // P-15: sem o discente não há orientação válida (ficaria órfã, sem nem o nome). Reporta e segue.
        erros.push({
          tabela: 'orientacoes',
          item: `${ori.discente_nome} (${tipoFinal})`,
          mensagem: `Não foi possível cadastrar o discente: ${e instanceof Error ? e.message : 'erro desconhecido'}`,
        })
        contagem.ignorados++
        continue
      }
    }

    // Etapa R3: discente já cadastrado sem orientador passa a ter o docente como orientador,
    // preservando orientação já confirmada. D-11/H-02: coorientação nunca define o principal.
    if (docenteId && discenteId && principal) {
      let discAtual: DiscenteExistenteBanco | undefined = cacheDiscentes.lista.find(
        (d) => d.id === discenteId,
      )
      if (!discAtual) {
        // discente informado por id e fora do cache: consulta direta
        const { data } = await (client as any)
          .from('discentes')
          .select('id, nome, orientador, docente_orientador_id')
          .eq('id', discenteId)
          .maybeSingle()
        if (data) {
          discAtual = data as DiscenteExistenteBanco
          cacheDiscentes.lista.push(discAtual)
        }
      }
      if (discAtual && !discAtual.docente_orientador_id) {
        const res = await atualizarLinha(client, 'discentes', discenteId, {
          docente_orientador_id: docenteId,
          orientador: nomeDocente,
        })
        if (res.ok) {
          discAtual.docente_orientador_id = docenteId
        } else if (!res.semPermissao) {
          // Sem permissão é esperado (o aluno é de outro orientador); erro de verdade é mostrado.
          erros.push({
            tabela: 'discentes',
            item: ori.discente_nome,
            mensagem: res.mensagem || 'Não foi possível definir o orientador do discente.',
          })
        }
      }
    }

    const inicioFinal = ori.inicio
      ? mesAnoDoLattes(ori.inicio)
      : ori.ano_referencia
        ? mesAnoDoLattes(ori.ano_referencia)
        : ''
    const chaveDedupe = `${docenteId || 0}_${discenteId || 0}_${normalizarTitulo(tipoFinal)}_${anoParaChave(inicioFinal)}`
    const existente = mapaOriExistentes.get(chaveDedupe)

    const payload: Record<string, unknown> = {
      tipo: tipoFinal,
      inicio: inicioFinal,
      fim: ori.fim ? mesAnoDoLattes(ori.fim) : '',
      status: ori.status || 'ativo',
      docente_id: docenteId,
      discente_id: discenteId,
      link_comprovacao: ori.link_comprovacao || '',
      observacoes: ori.observacoes || '',
      data_defesa: ori.data_defesa ?? null,
      flag_orientador_principal: ori.flag_orientador_principal ?? false,
    }

    let gravada = false
    if (existente) {
      // UPDATE (confirmado)
      const res = await atualizarLinha(client, 'orientacoes', existente.id, payload)
      if (!res.ok) {
        erros.push({
          tabela: 'orientacoes',
          item: `${ori.discente_nome || 'Orientação'} (${tipoFinal})`,
          mensagem: res.mensagem || 'Erro no update de orientação.',
        })
        contagem.ignorados++
      } else {
        contagem.atualizados++
        gravada = true
      }
    } else {
      // INSERT
      const { data: insData, error: insErr } = await (client as any)
        .from('orientacoes')
        .insert([payload])
        .select('id, docente_id, discente_id, tipo, inicio')
        .single()

      if (insErr) {
        erros.push({
          tabela: 'orientacoes',
          item: `${ori.discente_nome || 'Orientação'} (${tipoFinal})`,
          mensagem: insErr.message || 'Erro no insert de orientação.',
        })
        contagem.ignorados++
      } else {
        contagem.inseridos++
        gravada = true
        if (insData) {
          mapaOriExistentes.set(chaveDedupe, insData as OriExistente)
        }
      }
    }

    // D-31: formado (mestrado ou doutorado concluído, como orientador principal) também é Egresso
    if (
      gravada &&
      egressosDisponiveis &&
      concluida &&
      principal &&
      discenteId &&
      ['Mestrado', 'Doutorado'].includes(tipoFinal)
    ) {
      const chaveEgr = normalizarTitulo(ori.discente_nome)
      if (chaveEgr && !egressosPorNome.has(chaveEgr)) {
        const { error: egrErr } = await (client as any)
          .from('egressos')
          .insert([
            {
              nome: ori.discente_nome.trim(),
              tipo_curso: tipoFinal,
              ano_titulacao: anoDeMesAno(mesConclusao),
              docente_orientador_id: docenteId,
              orientador: nomeDocente,
              observacoes: 'Cadastrado automaticamente via importação Lattes',
            },
          ])
          .select('id')
          .single()
        if (egrErr) {
          erros.push({
            tabela: 'egressos',
            item: `${ori.discente_nome} (${tipoFinal})`,
            mensagem: egrErr.message || 'Erro ao cadastrar o egresso.',
          })
          egressos.ignorados++
        } else {
          egressos.inseridos++
          egressosPorNome.add(chaveEgr)
        }
      }
    }
  }

  return { contagem, erros, egressos }
}

/**
 * Grava disciplinas no Supabase:
 * A importação de disciplinas via Lattes foi DESATIVADA por decisão da cliente:
 * a página Disciplinas e os vínculos disciplina↔docente são gerenciados exclusivamente
 * de forma manual. Qualquer dado de disciplina enviado ao pipeline Lattes é ignorado (no-op seguro)
 * e não altera as tabelas `disciplinas` nem `disciplinas_docentes`.
 */
export async function gravarDisciplinas(
  disciplinas: DisciplinaParaGravar[],
  _client: SupabaseClientLike = (globalThis as any).__SUPABASE_CLIENT__ || supabase,
): Promise<{ contagem: RelatorioContagemTabela; erros: RelatorioGravacaoLattes['erros'] }> {
  const contagem: RelatorioContagemTabela = {
    inseridos: 0,
    atualizados: 0,
    ignorados: disciplinas ? disciplinas.length : 0,
  }
  return { contagem, erros: [] }
}

/**
 * Grava projetos de pesquisa no Supabase:
 * - Coordenador resolvido por NRO-ID-CNPQ / id_lattes ou nome; sem responsável, fica vazio (D-33);
 * - Financiadores mapeados para orgao_fomento;
 * - Dedupe: por título normalizado + início. UPDATE só muda o coordenador quando o Lattes aponta um;
 * - Participantes (D-33): o dono do currículo e os demais docentes da equipe viram linhas de
 *   projetos_participantes, o que faz o projeto aparecer na tela do docente. Docente só grava a
 *   própria linha (a RLS não deixa gravar a de outro).
 */
export async function gravarProjetosPesquisa(
  projetos: ProjetoPesquisaParaGravar[],
  client: SupabaseClientLike = (globalThis as any).__SUPABASE_CLIENT__ || supabase,
  mapaDocentesPrecarregado?: MapasDocentes,
  opcoes: OpcoesGravacao = {},
): Promise<{
  contagem: RelatorioContagemTabela
  erros: RelatorioGravacaoLattes['erros']
  participantes: number
}> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []
  let participantes = 0

  if (!projetos || projetos.length === 0) {
    return { contagem, erros, participantes }
  }

  // 1. Carrega projetos existentes
  const { data: existentes, error: errBusca } = await (client as any)
    .from('projetos_pesquisa')
    .select('id, titulo, inicio')

  if (errBusca) {
    erros.push({
      tabela: 'projetos_pesquisa',
      item: 'listagem_inicial',
      mensagem: errBusca.message || 'Erro ao consultar projetos existentes.',
    })
    contagem.ignorados += projetos.length
    return { contagem, erros, participantes }
  }

  // 2. Carrega mapa de docentes para resolução de coordenador e participantes
  let docMapas = mapaDocentesPrecarregado
  if (!docMapas) {
    const { data: existentesDoc } = await (client as any)
      .from('docentes')
      .select('id, nome, id_lattes')
    const porIdLattes = new Map<string, DocenteExistenteBanco>()
    const porNome = new Map<string, DocenteExistenteBanco>()
    for (const d of existentesDoc || []) {
      if (d.id_lattes) porIdLattes.set(d.id_lattes.trim(), d)
      if (d.nome) porNome.set(normalizarTitulo(d.nome), d)
    }
    docMapas = { porIdLattes, porNomeNormalizado: porNome }
  }

  // 3. Participações já gravadas (chave projeto_docente)
  const participacoesExistentes = new Set<string>()
  const { data: partsBanco } = await (client as any)
    .from('projetos_participantes')
    .select('projeto_id, docente_id')
  for (const pp of partsBanco || []) {
    participacoesExistentes.add(`${pp.projeto_id}_${pp.docente_id}`)
  }

  interface ProjetoExistente {
    id: number
    titulo: string
    inicio: string
  }
  const listaExistentes: ProjetoExistente[] = existentes || []
  const mapaPorChave = new Map<string, ProjetoExistente>()

  for (const p of listaExistentes) {
    const chave = `${normalizarTitulo(p.titulo)}_${anoParaChave(p.inicio)}`
    mapaPorChave.set(chave, p)
  }

  for (const proj of projetos) {
    const tituloLimpo = proj.titulo?.trim()
    if (!tituloLimpo) {
      contagem.ignorados++
      continue
    }

    // Resolver coordenador_id
    // Quando o coordenador é o dono do currículo, o nome dele também vale se o ID Lattes não está cadastrado
    const coordIdentificadores =
      proj.coordenador_identificador &&
      proj.coordenador_identificador === proj.importador_identificador
        ? [proj.coordenador_identificador, proj.importador_nome]
        : [proj.coordenador_identificador]
    const coordId: number | null =
      proj.coordenador_id ?? resolverDocente(coordIdentificadores, docMapas)?.id ?? null

    const chave = `${normalizarTitulo(tituloLimpo)}_${anoParaChave(proj.inicio)}`
    const existente = mapaPorChave.get(chave)

    const payload: Record<string, unknown> = {
      titulo: tituloLimpo,
      descricao: proj.descricao || '',
      inicio: proj.inicio ? mesAnoDoLattes(proj.inicio) : '',
      fim: proj.fim ? mesAnoDoLattes(proj.fim) : '',
      financiamento: Boolean(proj.financiamento),
      orgao_fomento: proj.orgao_fomento || '',
      link_comprovacao: proj.link_comprovacao || '',
      observacoes: proj.observacoes || '',
    }
    // Só grava o coordenador quando há um: reimportar não pode apagar o coordenador já cadastrado
    if (coordId) payload.coordenador_id = coordId

    let projetoId: number | null = existente?.id ?? null

    if (existente) {
      const res = await atualizarLinha(client, 'projetos_pesquisa', existente.id, payload)
      if (res.ok) {
        contagem.atualizados++
      } else if (res.semPermissao) {
        // Esperado: o projeto é de outro coordenador e o docente só participa. Não é erro; o
        // projeto segue como está e a participação abaixo é registrada.
        contagem.ignorados++
      } else {
        erros.push({
          tabela: 'projetos_pesquisa',
          item: tituloLimpo,
          mensagem: res.mensagem || 'Erro no update de projeto de pesquisa.',
        })
        contagem.ignorados++
      }
    } else {
      const { data: insData, error: insErr } = await (client as any)
        .from('projetos_pesquisa')
        .insert([{ ...payload, coordenador_id: coordId }])
        .select('id, titulo, inicio')
        .single()

      if (insErr) {
        erros.push({
          tabela: 'projetos_pesquisa',
          item: tituloLimpo,
          mensagem: insErr.message || 'Erro no insert de projeto de pesquisa.',
        })
        contagem.ignorados++
      } else {
        contagem.inseridos++
        if (insData) {
          mapaPorChave.set(chave, insData as ProjetoExistente)
          projetoId = (insData as ProjetoExistente).id
        }
      }
    }

    // Participantes: dono do currículo + docentes da equipe cadastrados no sistema
    if (!projetoId) continue
    const candidatos = new Map<number, 'coordenador' | 'participante'>()
    for (const m of proj.equipe || []) {
      const d = resolverDocente([m.id_cnpq, m.nome], docMapas)
      if (d) candidatos.set(d.id, m.responsavel ? 'coordenador' : 'participante')
    }
    const dono = resolverDocente([proj.importador_identificador, proj.importador_nome], docMapas)
    if (dono && !candidatos.has(dono.id)) {
      candidatos.set(dono.id, proj.importador_responsavel ? 'coordenador' : 'participante')
    }

    for (const [docenteId, papel] of candidatos) {
      if (docenteId === coordId) continue // o coordenador já enxerga o projeto por coordenador_id
      if (opcoes.papelUsuario === 'docente' && docenteId !== opcoes.docenteIdUsuario) continue
      const chavePart = `${projetoId}_${docenteId}`
      if (participacoesExistentes.has(chavePart)) continue
      const { error: partErr } = await (client as any)
        .from('projetos_participantes')
        .insert([{ projeto_id: projetoId, docente_id: docenteId, papel }])
      if (partErr) {
        erros.push({
          tabela: 'projetos_participantes',
          item: tituloLimpo,
          mensagem: partErr.message || 'Erro ao registrar o participante do projeto.',
        })
      } else {
        participacoesExistentes.add(chavePart)
        participantes++
      }
    }
  }

  return { contagem, erros, participantes }
}

/**
 * Grava premiações no Supabase:
 * - Dedupe: por título normalizado + ano (ou nome_premiado).
 */
export async function gravarPremiacoes(
  premiacoes: PremiacaoParaGravar[],
  client: SupabaseClientLike = (globalThis as any).__SUPABASE_CLIENT__ || supabase,
): Promise<{ contagem: RelatorioContagemTabela; erros: RelatorioGravacaoLattes['erros'] }> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []

  if (!premiacoes || premiacoes.length === 0) {
    return { contagem, erros }
  }

  const { data: existentes, error: errBusca } = await (client as any)
    .from('premiacoes')
    .select('id, titulo, ano')

  if (errBusca) {
    erros.push({
      tabela: 'premiacoes',
      item: 'listagem_inicial',
      mensagem: errBusca.message || 'Erro ao consultar premiações existentes.',
    })
    contagem.ignorados += premiacoes.length
    return { contagem, erros }
  }

  interface PremExistente {
    id: number
    titulo: string
    ano: number | null
  }
  const listaExistentes: PremExistente[] = existentes || []
  const mapaPorChave = new Map<string, PremExistente>()

  for (const pr of listaExistentes) {
    const chave = `${normalizarTitulo(pr.titulo)}_${pr.ano || 0}`
    mapaPorChave.set(chave, pr)
  }

  for (const prem of premiacoes) {
    const tituloLimpo = prem.titulo?.trim()
    if (!tituloLimpo) {
      contagem.ignorados++
      continue
    }

    const chave = `${normalizarTitulo(tituloLimpo)}_${prem.ano || 0}`
    const existente = mapaPorChave.get(chave)

    const payload: Record<string, unknown> = {
      titulo: tituloLimpo,
      ano: prem.ano ?? null,
      nome_premiado: prem.nome_premiado || '',
      instituicao: prem.instituicao || '',
      link_comprovacao: prem.link_comprovacao || '',
      observacoes: prem.observacoes || '',
    }

    if (existente) {
      const { error: updErr } = await (client as any)
        .from('premiacoes')
        .update(payload)
        .eq('id', existente.id)

      if (updErr) {
        erros.push({
          tabela: 'premiacoes',
          item: tituloLimpo,
          mensagem: updErr.message || 'Erro no update de premiação.',
        })
        contagem.ignorados++
      } else {
        contagem.atualizados++
      }
    } else {
      const { data: insData, error: insErr } = await (client as any)
        .from('premiacoes')
        .insert([payload])
        .select('id, titulo, ano')
        .single()

      if (insErr) {
        erros.push({
          tabela: 'premiacoes',
          item: tituloLimpo,
          mensagem: insErr.message || 'Erro no insert de premiação.',
        })
        contagem.ignorados++
      } else {
        contagem.inseridos++
        if (insData) {
          mapaPorChave.set(chave, insData as PremExistente)
        }
      }
    }
  }

  return { contagem, erros }
}

/**
 * Grava produção técnica no Supabase:
 * - Dedupe: por título normalizado + ano;
 * - Tipo mapeado estritamente para 'Software' | 'Patente' | 'Relatório'.
 */
export async function gravarProducaoTecnica(
  producoes: ProducaoTecnicaParaGravar[],
  client: SupabaseClientLike = (globalThis as any).__SUPABASE_CLIENT__ || supabase,
): Promise<{ contagem: RelatorioContagemTabela; erros: RelatorioGravacaoLattes['erros'] }> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []

  if (!producoes || producoes.length === 0) {
    return { contagem, erros }
  }

  const { data: existentes, error: errBusca } = await (client as any)
    .from('producao_tecnica')
    .select('id, titulo, ano, tipo')

  if (errBusca) {
    erros.push({
      tabela: 'producao_tecnica',
      item: 'listagem_inicial',
      mensagem: errBusca.message || 'Erro ao consultar produções técnicas existentes.',
    })
    contagem.ignorados += producoes.length
    return { contagem, erros }
  }

  interface PtExistente {
    id: number
    titulo: string
    ano: number | null
    tipo: string
  }
  const listaExistentes: PtExistente[] = existentes || []
  const mapaPorChave = new Map<string, PtExistente>()

  for (const pt of listaExistentes) {
    const chave = `${normalizarTitulo(pt.titulo)}_${pt.ano || 0}`
    mapaPorChave.set(chave, pt)
  }

  for (const prod of producoes) {
    const tituloLimpo = prod.titulo?.trim()
    if (!tituloLimpo) {
      contagem.ignorados++
      continue
    }

    const chave = `${normalizarTitulo(tituloLimpo)}_${prod.ano || 0}`
    const existente = mapaPorChave.get(chave)

    const payload: Record<string, unknown> = {
      titulo: tituloLimpo,
      ano: prod.ano ?? null,
      autores: prod.autores || '',
      tipo: prod.tipo || 'Software',
      link_comprovacao: prod.link_comprovacao || '',
      observacoes: prod.observacoes || '',
    }

    if (existente) {
      const { error: updErr } = await (client as any)
        .from('producao_tecnica')
        .update(payload)
        .eq('id', existente.id)

      if (updErr) {
        erros.push({
          tabela: 'producao_tecnica',
          item: tituloLimpo,
          mensagem: updErr.message || 'Erro no update de produção técnica.',
        })
        contagem.ignorados++
      } else {
        contagem.atualizados++
      }
    } else {
      const { data: insData, error: insErr } = await (client as any)
        .from('producao_tecnica')
        .insert([payload])
        .select('id, titulo, ano, tipo')
        .single()

      if (insErr) {
        erros.push({
          tabela: 'producao_tecnica',
          item: tituloLimpo,
          mensagem: insErr.message || 'Erro no insert de produção técnica.',
        })
        contagem.ignorados++
      } else {
        contagem.inseridos++
        if (insData) {
          mapaPorChave.set(chave, insData as PtExistente)
        }
      }
    }
  }

  return { contagem, erros }
}

/**
 * Grava patentes no Supabase:
 * - Dedupe: por número de registro INPI ou título normalizado;
 * - Status mapeado estritamente para 'Concessão' | 'Licenciamento' | 'Pendente'.
 */
export async function gravarPatentes(
  patentes: PatenteParaGravar[],
  client: SupabaseClientLike = (globalThis as any).__SUPABASE_CLIENT__ || supabase,
): Promise<{ contagem: RelatorioContagemTabela; erros: RelatorioGravacaoLattes['erros'] }> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []

  if (!patentes || patentes.length === 0) {
    return { contagem, erros }
  }

  const { data: existentes, error: errBusca } = await (client as any)
    .from('patentes')
    .select('id, titulo, inpi, status')

  if (errBusca) {
    erros.push({
      tabela: 'patentes',
      item: 'listagem_inicial',
      mensagem: errBusca.message || 'Erro ao consultar patentes existentes.',
    })
    contagem.ignorados += patentes.length
    return { contagem, erros }
  }

  interface PatExistente {
    id: number
    titulo: string
    inpi: string
    status: string
  }
  const listaExistentes: PatExistente[] = existentes || []
  const mapaPorInpi = new Map<string, PatExistente>()
  const mapaPorTitulo = new Map<string, PatExistente>()

  for (const pat of listaExistentes) {
    if (pat.inpi && pat.inpi !== 'Não informado') {
      mapaPorInpi.set(pat.inpi.trim().toUpperCase(), pat)
    }
    mapaPorTitulo.set(normalizarTitulo(pat.titulo), pat)
  }

  for (const pat of patentes) {
    const tituloLimpo = pat.titulo?.trim()
    if (!tituloLimpo) {
      contagem.ignorados++
      continue
    }

    const inpiLimpo = pat.inpi?.trim() || 'Não informado'
    let existente: PatExistente | undefined
    if (inpiLimpo !== 'Não informado') {
      existente = mapaPorInpi.get(inpiLimpo.toUpperCase())
    }
    if (!existente) {
      existente = mapaPorTitulo.get(normalizarTitulo(tituloLimpo))
    }

    const payload: Record<string, unknown> = {
      titulo: tituloLimpo,
      status: pat.status || 'Pendente',
      autores: pat.autores || '',
      inpi: inpiLimpo,
      link_comprovacao: pat.link_comprovacao || '',
      observacoes: pat.observacoes || '',
    }

    if (existente) {
      const { error: updErr } = await (client as any)
        .from('patentes')
        .update(payload)
        .eq('id', existente.id)

      if (updErr) {
        erros.push({
          tabela: 'patentes',
          item: tituloLimpo,
          mensagem: updErr.message || 'Erro no update de patente.',
        })
        contagem.ignorados++
      } else {
        contagem.atualizados++
      }
    } else {
      const { data: insData, error: insErr } = await (client as any)
        .from('patentes')
        .insert([payload])
        .select('id, titulo, inpi, status')
        .single()

      if (insErr) {
        erros.push({
          tabela: 'patentes',
          item: tituloLimpo,
          mensagem: insErr.message || 'Erro no insert de patente.',
        })
        contagem.ignorados++
      } else {
        contagem.inseridos++
        if (insData) {
          const rec = insData as PatExistente
          mapaPorTitulo.set(normalizarTitulo(rec.titulo), rec)
          if (rec.inpi && rec.inpi !== 'Não informado') {
            mapaPorInpi.set(rec.inpi.trim().toUpperCase(), rec)
          }
        }
      }
    }
  }

  return { contagem, erros }
}

/**
 * Grava eventos no Supabase:
 * - Dedupe: por docente + evento normalizado + ano (ou local_data);
 * - Mapeia papel, evento, docente, local_data.
 */
export async function gravarEventos(
  eventos: EventoParaGravar[],
  client: SupabaseClientLike = (globalThis as any).__SUPABASE_CLIENT__ || supabase,
): Promise<{ contagem: RelatorioContagemTabela; erros: RelatorioGravacaoLattes['erros'] }> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []

  if (!eventos || eventos.length === 0) {
    return { contagem, erros }
  }

  const { data: existentes, error: errBusca } = await (client as any)
    .from('eventos')
    .select('id, docente, evento, local_data, papel')

  if (errBusca) {
    erros.push({
      tabela: 'eventos',
      item: 'listagem_inicial',
      mensagem: errBusca.message || 'Erro ao consultar eventos existentes.',
    })
    contagem.ignorados += eventos.length
    return { contagem, erros }
  }

  interface EveExistente {
    id: number
    docente: string
    evento: string
    local_data: string
    papel: string
  }
  const listaExistentes: EveExistente[] = existentes || []
  const mapaPorChave = new Map<string, EveExistente>()

  for (const e of listaExistentes) {
    const chave = `${normalizarTitulo(e.docente || '')}_${normalizarTitulo(e.evento)}_${e.local_data || ''}`
    mapaPorChave.set(chave, e)
  }

  for (const ev of eventos) {
    const eventoNome = ev.evento?.trim()
    const docenteNome = ev.docente?.trim() || ''

    if (!eventoNome) {
      contagem.ignorados++
      continue
    }

    const chave = `${normalizarTitulo(docenteNome)}_${normalizarTitulo(eventoNome)}_${ev.local_data || ''}`
    const existente = mapaPorChave.get(chave)

    const payload: Record<string, unknown> = {
      docente: docenteNome,
      evento: eventoNome,
      local_data: ev.local_data || 'Não informado',
      papel: ev.papel || 'Participante',
      link_comprovacao: ev.link_comprovacao || '',
      observacoes: ev.observacoes || '',
    }

    if (existente) {
      const { error: updErr } = await (client as any)
        .from('eventos')
        .update(payload)
        .eq('id', existente.id)

      if (updErr) {
        erros.push({
          tabela: 'eventos',
          item: `${docenteNome ? docenteNome + ': ' : ''}${eventoNome}`,
          mensagem: updErr.message || 'Erro no update de evento.',
        })
        contagem.ignorados++
      } else {
        contagem.atualizados++
      }
    } else {
      const { data: insData, error: insErr } = await (client as any)
        .from('eventos')
        .insert([payload])
        .select('id, docente, evento, local_data, papel')
        .single()

      if (insErr) {
        erros.push({
          tabela: 'eventos',
          item: `${docenteNome ? docenteNome + ': ' : ''}${eventoNome}`,
          mensagem: insErr.message || 'Erro no insert de evento.',
        })
        contagem.ignorados++
      } else {
        contagem.inseridos++
        if (insData) {
          mapaPorChave.set(chave, insData as EveExistente)
        }
      }
    }
  }

  return { contagem, erros }
}

/**
 * Serviço de gravação de dados Lattes:
 * Executa a persistência para todas as 9 tabelas do sistema de acordo com os dados recebidos.
 * Mantém isolamento de falhas por tabela e relatório detalhado com contagens.
 */
export async function gravarDadosLattes(
  dados: {
    docentes?: DocenteParaGravar[]
    publicacoes?: PublicacaoParaGravar[]
    orientacoes?: OrientacaoParaGravar[]
    projetos_pesquisa?: ProjetoPesquisaParaGravar[]
    premiacoes?: PremiacaoParaGravar[]
    producao_tecnica?: ProducaoTecnicaParaGravar[]
    patentes?: PatenteParaGravar[]
    eventos?: EventoParaGravar[]
    disciplinas?: DisciplinaParaGravar[]
  },
  client: SupabaseClientLike = (globalThis as any).__SUPABASE_CLIENT__ || supabase,
  opcoes: OpcoesGravacao = {},
): Promise<RelatorioGravacaoLattes> {
  const relatorio: RelatorioGravacaoLattes = {
    docentes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    publicacoes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    orientacoes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    projetos_pesquisa: { inseridos: 0, atualizados: 0, ignorados: 0 },
    premiacoes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    producao_tecnica: { inseridos: 0, atualizados: 0, ignorados: 0 },
    patentes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    eventos: { inseridos: 0, atualizados: 0, ignorados: 0 },
    disciplinas: { inseridos: 0, atualizados: 0, ignorados: 0 },
    erros: [],
  }

  // 1. Docentes são persistidos primeiro para garantir que IDs existam para relacionamentos
  if (dados.docentes && dados.docentes.length > 0) {
    try {
      const resDoc = await gravarDocentes(dados.docentes, client)
      relatorio.docentes = resDoc.contagem
      relatorio.erros.push(...resDoc.erros)
    } catch (err: any) {
      relatorio.erros.push({
        tabela: 'docentes',
        item: 'lote_docentes',
        mensagem: err?.message || 'Falha crítica ao gravar docentes.',
      })
      relatorio.docentes.ignorados += dados.docentes.length
    }
  }

  // 2. Orientações (resolve/cria discentes e egressos). Antes das publicações: os alunos precisam
  // existir quando os artigos forem casados com orientandos e egressos (D-31).
  if (dados.orientacoes && dados.orientacoes.length > 0) {
    try {
      const resOri = await gravarOrientacoes(dados.orientacoes, client)
      relatorio.orientacoes = resOri.contagem
      relatorio.egressos = resOri.egressos
      relatorio.erros.push(...resOri.erros)
    } catch (err: any) {
      relatorio.erros.push({
        tabela: 'orientacoes',
        item: 'lote_orientacoes',
        mensagem: err?.message || 'Falha crítica ao gravar orientações.',
      })
      relatorio.orientacoes.ignorados += dados.orientacoes.length
    }
  }

  // 3. Publicações
  if (dados.publicacoes && dados.publicacoes.length > 0) {
    try {
      const resPub = await gravarPublicacoes(dados.publicacoes, client)
      relatorio.publicacoes = resPub.contagem
      relatorio.erros.push(...resPub.erros)
    } catch (err: any) {
      relatorio.erros.push({
        tabela: 'publicacoes',
        item: 'lote_publicacoes',
        mensagem: err?.message || 'Falha crítica ao gravar publicações.',
      })
      relatorio.publicacoes.ignorados += dados.publicacoes.length
    }
  }

  // 4. Projetos de pesquisa
  if (dados.projetos_pesquisa && dados.projetos_pesquisa.length > 0) {
    try {
      const resProj = await gravarProjetosPesquisa(
        dados.projetos_pesquisa,
        client,
        undefined,
        opcoes,
      )
      relatorio.projetos_pesquisa = resProj.contagem
      relatorio.vinculos = {
        publicacoes_docentes: relatorio.vinculos?.publicacoes_docentes ?? 0,
        publicacoes_coautores: relatorio.vinculos?.publicacoes_coautores ?? 0,
        orientadores_discentes: relatorio.vinculos?.orientadores_discentes ?? 0,
        ...relatorio.vinculos,
        projetos_participantes: resProj.participantes,
      }
      relatorio.erros.push(...resProj.erros)
    } catch (err: any) {
      relatorio.erros.push({
        tabela: 'projetos_pesquisa',
        item: 'lote_projetos',
        mensagem: err?.message || 'Falha crítica ao gravar projetos de pesquisa.',
      })
      relatorio.projetos_pesquisa.ignorados += dados.projetos_pesquisa.length
    }
  }

  // 6. Premiações
  if (dados.premiacoes && dados.premiacoes.length > 0) {
    try {
      const resPrem = await gravarPremiacoes(dados.premiacoes, client)
      relatorio.premiacoes = resPrem.contagem
      relatorio.erros.push(...resPrem.erros)
    } catch (err: any) {
      relatorio.erros.push({
        tabela: 'premiacoes',
        item: 'lote_premiacoes',
        mensagem: err?.message || 'Falha crítica ao gravar premiações.',
      })
      relatorio.premiacoes.ignorados += dados.premiacoes.length
    }
  }

  // 7. Produção técnica
  if (dados.producao_tecnica && dados.producao_tecnica.length > 0) {
    try {
      const resPt = await gravarProducaoTecnica(dados.producao_tecnica, client)
      relatorio.producao_tecnica = resPt.contagem
      relatorio.erros.push(...resPt.erros)
    } catch (err: any) {
      relatorio.erros.push({
        tabela: 'producao_tecnica',
        item: 'lote_producao_tecnica',
        mensagem: err?.message || 'Falha crítica ao gravar produção técnica.',
      })
      relatorio.producao_tecnica.ignorados += dados.producao_tecnica.length
    }
  }

  // 8. Patentes
  if (dados.patentes && dados.patentes.length > 0) {
    try {
      const resPat = await gravarPatentes(dados.patentes, client)
      relatorio.patentes = resPat.contagem
      relatorio.erros.push(...resPat.erros)
    } catch (err: any) {
      relatorio.erros.push({
        tabela: 'patentes',
        item: 'lote_patentes',
        mensagem: err?.message || 'Falha crítica ao gravar patentes.',
      })
      relatorio.patentes.ignorados += dados.patentes.length
    }
  }

  // 9. Eventos
  if (dados.eventos && dados.eventos.length > 0) {
    try {
      const resEve = await gravarEventos(dados.eventos, client)
      relatorio.eventos = resEve.contagem
      relatorio.erros.push(...resEve.erros)
    } catch (err: any) {
      relatorio.erros.push({
        tabela: 'eventos',
        item: 'lote_eventos',
        mensagem: err?.message || 'Falha crítica ao gravar eventos.',
      })
      relatorio.eventos.ignorados += dados.eventos.length
    }
  }

  // 10. Disciplinas (gravação desativada — preenchimento exclusivamente manual)
  if (dados.disciplinas && dados.disciplinas.length > 0) {
    const resDisc = await gravarDisciplinas(dados.disciplinas, client)
    relatorio.disciplinas = resDisc.contagem
  }

  return relatorio
}
