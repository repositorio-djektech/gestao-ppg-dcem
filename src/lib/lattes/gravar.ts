import { supabase } from '@/lib/supabase/client'
import { normalizarTitulo } from './dedupe'
import type { LattesDocente, LattesPublicacao } from './types'

export interface RelatorioContagemTabela {
  inseridos: number
  atualizados: number
  ignorados: number
}

export interface RelatorioGravacaoLattes {
  docentes: RelatorioContagemTabela
  publicacoes: RelatorioContagemTabela
  erros: Array<{
    tabela: 'docentes' | 'publicacoes'
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

/**
 * Serviço de gravação de dados Lattes:
 * Executa a persistência APENAS para `docentes` e `publicacoes`.
 * Retorna relatório consolidado com contagens { inseridos, atualizados, ignorados } por tabela.
 */
export async function gravarDadosLattes(
  dados: {
    docentes?: DocenteParaGravar[]
    publicacoes?: PublicacaoParaGravar[]
  },
  client: SupabaseClientLike = supabase,
): Promise<RelatorioGravacaoLattes> {
  const relatorio: RelatorioGravacaoLattes = {
    docentes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    publicacoes: { inseridos: 0, atualizados: 0, ignorados: 0 },
    erros: [],
  }

  if (dados.docentes && dados.docentes.length > 0) {
    const resDoc = await gravarDocentes(dados.docentes, client)
    relatorio.docentes = resDoc.contagem
    relatorio.erros.push(...resDoc.erros)
  }

  if (dados.publicacoes && dados.publicacoes.length > 0) {
    const resPub = await gravarPublicacoes(dados.publicacoes, client)
    relatorio.publicacoes = resPub.contagem
    relatorio.erros.push(...resPub.erros)
  }

  return relatorio
}
