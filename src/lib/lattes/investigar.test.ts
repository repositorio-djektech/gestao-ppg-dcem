import { describe, it } from 'vitest'
import fs from 'node:fs'
import { parseLattesXml } from './parser'
import { decodificarIso88591 } from './readFiles'
import { processarArquivosLattes } from './processor'
import { mapearDadosParaRevisao } from './revisao'

describe('Investigação do XML real de homologação', () => {
  const xmlPath = 'docs/3104369029830651.xml'

  it('audita contagens brutas do XML vs contagens no quadriênio 2022-2025', async () => {
    const rawBuffer = fs.readFileSync(xmlPath)
    const xml = decodificarIso88591(rawBuffer)

    // Parser direto
    const parsed = parseLattesXml(xml, '3104369029830651.xml')

    // Contagem regex direta no XML decodificado para conferência
    const countTag = (tag: string) => {
      const re = new RegExp(`<${tag}\\b`, 'gi')
      const matches = xml.match(re)
      return matches ? matches.length : 0
    }

    const artigosBrutos = countTag('ARTIGO-PUBLICADO')
    const livrosBrutos = countTag('LIVRO-PUBLICADO-OU-ORGANIZADO')
    const capitulosBrutos = countTag('CAPITULO-DE-LIVRO-PUBLICADO')
    const bancasBrutas = countTag('PARTICIPACAO-EM-BANCA')
    const projetosBrutos = countTag('PROJETO-DE-PESQUISA')
    const premiosBrutos = countTag('PREMIO-TITULO')
    const trabalhoTecnicoBruto = countTag('TRABALHO-TECNICO')
    const patentesBrutas = countTag('PATENTE')
    const trabalhosEventosBrutos = countTag('TRABALHO-EM-EVENTOS')
    const partEventosBrutos = countTag('PARTICIPACAO-EM-EVENTO-CONGRESSO')

    const file = new File([rawBuffer], '3104369029830651.xml', { type: 'text/xml' })
    const processado = await processarArquivosLattes([file])
    const tabelas = mapearDadosParaRevisao(processado)

    const diag = {
      docente: parsed.nome_docente,
      artigosBrutos,
      livrosBrutos,
      capitulosBrutos,
      bancasBrutas,
      projetosBrutos,
      premiosBrutos,
      trabalhoTecnicoBruto,
      patentesBrutas,
      trabalhosEventosBrutos,
      partEventosBrutos,
      parserPubAInserir: parsed.estatisticas.publicacoes.a_inserir,
      parserPubIgnorados: parsed.estatisticas.publicacoes.ignorados,
      processadoSecoes: processado.resumoGeral.secoes,
      tabelasContagens: Object.fromEntries(
        Object.entries(tabelas).map(([k, v]) => [
          k,
          { ins: v.inseridos, ign: v.ignorados, itens: v.itens.length },
        ]),
      ),
    }

    // Asserções para validar as contagens do XML real
    // 1. Docente
    expect(parsed.nome_docente).toBe('Ledjane Silva Barreto')
    expect(parsed.id_lattes).toBe('3104369029830651')

    // 2. XML total vs no quadriênio
    expect(artigosBrutos).toBeGreaterThan(0)
    expect(processado.resumoGeral.secoes.publicacoes.totalValidos).toBeGreaterThan(0)
    expect(processado.resumoGeral.secoes.publicacoes.totalForaQuadrienio).toBeGreaterThan(0)

    // 3. Revisão agrupada
    expect(tabelas.docentes.inseridos).toBe(1)
    expect(tabelas.publicacoes.inseridos).toBe(processado.resumoGeral.secoes.publicacoes.totalValidos)
    expect(tabelas.orientacoes.inseridos).toBe(processado.resumoGeral.secoes.orientacoes.totalValidos)
    expect(tabelas.bancas.inseridos).toBe(processado.resumoGeral.secoes.bancas.totalValidos)
    expect(tabelas.projetos_pesquisa.inseridos).toBe(processado.resumoGeral.secoes.projetos.totalValidos)
    expect(tabelas.premiacoes.inseridos).toBe(processado.resumoGeral.secoes.premiacoes.totalValidos)
    expect(tabelas.producao_tecnica.inseridos).toBe(processado.resumoGeral.secoes.producoes_tecnicas.totalValidos)
    expect(tabelas.patentes.inseridos).toBe(processado.resumoGeral.secoes.patentes.totalValidos)
    expect(tabelas.eventos.inseridos).toBe(processado.resumoGeral.secoes.eventos.totalValidos)
  })
})
