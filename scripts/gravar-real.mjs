#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { decodificarIso88591 } from '../src/lib/lattes/readFiles.js'
import { processarArquivosLattes } from '../src/lib/lattes/processor.js'
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
} from '../src/lib/lattes/gravar.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// Carregar .env se variáveis não estiverem no process.env
let supabaseUrl = process.env.VITE_SUPABASE_URL
let supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const envPath = path.resolve(projectRoot, '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx !== -1) {
        const k = trimmed.slice(0, eqIdx).trim()
        const v = trimmed.slice(eqIdx + 1).trim()
        if (k === 'VITE_SUPABASE_URL' && !supabaseUrl) supabaseUrl = v
        if (k === 'VITE_SUPABASE_PUBLISHABLE_KEY' && !supabaseAnonKey) supabaseAnonKey = v
      }
    }
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'ERRO: VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY não definidos no ambiente.',
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Autenticar com o usuário administrador padrão para satisfazer RLS
const adminEmail = process.env.PPG_ADMIN_EMAIL || 'ppgdcem@djektech.com.br'
const adminPassword = process.env.PPG_ADMIN_PASSWORD || 'ppg@dcem'

const { error: authErr } = await supabase.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
})

if (authErr) {
  console.error('ERRO de autenticação Supabase:', authErr.message)
  process.exit(1)
}

const xmlPath = path.resolve(projectRoot, 'docs/3104369029830651.xml')
if (!fs.existsSync(xmlPath)) {
  console.error('ERRO: Arquivo não encontrado:', xmlPath)
  process.exit(1)
}

const rawBuffer = fs.readFileSync(xmlPath)
const xmlTexto = decodificarIso88591(rawBuffer)
const xmlFile = new File([rawBuffer], '3104369029830651.xml', { type: 'text/xml' })

const resultado = await processarArquivosLattes([xmlFile])
if (resultado.curriculosProcessadosCount === 0 || resultado.resultados.length === 0) {
  console.error('ERRO: Falha ao processar XML do Lattes.')
  process.exit(1)
}

const itens = {
  docentes: resultado.resultados
    .map((r) => r.docente)
    .filter(Boolean)
    .map(converterLattesDocente),
  publicacoes: resultado.resultados.flatMap((r) => r.publicacoes).map(converterLattesPublicacao),
  orientacoes: resultado.resultados.flatMap((r) =>
    r.orientacoes.map((ori) =>
      converterLattesOrientacao(ori, {
        id_lattes: r.id_lattes,
        nome: r.nome_docente,
      }),
    ),
  ),
  bancas: resultado.resultados.flatMap((r) => r.bancas).map(converterLattesBanca),
  projetos_pesquisa: resultado.resultados.flatMap((r) =>
    r.projetos.map((proj) =>
      converterLattesProjeto(proj, {
        id_lattes: r.id_lattes,
        nome: r.nome_docente,
      }),
    ),
  ),
  premiacoes: resultado.resultados.flatMap((r) =>
    r.premiacoes.map((prem) =>
      converterLattesPremiacao(prem, {
        nome: r.nome_docente,
      }),
    ),
  ),
  producao_tecnica: resultado.resultados
    .flatMap((r) => r.producoes_tecnicas)
    .map(converterLattesProducaoTecnica),
  patentes: resultado.resultados.flatMap((r) => r.patentes).map(converterLattesPatente),
  eventos: resultado.resultados.flatMap((r) =>
    r.eventos.map((eve) =>
      converterLattesEvento(eve, {
        nome: r.nome_docente,
      }),
    ),
  ),
}

const relatorio = await gravarDadosLattes(itens, supabase)

console.log('=== RELATÓRIO COMPACTO DE GRAVAÇÃO LATTES ===')
const tabelas = [
  'docentes',
  'publicacoes',
  'orientacoes',
  'bancas',
  'projetos_pesquisa',
  'premiacoes',
  'producao_tecnica',
  'patentes',
  'eventos',
]

for (const t of tabelas) {
  const c = relatorio[t]
  console.log(
    `${t}: inseridos=${c.inseridos}, atualizados=${c.atualizados}, ignorados=${c.ignorados}`,
  )
}
console.log(`erros: ${relatorio.erros.length}`)
if (relatorio.erros.length > 0) {
  for (const e of relatorio.erros) {
    console.error(`  [${e.tabela}] ${e.item}: ${e.mensagem}`)
  }
}
