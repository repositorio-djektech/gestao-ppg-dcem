import type { Discente, Egresso } from '@/types/database'

export interface AutorCandidatoPrograma {
  id: number
  tipo: 'orientando' | 'egresso'
  nome: string
  grauConfianca: number // 0 a 1
  motivoMatch: string
  discenteId?: number
  egressoId?: number
}

const STOPWORDS_NOME = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'junior',
  'neto',
  'filho',
  'sobrinho',
  'dr',
  'dra',
  'prof',
  'profa',
])

/**
 * Normaliza string removendo acentuação, caracteres especiais e convertendo para minúsculas.
 */
export function normalizarTextoNome(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Divide o campo de texto livre de autores em segmentos individuais.
 * Suporta separadores comuns do Lattes/Scopus/Crossref: ponto-e-vírgula, " and ", vírgula (quando não for Sobrenome, Iniciais).
 */
export function dividirAutoresTexto(autoresStr: string | null | undefined): string[] {
  if (!autoresStr) return []
  const texto = autoresStr.trim()
  if (!texto) return []

  // Se tiver ponto-e-vírgula, é o padrão Lattes canônico
  if (texto.includes(';')) {
    return texto
      .split(';')
      .map((a) => a.trim())
      .filter(Boolean)
  }

  // Se tiver " and "
  if (/\s+and\s+/i.test(texto)) {
    return texto
      .split(/\s+and\s+/i)
      .map((a) => a.trim())
      .filter(Boolean)
  }

  // Caso seja apenas vírgula separando autores inteiros (ex: "Carlos Roberto, João Silva")
  // Se não contiver padrão "Sobrenome, Iniciais", divide por vírgula
  const partes = texto
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  // Se parecer "Sobrenome, Nome", mantenha junto
  if (partes.length === 2 && !partes[0].includes(' ') && !partes[1].includes(';')) {
    // Pode ser um único autor "Silva, J."
    return [texto]
  }

  return partes.length > 0 ? partes : [texto]
}

export interface PartesNome {
  original: string
  tokens: string[]
  ultimoSobrenome: string
  primeiroNome: string
  iniciais: string[] // ex: ['j', 'l']
}

/**
 * Analisa um nome ou autor extraindo sobrenome, primeiro nome e iniciais.
 * Trata tanto "Silva, João P." quanto "João P. Silva".
 */
export function decomporNome(nomeRaw: string): PartesNome {
  const norm = normalizarTextoNome(nomeRaw)
  const tokens = norm.split(' ').filter((t) => t.length > 0 && !STOPWORDS_NOME.has(t))

  if (tokens.length === 0) {
    return {
      original: nomeRaw,
      tokens: [],
      ultimoSobrenome: '',
      primeiroNome: '',
      iniciais: [],
    }
  }

  // Verifica se o texto original tinha vírgula (formato "Sobrenome, Nome")
  if (nomeRaw.includes(',')) {
    const [sobrenomeParte, ...resto] = nomeRaw.split(',')
    const sobrenomeTokens = normalizarTextoNome(sobrenomeParte)
      .split(' ')
      .filter((t) => t.length > 0 && !STOPWORDS_NOME.has(t))
    const restoTokens = normalizarTextoNome(resto.join(' '))
      .split(' ')
      .filter((t) => t.length > 0 && !STOPWORDS_NOME.has(t))

    const ultimoSobrenome = sobrenomeTokens[sobrenomeTokens.length - 1] || tokens[tokens.length - 1]
    const primeiroNome = restoTokens[0] || tokens[0]
    const iniciais = restoTokens.map((t) => t[0]).filter(Boolean)

    return {
      original: nomeRaw,
      tokens,
      ultimoSobrenome,
      primeiroNome,
      iniciais,
    }
  }

  // Formato direto "Nome Sobrenome" ou "Nome Meio Sobrenome"
  const primeiroNome = tokens[0]
  const ultimoSobrenome = tokens[tokens.length - 1]
  const iniciais = tokens
    .slice(0, -1)
    .map((t) => t[0])
    .filter(Boolean)

  return {
    original: nomeRaw,
    tokens,
    ultimoSobrenome,
    primeiroNome,
    iniciais,
  }
}

/**
 * Compara dois nomes (um trecho de autor da publicação vs um discente/egresso) e retorna o grau de confiança (0 a 1).
 */
export function calcularSimilaridadeNome(
  autorStr: string,
  pessoaNome: string,
): { match: boolean; score: number; motivo: string } {
  const normAutor = normalizarTextoNome(autorStr)
  const normPessoa = normalizarTextoNome(pessoaNome)

  if (!normAutor || !normPessoa) {
    return { match: false, score: 0, motivo: '' }
  }

  // 1. Match exato normalizado
  if (normAutor === normPessoa) {
    return { match: true, score: 1.0, motivo: 'Nome completo exato' }
  }

  // 2. Substring do nome completo da pessoa dentro da string de autor (ex: "FONSECA, JANDER LOPES")
  const partesPessoa = decomporNome(pessoaNome)
  const partesAutor = decomporNome(autorStr)

  if (partesPessoa.tokens.length === 0 || partesAutor.tokens.length === 0) {
    return { match: false, score: 0, motivo: '' }
  }

  // Se todos os tokens da pessoa estiverem contidos no autor
  const todosTokensPessoaNoAutor = partesPessoa.tokens.every((t) => partesAutor.tokens.includes(t))
  if (todosTokensPessoaNoAutor && partesPessoa.tokens.length >= 2) {
    return {
      match: true,
      score: 0.95,
      motivo: 'Todos os sobrenomes e nomes coincidem',
    }
  }

  // Se todos os tokens do autor estiverem contidos na pessoa (ex: autor tem 2 nomes e pessoa tem 3)
  const todosTokensAutorNaPessoa = partesAutor.tokens.every((t) => partesPessoa.tokens.includes(t))
  if (todosTokensAutorNaPessoa && partesAutor.tokens.length >= 2) {
    return {
      match: true,
      score: 0.9,
      motivo: 'Nome e sobrenome presentes no cadastro do programa',
    }
  }

  // 3. Sobrenome + Iniciais:
  // Ex: "Fonseca, J. L." ou "Fonseca, J." vs "Jander Lopes Fonseca"
  // Ex: "Silva, J." vs "João Silva"
  const mesmoSobrenome =
    partesAutor.ultimoSobrenome.length > 2 &&
    (partesAutor.ultimoSobrenome === partesPessoa.ultimoSobrenome ||
      partesPessoa.tokens.includes(partesAutor.ultimoSobrenome))

  if (mesmoSobrenome) {
    // Compara primeira letra do primeiro nome
    const inicialAutor = partesAutor.primeiroNome ? partesAutor.primeiroNome[0] : ''
    const inicialPessoa = partesPessoa.primeiroNome ? partesPessoa.primeiroNome[0] : ''

    if (inicialAutor && inicialPessoa && inicialAutor === inicialPessoa) {
      // Se autor informou mais de 1 caractere no primeiro nome e coincide com primeiro nome da pessoa
      if (
        partesAutor.primeiroNome.length > 2 &&
        partesPessoa.primeiroNome.length > 2 &&
        partesAutor.primeiroNome === partesPessoa.primeiroNome
      ) {
        return {
          match: true,
          score: 0.9,
          motivo: `Sobrenome (${partesAutor.ultimoSobrenome}) e primeiro nome (${partesAutor.primeiroNome}) idênticos`,
        }
      }

      // Se foi apenas inicial (ex: "Silva, J." ≈ "João Silva")
      return {
        match: true,
        score: 0.75,
        motivo: `Sobrenome (${partesAutor.ultimoSobrenome}) + inicial compatível (${inicialAutor.toUpperCase()}.)`,
      }
    }
  }

  return { match: false, score: 0, motivo: '' }
}

/**
 * Sugere candidatos de discentes e egressos para uma publicação a partir do campo de texto livre de autores.
 */
export function sugerirCoautoresPublicacao(params: {
  autoresTexto: string | null | undefined
  discentes: Array<Pick<Discente, 'id' | 'nome' | 'status'>>
  egressos?: Array<Pick<Egresso, 'id' | 'nome'>>
}): AutorCandidatoPrograma[] {
  const { autoresTexto, discentes, egressos = [] } = params
  if (!autoresTexto) return []

  const autores = dividirAutoresTexto(autoresTexto)
  const candidatos: AutorCandidatoPrograma[] = []
  const chavesVistas = new Set<string>()

  // Compara cada trecho de autor contra discentes
  for (const autor of autores) {
    // 1. Testa contra discentes
    for (const disc of discentes) {
      const sim = calcularSimilaridadeNome(autor, disc.nome)
      if (sim.match) {
        const chave = `discente-${disc.id}`
        if (!chavesVistas.has(chave)) {
          chavesVistas.add(chave)
          candidatos.push({
            id: disc.id,
            discenteId: disc.id,
            tipo: 'orientando',
            nome: disc.nome,
            grauConfianca: sim.score,
            motivoMatch: `${sim.motivo} (Autor no artigo: "${autor.trim()}")`,
          })
        }
      }
    }

    // 2. Testa contra egressos
    for (const eg of egressos) {
      const sim = calcularSimilaridadeNome(autor, eg.nome)
      if (sim.match) {
        const chave = `egresso-${eg.id}`
        if (!chavesVistas.has(chave)) {
          chavesVistas.add(chave)
          candidatos.push({
            id: eg.id,
            egressoId: eg.id,
            tipo: 'egresso',
            nome: eg.nome,
            grauConfianca: sim.score,
            motivoMatch: `${sim.motivo} (Egresso P²CEM; Autor no artigo: "${autor.trim()}")`,
          })
        }
      }
    }
  }

  // Ordena por maior grau de confiança
  return candidatos.sort((a, b) => b.grauConfianca - a.grauConfianca)
}
