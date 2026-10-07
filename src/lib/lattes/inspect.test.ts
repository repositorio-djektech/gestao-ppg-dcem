import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import JSZip from 'jszip'
import { parseLattesXml } from './parser'
import { readLattesFiles, decodificarIso88591 } from './readFiles'
import { ANO_INICIO, ANO_FIM, filtrarPorQuadrienio, estaNoQuadrienio } from './quadrienio'
import { deduplicarItens, normalizarTitulo, gerarChaveDedupe } from './dedupe'
import { processarArquivosLattes } from './processor'
import { mapearDadosParaRevisao } from './revisao'

describe('Pipeline Lattes - subetapa 1A', () => {
  const xmlPath = 'docs/3104369029830651.xml'

  it('valida constantes do quadriênio CAPES 2025-2028', () => {
    expect(ANO_INICIO).toBe(2025)
    expect(ANO_FIM).toBe(2028)

    expect(estaNoQuadrienio(2024)).toBe(false)
    expect(estaNoQuadrienio(2025)).toBe(true)
    expect(estaNoQuadrienio(2026)).toBe(true)
    expect(estaNoQuadrienio(2027)).toBe(true)
    expect(estaNoQuadrienio(2028)).toBe(true)
    expect(estaNoQuadrienio(2029)).toBe(false)
    expect(estaNoQuadrienio(null)).toBe(false)
    expect(estaNoQuadrienio(undefined)).toBe(false)
    expect(estaNoQuadrienio('invalido')).toBe(false)
    expect(estaNoQuadrienio('2025')).toBe(true)
    expect(estaNoQuadrienio('2026')).toBe(true)
  })

  it('valida lógica pura de normalização e deduplicação', () => {
    const tit1 = 'Síntese e Caracterização de Nano-estruturas!'
    const tit2 = 'sintese e caracterizacao de nano estruturas'
    expect(normalizarTitulo(tit1)).toBe('sintese e caracterizacao de nano estruturas')
    expect(normalizarTitulo(tit2)).toBe('sintese e caracterizacao de nano estruturas')

    const chave1 = gerarChaveDedupe(tit1, 2024)
    const chave2 = gerarChaveDedupe(tit2, 2024)
    expect(chave1).toBe(chave2)
    expect(chave1).toBe('sintese e caracterizacao de nano estruturas_2024')

    const lista = [
      { id: 1, titulo: 'Artigo Um', ano: 2023 },
      { id: 2, titulo: 'artigo  um !', ano: 2023 }, // duplicata
      { id: 3, titulo: 'Artigo Um', ano: 2024 }, // ano diferente -> não duplicata
      { id: 4, titulo: 'Artigo Dois', ano: 2024 },
    ]

    const deduped = deduplicarItens(lista)
    expect(deduped.totalOriginal).toBe(4)
    expect(deduped.totalUnicos).toBe(3)
    expect(deduped.totalDuplicatas).toBe(1)
    expect(deduped.unicos.map((i) => i.id)).toEqual([1, 3, 4])
    expect(deduped.duplicatasDescartadas[0].id).toBe(2)
  })

  it('lê XML real via readFiles simulando File[] e também via ZIP em memória', async () => {
    const rawBuffer = fs.readFileSync(xmlPath)
    expect(rawBuffer.length).toBeGreaterThan(500_000)

    // Decodificação ISO-8859-1 explícita
    const xmlTexto = decodificarIso88591(rawBuffer)
    expect(xmlTexto).toContain('CURRICULO-VITAE')
    expect(xmlTexto).toContain('3104369029830651')

    // 1. Simula File com o XML
    const xmlFile = new File([rawBuffer], 'curriculo_ledjane.xml', { type: 'text/xml' })
    const lidosXml = await readLattesFiles([xmlFile])
    expect(lidosXml).toHaveLength(1)
    expect(lidosXml[0].nomeArquivo).toBe('curriculo_ledjane.xml')
    expect(lidosXml[0].origem).toBe('xml')
    expect(lidosXml[0].xml).toContain('CURRICULO-VITAE')

    // 2. Simula ZIP contendo o XML dentro de uma subpasta e outros arquivos não-XML
    const zip = new JSZip()
    zip.file('subpasta/curriculo.xml', rawBuffer)
    zip.file('readme.txt', 'arquivo de apoio que deve ser ignorado')
    zip.file('subpasta/outro_arquivo.pdf', new Uint8Array([1, 2, 3]))

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
    const zipFile = new File([zipBuffer], 'curriculos.zip', { type: 'application/zip' })

    const lidosZip = await readLattesFiles([zipFile])
    expect(lidosZip).toHaveLength(1)
    expect(lidosZip[0].nomeArquivo).toContain('curriculo.xml')
    expect(lidosZip[0].origem).toBe('zip')
    expect(lidosZip[0].zipArquivoPai).toBe('curriculos.zip')
    expect(lidosZip[0].xml).toContain('CURRICULO-VITAE')
  })

  it('executa pipeline completo no XML real de Ledjane Silva Barreto (parser + quadrienio + dedupe)', () => {
    const rawBuffer = fs.readFileSync(xmlPath)
    const xml = decodificarIso88591(rawBuffer)

    // 1. Parser
    const resultado = parseLattesXml(xml, '3104369029830651.xml')
    expect(resultado.sucesso).toBe(true)
    expect(resultado.id_lattes).toBe('3104369029830651')
    expect(resultado.nome_docente).toBe('Ledjane Silva Barreto')

    // Contagens brutas das seções no resultado do parser (o parser já aplica a lógica de extração do quadriênio)
    console.log('--- ESTATÍSTICAS DO PARSER (XML REAL) ---')
    console.log(`Docente: ${resultado.nome_docente} (ID: ${resultado.id_lattes})`)
    console.log(`Publicações inseríveis: ${resultado.publicacoes.length}`)
    console.log(`Orientações inseríveis: ${resultado.orientacoes.length}`)
    console.log(`Bancas inseríveis: ${resultado.bancas.length}`)
    console.log(`Projetos inseríveis: ${resultado.projetos.length}`)
    console.log(`Premiações inseríveis: ${resultado.premiacoes.length}`)
    console.log(`Produções técnicas: ${resultado.producoes_tecnicas.length}`)
    console.log(`Patentes inseríveis: ${resultado.patentes.length}`)
    console.log(`Eventos inseríveis: ${resultado.eventos.length}`)

    // 2. Testar pipeline com filtrarPorQuadrienio e deduplicarItens explicitamente
    // Publicações
    const pubsQuad = filtrarPorQuadrienio(resultado.publicacoes, (p) => p.ano, ANO_INICIO, ANO_FIM)
    const pubsDedupe = deduplicarItens(
      pubsQuad.dentro,
      (p) => p.titulo,
      (p) => p.ano,
    )
    expect(pubsQuad.totalDentro).toBe(resultado.publicacoes.length)

    // Bancas
    const bancasQuad = filtrarPorQuadrienio(resultado.bancas, (b) => b.ano, ANO_INICIO, ANO_FIM)
    const bancasDedupe = deduplicarItens(
      bancasQuad.dentro,
      (b) => b.titulo_trabalho,
      (b) => b.ano,
    )
    expect(bancasQuad.totalDentro).toBe(resultado.bancas.length)

    // Orientações (pós-filtro quadriênio por ano de conclusão ou início)
    const oriQuad = filtrarPorQuadrienio(
      resultado.orientacoes,
      (o) => o.ano_conclusao || o.ano_inicio || null,
      ANO_INICIO,
      ANO_FIM,
    )
    const oriDedupe = deduplicarItens(
      oriQuad.dentro,
      (o) => `${o.orientando} ${o.titulo_trabalho || ''}`,
      (o) => o.ano_conclusao || o.ano_inicio || null,
    )

    console.log('--- RESULTADOS PÓS-FILTRO E PÓS-DEDUPE ---')
    console.log(
      `Publicações únicas (${ANO_INICIO}-${ANO_FIM}): ${pubsDedupe.totalUnicos} (descartadas: ${pubsDedupe.totalDuplicatas})`,
    )
    console.log(
      `Bancas únicas (${ANO_INICIO}-${ANO_FIM}): ${bancasDedupe.totalUnicos} (descartadas: ${bancasDedupe.totalDuplicatas})`,
    )
    console.log(
      `Orientações únicas (${ANO_INICIO}-${ANO_FIM}): ${oriDedupe.totalUnicos} (descartadas: ${oriDedupe.totalDuplicatas})`,
    )

    // O pipeline deve processar sem quebrar e manter os itens íntegros
    expect(resultado.docente).not.toBeNull()
    expect(resultado.docente?.nome_completo).toBe('Ledjane Silva Barreto')
  })

  it('audita contagens brutas do XML real, acentuação, quadriênio e deduplicação na revisão', async () => {
    const rawBuffer = fs.readFileSync(xmlPath)
    const xml = decodificarIso88591(rawBuffer)

    // Parser direto com e sem filtro de quadriênio
    const parsed = parseLattesXml(xml, '3104369029830651.xml')
    const parsedSemFiltro = parseLattesXml(xml, '3104369029830651.xml', 1900, 2100)

    // Contagens totais sem filtro esperadas da auditoria histórica do XML real (não mudam com o recorte)
    expect(parsedSemFiltro.publicacoes.filter((p) => p.tipo === 'ARTIGO').length).toBe(68)
    expect(parsedSemFiltro.publicacoes.filter((p) => p.tipo === 'LIVRO').length).toBe(1)
    expect(parsedSemFiltro.publicacoes.filter((p) => p.tipo === 'CAPITULO').length).toBe(8)
    expect(parsedSemFiltro.eventos.filter((e) => e.tipo === 'TRABALHO').length).toBe(32)
    expect(parsedSemFiltro.projetos.length).toBe(25)

    // Identificação do docente e acentuação no resumo
    expect(parsed.nome_docente).toBe('Ledjane Silva Barreto')
    expect(parsed.id_lattes).toBe('3104369029830651')
    expect(parsed.docente?.nome_completo).toBe('Ledjane Silva Barreto')
    expect(parsed.docente?.resumo_cv).toContain('Graduação em Química Industrial')
    expect(parsed.docente?.resumo_cv).not.toContain('')

    // Processamento via processor
    const file1 = new File([rawBuffer], '3104369029830651.xml', { type: 'text/xml' })
    const processado = await processarArquivosLattes([file1])
    const tabelas = mapearDadosParaRevisao(processado)

    const auditCounts = {
      publicacoesValidos: processado.resumoGeral.secoes.publicacoes.totalValidos,
      publicacoesFora: processado.resumoGeral.secoes.publicacoes.totalForaQuadrienio,
      orientacoesValidos: processado.resumoGeral.secoes.orientacoes.totalValidos,
      bancasValidos: processado.resumoGeral.secoes.bancas.totalValidos,
      projetosValidos: processado.resumoGeral.secoes.projetos.totalValidos,
      premiacoesValidos: processado.resumoGeral.secoes.premiacoes.totalValidos,
      producoesTecnicasValidos: processado.resumoGeral.secoes.producoes_tecnicas.totalValidos,
      patentesValidos: processado.resumoGeral.secoes.patentes.totalValidos,
      eventosValidos: processado.resumoGeral.secoes.eventos.totalValidos,
    }
    fs.writeFileSync('audit-counts.json', JSON.stringify(auditCounts, null, 2), 'utf8')

    // (a) Asserção de quadriênio: totalForaQuadrienio > 0 para publicações (recorte 2025-2028 descartando antigas)
    expect(processado.resumoGeral.secoes.publicacoes.totalForaQuadrienio).toBeGreaterThan(0)

    // (b) Asserção de dedupe: processar o mesmo XML duas vezes não dobra contagens na revisão (mesmo número de itens)
    const fileDup1 = new File([rawBuffer], 'curriculo_instancia_1.xml', { type: 'text/xml' })
    const fileDup2 = new File([rawBuffer], 'curriculo_instancia_2.xml', { type: 'text/xml' })
    const processadoDuplicado = await processarArquivosLattes([fileDup1, fileDup2])
    const tabelasDuplicadas = mapearDadosParaRevisao(processadoDuplicado)

    // Docente: 1 único docente deduplicado (mesmo id_lattes)
    expect(processadoDuplicado.curriculosProcessadosCount).toBe(2)
    expect(tabelasDuplicadas.docentes.itens.length).toBe(tabelas.docentes.itens.length)
    expect(tabelasDuplicadas.docentes.inseridos).toBe(tabelas.docentes.inseridos)

    // Publicações: deduplicadas por chave normalizada (título + ano)
    expect(tabelasDuplicadas.publicacoes.itens.length).toBe(tabelas.publicacoes.itens.length)
    expect(tabelasDuplicadas.publicacoes.inseridos).toBe(tabelas.publicacoes.inseridos)

    // Bancas: deduplicadas por chave normalizada
    expect(tabelasDuplicadas.bancas.itens.length).toBe(tabelas.bancas.itens.length)
    expect(tabelasDuplicadas.bancas.inseridos).toBe(tabelas.bancas.inseridos)

    // Orientações: deduplicadas
    expect(tabelasDuplicadas.orientacoes.itens.length).toBe(tabelas.orientacoes.itens.length)
    expect(tabelasDuplicadas.orientacoes.inseridos).toBe(tabelas.orientacoes.inseridos)

    // Conferência do mapeamento geral das tabelas de revisão
    expect(tabelas.docentes.inseridos).toBe(1)
    expect(tabelas.publicacoes.inseridos).toBe(
      processado.resumoGeral.secoes.publicacoes.totalValidos,
    )
    expect(tabelas.orientacoes.inseridos).toBe(
      processado.resumoGeral.secoes.orientacoes.totalValidos,
    )
    expect(tabelas.bancas.inseridos).toBe(processado.resumoGeral.secoes.bancas.totalValidos)
    expect(tabelas.projetos_pesquisa.inseridos).toBe(
      processado.resumoGeral.secoes.projetos.totalValidos,
    )
    expect(tabelas.premiacoes.inseridos).toBe(processado.resumoGeral.secoes.premiacoes.totalValidos)
    expect(tabelas.producao_tecnica.inseridos).toBe(
      processado.resumoGeral.secoes.producoes_tecnicas.totalValidos,
    )
    expect(tabelas.patentes.inseridos).toBe(processado.resumoGeral.secoes.patentes.totalValidos)
    expect(tabelas.eventos.inseridos).toBe(processado.resumoGeral.secoes.eventos.totalValidos)
  })
})
