import { supabase } from '@/lib/supabase/client'
import { normalizarTitulo } from './dedupe'
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

export interface RelatorioContagemTabela {
  inseridos: number
  atualizados: number
  ignorados: number
}

export interface RelatorioGravacaoLattes {
  docentes: RelatorioContagemTabela
  publicacoes: RelatorioContagemTabela
  orientacoes: RelatorioContagemTabela
  bancas: RelatorioContagemTabela
  projetos_pesquisa: RelatorioContagemTabela
  premiacoes: RelatorioContagemTabela
  producao_tecnica: RelatorioContagemTabela
  patentes: RelatorioContagemTabela
  eventos: RelatorioContagemTabela
  erros: Array<{
    tabela: TabelaAlvoId | 'discentes'
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
}

export interface PublicacaoParaGravar {
  titulo: string
  autores: string
  periodico: string
  ano: number
  doi?: string | null
  link_comprovacao?: string | null
  observacoes?: string | null
}

export interface OrientacaoParaGravar {
  docente_id?: number | null
  docente_identificador?: string | null // id_lattes ou nome para resolução
  discente_id?: number | null
  discente_nome: string
  tipo: string
  inicio: string
  fim?: string | null
  status: 'ativo' | 'concluido' | 'cancelado'
  link_comprovacao?: string | null
  observacoes?: string | null
  titulo_trabalho?: string | null
  ano_referencia?: number | null
}

export interface BancaParaGravar {
  titulo_trabalho: string
  data: string
  discente_id?: number | null
  candidato_nome?: string | null
  membros: string
  tipo: 'Mestrado' | 'Doutorado' | 'Qualificação'
  ano_referencia?: number | null
  link_comprovacao?: string | null
  observacoes?: string | null
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

interface DocenteExistenteBanco {
  id: number
  nome: string
  id_lattes: string | null
}

interface PublicacaoExistenteBanco {
  id: number
  titulo: string
  ano: number
}

// Tipo flexível para permitir injeção de dependência / mock do Supabase nos testes unitários
export type SupabaseClientLike = typeof supabase

/**
 * Converte um LattesDocente extraído pelo parser Lattes para o formato de persistência.
 */
export function converterLattesDocente(d: LattesDocente): DocenteParaGravar {
  return {
    id_lattes: d.id_lattes && d.id_lattes.trim() !== '' ? d.id_lattes.trim() : null,
    nome: d.nome_completo ? d.nome_completo.trim() : '',
  }
}

/**
 * Converte um LattesPublicacao extraído pelo parser Lattes para o formato da tabela publicacoes.
 * Mapeia: titulo, autores (lista de nomes separados por vírgula), periodico, ano, doi.
 * Campos sem origem no XML (link_comprovacao, observacoes) ficam como string vazia / nulo.
 */
export function converterLattesPublicacao(p: LattesPublicacao): PublicacaoParaGravar {
  return {
    titulo: p.titulo ? p.titulo.trim() : '',
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

  const statusDb: 'ativo' | 'concluido' | 'cancelado' =
    o.situacao === 'CONCLUIDA' ? 'concluido' : 'ativo'

  const anoRef = o.ano_conclusao || o.ano_inicio || null
  const inicioStr = o.ano_inicio ? String(o.ano_inicio) : anoRef ? String(anoRef) : ''
  const fimStr = o.ano_conclusao ? String(o.ano_conclusao) : ''

  const obsPartes: string[] = []
  if (o.titulo_trabalho) obsPartes.push(`Título: ${o.titulo_trabalho.trim()}`)
  if (o.tipo_orientacao === 'CO_ORIENTADOR') obsPartes.push('Co-orientador')
  if (o.instituicao) obsPartes.push(`Instituição: ${o.instituicao}`)
  if (o.curso) obsPartes.push(`Curso: ${o.curso}`)
  if (o.agencia_fomento) obsPartes.push(`Fomento: ${o.agencia_fomento}`)

  return {
    docente_identificador: docenteContexto?.id_lattes || docenteContexto?.nome || null,
    discente_nome: o.orientando ? o.orientando.trim() : '',
    tipo: tipoDb,
    inicio: inicioStr,
    fim: fimStr,
    status: statusDb,
    link_comprovacao: '',
    observacoes: obsPartes.join(' | '),
    titulo_trabalho: o.titulo_trabalho ? o.titulo_trabalho.trim() : null,
    ano_referencia: anoRef,
  }
}

/**
 * Converte LattesBanca para o formato da tabela bancas.
 * Deriva o tipo estrito: 'Mestrado' | 'Doutorado' | 'Qualificação'.
 */
export function converterLattesBanca(b: LattesBanca): BancaParaGravar {
  let tipoDb: 'Mestrado' | 'Doutorado' | 'Qualificação' = 'Mestrado'
  if (b.tipo === 'DOUTORADO') {
    tipoDb = 'Doutorado'
  } else if (b.tipo === 'QUALIFICACAO') {
    tipoDb = 'Qualificação'
  } else {
    // MESTRADO, GRADUACAO ou OUTRA -> padrão 'Mestrado' (respeitando CHECK constraint)
    tipoDb = 'Mestrado'
  }

  const anoNum = typeof b.ano === 'number' ? b.ano : parseInt(String(b.ano), 10) || null
  const dataStr = anoNum ? String(anoNum) : ''

  const obsPartes: string[] = []
  if (b.tipo === 'GRADUACAO') obsPartes.push('Banca de Graduação / TCC')
  if (b.instituicao) obsPartes.push(`Instituição: ${b.instituicao}`)
  if (b.curso) obsPartes.push(`Curso: ${b.curso}`)

  return {
    titulo_trabalho: b.titulo_trabalho ? b.titulo_trabalho.trim() : '',
    tipo: tipoDb,
    data: dataStr,
    candidato_nome: b.candidato ? b.candidato.trim() : null,
    membros: b.participantes ? b.participantes.trim() : '',
    ano_referencia: anoNum,
    link_comprovacao: '',
    observacoes: obsPartes.join(' | '),
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
  const coordenadorIdCnpq = coordenador?.id_cnpq || null
  const coordenadorNome = coordenador?.nome || (p.responsavel ? docenteContexto?.nome : null)

  const orgaoFomento =
    p.financiadores && p.financiadores.length > 0 ? p.financiadores.join(', ') : ''
  const financiamento = Boolean(p.financiadores && p.financiadores.length > 0)

  const inicioStr = p.ano_inicio ? String(p.ano_inicio) : ''
  const fimStr = p.ano_fim ? String(p.ano_fim) : p.situacao === 'EM_ANDAMENTO' ? 'Atual' : ''

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
    coordenador_identificador:
      coordenadorIdCnpq ||
      coordenadorNome ||
      docenteContexto?.id_lattes ||
      docenteContexto?.nome ||
      null,
    financiamento,
    orgao_fomento: orgaoFomento,
    link_comprovacao: '',
    observacoes: obsPartes.join(' | '),
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
    titulo: pr.nome ? pr.nome.trim() : '',
    ano: anoNum,
    nome_premiado: docenteContexto?.nome ? docenteContexto.nome.trim() : '',
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
  const docenteNome = docenteContexto?.nome ? docenteContexto.nome.trim() : ''

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
    evento: e.nome ? e.nome.trim() : '',
    local_data: localDataStr,
    papel: papelDb,
    ano_referencia: anoNum,
    link_comprovacao: '',
    observacoes: obsPartes.join(' | '),
  }
}

/**
 * Grava docentes no Supabase seguindo as regras da Subetapa 2A:
 * - Casar por `id_lattes` se presente.
 * - Se existir docente com esse id_lattes -> UPDATE (nome e demais campos extraídos);
 *   senão INSERT.
 * - Se id_lattes ausente / nulo / vazio, casar por nome exato (trim).
 *   Se encontrar -> UPDATE; senão INSERT.
 * - Retorna contagem { inseridos, atualizados, ignorados }.
 */
export async function gravarDocentes(
  docentes: DocenteParaGravar[],
  client: SupabaseClientLike = supabase,
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

  for (const d of listaExistentes) {
    if (d.id_lattes && d.id_lattes.trim() !== '') {
      porIdLattes.set(d.id_lattes.trim(), d)
    }
    if (d.nome && d.nome.trim() !== '') {
      porNomeExato.set(d.nome.trim(), d)
    }
  }

  for (const doc of docentes) {
    const nomeLimpo = doc.nome?.trim()
    const idLattesLimpo = doc.id_lattes?.trim() || null

    if (!nomeLimpo) {
      contagem.ignorados++
      continue
    }

    // Procura match
    let encontrado: DocenteExistenteBanco | undefined
    if (idLattesLimpo) {
      encontrado = porIdLattes.get(idLattesLimpo)
    }

    // Se id_lattes ausente ou não encontrou por id_lattes mas sem id_lattes informado:
    // "Se id_lattes ausente, casar por nome exato."
    if (!idLattesLimpo && !encontrado) {
      encontrado = porNomeExato.get(nomeLimpo)
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
  client: SupabaseClientLike = supabase,
): Promise<{ contagem: RelatorioContagemTabela; erros: RelatorioGravacaoLattes['erros'] }> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []

  if (!publicacoes || publicacoes.length === 0) {
    return { contagem, erros }
  }

  // 1. Carrega todas as publicações existentes no banco para comparação por título normalizado + ano
  const { data: existentes, error: buscaErro } = await (client as any)
    .from('publicacoes')
    .select('id, titulo, ano')

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
        }
      }
    }
  }

  return { contagem, erros }
}

interface DiscenteExistenteBanco {
  id: number
  nome: string
  link_lattes?: string | null
}

/**
 * Resolve ou cria um discente pelo nome no banco Supabase.
 * Matching:
 * 1. Nome normalizado (sem acentos, minúsculo, trim).
 * 2. Se não encontrar, insere na tabela discentes com status 'ativo' e data_ingresso ano corrente.
 */
export async function resolverOuCriarDiscente(
  nomeDiscente: string,
  cacheDiscentes: {
    porNomeNormalizado: Map<string, DiscenteExistenteBanco>
    lista: DiscenteExistenteBanco[]
  },
  client: SupabaseClientLike = supabase,
): Promise<{ id: number; criado: boolean } | null> {
  const nomeLimpo = nomeDiscente.trim()
  if (!nomeLimpo) return null

  const chave = normalizarTitulo(nomeLimpo)
  const existente = cacheDiscentes.porNomeNormalizado.get(chave)
  if (existente) {
    return { id: existente.id, criado: false }
  }

  // Tenta inserir novo discente
  const novoPayload = {
    nome: nomeLimpo,
    cpf: '',
    data_ingresso: String(new Date().getFullYear()),
    status: 'ativo',
    link_lattes: '',
    link_comprovacao: '',
    observacoes: 'Cadastrado automaticamente via importação Lattes',
  }

  const { data, error } = await (client as any)
    .from('discentes')
    .insert([novoPayload])
    .select('id, nome')
    .single()

  if (error || !data) {
    return null
  }

  const rec: DiscenteExistenteBanco = { id: data.id, nome: data.nome }
  cacheDiscentes.lista.push(rec)
  cacheDiscentes.porNomeNormalizado.set(chave, rec)
  return { id: rec.id, criado: true }
}

/**
 * Grava orientações no Supabase:
 * - Resolve docente_id via id_lattes ou nome;
 * - Resolve/cria discente_id via nome;
 * - Dedupe: mesmo docente_id + mesmo discente_id + mesmo ano de início/referência + tipo
 *   (ou discente_id + ano_referencia quando docente não vinculado);
 *   se existir -> UPDATE, senão INSERT.
 */
export async function gravarOrientacoes(
  orientacoes: OrientacaoParaGravar[],
  client: SupabaseClientLike = supabase,
  mapaDocentesPrecarregado?: {
    porIdLattes: Map<string, DocenteExistenteBanco>
    porNomeNormalizado: Map<string, DocenteExistenteBanco>
  },
): Promise<{ contagem: RelatorioContagemTabela; erros: RelatorioGravacaoLattes['erros'] }> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []

  if (!orientacoes || orientacoes.length === 0) {
    return { contagem, erros }
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
    return { contagem, erros }
  }

  // 2. Carrega discentes para cache em memória
  const { data: existentesDisc, error: errDisc } = await (client as any)
    .from('discentes')
    .select('id, nome, link_lattes')

  if (errDisc) {
    erros.push({
      tabela: 'orientacoes',
      item: 'discentes_cache',
      mensagem: errDisc.message || 'Erro ao carregar discentes para vinculo de orientação.',
    })
    contagem.ignorados += orientacoes.length
    return { contagem, erros }
  }

  const cacheDiscentes = {
    lista: (existentesDisc || []) as DiscenteExistenteBanco[],
    porNomeNormalizado: new Map<string, DiscenteExistenteBanco>(),
  }
  for (const d of cacheDiscentes.lista) {
    if (d.nome) cacheDiscentes.porNomeNormalizado.set(normalizarTitulo(d.nome), d)
  }

  // 3. Carrega docentes se não fornecido
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
    const chave = `${o.docente_id || 0}_${o.discente_id || 0}_${normalizarTitulo(o.tipo || '')}_${o.inicio || ''}`
    mapaOriExistentes.set(chave, o)
  }

  for (const ori of orientacoes) {
    // Resolver docente_id
    let docenteId: number | null = ori.docente_id ?? null
    if (!docenteId && ori.docente_identificador) {
      const matchLattes = docMapas.porIdLattes.get(ori.docente_identificador.trim())
      if (matchLattes) {
        docenteId = matchLattes.id
      } else {
        const matchNome = docMapas.porNomeNormalizado.get(
          normalizarTitulo(ori.docente_identificador),
        )
        if (matchNome) docenteId = matchNome.id
      }
    }

    // Resolver discente_id
    let discenteId: number | null = ori.discente_id ?? null
    if (!discenteId && ori.discente_nome) {
      try {
        const resDisc = await resolverOuCriarDiscente(ori.discente_nome, cacheDiscentes, client)
        if (resDisc) discenteId = resDisc.id
      } catch (err) {
        // Ignora falha silenciosa para não quebrar fluxo todo
      }
    }

    const tipoFinal = ori.tipo || 'Mestrado'
    const inicioFinal = ori.inicio || (ori.ano_referencia ? String(ori.ano_referencia) : '')
    const chaveDedupe = `${docenteId || 0}_${discenteId || 0}_${normalizarTitulo(tipoFinal)}_${inicioFinal}`
    const existente = mapaOriExistentes.get(chaveDedupe)

    const payload: Record<string, unknown> = {
      tipo: tipoFinal,
      inicio: inicioFinal,
      fim: ori.fim || '',
      status: ori.status || 'ativo',
      docente_id: docenteId,
      discente_id: discenteId,
      link_comprovacao: ori.link_comprovacao || '',
      observacoes: ori.observacoes || '',
    }

    if (existente) {
      // UPDATE
      const { error: updErr } = await (client as any)
        .from('orientacoes')
        .update(payload)
        .eq('id', existente.id)

      if (updErr) {
        erros.push({
          tabela: 'orientacoes',
          item: `${ori.discente_nome || 'Orientação'} (${tipoFinal})`,
          mensagem: updErr.message || 'Erro no update de orientação.',
        })
        contagem.ignorados++
      } else {
        contagem.atualizados++
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
        if (insData) {
          mapaOriExistentes.set(chaveDedupe, insData as OriExistente)
        }
      }
    }
  }

  return { contagem, erros }
}

/**
 * Grava bancas no Supabase:
 * - Dedupe: por título normalizado + ano (ou título normalizado);
 * - Resolve discente_id pelo candidato_nome se presente;
 * - Tipo mapeado estritamente para 'Mestrado' | 'Doutorado' | 'Qualificação'.
 */
export async function gravarBancas(
  bancas: BancaParaGravar[],
  client: SupabaseClientLike = supabase,
): Promise<{ contagem: RelatorioContagemTabela; erros: RelatorioGravacaoLattes['erros'] }> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []

  if (!bancas || bancas.length === 0) {
    return { contagem, erros }
  }

  // 1. Carrega bancas existentes
  const { data: existentes, error: errBusca } = await (client as any)
    .from('bancas')
    .select('id, titulo_trabalho, data, tipo')

  if (errBusca) {
    erros.push({
      tabela: 'bancas',
      item: 'listagem_inicial',
      mensagem: errBusca.message || 'Erro ao consultar bancas existentes.',
    })
    contagem.ignorados += bancas.length
    return { contagem, erros }
  }

  // 2. Cache de discentes para resolução de candidato_nome
  const { data: discentesData } = await (client as any).from('discentes').select('id, nome')
  const mapDiscentes = new Map<string, number>()
  for (const d of discentesData || []) {
    if (d.nome) mapDiscentes.set(normalizarTitulo(d.nome), d.id)
  }

  interface BancaExistente {
    id: number
    titulo_trabalho: string
    data: string
    tipo: string
  }
  const listaExistentes: BancaExistente[] = existentes || []
  const mapaPorChave = new Map<string, BancaExistente>()

  for (const b of listaExistentes) {
    const anoStr = b.data ? b.data.slice(0, 4) : ''
    const chave = `${normalizarTitulo(b.titulo_trabalho)}_${anoStr}`
    mapaPorChave.set(chave, b)
  }

  for (const banca of bancas) {
    const tituloLimpo = banca.titulo_trabalho?.trim()
    if (!tituloLimpo) {
      contagem.ignorados++
      continue
    }

    const anoStr = banca.ano_referencia
      ? String(banca.ano_referencia)
      : banca.data
        ? banca.data.slice(0, 4)
        : ''
    const chave = `${normalizarTitulo(tituloLimpo)}_${anoStr}`
    const existente = mapaPorChave.get(chave)

    // Resolve discente_id se houver candidato
    let discenteId = banca.discente_id ?? null
    if (!discenteId && banca.candidato_nome) {
      discenteId = mapDiscentes.get(normalizarTitulo(banca.candidato_nome)) || null
    }

    const payload: Record<string, unknown> = {
      titulo_trabalho: tituloLimpo,
      data: banca.data || anoStr || '',
      membros: banca.membros || '',
      tipo: banca.tipo || 'Mestrado',
      discente_id: discenteId,
      link_comprovacao: banca.link_comprovacao || '',
      observacoes: banca.observacoes || '',
    }

    if (existente) {
      const { error: updErr } = await (client as any)
        .from('bancas')
        .update(payload)
        .eq('id', existente.id)

      if (updErr) {
        erros.push({
          tabela: 'bancas',
          item: tituloLimpo,
          mensagem: updErr.message || 'Erro no update de banca.',
        })
        contagem.ignorados++
      } else {
        contagem.atualizados++
      }
    } else {
      const { data: insData, error: insErr } = await (client as any)
        .from('bancas')
        .insert([payload])
        .select('id, titulo_trabalho, data, tipo')
        .single()

      if (insErr) {
        erros.push({
          tabela: 'bancas',
          item: tituloLimpo,
          mensagem: insErr.message || 'Erro no insert de banca.',
        })
        contagem.ignorados++
      } else {
        contagem.inseridos++
        if (insData) {
          mapaPorChave.set(chave, insData as BancaExistente)
        }
      }
    }
  }

  return { contagem, erros }
}

/**
 * Grava projetos de pesquisa no Supabase:
 * - Coordenador resolvido por NRO-ID-CNPQ / id_lattes ou nome;
 * - Financiadores mapeados para orgao_fomento;
 * - Dedupe: por título normalizado + início.
 */
export async function gravarProjetosPesquisa(
  projetos: ProjetoPesquisaParaGravar[],
  client: SupabaseClientLike = supabase,
  mapaDocentesPrecarregado?: {
    porIdLattes: Map<string, DocenteExistenteBanco>
    porNomeNormalizado: Map<string, DocenteExistenteBanco>
  },
): Promise<{ contagem: RelatorioContagemTabela; erros: RelatorioGravacaoLattes['erros'] }> {
  const contagem: RelatorioContagemTabela = { inseridos: 0, atualizados: 0, ignorados: 0 }
  const erros: RelatorioGravacaoLattes['erros'] = []

  if (!projetos || projetos.length === 0) {
    return { contagem, erros }
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
    return { contagem, erros }
  }

  // 2. Carrega mapa de docentes para resolução de coordenador
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

  interface ProjetoExistente {
    id: number
    titulo: string
    inicio: string
  }
  const listaExistentes: ProjetoExistente[] = existentes || []
  const mapaPorChave = new Map<string, ProjetoExistente>()

  for (const p of listaExistentes) {
    const chave = `${normalizarTitulo(p.titulo)}_${p.inicio || ''}`
    mapaPorChave.set(chave, p)
  }

  for (const proj of projetos) {
    const tituloLimpo = proj.titulo?.trim()
    if (!tituloLimpo) {
      contagem.ignorados++
      continue
    }

    // Resolver coordenador_id
    let coordId = proj.coordenador_id ?? null
    if (!coordId && proj.coordenador_identificador) {
      const matchLattes = docMapas.porIdLattes.get(proj.coordenador_identificador.trim())
      if (matchLattes) {
        coordId = matchLattes.id
      } else {
        const matchNome = docMapas.porNomeNormalizado.get(
          normalizarTitulo(proj.coordenador_identificador),
        )
        if (matchNome) coordId = matchNome.id
      }
    }

    const chave = `${normalizarTitulo(tituloLimpo)}_${proj.inicio || ''}`
    const existente = mapaPorChave.get(chave)

    const payload: Record<string, unknown> = {
      titulo: tituloLimpo,
      descricao: proj.descricao || '',
      inicio: proj.inicio || '',
      fim: proj.fim || '',
      coordenador_id: coordId,
      financiamento: Boolean(proj.financiamento),
      orgao_fomento: proj.orgao_fomento || '',
      link_comprovacao: proj.link_comprovacao || '',
      observacoes: proj.observacoes || '',
    }

    if (existente) {
      const { error: updErr } = await (client as any)
        .from('projetos_pesquisa')
        .update(payload)
        .eq('id', existente.id)

      if (updErr) {
        erros.push({
          tabela: 'projetos_pesquisa',
          item: tituloLimpo,
          mensagem: updErr.message || 'Erro no update de projeto de pesquisa.',
        })
        contagem.ignorados++
      } else {
        contagem.atualizados++
      }
    } else {
      const { data: insData, error: insErr } = await (client as any)
        .from('projetos_pesquisa')
        .insert([payload])
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
        }
      }
    }
  }

  return { contagem, erros }
}

/**
 * Grava premiações no Supabase:
 * - Dedupe: por título normalizado + ano (ou nome_premiado).
 */
export async function gravarPremiacoes(
  premiacoes: PremiacaoParaGravar[],
  client: SupabaseClientLike = supabase,
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
  client: SupabaseClientLike = supabase,
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
  client: SupabaseClientLike = supabase,
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
  client: SupabaseClientLike = supabase,
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
    bancas?: BancaParaGravar[]
    projetos_pesquisa?: ProjetoPesquisaParaGravar[]
    premiacoes?: PremiacaoParaGravar[]
    producao_tecnica?: ProducaoTecnicaParaGravar[]
    patentes?: PatenteParaGravar[]
    eventos?: EventoParaGravar[]
  },
  client: SupabaseClientLike = supabase,
): Promise<RelatorioGravacaoLattes> {
  const relatorio: RelatorioGravacaoLattes = {
    docentes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    publicacoes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    orientacoes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    bancas: { inseridos: 0, atualizados: 0, ignorados: 0 },
    projetos_pesquisa: { inseridos: 0, atualizados: 0, ignorados: 0 },
    premiacoes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    producao_tecnica: { inseridos: 0, atualizados: 0, ignorados: 0 },
    patentes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    eventos: { inseridos: 0, atualizados: 0, ignorados: 0 },
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

  // 2. Publicações
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

  // 3. Orientações (resolve discentes e docentes)
  if (dados.orientacoes && dados.orientacoes.length > 0) {
    try {
      const resOri = await gravarOrientacoes(dados.orientacoes, client)
      relatorio.orientacoes = resOri.contagem
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

  // 4. Bancas
  if (dados.bancas && dados.bancas.length > 0) {
    try {
      const resBan = await gravarBancas(dados.bancas, client)
      relatorio.bancas = resBan.contagem
      relatorio.erros.push(...resBan.erros)
    } catch (err: any) {
      relatorio.erros.push({
        tabela: 'bancas',
        item: 'lote_bancas',
        mensagem: err?.message || 'Falha crítica ao gravar bancas.',
      })
      relatorio.bancas.ignorados += dados.bancas.length
    }
  }

  // 5. Projetos de pesquisa
  if (dados.projetos_pesquisa && dados.projetos_pesquisa.length > 0) {
    try {
      const resProj = await gravarProjetosPesquisa(dados.projetos_pesquisa, client)
      relatorio.projetos_pesquisa = resProj.contagem
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

  return relatorio
}
