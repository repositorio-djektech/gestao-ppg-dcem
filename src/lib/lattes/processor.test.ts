import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import JSZip from 'jszip'
import { processarArquivosLattes } from './processor'

describe('Subetapa 1B - processarArquivosLattes', () => {
  const xmlPath = 'docs/3104369029830651.xml'

  it('processa arquivo XML válido e calcula resumo do quadriênio e deduplicação', async () => {
    const rawBuffer = fs.readFileSync(xmlPath)
    const xmlFile = new File([rawBuffer], '3104369029830651.xml', { type: 'text/xml' })

    const resultado = await processarArquivosLattes([xmlFile])

    expect(resultado.arquivosLidosCount).toBe(1)
    expect(resultado.curriculosProcessadosCount).toBe(1)
    expect(resultado.erros).toHaveLength(0)
    expect(resultado.resumoGeral.totalDocentes).toBe(1)

    const doc = resultado.resultados[0]
    expect(doc.sucesso).toBe(true)
    expect(doc.nome_docente).toBe('Ledjane Silva Barreto')
    expect(doc.id_lattes).toBe('3104369029830651')

    // Seções
    expect(resultado.resumoGeral.secoes.publicacoes.totalValidos).toBeGreaterThan(0)
    expect(resultado.resumoGeral.secoes.bancas.totalValidos).toBeGreaterThan(0)
    expect(resultado.resumoGeral.secoes.orientacoes.totalValidos).toBeGreaterThan(0)
  })

  it('debug env', async () => {
    const { execSync } = await import('node:child_process')
    try {
      const out = execSync('node scripts/gravar-real.mjs', { encoding: 'utf8' })
      fs.writeFileSync('output-exec1.txt', out, 'utf8')
    } catch (e: any) {
      fs.writeFileSync('output-exec1.txt', 'ERROR: ' + (e.stdout || e.stderr || e.message), 'utf8')
    }
  })

  it('processa múltiplos arquivos (XML individual e ZIP contendo XML) simultaneamente', async () => {
    const rawBuffer = fs.readFileSync(xmlPath)
    const xmlFile = new File([rawBuffer], 'docente1.xml', { type: 'text/xml' })

    const zip = new JSZip()
    zip.file('docente2.xml', rawBuffer)
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
    const zipFile = new File([zipBuffer], 'docente2.zip', { type: 'application/zip' })

    const resultado = await processarArquivosLattes([xmlFile, zipFile])

    expect(resultado.arquivosLidosCount).toBe(2)
    expect(resultado.curriculosProcessadosCount).toBe(2)
    expect(resultado.erros).toHaveLength(0)
    expect(resultado.resumoGeral.totalDocentes).toBe(2)
  })

  it('debug should fail', () => {
    expect(1).toBe(2)
  })

  it('trata arquivos inválidos ou com erro sem quebrar o processamento dos demais', async () => {
    const rawBuffer = fs.readFileSync(xmlPath)
    const xmlValido = new File([rawBuffer], 'valido.xml', { type: 'text/xml' })
    const xmlInvalido = new File(
      ['<arquivo_invalido>sem curriculo</arquivo_invalido>'],
      'invalido.xml',
      {
        type: 'text/xml',
      },
    )
    const arquivoPdf = new File(['dados binarios'], 'documento.pdf', { type: 'application/pdf' })

    const resultado = await processarArquivosLattes([xmlValido, xmlInvalido, arquivoPdf])

    // O válido é lido
    expect(resultado.curriculosProcessadosCount).toBe(1)
    expect(resultado.resultados[0].nome_docente).toBe('Ledjane Silva Barreto')

    // Os inválidos geram erros amigáveis na lista de erros sem quebrar a execução
    expect(resultado.erros.length).toBeGreaterThanOrEqual(1)
    const msgInvalido = resultado.erros.find((e) => e.arquivo === 'invalido.xml')
    expect(msgInvalido).toBeDefined()
    expect(msgInvalido?.mensagem).toContain('CURRICULO-VITAE')
  })
})
