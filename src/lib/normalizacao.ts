/**
 * Utilitários de normalização de nomes próprios e títulos acadêmicos.
 *
 * Regras:
 * - Nomes de pessoas (Docentes, Discentes, Egressos):
 *   Apenas iniciais maiúsculas (Title Case), preservando conectivos estritamente em minúsculas
 *   ("de, da, das, do e dos"). Ex: "ledjane de Jesus Silva barreto" -> "Ledjane de Jesus Silva Barreto".
 *
 * - Títulos / Textos acadêmicos (Títulos de publicações, trabalhos, prêmios, eventos):
 *   Iniciais maiúsculas nos termos significativos (Title Case), mantendo minúsculas conectivos
 *   (de, da, das, do, dos, e, em, para, com, a, o, as, os, no, na, nos, nas, por, um, uma...)
 *   e preservando maiúsculas de siglas e fórmulas acadêmicas já consagradas (ex.: CAPES, CNPq, UFS,
 *   PPG-DCEM, P²CEM, CBECiMat, EIDTI, FTIR, JCR, DOI, etc.).
 */

const CONECTIVOS_NOMES_PESSOAS = new Set(['de', 'da', 'das', 'do', 'dos', 'e'])

const CONECTIVOS_TITULOS = new Set([
  'a',
  'o',
  'as',
  'os',
  'um',
  'uma',
  'uns',
  'umas',
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
  'para',
  'pra',
  'pro',
  'com',
  'por',
  'sem',
  'sob',
  'sobre',
  'ou',
  'se',
  'que',
  // Conectivos em inglês comuns em títulos de artigos científicos
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

// Siglas consagradas para preservar caixa exata
const SIGLAS_ACADEMICAS = new Map<string, string>([
  ['capes', 'CAPES'],
  ['cnpq', 'CNPq'],
  ['ufs', 'UFS'],
  ['ppg-dcem', 'PPG-DCEM'],
  ['ppgdcem', 'PPG-DCEM'],
  ['p²cem', 'P²CEM'],
  ['p2cem', 'P²CEM'],
  ['cbecimat', 'CBECiMat'],
  ['eidti', 'EIDTI'],
  ['ftir', 'FTIR'],
  ['jcr', 'JCR'],
  ['doi', 'DOI'],
  ['dsscs', 'DSSCs'],
  ['fapesp', 'FAPESP'],
  ['fapitec', 'FAPITEC'],
  ['abm', 'ABM'],
  ['inpi', 'INPI'],
  ['mec', 'MEC'],
  ['b-mrs', 'B-MRS'],
  ['uhf', 'UHF'],
  ['ptcr', 'PTCR'],
  ['pvp', 'PVP'],
  ['pvpp', 'PVPP'],
  ['ldh', 'LDH'],
  ['tempo', 'TEMPO'],
  ['nir', 'NIR'],
])

/**
 * Normaliza nomes de pessoas (docentes, discentes, egressos).
 * Apenas iniciais maiúsculas, com conectivos "de, da, das, do, dos, e" em minúsculas.
 */
export function normalizarNomePessoa(nome: string | null | undefined): string {
  if (!nome) return ''
  const limpo = nome.trim()
  if (!limpo) return ''

  // Divide por espaços mantendo hifens dentro dos termos
  const palavras = limpo.split(/\s+/)

  const formatadas = palavras.map((palavra, index) => {
    // Casos especiais com hífen (ex: "Saint-Germain")
    if (palavra.includes('-')) {
      return palavra
        .split('-')
        .map((sub, subIdx) => {
          const subLower = sub.toLowerCase()
          if (index > 0 && subIdx > 0 && CONECTIVOS_NOMES_PESSOAS.has(subLower)) {
            return subLower
          }
          return capitalizarTermo(sub)
        })
        .join('-')
    }

    const lower = palavra.toLowerCase()
    // O primeiro nome sempre tem inicial maiúscula, mesmo que pareça conectivo
    if (index > 0 && CONECTIVOS_NOMES_PESSOAS.has(lower)) {
      return lower
    }

    // Siglas com ponto como Ph.D., Dr., Me., Prof.
    if (palavra.includes('.')) {
      return palavra
    }

    // Numerais romanos (II, III, IV, Filho, Neto, Sobrinho, Júnior, Junior)
    if (/^(ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(palavra)) {
      return palavra.toUpperCase()
    }

    return capitalizarTermo(palavra)
  })

  return formatadas.join(' ')
}

/**
 * Capitaliza a primeira letra de um termo e coloca o restante em minúsculas
 */
function capitalizarTermo(termo: string): string {
  if (!termo) return ''
  // Preserva caracteres como ordinais: 1º, 2ª
  if (/^[0-9]+[ºª°]?$/i.test(termo)) {
    return termo
  }
  return termo.charAt(0).toUpperCase() + termo.slice(1).toLowerCase()
}

/**
 * Verifica se uma palavra é uma sigla ou fórmula química (ex: "YF3", "CaTiO3", "CO2", "NiO", "CAPES").
 */
function identificarSiglaOuFormula(palavra: string): string | null {
  // Limpa pontuações periféricas para testar: (CAPES) -> CAPES
  const match = palavra.match(/^([([{'"“‘]*)(\S+?)([)\]}'"”’.,;:!?-]*)$/)
  if (!match) return null

  const [, prefixo, nucleo, sufixo] = match
  const nucleoLower = nucleo.toLowerCase()

  // 1. Sigla conhecida do dicionário acadêmico
  if (SIGLAS_ACADEMICAS.has(nucleoLower)) {
    return prefixo + SIGLAS_ACADEMICAS.get(nucleoLower)! + sufixo
  }

  // 2. Fórmulas químicas com dígitos ou letras mistas intencionais (ex: "YF3", "NiO", "Er3+", "CaMoO4", "CO2")
  // Se contiver números ou símbolos químicos (+, -, @) e letras maiúsculas:
  if (/[0-9+@#]/.test(nucleo) && /[A-Z]/.test(nucleo)) {
    return palavra // preserva original intacto
  }

  // 3. Sigla toda em maiúsculas com pelo menos 2 caracteres (ex: "EIDTI", "UFBA", "B-MRS")
  // Se o texto original já estava em maiúsculas puras com 2-6 letras e não parece apenas palavra gritada em texto todo UPPER
  // (será tratado na função principal)
  return null
}

/**
 * Normaliza títulos de trabalhos, publicações, prêmios ou eventos.
 * - Converte textos gritados em Title Case acadêmico
 * - Preserva siglas consagradas (CAPES, CNPq, UFS, P²CEM, etc.) e fórmulas químicas
 * - Mantém conectivos em minúsculas exceto no início do título ou logo após dois-pontos / traço
 */
export function normalizarTituloAcademico(titulo: string | null | undefined): string {
  if (!titulo) return ''
  const limpo = titulo.trim().replace(/\s+/g, ' ')
  if (!limpo) return ''

  // Verifica se o texto inteiro está gritado em CAIXA ALTA (ex: "COMPARATIVE ANALYSIS OF SPECTRAL...")
  const apenasLetras = limpo.replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '')
  const textoTodoMaiusculo = apenasLetras.length > 3 && apenasLetras === apenasLetras.toUpperCase()

  // Se já tiver maiúsculas e minúsculas misturadas bem formatadas (exceto se for só primeira letra),
  // ainda podemos corrigir conectivos que ficaram em maiúsculas sem querer.
  const palavras = limpo.split(' ')

  const formatadas = palavras.map((palavra, index) => {
    // Extrai pontuações inicial e final
    const match = palavra.match(/^([([{'"“‘]*)(.+?)([)\]}'"”’.,;:!?-]*)$/)
    if (!match) return palavra

    const [, prefixo, miolo, sufixo] = match
    const mioloLower = miolo.toLowerCase()

    // 1. Checa dicionário de siglas conhecidas
    if (SIGLAS_ACADEMICAS.has(mioloLower)) {
      return prefixo + SIGLAS_ACADEMICAS.get(mioloLower)! + sufixo
    }

    // 2. Fórmulas químicas e símbolos (ex: YF3, CaTiO3, CO2, Au@Pd, etc.)
    if (/[0-9+@#&]/.test(miolo) && /[a-zA-Z]/.test(miolo)) {
      // Se estava todo maiúsculo e tem número, preserva como fórmula
      return prefixo + miolo + sufixo
    }

    // 3. Conectivos (deve ficar minúsculo, exceto se for a primeira palavra ou após dois-pontos)
    const palavraAnterior = index > 0 ? palavras[index - 1] : ''
    const aposPontuacaoForte =
      palavraAnterior.endsWith(':') ||
      palavraAnterior.endsWith('.') ||
      palavraAnterior.endsWith(';') ||
      palavraAnterior.endsWith('—') ||
      palavraAnterior.endsWith('-')

    if (index > 0 && !aposPontuacaoForte && CONECTIVOS_TITULOS.has(mioloLower)) {
      return prefixo + mioloLower + sufixo
    }

    // 4. Numerais romanos ou ordinais (ex: 17º, 18º, XXIII, XVIII, II)
    if (/^[0-9]+[ºª°]$/i.test(miolo)) {
      return prefixo + miolo + sufixo
    }
    if (
      /^(ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx|xxi|xxii|xxiii)$/i.test(
        miolo,
      )
    ) {
      return prefixo + miolo.toUpperCase() + sufixo
    }

    // 5. Se o texto estava todo em MAIÚSCULAS e esta palavra tinha 2-5 letras e não é sigla conhecida:
    // Se for palavra comum em inglês ou português, vira Title Case; se parece sigla específica, mantém
    if (textoTodoMaiusculo) {
      return prefixo + capitalizarTermo(miolo) + sufixo
    }

    // 6. Se a palavra original já era mista ou tinha maiúsculas no meio (ex: "PubMed", "pH", "GaAs"), preserva
    if (miolo.length > 1 && /[a-z]/.test(miolo) && /[A-Z]/.test(miolo.slice(1))) {
      return prefixo + miolo + sufixo
    }

    // 7. Padrão: Title Case na primeira palavra ou palavra comum
    return prefixo + capitalizarTermo(miolo) + sufixo
  })

  return formatadas.join(' ')
}
