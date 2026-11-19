import { readLattesFiles, type LattesArquivoLido } from './readFiles'
import { parseLattesXml } from './parser'
import {
  ANO_INICIO,
  ANO_FIM,
  filtrarPorQuadrienio,
  intervaloCruzaJanela,
  janelaImportacaoPadrao,
  type JanelaAnos,
} from './quadrienio'
import { deduplicarItens } from './dedupe'
import type { LattesArquivoResultado } from './types'

export { ANO_INICIO, ANO_FIM }

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

export interface OpcoesImportacaoLattes {
  /** Ano inicial da janela de importação (padrão: 2020, D-31). */
  anoInicio?: number
  /** Ano final da janela de importação (padrão: o maior entre o fim do período e o ano atual). */
  anoFim?: number
}

/**
 * Executa o fluxo de importação completo da Subetapa 1B:
 * 1. readLattesFiles: lê arquivos .xml e .zip descompactando e decodificando ISO-8859-1
 * 2. parseLattesXml: analisa o XML gerando itens brutos e metadados
 * 3. filtrarPorQuadrienio: reforça o recorte temporal pela janela de importação (D-31). Orientações
 *    e projetos EM ANDAMENTO nunca são cortados por ano.
 * 4. deduplicarItens: remove duplicatas por chave normalizada (título + ano)
 * 5. Agrega estatísticas e resumo para revisão posterior (subetapa 1C), sem persistência no banco.
 */
export async function processarArquivosLattes(
  arquivos: File[] | FileList,
  opcoes: OpcoesImportacaoLattes = {},
): Promise<ResultadoProcessamentoLattes> {
  const padrao = janelaImportacaoPadrao()
  const janela: JanelaAnos = {
    anoInicio: opcoes.anoInicio ?? padrao.anoInicio,
    anoFim: opcoes.anoFim ?? padrao.anoFim,
  }
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

      const parsed = parseLattesXml(arq.xml, arq.nomeArquivo, janela.anoInicio, janela.anoFim)

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
      const pubQuad = filtrarPorQuadrienio(
        parsed.publicacoes,
        (p) => p.ano,
        janela.anoInicio,
        janela.anoFim,
      )
      const pubDedupe = deduplicarItens(
        pubQuad.dentro,
        (p) => p.titulo,
        (p) => p.ano,
      )

      // Orientações: as EM ANDAMENTO sempre entram (o aluno ainda está no programa); as concluídas
      // seguem a janela de importação
      const oriAndamento = parsed.orientacoes.filter((o) => o.situacao === 'EM_ANDAMENTO')
      const oriConcluidasQuad = filtrarPorQuadrienio(
        parsed.orientacoes.filter((o) => o.situacao !== 'EM_ANDAMENTO'),
        (o) => o.ano_conclusao || o.ano_inicio || null,
        janela.anoInicio,
        janela.anoFim,
      )
      const oriQuad = {
        dentro: [...oriAndamento, ...oriConcluidasQuad.dentro],
        totalIgnorados: oriConcluidasQuad.totalIgnorados,
      }
      const oriDedupe = deduplicarItens(
        oriQuad.dentro,
        (o) => `${o.orientando} ${o.titulo_trabalho || ''}`,
        (o) => o.ano_conclusao || o.ano_inicio || null,
      )

      // Projetos: em andamento sempre entra; os demais precisam cruzar a janela de importação
      const projDentro = parsed.projetos.filter(
        (p) =>
          p.situacao === 'EM_ANDAMENTO' || intervaloCruzaJanela(p.ano_inicio, p.ano_fim, janela),
      )
      const projQuad = {
        dentro: projDentro,
        totalIgnorados: parsed.projetos.length - projDentro.length,
      }
      const projDedupe = deduplicarItens(
        projQuad.dentro,
        (p) => p.nome,
        (p) => p.ano_inicio || p.ano_fim || null,
      )

      // Produções técnicas
      const prodQuad = filtrarPorQuadrienio(
        parsed.producoes_tecnicas,
        (pt) => pt.ano,
        janela.anoInicio,
        janela.anoFim,
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
        janela.anoInicio,
        janela.anoFim,
      )
      const patDedupe = deduplicarItens(
        patQuad.dentro,
        (p) => p.titulo,
        (p) => p.ano_concessao || p.ano_deposito || p.ano_desenvolvimento || null,
      )

      // Eventos
      const eveQuad = filtrarPorQuadrienio(
        parsed.eventos,
        (e) => e.ano,
        janela.anoInicio,
        janela.anoFim,
      )
      const eveDedupe = deduplicarItens(
        eveQuad.dentro,
        (e) => `${e.nome} ${e.titulo_trabalho || ''}`,
        (e) => e.ano,
      )

      // Premiações
      const premQuad = filtrarPorQuadrienio(
        parsed.premiacoes,
        (p) => p.ano,
        janela.anoInicio,
        janela.anoFim,
      )
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

      // O parser já descarta o que está fora do quadriênio; somamos esses itens ao resumo
      const foraDoQuadrienio = (tabela: string) =>
        parsed.itens_ignorados.filter((i) => i.tabela === tabela && i.motivo === 'FORA_QUADRIENIO')
          .length
      secoesResumo.publicacoes.totalForaQuadrienio += foraDoQuadrienio('publicacoes')
      secoesResumo.orientacoes.totalForaQuadrienio += foraDoQuadrienio('orientacoes')
      secoesResumo.projetos.totalForaQuadrienio += foraDoQuadrienio('projetos_pesquisa')
      secoesResumo.producoes_tecnicas.totalForaQuadrienio += foraDoQuadrienio('producao_tecnica')
      secoesResumo.patentes.totalForaQuadrienio += foraDoQuadrienio('patentes')
      secoesResumo.eventos.totalForaQuadrienio += foraDoQuadrienio('eventos')
      secoesResumo.premiacoes.totalForaQuadrienio += foraDoQuadrienio('premiacoes')
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
