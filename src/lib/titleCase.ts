/**
 * Utilitário de formatação de exibição em Title Case para entidades textuais do sistema
 * (títulos de publicações, prêmios, projetos, eventos, nomes de pessoas, periódicos,
 * instituições/empresas, editais/financiadores).
 *
 * Regras:
 * 1. Preposições e conectivos em minúscula sempre:
 *    de, da, do, das, dos, e, em, no, na, nos, nas, ao, aos, com, para, por, ou
 *    (exceto se for a primeira palavra do texto ou início após pontuação forte como ": " ou " - ").
 * 2. Palavras que já estão TODAS em maiúsculas são consideradas siglas/acrônimos e
 *    permanecem como estão (ex.: CAPES, ABCM, AGITTE, UFSC, CNPq).
 *    Tokens contendo maiúsculas internas (ex.: CNPq, CBECiMat) também são preservados.
 * 3. Acentuação preservada (Área, Iniciação, Científica, São, etc.).
 * 4. Hífens: capitaliza após hífen (ex.: "sudeste-brasileiro" -> "Sudeste-Brasileiro").
 * 5. Não afeta números, ordinais (1º, 18º), códigos romanos (II, III), URLs, etc.
 */

const PREPOSICOES_CONECTIVOS = new Set<string>([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'ao',
  'aos',
  'com',
  'para',
  'por',
  'ou',
])

// Conectivos em inglês comuns em títulos acadêmicos
const CONECTIVOS_INGLES = new Set<string>([
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'and',
  'or',
  'the',
  'an',
])

const NUMERAIS_ROMANOS = new Set<string>([
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
  'xi',
  'xii',
  'xiii',
  'xiv',
  'xv',
  'xvi',
  'xvii',
  'xviii',
  'xix',
  'xx',
])

/**
 * Capitaliza a primeira letra de um termo (com acentos) e coloca as demais em minúscula.
 */
function capitalizarSimples(termo: string): string {
  if (!termo) return ''
  const primeira = termo.charAt(0).toLocaleUpperCase('pt-BR')
  const restante = termo.slice(1).toLocaleLowerCase('pt-BR')
  return primeira + restante
}

/**
 * Trata um segmento de palavra separado por hífen.
 * Ex: "sudeste" -> "Sudeste", "AGITTE" -> "AGITTE"
 */
function formatarSubpalavraHifen(
  sub: string,
  indexNaPalavra: number,
  isPrimeiraPalavraGeral: boolean,
): string {
  if (!sub) return ''

  // Se já for toda maiúscula (com pelo menos 2 letras), é sigla e fica intocada
  const apenasLetras = sub.replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '')
  if (apenasLetras.length >= 2 && apenasLetras === apenasLetras.toUpperCase()) {
    return sub
  }

  // Se contiver maiúscula interna (ex.: CNPq, PubMed), preserva
  if (sub.length > 1 && /[a-z]/.test(sub) && /[A-Z]/.test(sub.slice(1))) {
    return sub
  }

  const subLower = sub.toLocaleLowerCase('pt-BR')

  // Numerais romanos
  if (NUMERAIS_ROMANOS.has(subLower)) {
    return sub.toUpperCase()
  }

  // Ordinais
  if (/^[0-9]+[ºª°]?$/i.test(sub)) {
    return sub
  }

  // Conectivos após o hífen: se for a primeira subpalavra e primeira da frase, capitaliza; senão pode ser minúsculo
  if (
    indexNaPalavra > 0 &&
    (PREPOSICOES_CONECTIVOS.has(subLower) || CONECTIVOS_INGLES.has(subLower))
  ) {
    return subLower
  }

  return capitalizarSimples(sub)
}

/**
 * Processa uma única palavra/token que pode conter hífen, barra ou pontuação anexa.
 */
function formatarToken(
  token: string,
  indexNoTexto: number,
  aposPontuacaoForte: boolean,
  contextoTextoTodoMaiusculo: boolean,
): string {
  if (!token) return ''

  // Isolar pontuações iniciais e finais: ex: "(CAPES)", "'UNIVERSIDADE'", "AGITTE,"
  const match = token.match(/^([([{'"“‘«]*)(.*?)([)\]}'"”’».,;:!?-]*)$/)
  if (!match) return token

  const [, prefixo, miolo, sufixo] = match
  if (!miolo) return token

  // Se o miolo contiver hífens (ex.: "sudeste-brasileiro", "PPG-DCEM")
  if (miolo.includes('-')) {
    const partes = miolo.split('-')
    const partesFormatadas = partes.map((parte, subIdx) =>
      formatarSubpalavraHifen(parte, subIdx, indexNoTexto === 0 && subIdx === 0),
    )
    return prefixo + partesFormatadas.join('-') + sufixo
  }

  // Se contiver barra (ex.: "Docente/Discente")
  if (miolo.includes('/')) {
    const partes = miolo.split('/')
    const partesFormatadas = partes.map((parte, subIdx) =>
      formatarSubpalavraHifen(parte, subIdx, indexNoTexto === 0 && subIdx === 0),
    )
    return prefixo + partesFormatadas.join('/') + sufixo
  }

  const mioloLower = miolo.toLocaleLowerCase('pt-BR')

  // Ordinais (1º, 2ª, 17º, 18º) ou números puros
  if (/^[0-9]+[ºª°]?$/i.test(miolo)) {
    return prefixo + miolo + sufixo
  }

  // Numerais romanos (II, III, IV...)
  if (NUMERAIS_ROMANOS.has(mioloLower)) {
    return prefixo + miolo.toUpperCase() + sufixo
  }

  // Preservar tokens com maiúsculas internas (ex.: CNPq, PubMed, LaTeX, CBECiMat)
  if (miolo.length > 1 && /[a-z]/.test(miolo) && /[A-Z]/.test(miolo.slice(1))) {
    return prefixo + miolo + sufixo
  }

  const apenasLetras = miolo.replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '')

  // Regra de Siglas:
  // "palavras que já estão TODAS em maiúsculas são consideradas siglas/acrônimos e permanecem como estão"
  // Note que se o texto original NÃO estava inteiramente em caixa alta, qualquer palavra ALL CAPS é uma sigla legítima
  // (ex.: "UNIVERSIDADE FEDERAL DE SERGIPE - AGITTE" tem AGITTE como sigla e palavras comuns que viram Title Case).
  // Para distinguir siglas reais quando a frase inteira estava em UPPERCASE:
  // - Palavras com 2 a 6 letras que não sejam palavras comuns em português/inglês OU que sejam siglas conhecidas
  // - Tokens consagrados: CAPES, ABCM, AGITTE, UFSC, CNPq, UFS, EMBRAPA, FAPITEC, INPI, DOI, FTIR, MEC...
  // - Além disso: se a palavra está numa lista de conectivos, ela NUNCA deve ser tratada como sigla
  //   (ex.: "DE", "DA", "E" em maiúsculo viram "de", "da", "e").
  const isConectivo = PREPOSICOES_CONECTIVOS.has(mioloLower) || CONECTIVOS_INGLES.has(mioloLower)

  if (isConectivo) {
    if (indexNoTexto === 0 || aposPontuacaoForte) {
      return prefixo + capitalizarSimples(miolo) + sufixo
    }
    return prefixo + mioloLower + sufixo
  }

  // Se o texto inteiro NÃO estava gritado em maiúsculas (ou seja, texto misto com alguma palavra em UPPER):
  // Toda palavra ALL-CAPS com 2+ letras é considerada sigla/acrônimo.
  if (!contextoTextoTodoMaiusculo) {
    if (apenasLetras.length >= 2 && apenasLetras === apenasLetras.toUpperCase()) {
      return prefixo + miolo + sufixo
    }
  } else {
    // Quando o texto inteiro foi digitado em CAIXA ALTA (ex.: "UNIVERSIDADE FEDERAL DE SERGIPE - AGITTE"):
    // Como diferenciar siglas ("AGITTE", "CAPES", "ABCM", "UFSC") de palavras comuns ("UNIVERSIDADE", "FEDERAL", "SERGIPE")?
    // 1. Siglas consagradas ou conhecidas
    // 2. Palavras sem vogais ou com estrutura de acrônimo
    // 3. Heurística e dicionário de siglas conhecidas + teste de palavras comuns da língua
    if (ehSiglaEmTextoGritado(miolo, apenasLetras)) {
      return prefixo + miolo + sufixo
    }
  }

  // Padrão: Title Case
  return prefixo + capitalizarSimples(miolo) + sufixo
}

// Siglas consagradas comuns na instituição e área acadêmica
const SIGLAS_CONHECIDAS = new Set<string>([
  'capes',
  'cnpq',
  'abcm',
  'agitte',
  'ufsc',
  'ufs',
  'ufba',
  'ufrj',
  'ufmg',
  'unicamp',
  'usp',
  'unesp',
  'embrapa',
  'fapitec',
  'fapesp',
  'faperj',
  'fapemig',
  'inpi',
  'mec',
  'mcti',
  'finep',
  'anp',
  'abm',
  'sbmicro',
  'sbpc',
  'b-mrs',
  'ppgdcem',
  'ppg-dcem',
  'p2cem',
  'p²cem',
  'cbecimat',
  'eidti',
  'ftir',
  'jcr',
  'doi',
  'qualis',
  'wos',
  'scopus',
  'ebtt',
  'ifs',
  'ifba',
  'ifpb',
  'ifrn',
  'ifpe',
  'cefet',
  'confea',
  'crea',
])

function ehSiglaEmTextoGritado(palavra: string, apenasLetras: string): boolean {
  const lower = palavra.toLowerCase()
  if (SIGLAS_CONHECIDAS.has(lower)) {
    return true
  }

  // Se tem menos de 2 letras, não é sigla (ex: "A", "E", "O")
  if (apenasLetras.length < 2) {
    return false
  }

  // Se não tem nenhuma vogal (ex.: "CNPq", "FTIR", "CPTM", "FDRH"), com certeza é sigla
  if (!/[aeiouáéíóúâêîôûãõ]/i.test(apenasLetras)) {
    return true
  }

  // Se tem dígitos intercalados ou símbolos (ex.: "P²CEM", "CO2", "18º")
  if (/[0-9]/.test(palavra)) {
    return true
  }

  // Se já tinha minúsculas e maiúsculas combinadas originalmente (ex.: "CNPq", "ABCM")
  if (/[a-z]/.test(palavra) && /[A-Z]/.test(palavra)) {
    return true
  }

  return false
}

/**
 * Converte um texto qualquer para Title Case de acordo com as regras especificadas:
 * - Preposições e conectivos em minúscula (de, da, do, das, dos, e, em, no, na, nos, nas, ao, aos, com, para, por, ou);
 * - Palavras todas em maiúsculas permanecem como estão (CAPES, ABCM, AGITTE, UFSC, CNPq...);
 * - Acentuação preservada;
 * - Hífens: capitaliza após hífen ("Sudeste-Brasileiro");
 * - Se o texto for nulo, indefinido ou vazio, retorna string vazia.
 */
export function toTitleCase(texto: string | null | undefined): string {
  if (texto === null || texto === undefined) return ''
  const limpo = String(texto).trim()
  if (!limpo) return ''

  // Identifica se a string inteira está em maiúsculas (todas as letras são uppercase)
  const letrasDoTexto = limpo.replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '')
  const textoTodoMaiusculo =
    letrasDoTexto.length > 3 && letrasDoTexto === letrasDoTexto.toUpperCase()

  // Divide por espaços preservando múltiplos espaços caso existam
  const tokens = limpo.split(/\s+/)

  const formatados = tokens.map((token, index) => {
    // Determina se a palavra anterior termina com pontuação forte que inicia nova oração/frase
    let aposPontuacaoForte = false
    if (index > 0) {
      const anterior = tokens[index - 1]
      aposPontuacaoForte =
        anterior.endsWith(':') ||
        anterior.endsWith('.') ||
        anterior.endsWith(';') ||
        anterior.endsWith('—') ||
        anterior === '-' ||
        anterior === '—' ||
        anterior.endsWith('-')
    }

    return formatarToken(token, index, aposPontuacaoForte, textoTodoMaiusculo)
  })

  return formatados.join(' ')
}
