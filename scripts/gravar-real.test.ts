import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { decodificarIso88591 } from '../src/lib/lattes/readFiles'
import { processarArquivosLattes } from '../src/lib/lattes/processor'
import {
  gravarDadosLattes,
  converterLattesDocente,
  converterLattesPublicacao,
  converterLattesOrientacao,
  converterLattesBanca,
  converterLattesProjeto,
  converterLattesPremiacao,
  converterLattesProducaoTecnica,
  converterLattesPatente,
  converterLattesEvento,
} from '../src/lib/lattes/gravar'

describe('Execução Real Lattes no Supabase', () => {
  it('executa gravação real e reimportação (idempotência)', async () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

    console.log('DEBUG ENV:', {
      url: supabaseUrl,
      keyLen: supabaseAnonKey?.length,
      keys: Object.keys(process.env).filter((k) => k.includes('SUPABASE')),
    })
    expect(supabaseAnonKey).toBe('FORCAR_FALHA_PARA_VER_LOG')

    const client = createClient(supabaseUrl, supabaseAnonKey)

    // Autenticar com admin para satisfazer RLS
    const { error: authErr } = await client.auth.signInWithPassword({
      email: 'ppgdcem@djektech.com.br',
      password: 'ppg@dcem',
    })
    expect(authErr).toBeNull()

    const xmlPath = path.resolve(process.cwd(), 'docs/3104369029830651.xml')
    const rawBuffer = fs.readFileSync(xmlPath)
    const xmlTexto = decodificarIso88591(rawBuffer)
    expect(xmlTexto).toContain('3104369029830651')

    const xmlFile = new File([rawBuffer], '3104369029830651.xml', { type: 'text/xml' })
    const processado = await processarArquivosLattes([xmlFile])
    expect(processado.curriculosProcessadosCount).toBe(1)

    const extrairItens = () => ({
      docentes: processado.resultados
        .map((r) => r.docente)
        .filter(Boolean)
        .map(converterLattesDocente),
      publicacoes: processado.resultados
        .flatMap((r) => r.publicacoes)
        .map(converterLattesPublicacao),
      orientacoes: processado.resultados.flatMap((r) =>
        r.orientacoes.map((ori) =>
          converterLattesOrientacao(ori, {
            id_lattes: r.id_lattes,
            nome: r.nome_docente,
          }),
        ),
      ),
      bancas: processado.resultados.flatMap((r) => r.bancas).map(converterLattesBanca),
      projetos_pesquisa: processado.resultados.flatMap((r) =>
        r.projetos.map((proj) =>
          converterLattesProjeto(proj, {
            id_lattes: r.id_lattes,
            nome: r.nome_docente,
          }),
        ),
      ),
      premiacoes: processado.resultados.flatMap((r) =>
        r.premiacoes.map((prem) =>
          converterLattesPremiacao(prem, {
            nome: r.nome_docente,
          }),
        ),
      ),
      producao_tecnica: processado.resultados
        .flatMap((r) => r.producoes_tecnicas)
        .map(converterLattesProducaoTecnica),
      patentes: processado.resultados.flatMap((r) => r.patentes).map(converterLattesPatente),
      eventos: processado.resultados.flatMap((r) =>
        r.eventos.map((eve) =>
          converterLattesEvento(eve, {
            nome: r.nome_docente,
          }),
        ),
      ),
    })

    console.log('=== INÍCIO 1ª GRAVAÇÃO REAL ===')
    const relatorio1 = await gravarDadosLattes(extrairItens(), client)
    console.log('--- RELATÓRIO 1ª GRAVAÇÃO ---')
    for (const t of [
      'docentes',
      'publicacoes',
      'orientacoes',
      'bancas',
      'projetos_pesquisa',
      'premiacoes',
      'producao_tecnica',
      'patentes',
      'eventos',
    ]) {
      const c = relatorio1[t]
      console.log(
        `${t}: inseridos=${c.inseridos}, atualizados=${c.atualizados}, ignorados=${c.ignorados}`,
      )
    }
    console.log(`erros 1ª gravação: ${relatorio1.erros.length}`)
    if (relatorio1.erros.length > 0) {
      console.error(JSON.stringify(relatorio1.erros, null, 2))
    }

    console.log('=== INÍCIO 2ª GRAVAÇÃO REAL (REIMPORTAÇÃO / IDEMPOTÊNCIA) ===')
    const relatorio2 = await gravarDadosLattes(extrairItens(), client)
    console.log('--- RELATÓRIO 2ª GRAVAÇÃO ---')
    for (const t of [
      'docentes',
      'publicacoes',
      'orientacoes',
      'bancas',
      'projetos_pesquisa',
      'premiacoes',
      'producao_tecnica',
      'patentes',
      'eventos',
    ]) {
      const c = relatorio2[t]
      console.log(
        `${t}: inseridos=${c.inseridos}, atualizados=${c.atualizados}, ignorados=${c.ignorados}`,
      )
    }
    console.log(`erros 2ª gravação: ${relatorio2.erros.length}`)
    if (relatorio2.erros.length > 0) {
      console.error(JSON.stringify(relatorio2.erros, null, 2))
    }

    // Asserção de erros
    expect(relatorio1.erros).toHaveLength(0)
    expect(relatorio2.erros).toHaveLength(0)

    // Asserção de idempotência: 2ª gravação deve ter 0 inseridos em todas as tabelas
    expect(relatorio2.docentes.inseridos).toBe(0)
    expect(relatorio2.publicacoes.inseridos).toBe(0)
    expect(relatorio2.orientacoes.inseridos).toBe(0)
    expect(relatorio2.bancas.inseridos).toBe(0)
    expect(relatorio2.projetos_pesquisa.inseridos).toBe(0)
    expect(relatorio2.premiacoes.inseridos).toBe(0)
    expect(relatorio2.producao_tecnica.inseridos).toBe(0)
    expect(relatorio2.patentes.inseridos).toBe(0)
    expect(relatorio2.eventos.inseridos).toBe(0)
  }, 120_000)
})
