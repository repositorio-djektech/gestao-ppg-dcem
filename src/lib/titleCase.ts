/**
 * Utilitário de formatação de exibição em Title Case para entidades textuais do sistema
 * (títulos de publicações, prêmios, projetos, eventos, nomes de pessoas, periódicos,
 * instituições/empresas, editais/financiadores, afiliações).
 *
 * Regras:
 * 1. Preposições e conectivos em minúscula sempre:
 *    de, da, do, das, dos, e, em, no, na, nos, nas, ao, aos, à, às, com, para, por, pelo, pela,
 *    pelos, pelas, ou, um, uma, uns, umas, sem, sob, sobre, a, o, as, os
 *    (exceto se for a primeira palavra do texto ou início após pontuação forte como ": " ou " - ").
 * 2. Siglas e acrônimos permanecem em maiúsculas:
 *    - Siglas conhecidas: CAPES, CNPq, UFS, JDP, PDQ, P²CEM, PPG-DCEM, ABCM, AGITTE, UFSC,
 *      EMBRAPA, FAPITEC, INPI, MEC, FTIR, JCR, DOI, etc.
 *    - Tokens sem vogais (com 2+ letras): JDP, PDQ, FTIR, CPTM, NP, etc.
 *    - Tokens com maiúsculas internas preservadas: CNPq, PubMed, CBECiMat, LaTeX.
 *    - Fórmulas químicas e símbolos com dígitos: CO2, TiO2, CaCO3, nano-CaCO3.
 * 3. Nomes comuns e sobrenomes (mesmo se vierem em ALL CAPS como "SILVA, J. A.") são normalizados
 *    para Title Case: "Silva, J. A.".
 * 4. Acentuação preservada (Área, Iniciação, Científica, São, etc.).
 * 5. Hífens: capitaliza após hífen (ex.: "sudeste-brasileiro" -> "Sudeste-Brasileiro").
 * 6. Não quebra e-mails, URLs, DOIs, números ou códigos.
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
  'à',
  'às',
  'com',
  'para',
  'pra',
  'pro',
  'por',
  'pelo',
  'pela',
  'pelos',
  'pelas',
  'ou',
  'sem',
  'sob',
  'sobre',
  'a',
  'o',
  'as',
  'os',
  'um',
  'uma',
  'uns',
  'umas',
  'num',
  'numa',
  'nuns',
  'numas',
])

// Conectivos em inglês comuns em títulos acadêmicos e periódicos internacionais
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
  'a',
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

// Siglas consagradas e seus formatos canônicos preferenciais
const SIGLAS_PREFERENCIAIS = new Map<string, string>([
  ['capes', 'CAPES'],
  ['cnpq', 'CNPq'],
  ['abcm', 'ABCM'],
  ['agitte', 'AGITTE'],
  ['ufsc', 'UFSC'],
  ['ufs', 'UFS'],
  ['ufba', 'UFBA'],
  ['ufrj', 'UFRJ'],
  ['ufmg', 'UFMG'],
  ['unicamp', 'UNICAMP'],
  ['usp', 'USP'],
  ['unesp', 'UNESP'],
  ['embrapa', 'EMBRAPA'],
  ['fapitec', 'FAPITEC'],
  ['fapesp', 'FAPESP'],
  ['faperj', 'FAPERJ'],
  ['fapemig', 'FAPEMIG'],
  ['inpi', 'INPI'],
  ['mec', 'MEC'],
  ['mcti', 'MCTI'],
  ['finep', 'FINEP'],
  ['anp', 'ANP'],
  ['abm', 'ABM'],
  ['sbmicro', 'SBMicro'],
  ['sbpc', 'SBPC'],
  ['b-mrs', 'B-MRS'],
  ['ppgdcem', 'PPG-DCEM'],
  ['ppg-dcem', 'PPG-DCEM'],
  ['p2cem', 'P²CEM'],
  ['p²cem', 'P²CEM'],
  ['cbecimat', 'CBECiMat'],
  ['eidti', 'EIDTI'],
  ['ftir', 'FTIR'],
  ['jcr', 'JCR'],
  ['doi', 'DOI'],
  ['qualis', 'Qualis'],
  ['wos', 'WoS'],
  ['scopus', 'Scopus'],
  ['ebtt', 'EBTT'],
  ['ifs', 'IFS'],
  ['ifba', 'IFBA'],
  ['ifpb', 'IFPB'],
  ['ifrn', 'IFRN'],
  ['ifpe', 'IFPE'],
  ['cefet', 'CEFET'],
  ['confea', 'CONFEA'],
  ['crea', 'CREA'],
  ['jdp', 'JDP'],
  ['pdq', 'PDQ'],
  ['np', 'NP'],
  ['msc', 'MSc'],
  ['dsc', 'DSc'],
  ['phd', 'Ph.D.'],
  ['pibic', 'PIBIC'],
  ['pibiti', 'PIBITI'],
  ['pibid', 'PIBID'],
  ['dna', 'DNA'],
  ['rna', 'RNA'],
  ['nmr', 'NMR'],
  ['xrd', 'XRD'],
  ['sem', 'SEM'],
  ['tem', 'TEM'],
  ['afm', 'AFM'],
  ['dsscs', 'DSSCs'],
  ['dssc', 'DSSC'],
  ['drx', 'DRX'],
  ['mev', 'MEV'],
  ['met', 'MET'],
  ['eds', 'EDS'],
  ['tga', 'TGA'],
  ['ieee', 'IEEE'],
  ['acm', 'ACM'],
  ['iop', 'IOP'],
  ['acs', 'ACS'],
  ['rsc', 'RSC'],
  ['mdpi', 'MDPI'],
  ['si', 'SI'],
  ['ti', 'TI'],
  ['ic', 'IC'],
  ['it', 'IT'],
  ['ie', 'IE'],
  ['tcc', 'TCC'],
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
 * Verifica se um token é uma sigla/acrônimo legítimo que deve permanecer em maiúsculas.
 */
function ehSigla(termo: string, apenasLetras: string): boolean {
  const lower = termo.toLowerCase()

  // 1. Sigla conhecida no dicionário
  if (SIGLAS_PREFERENCIAIS.has(lower)) {
    return true
  }

  // 2. Se tem menos de 2 letras, não é sigla (ex: "A", "E", "O", "J.")
  if (apenasLetras.length < 2) {
    return false
  }

  // 3. Se não tem nenhuma vogal (ex.: JDP, FTIR, CPTM, FDRH, NP, PDQ, XRD, DRX), com certeza é sigla
  if (!/[aeiouáéíóúâêîôûãõ]/i.test(apenasLetras)) {
    return true
  }

  // 4. Se tem dígitos intercalados ou símbolos químicos (ex.: "P²CEM", "CO2", "TiO2", "nano-CaCO3")
  if (/[0-9]/.test(termo) && /[a-zA-Z]/.test(termo)) {
    return true
  }

  // 5. Se já tinha minúsculas e maiúsculas intencionais misturadas (ex.: "CNPq", "PubMed", "CBECiMat")
  if (termo.length > 1 && /[a-z]/.test(termo) && /[A-Z]/.test(termo.slice(1))) {
    return true
  }

  return false
}

/**
 * Trata um segmento de palavra separado por hífen ou barra.
 * Ex: "sudeste" -> "Sudeste", "AGITTE" -> "AGITTE", "P²CEM" -> "P²CEM"
 */
function formatarSubpalavra(
  sub: string,
  indexNaPalavra: number,
  isPrimeiraPalavraGeral: boolean,
): string {
  if (!sub) return ''

  const subLower = sub.toLocaleLowerCase('pt-BR')

  // Se for sigla preferencial
  if (SIGLAS_PREFERENCIAIS.has(subLower)) {
    return SIGLAS_PREFERENCIAIS.get(subLower)!
  }

  // Numerais romanos
  if (NUMERAIS_ROMANOS.has(subLower)) {
    return sub.toUpperCase()
  }

  // Ordinais ou números
  if (/^[0-9]+[ºª°]?$/i.test(sub)) {
    return sub
  }

  const apenasLetras = sub.replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '')

  // Se for sigla
  if (ehSigla(sub, apenasLetras)) {
    return sub
  }

  // Conectivos após o hífen: minúsculo
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
function formatarToken(token: string, indexNoTexto: number, aposPontuacaoForte: boolean): string {
  if (!token) return ''

  // Se for e-mail ou URL ou DOI, preserva intacto
  if (token.includes('@') && !token.includes(' ')) return token
  if (/^(https?:\/\/|www\.|doi:)/i.test(token)) return token
  if (/^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/.test(token)) return token

  // Isolar pontuações iniciais e finais: ex: "(CAPES)", "'UNIVERSIDADE'", "AGITTE,", "SILVA,"
  const match = token.match(/^([([{'"“‘«]*)(.*?)([)\]}'"”’».,;:!?-]*)$/)
  if (!match) return token

  const [, prefixo, miolo, sufixo] = match
  if (!miolo) return token

  // Se o miolo contiver hífens (ex.: "sudeste-brasileiro", "PPG-DCEM", "nano-CaCO3")
  if (miolo.includes('-')) {
    const partes = miolo.split('-')
    const partesFormatadas = partes.map((parte, subIdx) =>
      formatarSubpalavra(parte, subIdx, indexNoTexto === 0 && subIdx === 0),
    )
    return prefixo + partesFormatadas.join('-') + sufixo
  }

  // Se contiver barra (ex.: "Docente/Discente")
  if (miolo.includes('/')) {
    const partes = miolo.split('/')
    const partesFormatadas = partes.map((parte, subIdx) =>
      formatarSubpalavra(parte, subIdx, indexNoTexto === 0 && subIdx === 0),
    )
    return prefixo + partesFormatadas.join('/') + sufixo
  }

  const mioloLower = miolo.toLocaleLowerCase('pt-BR')

  // Checar siglas consagradas diretas
  if (SIGLAS_PREFERENCIAIS.has(mioloLower)) {
    return prefixo + SIGLAS_PREFERENCIAIS.get(mioloLower)! + sufixo
  }

  // Ordinais (1º, 2ª, 17º, 18º) ou números puros
  if (/^[0-9]+[ºª°]?$/i.test(miolo)) {
    return prefixo + miolo + sufixo
  }

  // Numerais romanos (II, III, IV...)
  if (NUMERAIS_ROMANOS.has(mioloLower)) {
    return prefixo + miolo.toUpperCase() + sufixo
  }

  // Se o miolo contiver ponto interno (ex.: iniciais como "L.S." ou "Ph.D.")
  if (miolo.includes('.') && miolo.length <= 6) {
    return prefixo + miolo.toUpperCase() + sufixo
  }

  // Conectivos e preposições (de, da, do, e, em, no, na, com, para, por, etc.)
  const isConectivo = PREPOSICOES_CONECTIVOS.has(mioloLower) || CONECTIVOS_INGLES.has(mioloLower)

  if (isConectivo) {
    if (indexNoTexto === 0 || aposPontuacaoForte) {
      return prefixo + capitalizarSimples(miolo) + sufixo
    }
    return prefixo + mioloLower + sufixo
  }

  const apenasLetras = miolo.replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '')

  // Se for sigla / acrônimo legítimo (JDP, FTIR, TiO2, CNPq, etc.)
  if (ehSigla(miolo, apenasLetras)) {
    return prefixo + miolo + sufixo
  }

  // Padrão: Title Case (iniciais maiúsculas e restante minúsculo)
  return prefixo + capitalizarSimples(miolo) + sufixo
}

/**
 * Converte um texto qualquer para Title Case de acordo com as regras especificadas:
 * - Preposições e conectivos em minúscula (de, da, do, das, dos, e, em, no, na, nos, nas, ao, aos, à, às, com, para, por, etc.);
 * - Apenas siglas e acrônimos permanecem em maiúsculas (CAPES, ABCM, AGITTE, UFSC, CNPq, JDP, etc.);
 * - Palavras inteiras em maiúsculas (nomes, títulos, periódicos gritados) viram Title Case:
 *   "SILVA, J. A." -> "Silva, J. A.", "JOURNAL OF MATERIALS RESEARCH" -> "Journal of Materials Research";
 * - Acentuação preservada;
 * - Hífens: capitaliza após hífen ("Sudeste-Brasileiro");
 * - E-mails, URLs e DOIs são preservados;
 * - Se o texto for nulo, indefinido ou vazio, retorna string vazia.
 */
export function toTitleCase(texto: string | null | undefined): string {
  if (texto === null || texto === undefined) return ''
  const limpo = String(texto).trim()
  if (!limpo) return ''

  // Se for estritamente um email, URL ou código identificador com hífen/underline numérico
  if (limpo.includes('@') && !limpo.includes(' ')) return limpo
  if (/^(https?:\/\/|www\.|doi:)/i.test(limpo)) return limpo

  // Divide por espaços preservando palavras
  const tokens = limpo.split(/\s+/)

  const formatados = tokens.map((token, index) => {
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

    return formatarToken(token, index, aposPontuacaoForte)
  })

  return formatados.join(' ')
}
