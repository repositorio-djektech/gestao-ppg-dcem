import { readLattesFiles, type LattesArquivoLido } from './readFiles'
import { parseLattesXml } from './parser'
import { ANO_INICIO, ANO_FIM, filtrarPorQuadrienio } from './quadrienio'
import { deduplicarItens } from './dedupe'
import type { LattesArquivoResultado } from './types'

export interface ItemErroImportacao {
  arquivo: string
  origem: 'xml' | 'zip'
  zipArquivoPai?: string
  mensagem: string
}

export interface ResumoSecaoImportada {
  chave: string
  rotulo: string
  totalLidos: number
  totalValidos: number
  totalDuplicados: number
  totalForaQuadrienio: number
}

export interface ResultadoProcessamentoLattes {
  arquivosLidosCount: number
  curriculosProcessadosCount: number
  erros: ItemErroImportacao[]
  resultados: LattesArquivoResultado[]
  resumoGeral: {
    totalDocentes: number
    secoes: Record<string, ResumoSecaoImportada>
  }
}

/**
 * Executa o fluxo de importação completo da Subetapa 1B:
 * 1. readLattesFiles: lê arquivos .xml e .zip descompactando e decodificando ISO-8859-1
 * 2. parseLattesXml: analisa o XML gerando itens brutos e metadados
 * 3. filtrarPorQuadrienio: reforça o recorte temporal (2022–2025)
 * 4. deduplicarItens: remove duplicatas por chave normalizada (título + ano)
 * 5. Agrega estatísticas e resumo para revisão posterior (subetapa 1C), sem persistência no banco.
 */
export async function processarArquivosLattes(
  arquivos: File[] | FileList,
): Promise<ResultadoProcessamentoLattes> {
  const arquivosLidos: LattesArquivoLido[] = await readLattesFiles(arquivos)

  const erros: ItemErroImportacao[] = []
  const resultados: LattesArquivoResultado[] = []

  const secoesResumo: Record<string, ResumoSecaoImportada> = {
    publicacoes: {
      chave: 'publicacoes',
      rotulo: 'Publicações',
      totalLidos: 0,
      totalValidos: 0,
      totalDuplicados: 0,
      totalForaQuadrienio: 0,
    },
    orientacoes: {
      chave: 'orientacoes',
      rotulo: 'Orientações',
      totalLidos: 0,
      totalValidos: 0,
      totalDuplicados: 0,
      totalForaQuadrienio: 0,
    },
    bancas: {
      chave: 'bancas',
      rotulo: 'Bancas',
      totalLidos: 0,
      totalValidos: 0,
      totalDuplicados: 0,
      totalForaQuadrienio: 0,
    },
    projetos: {
      chave: 'projetos',
      rotulo: 'Projetos de Pesquisa',
      totalLidos: 0,
      totalValidos: 0,
      totalDuplicados: 0,
      totalForaQuadrienio: 0,
    },
    producoes_tecnicas: {
      chave: 'producoes_tecnicas',
      rotulo: 'Produção Técnica',
      totalLidos: 0,
      totalValidos: 0,
      totalDuplicados: 0,
      totalForaQuadrienio: 0,
    },
    patentes: {
      chave: 'patentes',
      rotulo: 'Patentes',
      totalLidos: 0,
      totalValidos: 0,
      totalDuplicados: 0,
      totalForaQuadrienio: 0,
    },
    eventos: {
      chave: 'eventos',
      rotulo: 'Eventos',
      totalLidos: 0,
      totalValidos: 0,
      totalDuplicados: 0,
      totalForaQuadrienio: 0,
    },
    premiacoes: {
      chave: 'premiacoes',
      rotulo: 'Premiações',
      totalLidos: 0,
      totalValidos: 0,
      totalDuplicados: 0,
      totalForaQuadrienio: 0,
    },
  }

  for (const arq of arquivosLidos) {
    try {
      if (!arq.xml || arq.xml.trim().length === 0) {
        erros.push({
          arquivo: arq.nomeArquivo,
          origem: arq.origem,
          zipArquivoPai: arq.zipArquivoPai,
          mensagem: 'O arquivo XML está vazio ou não pôde ser decodificado.',
        })
        continue
      }

      const parsed = parseLattesXml(arq.xml, arq.nomeArquivo)

      if (!parsed.sucesso || parsed.erro) {
        erros.push({
          arquivo: arq.nomeArquivo,
          origem: arq.origem,
          zipArquivoPai: arq.zipArquivoPai,
          mensagem: parsed.erro || 'Falha ao processar o XML do currículo Lattes.',
        })
        continue
      }

      // Aplica filtrarPorQuadrienio e deduplicarItens explicitamente
      // Publicações
      const pubQuad = filtrarPorQuadrienio(parsed.publicacoes, (p) => p.ano, ANO_INICIO, ANO_FIM)
      const pubDedupe = deduplicarItens(
        pubQuad.dentro,
        (p) => p.titulo,
        (p) => p.ano,
      )

      // Orientações
      const oriQuad = filtrarPorQuadrienio(
        parsed.orientacoes,
        (o) => o.ano_conclusao || o.ano_inicio || null,
        ANO_INICIO,
        ANO_FIM,
      )
      const oriDedupe = deduplicarItens(
        oriQuad.dentro,
        (o) => `${o.orientando} ${o.titulo_trabalho || ''}`,
        (o) => o.ano_conclusao || o.ano_inicio || null,
      )

      // Bancas
      const banQuad = filtrarPorQuadrienio(parsed.bancas, (b) => b.ano, ANO_INICIO, ANO_FIM)
      const banDedupe = deduplicarItens(
        banQuad.dentro,
        (b) => b.titulo_trabalho,
        (b) => b.ano,
      )

      // Projetos
      const projQuad = filtrarPorQuadrienio(
        parsed.projetos,
        (p) => p.ano_fim || p.ano_inicio || null,
        ANO_INICIO,
        ANO_FIM,
      )
      const projDedupe = deduplicarItens(
        projQuad.dentro,
        (p) => p.nome,
        (p) => p.ano_inicio || p.ano_fim || null,
      )

      // Produções técnicas
      const prodQuad = filtrarPorQuadrienio(
        parsed.producoes_tecnicas,
        (pt) => pt.ano,
        ANO_INICIO,
        ANO_FIM,
      )
      const prodDedupe = deduplicarItens(
        prodQuad.dentro,
        (pt) => pt.titulo,
        (pt) => pt.ano,
      )

      // Patentes
      const patQuad = filtrarPorQuadrienio(
        parsed.patentes,
        (p) => p.ano_concessao || p.ano_deposito || p.ano_desenvolvimento || null,
        ANO_INICIO,
        ANO_FIM,
      )
      const patDedupe = deduplicarItens(
        patQuad.dentro,
        (p) => p.titulo,
        (p) => p.ano_concessao || p.ano_deposito || p.ano_desenvolvimento || null,
      )

      // Eventos
      const eveQuad = filtrarPorQuadrienio(parsed.eventos, (e) => e.ano, ANO_INICIO, ANO_FIM)
      const eveDedupe = deduplicarItens(
        eveQuad.dentro,
        (e) => `${e.nome} ${e.titulo_trabalho || ''}`,
        (e) => e.ano,
      )

      // Premiações
      const premQuad = filtrarPorQuadrienio(parsed.premiacoes, (p) => p.ano, ANO_INICIO, ANO_FIM)
      const premDedupe = deduplicarItens(
        premQuad.dentro,
        (p) => p.nome,
        (p) => p.ano,
      )

      // Atualiza o resultado com as listas refinadas
      const resultadoRefinado: LattesArquivoResultado = {
        ...parsed,
        publicacoes: pubDedupe.unicos,
        orientacoes: oriDedupe.unicos,
        bancas: banDedupe.unicos,
        projetos: projDedupe.unicos,
        producoes_tecnicas: prodDedupe.unicos,
        patentes: patDedupe.unicos,
        eventos: eveDedupe.unicos,
        premiacoes: premDedupe.unicos,
        estatisticas: {
          publicacoes: {
            a_inserir: pubDedupe.unicos.length,
            ignorados:
              parsed.estatisticas.publicacoes.ignorados +
              pubQuad.totalIgnorados +
              pubDedupe.totalDuplicatas,
          },
          orientacoes: {
            a_inserir: oriDedupe.unicos.length,
            ignorados:
              parsed.estatisticas.orientacoes.ignorados +
              oriQuad.totalIgnorados +
              oriDedupe.totalDuplicatas,
          },
          bancas: {
            a_inserir: banDedupe.unicos.length,
            ignorados:
              parsed.estatisticas.bancas.ignorados +
              banQuad.totalIgnorados +
              banDedupe.totalDuplicatas,
          },
          projetos: {
            a_inserir: projDedupe.unicos.length,
            ignorados:
              parsed.estatisticas.projetos.ignorados +
              projQuad.totalIgnorados +
              projDedupe.totalDuplicatas,
          },
          producoes_tecnicas: {
            a_inserir: prodDedupe.unicos.length,
            ignorados:
              parsed.estatisticas.producoes_tecnicas.ignorados +
              prodQuad.totalIgnorados +
              prodDedupe.totalDuplicatas,
          },
          patentes: {
            a_inserir: patDedupe.unicos.length,
            ignorados:
              parsed.estatisticas.patentes.ignorados +
              patQuad.totalIgnorados +
              patDedupe.totalDuplicatas,
          },
          eventos: {
            a_inserir: eveDedupe.unicos.length,
            ignorados:
              parsed.estatisticas.eventos.ignorados +
              eveQuad.totalIgnorados +
              eveDedupe.totalDuplicatas,
          },
          premiacoes: {
            a_inserir: premDedupe.unicos.length,
            ignorados:
              parsed.estatisticas.premiacoes.ignorados +
              premQuad.totalIgnorados +
              premDedupe.totalDuplicatas,
          },
        },
      }

      resultados.push(resultadoRefinado)

      // Acumula resumo
      secoesResumo.publicacoes.totalValidos += pubDedupe.unicos.length
      secoesResumo.publicacoes.totalDuplicados += pubDedupe.totalDuplicatas
      secoesResumo.publicacoes.totalForaQuadrienio += pubQuad.totalIgnorados
      secoesResumo.publicacoes.totalLidos += parsed.publicacoes.length

      secoesResumo.orientacoes.totalValidos += oriDedupe.unicos.length
      secoesResumo.orientacoes.totalDuplicados += oriDedupe.totalDuplicatas
      secoesResumo.orientacoes.totalForaQuadrienio += oriQuad.totalIgnorados
      secoesResumo.orientacoes.totalLidos += parsed.orientacoes.length

      secoesResumo.bancas.totalValidos += banDedupe.unicos.length
      secoesResumo.bancas.totalDuplicados += banDedupe.totalDuplicatas
      secoesResumo.bancas.totalForaQuadrienio += banQuad.totalIgnorados
      secoesResumo.bancas.totalLidos += parsed.bancas.length

      secoesResumo.projetos.totalValidos += projDedupe.unicos.length
      secoesResumo.projetos.totalDuplicados += projDedupe.totalDuplicatas
      secoesResumo.projetos.totalForaQuadrienio += projQuad.totalIgnorados
      secoesResumo.projetos.totalLidos += parsed.projetos.length

      secoesResumo.producoes_tecnicas.totalValidos += prodDedupe.unicos.length
      secoesResumo.producoes_tecnicas.totalDuplicados += prodDedupe.totalDuplicatas
      secoesResumo.producoes_tecnicas.totalForaQuadrienio += prodQuad.totalIgnorados
      secoesResumo.producoes_tecnicas.totalLidos += parsed.producoes_tecnicas.length

      secoesResumo.patentes.totalValidos += patDedupe.unicos.length
      secoesResumo.patentes.totalDuplicados += patDedupe.totalDuplicatas
      secoesResumo.patentes.totalForaQuadrienio += patQuad.totalIgnorados
      secoesResumo.patentes.totalLidos += parsed.patentes.length

      secoesResumo.eventos.totalValidos += eveDedupe.unicos.length
      secoesResumo.eventos.totalDuplicados += eveDedupe.totalDuplicatas
      secoesResumo.eventos.totalForaQuadrienio += eveQuad.totalIgnorados
      secoesResumo.eventos.totalLidos += parsed.eventos.length

      secoesResumo.premiacoes.totalValidos += premDedupe.unicos.length
      secoesResumo.premiacoes.totalDuplicados += premDedupe.totalDuplicatas
      secoesResumo.premiacoes.totalForaQuadrienio += premQuad.totalIgnorados
      secoesResumo.premiacoes.totalLidos += parsed.premiacoes.length
    } catch (err) {
      erros.push({
        arquivo: arq.nomeArquivo,
        origem: arq.origem,
        zipArquivoPai: arq.zipArquivoPai,
        mensagem: err instanceof Error ? err.message : 'Erro desconhecido ao processar arquivo.',
      })
    }
  }

  // Se nenhum arquivo XML válido foi extraído da seleção (ex.: ZIP vazio ou arquivos que não tinham .xml)
  if (arquivosLidos.length === 0 && arquivos.length > 0) {
    const lista = Array.from(arquivos)
    for (const f of lista) {
      const nomeLower = f.name.toLowerCase()
      if (!nomeLower.endsWith('.xml') && !nomeLower.endsWith('.zip')) {
        erros.push({
          arquivo: f.name,
          origem: 'xml',
          mensagem: 'Extensão não suportada. Envie arquivos .xml ou .zip gerados pelo Lattes/CNPq.',
        })
      } else if (nomeLower.endsWith('.zip')) {
        erros.push({
          arquivo: f.name,
          origem: 'zip',
          mensagem: 'O arquivo compactado não contém arquivos .xml de currículo Lattes.',
        })
      }
    }
  }

  return {
    arquivosLidosCount: arquivosLidos.length,
    curriculosProcessadosCount: resultados.length,
    erros,
    resultados,
    resumoGeral: {
      totalDocentes: resultados.filter((r) => r.docente).length,
      secoes: secoesResumo,
    },
  }
}
