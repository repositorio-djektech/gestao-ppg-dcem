import fs from 'node:fs'

const buf = fs.readFileSync('docs/3104369029830651.xml')
console.log('Buffer bytes:', buf.length)
const decoder = new TextDecoder('iso-8859-1')
const xml = decoder.decode(buf)
console.log('Decoded length:', xml.length)
console.log('First 200 chars:', xml.slice(0, 200))

function countTags(tagName) {
  const openRegex = new RegExp(`<${tagName}[\\s>]`, 'gi')
  const matches = xml.match(openRegex)
  return matches ? matches.length : 0
}

const tags = [
  'ARTIGO-PUBLICADO',
  'LIVRO-PUBLICADO-OU-ORGANIZADO',
  'CAPITULO-DE-LIVRO-PUBLICADO',
  'ORIENTACOES-CONCLUIDAS-PARA-MESTRADO',
  'ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO',
  'ORIENTACOES-CONCLUIDAS-PARA-POS-DOUTORADO',
  'OUTRAS-ORIENTACOES-CONCLUIDAS',
  'ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO',
  'ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO',
  'ORIENTACAO-EM-ANDAMENTO-DE-POS-DOUTORADO',
  'ORIENTACAO-EM-ANDAMENTO-DE-INICIACAO-CIENTIFICA',
  'OUTRAS-ORIENTACOES-EM-ANDAMENTO',
  'PARTICIPACAO-EM-BANCA-DE-MESTRADO',
  'PARTICIPACAO-EM-BANCA-DE-DOUTORADO',
  'PARTICIPACAO-EM-BANCA-DE-EXAME-QUALIFICACAO',
  'PARTICIPACAO-EM-BANCA-DE-GRADUACAO',
  'PARTICIPACAO-EM-BANCA-DE-APERFEICOAMENTO-ESPECIALIZACAO',
  'OUTRAS-PARTICIPACOES-EM-BANCA-JULGADORA',
  'PREMIO-TITULO',
  'TRABALHO-TECNICO',
  'SOFTWARE',
  'PATENTE',
  'TRABALHO-EM-EVENTOS',
  'PARTICIPACAO-EM-EVENTO-CONGRESSO',
  'PROJETO-DE-PESQUISA',
  'LINHA-DE-PESQUISA',
  'DISCIPLINA',
  'AREAS-DO-CONHECIMENTO',
]

for (const t of tags) {
  console.log(`${t}: ${countTags(t)}`)
}

console.log('--- RESUMO ---')
console.log('Artigos:', countTags('ARTIGO-PUBLICADO'))
console.log('Livros:', countTags('LIVRO-PUBLICADO-OU-ORGANIZADO'))
console.log('Capitulos:', countTags('CAPITULO-DE-LIVRO-PUBLICADO'))
const concluidasMestrado = countTags('ORIENTACOES-CONCLUIDAS-PARA-MESTRADO')
const concluidasDoutorado = countTags('ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO')
const concluidasOutras = countTags('OUTRAS-ORIENTACOES-CONCLUIDAS')
const concluidasPosDoc = countTags('ORIENTACOES-CONCLUIDAS-PARA-POS-DOUTORADO')
console.log(
  'Orientacoes concluidas total:',
  concluidasMestrado + concluidasDoutorado + concluidasOutras + concluidasPosDoc,
  `(${concluidasMestrado}/${concluidasDoutorado}/${concluidasOutras})`,
)

const andMestrado = countTags('ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO')
const andDoutorado = countTags('ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO')
const andPosDoc = countTags('ORIENTACAO-EM-ANDAMENTO-DE-POS-DOUTORADO')
const andIC = countTags('ORIENTACAO-EM-ANDAMENTO-DE-INICIACAO-CIENTIFICA')
const andOutras = countTags('OUTRAS-ORIENTACOES-EM-ANDAMENTO')
console.log(
  'Orientacoes em andamento total:',
  andMestrado + andDoutorado + andPosDoc + andIC + andOutras,
)

const bMestrado = countTags('PARTICIPACAO-EM-BANCA-DE-MESTRADO')
const bDoutorado = countTags('PARTICIPACAO-EM-BANCA-DE-DOUTORADO')
const bQualif = countTags('PARTICIPACAO-EM-BANCA-DE-EXAME-QUALIFICACAO')
const bGrad = countTags('PARTICIPACAO-EM-BANCA-DE-GRADUACAO')
const bAperf = countTags('PARTICIPACAO-EM-BANCA-DE-APERFEICOAMENTO-ESPECIALIZACAO')
const bOutras = countTags('OUTRAS-PARTICIPACOES-EM-BANCA-JULGADORA')
console.log(
  'Bancas total:',
  bMestrado + bDoutorado + bQualif + bGrad + bAperf + bOutras,
  `(${bMestrado}/${bDoutorado}/${bGrad}/${bQualif}) aperf=${bAperf} outras=${bOutras}`,
)

console.log('Premios:', countTags('PREMIO-TITULO'))

const tTecnico = countTags('TRABALHO-TECNICO')
const tSoftware = countTags('SOFTWARE')
const tPatente = countTags('PATENTE')
const tProduto = countTags('PRODUTO-TECNOLOGICO')
const tProcesso = countTags('PROCESSOS-OU-TECNICAS')
const tDemais = countTags('DEMAIS-TIPOS-DE-PRODUCAO-TECNICA')
console.log(
  'Producoes tecnicas (sem patente):',
  tTecnico + tSoftware + tProduto + tProcesso + tDemais,
)
console.log('Trabalhos em eventos:', countTags('TRABALHO-EM-EVENTOS'))
console.log('Participacoes em eventos:', countTags('PARTICIPACAO-EM-EVENTO-CONGRESSO'))
