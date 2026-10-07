import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import JSZip from 'jszip'
import { parseLattesXml } from './parser'
import { readLattesFiles, decodificarIso88591 } from './readFiles'
import { ANO_INICIO, ANO_FIM, filtrarPorQuadrienio, estaNoQuadrienio } from './quadrienio'
import { deduplicarItens, normalizarTitulo, gerarChaveDedupe } from './dedupe'

describe('Pipeline Lattes - subetapa 1A', () => {
  const xmlPath = 'docs/3104369029830651.xml'

  it('valida constantes do quadriênio CAPES 2022-2025', () => {
    expect(ANO_INICIO).toBe(2022)
    expect(ANO_FIM).toBe(2025)

    expect(estaNoQuadrienio(2021)).toBe(false)
    expect(estaNoQuadrienio(2022)).toBe(true)
    expect(estaNoQuadrienio(2023)).toBe(true)
    expect(estaNoQuadrienio(2024)).toBe(true)
    expect(estaNoQuadrienio(2025)).toBe(true)
    expect(estaNoQuadrienio(2026)).toBe(false)
    expect(estaNoQuadrienio(null)).toBe(false)
    expect(estaNoQuadrienio(undefined)).toBe(false)
    expect(estaNoQuadrienio('invalido')).toBe(false)
    expect(estaNoQuadrienio('2023')).toBe(true)
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
    const pubsQuad = filtrarPorQuadrienio(resultado.publicacoes, (p) => p.ano, 2022, 2025)
    const pubsDedupe = deduplicarItens(
      pubsQuad.dentro,
      (p) => p.titulo,
      (p) => p.ano,
    )
    expect(pubsQuad.totalDentro).toBe(resultado.publicacoes.length)
    expect(pubsDedupe.totalUnicos).toBeGreaterThan(0)

    // Bancas
    const bancasQuad = filtrarPorQuadrienio(resultado.bancas, (b) => b.ano, 2022, 2025)
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
      2022,
      2025,
    )
    const oriDedupe = deduplicarItens(
      oriQuad.dentro,
      (o) => `${o.orientando} ${o.titulo_trabalho || ''}`,
      (o) => o.ano_conclusao || o.ano_inicio || null,
    )

    console.log('--- RESULTADOS PÓS-FILTRO E PÓS-DEDUPE ---')
    console.log(
      `Publicações únicas (2022-2025): ${pubsDedupe.totalUnicos} (descartadas: ${pubsDedupe.totalDuplicatas})`,
    )
    console.log(
      `Bancas únicas (2022-2025): ${bancasDedupe.totalUnicos} (descartadas: ${bancasDedupe.totalDuplicatas})`,
    )
    console.log(
      `Orientações únicas (2022-2025): ${oriDedupe.totalUnicos} (descartadas: ${oriDedupe.totalDuplicatas})`,
    )

    // O pipeline deve processar sem quebrar e manter os itens íntegros
    expect(resultado.docente).not.toBeNull()
    expect(resultado.docente?.nome_completo).toContain('Ledjane')
    expect(pubsDedupe.unicos.length).toBeGreaterThanOrEqual(1)
  })
})
