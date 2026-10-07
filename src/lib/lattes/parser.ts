import type {
  LattesDocente,
  LattesPublicacao,
  LattesOrientacao,
  LattesBanca,
  LattesProjeto,
  LattesPremiacao,
  LattesProducaoTecnica,
  LattesPatente,
  LattesEvento,
  LattesArquivoResultado,
} from './types'

/**
 * Normaliza valores de atributos de XML do Lattes:
 * "NAO_INFORMADO", strings vazias ou apenas espaços -> null.
 */
export function limparTexto(valor: string | null | undefined): string | null {
  if (!valor) return null
  const limpo = valor.trim()
  if (
    limpo === '' ||
    limpo.toUpperCase() === 'NAO_INFORMADO' ||
    limpo.toUpperCase() === 'NÃO INFORMADO'
  ) {
    return null
  }
  return limpo
}

/**
 * Normaliza chave de string para deduplicação (remove pontuação, acentos e múltiplos espaços).
 */
export function normalizarChave(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calcula os anos do quadriênio corrente [ano - 4, ano - 1].
 * Exemplo em 2026: 2022 a 2025.
 */
export function obterAnosQuadrienio(anoReferencia: number = new Date().getFullYear()): {
  anoInicio: number
  anoFim: number
} {
  return {
    anoInicio: anoReferencia - 4,
    anoFim: anoReferencia - 1,
  }
}

/**
 * Verifica se um ano está dentro do quadriênio.
 */
export function noQuadrienio(
  ano: number | null | undefined,
  anoInicio: number,
  anoFim: number,
): boolean {
  if (!ano) return false
  return ano >= anoInicio && ano <= anoFim
}

/**
 * Converte ArrayBuffer (lido com FileReader ou JSZip) decodificando como ISO-8859-1.
 */
export function decodificarXmlArrayBuffer(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('iso-8859-1')
  return decoder.decode(buffer)
}

/**
 * Extrai autores concatenados de um elemento pai (ex: ARTIGO-PUBLICADO, LIVRO, etc.)
 */
function extrairAutores(el: Element): string | null {
  const autoresEls = el.querySelectorAll('AUTORES')
  if (!autoresEls || autoresEls.length === 0) return null
  const lista: string[] = []
  autoresEls.forEach((a) => {
    const nome =
      limparTexto(a.getAttribute('NOME-PARA-CITACAO')) ||
      limparTexto(a.getAttribute('NOME-COMPLETO-DO-AUTOR'))
    if (nome) lista.push(nome)
  })
  return lista.length > 0 ? lista.join('; ') : null
}

/**
 * Parser do XML Lattes completo.
 */
export function parseLattesXml(
  xmlContent: string,
  nomeArquivo: string = 'curriculo.xml',
  anoInicioFiltro?: number,
  anoFimFiltro?: number,
): LattesArquivoResultado {
  const padraoQuadrienio = obterAnosQuadrienio()
  const anoInicio = anoInicioFiltro ?? padraoQuadrienio.anoInicio
  const anoFim = anoFimFiltro ?? padraoQuadrienio.anoFim

  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlContent, 'text/xml')

  // Checar erro de parse do DOMParser
  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    return {
      nome_arquivo: nomeArquivo,
      id_lattes: '',
      nome_docente: '',
      erro: `Erro na leitura da estrutura XML: ${parserError.textContent?.slice(0, 200) || 'formato inválido'}`,
      sucesso: false,
      publicacoes: [],
      orientacoes: [],
      bancas: [],
      projetos: [],
      premiacoes: [],
      producoes_tecnicas: [],
      patentes: [],
      eventos: [],
      estatisticas: {
        publicacoes: { a_inserir: 0, ignorados: 0 },
        orientacoes: { a_inserir: 0, ignorados: 0 },
        bancas: { a_inserir: 0, ignorados: 0 },
        projetos: { a_inserir: 0, ignorados: 0 },
        premiacoes: { a_inserir: 0, ignorados: 0 },
        producoes_tecnicas: { a_inserir: 0, ignorados: 0 },
        patentes: { a_inserir: 0, ignorados: 0 },
        eventos: { a_inserir: 0, ignorados: 0 },
      },
      itens_ignorados: [],
    }
  }

  const raiz = doc.querySelector('CURRICULO-VITAE')
  if (!raiz) {
    return {
      nome_arquivo: nomeArquivo,
      id_lattes: '',
      nome_docente: '',
      erro: 'Arquivo XML não contém a raiz <CURRICULO-VITAE>. Certifique-se de usar o XML oficial do CNPq/Lattes.',
      sucesso: false,
      publicacoes: [],
      orientacoes: [],
      bancas: [],
      projetos: [],
      premiacoes: [],
      producoes_tecnicas: [],
      patentes: [],
      eventos: [],
      estatisticas: {
        publicacoes: { a_inserir: 0, ignorados: 0 },
        orientacoes: { a_inserir: 0, ignorados: 0 },
        bancas: { a_inserir: 0, ignorados: 0 },
        projetos: { a_inserir: 0, ignorados: 0 },
        premiacoes: { a_inserir: 0, ignorados: 0 },
        producoes_tecnicas: { a_inserir: 0, ignorados: 0 },
        patentes: { a_inserir: 0, ignorados: 0 },
        eventos: { a_inserir: 0, ignorados: 0 },
      },
      itens_ignorados: [],
    }
  }

  const idLattes = raiz.getAttribute('NUMERO-IDENTIFICADOR') || ''

  // 1. DADOS GERAIS DO DOCENTE
  const dadosGeraisEl = raiz.querySelector('DADOS-GERAIS')
  const nomeDocente = dadosGeraisEl?.getAttribute('NOME-COMPLETO') || 'Docente sem nome'
  const citacoes = dadosGeraisEl?.getAttribute('NOME-EM-CITACOES-BIBLIOGRAFICAS')
  const orcid = dadosGeraisEl?.getAttribute('ORCID-ID')
  const resumoCv = dadosGeraisEl?.querySelector('RESUMO-CV')?.getAttribute('TEXTO-RESUMO-CV-RH')

  // Endereço / e-mail profissional
  const enderecoProf = dadosGeraisEl?.querySelector('ENDERECO-PROFISSIONAL')
  const emailProf = enderecoProf?.getAttribute('E-MAIL')
  const instituicao = enderecoProf?.getAttribute('NOME-INSTITUICAO-EMPRESA')
  const orgao =
    enderecoProf?.getAttribute('NOME-ORGAO') || enderecoProf?.getAttribute('NOME-UNIDADE')

  // Formação acadêmica
  const formacaoEl = raiz.querySelector('FORMACAO-ACADEMICA-TITULACAO')
  const formacoes: LattesDocente['formacao_academica'] = []
  if (formacaoEl) {
    formacaoEl.querySelectorAll('GRADUACAO, MESTRADO, DOUTORADO, POS-DOUTORADO').forEach((f) => {
      const tag = f.tagName.toUpperCase()
      let tipo: 'GRADUACAO' | 'MESTRADO' | 'DOUTORADO' | 'POS-DOUTORADO' | 'OUTRA' = 'OUTRA'
      if (tag === 'GRADUACAO') tipo = 'GRADUACAO'
      else if (tag === 'MESTRADO') tipo = 'MESTRADO'
      else if (tag === 'DOUTORADO') tipo = 'DOUTORADO'
      else if (tag === 'POS-DOUTORADO') tipo = 'POS-DOUTORADO'

      const curso = limparTexto(
        f.getAttribute('NOME-CURSO') || f.getAttribute('TITULO-DA-DISSERTACAO-TESE'),
      )
      const inst = limparTexto(f.getAttribute('NOME-INSTITUICAO'))
      const anoIni = parseInt(f.getAttribute('ANO-DE-INICIO') || '', 10) || null
      const anoFim =
        parseInt(
          f.getAttribute('ANO-DE-CONCLUSAO') || f.getAttribute('ANO-DE-OBTENCAO-DO-TITULO') || '',
          10,
        ) || null
      const orientador = limparTexto(
        f.getAttribute('NOME-COMPLETO-DO-ORIENTADOR') || f.getAttribute('NOME-ORIENTADOR-DOUT'),
      )
      const tituloTrab = limparTexto(
        f.getAttribute('TITULO-DA-DISSERTACAO-TESE') ||
          f.getAttribute('TITULO-DO-TRABALHO-DE-CONCLUSAO-DE-CURSO'),
      )

      formacoes.push({
        tipo,
        curso,
        instituicao: inst,
        ano_inicio: anoIni,
        ano_conclusao: anoFim,
        titulo_trabalho: tituloTrab,
        orientador,
      })
    })
  }

  const docente: LattesDocente = {
    id_lattes: idLattes,
    nome_completo: nomeDocente,
    citacoes_bibliograficas: limparTexto(citacoes),
    orcid: limparTexto(orcid),
    resumo_cv: limparTexto(resumoCv),
    email: limparTexto(emailProf),
    instituicao: limparTexto(instituicao),
    orgao: limparTexto(orgao),
    formacao_academica: formacoes,
  }

  const itensIgnorados: LattesArquivoResultado['itens_ignorados'] = []

  // ==========================================
  // 2. PUBLICAÇÕES (Artigos, Livros, Capítulos)
  // ==========================================
  const publicacoes: LattesPublicacao[] = []
  const chavesPublicacoes = new Set<string>()
  let pubIgnorados = 0

  // 2.1 Artigos
  raiz.querySelectorAll('ARTIGO-PUBLICADO').forEach((artEl) => {
    const dadosBasicos = artEl.querySelector('DADOS-BASICOS-DO-ARTIGO')
    const detalhamento = artEl.querySelector('DETALHAMENTO-DO-ARTIGO')
    const titulo = limparTexto(dadosBasicos?.getAttribute('TITULO-DO-ARTIGO'))
    const ano = parseInt(dadosBasicos?.getAttribute('ANO-DO-ARTIGO') || '', 10)
    const doi = limparTexto(dadosBasicos?.getAttribute('DOI'))
    const veiculo = limparTexto(detalhamento?.getAttribute('TITULO-DO-PERIODICO-OU-REVISTA'))
    const issn = limparTexto(detalhamento?.getAttribute('ISSN'))
    const volume = limparTexto(detalhamento?.getAttribute('VOLUME'))
    const fasciculo = limparTexto(detalhamento?.getAttribute('FASCICULO'))
    const serie = limparTexto(detalhamento?.getAttribute('SERIE'))
    const pagIni = limparTexto(detalhamento?.getAttribute('PAGINA-INICIAL'))
    const pagFim = limparTexto(detalhamento?.getAttribute('PAGINA-FINAL'))
    const autores = extrairAutores(artEl)

    if (!titulo || !ano) {
      pubIgnorados++
      itensIgnorados.push({
        tabela: 'publicacoes',
        identificador: titulo || 'Artigo sem título',
        motivo: 'DADOS_INSUFICIENTES',
        ano: ano || null,
      })
      return
    }

    if (!noQuadrienio(ano, anoInicio, anoFim)) {
      pubIgnorados++
      itensIgnorados.push({
        tabela: 'publicacoes',
        identificador: `[Artigo] ${titulo}`,
        motivo: 'FORA_QUADRIENIO',
        ano,
      })
      return
    }

    const chave = `${normalizarChave(titulo)}|${ano}`
    if (chavesPublicacoes.has(chave)) {
      pubIgnorados++
      itensIgnorados.push({
        tabela: 'publicacoes',
        identificador: `[Artigo] ${titulo}`,
        motivo: 'DUPLICADO',
        ano,
      })
      return
    }

    chavesPublicacoes.add(chave)
    publicacoes.push({
      tipo: 'ARTIGO',
      titulo,
      ano,
      doi,
      veiculo,
      issn_isbn: issn,
      volume,
      fasciculo,
      serie,
      pagina_inicial: pagIni,
      pagina_final: pagFim,
      autores,
      natureza: limparTexto(dadosBasicos?.getAttribute('NATUREZA')),
    })
  })

  // 2.2 Livros
  raiz.querySelectorAll('LIVRO-PUBLICADO-OU-ORGANIZADO').forEach((livroEl) => {
    const dadosBasicos = livroEl.querySelector('DADOS-BASICOS-DO-LIVRO')
    const detalhamento = livroEl.querySelector('DETALHAMENTO-DO-LIVRO')
    const titulo = limparTexto(dadosBasicos?.getAttribute('TITULO-DO-LIVRO'))
    const ano = parseInt(dadosBasicos?.getAttribute('ANO') || '', 10)
    const isbn = limparTexto(detalhamento?.getAttribute('ISBN'))
    const editora = limparTexto(detalhamento?.getAttribute('NOME-DA-EDITORA'))
    const volume = limparTexto(
      detalhamento?.getAttribute('NUMERO-DE-VOLUMES') ||
        detalhamento?.getAttribute('NUMERO-DE-PAGINAS'),
    )
    const autores = extrairAutores(livroEl)

    if (!titulo || !ano) {
      pubIgnorados++
      return
    }

    if (!noQuadrienio(ano, anoInicio, anoFim)) {
      pubIgnorados++
      itensIgnorados.push({
        tabela: 'publicacoes',
        identificador: `[Livro] ${titulo}`,
        motivo: 'FORA_QUADRIENIO',
        ano,
      })
      return
    }

    const chave = `${normalizarChave(titulo)}|${ano}`
    if (chavesPublicacoes.has(chave)) {
      pubIgnorados++
      itensIgnorados.push({
        tabela: 'publicacoes',
        identificador: `[Livro] ${titulo}`,
        motivo: 'DUPLICADO',
        ano,
      })
      return
    }

    chavesPublicacoes.add(chave)
    publicacoes.push({
      tipo: 'LIVRO',
      titulo,
      ano,
      veiculo: editora,
      issn_isbn: isbn,
      volume,
      autores,
    })
  })

  // 2.3 Capítulos de Livros
  raiz.querySelectorAll('CAPITULO-DE-LIVRO-PUBLICADO').forEach((capEl) => {
    const dadosBasicos = capEl.querySelector('DADOS-BASICOS-DO-CAPITULO')
    const detalhamento = capEl.querySelector('DETALHAMENTO-DO-CAPITULO')
    const titulo = limparTexto(dadosBasicos?.getAttribute('TITULO-DO-CAPITULO-DO-LIVRO'))
    const livroTitulo = limparTexto(detalhamento?.getAttribute('TITULO-DO-LIVRO'))
    const ano = parseInt(dadosBasicos?.getAttribute('ANO') || '', 10)
    const isbn = limparTexto(detalhamento?.getAttribute('ISBN'))
    const editora = limparTexto(detalhamento?.getAttribute('NOME-DA-EDITORA'))
    const pagIni = limparTexto(detalhamento?.getAttribute('PAGINA-INICIAL'))
    const pagFim = limparTexto(detalhamento?.getAttribute('PAGINA-FINAL'))
    const autores = extrairAutores(capEl)

    if (!titulo || !ano) {
      pubIgnorados++
      return
    }

    if (!noQuadrienio(ano, anoInicio, anoFim)) {
      pubIgnorados++
      itensIgnorados.push({
        tabela: 'publicacoes',
        identificador: `[Capítulo] ${titulo}`,
        motivo: 'FORA_QUADRIENIO',
        ano,
      })
      return
    }

    const chave = `${normalizarChave(titulo)}|${ano}`
    if (chavesPublicacoes.has(chave)) {
      pubIgnorados++
      itensIgnorados.push({
        tabela: 'publicacoes',
        identificador: `[Capítulo] ${titulo}`,
        motivo: 'DUPLICADO',
        ano,
      })
      return
    }

    chavesPublicacoes.add(chave)
    publicacoes.push({
      tipo: 'CAPITULO',
      titulo,
      ano,
      veiculo: livroTitulo ? `${livroTitulo} (${editora || ''})` : editora,
      issn_isbn: isbn,
      pagina_inicial: pagIni,
      pagina_final: pagFim,
      autores,
    })
  })

  // ==========================================
  // 3. ORIENTAÇÕES (Concluídas e Em Andamento)
  // ==========================================
  const orientacoes: LattesOrientacao[] = []
  const chavesOrientacoes = new Set<string>()
  let oriIgnorados = 0

  function processarOrientacao(el: Element, situacao: 'CONCLUIDA' | 'EM_ANDAMENTO') {
    const tagName = el.tagName.toUpperCase()
    let tipo: LattesOrientacao['tipo'] = 'OUTRA'
    if (tagName.includes('MESTRADO')) tipo = 'MESTRADO'
    else if (tagName.includes('DOUTORADO')) tipo = 'DOUTORADO'
    else if (tagName.includes('POS-DOUTORADO')) tipo = 'POS-DOUTORADO'
    else if (tagName.includes('INICIACAO-CIENTIFICA')) tipo = 'INICIACAO_CIENTIFICA'
    else if (tagName.includes('GRADUACAO') || tagName.includes('APERFEICOAMENTO'))
      tipo = 'GRADUACAO'

    const dadosBasicos =
      el.querySelector(
        'DADOS-BASICOS-DE-ORIENTACOES-CONCLUIDAS-PARA-MESTRADO, DADOS-BASICOS-DE-ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO, DADOS-BASICOS-DE-OUTRAS-ORIENTACOES-CONCLUIDAS, DADOS-BASICOS-DA-ORIENTACAO-EM-ANDAMENTO',
      ) || el.children[0]
    const detalhamento =
      el.querySelector(
        'DETALHAMENTO-DE-ORIENTACOES-CONCLUIDAS-PARA-MESTRADO, DETALHAMENTO-DE-ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO, DETALHAMENTO-DE-OUTRAS-ORIENTACOES-CONCLUIDAS, DETALHAMENTO-DA-ORIENTACAO-EM-ANDAMENTO',
      ) || el.children[1]

    const titulo = limparTexto(
      dadosBasicos?.getAttribute('TITULO') ||
        dadosBasicos?.getAttribute('TITULO-DO-TRABALHO') ||
        el.getAttribute('TITULO'),
    )
    const orientando = limparTexto(
      detalhamento?.getAttribute('NOME-DO-ORIENTANDO') || el.getAttribute('NOME-DO-ORIENTANDO'),
    )
    const anoConclusao =
      parseInt(dadosBasicos?.getAttribute('ANO') || el.getAttribute('ANO') || '', 10) || null
    const anoInicioOri =
      parseInt(
        dadosBasicos?.getAttribute('ANO-DE-INICIO') || el.getAttribute('ANO-DE-INICIO') || '',
        10,
      ) || null
    const anoVerificacao =
      situacao === 'CONCLUIDA' ? anoConclusao || anoInicioOri : anoInicioOri || anoConclusao

    const inst = limparTexto(
      detalhamento?.getAttribute('NOME-DA-INSTITUICAO') || el.getAttribute('NOME-DA-INSTITUICAO'),
    )
    const curso = limparTexto(
      detalhamento?.getAttribute('NOME-DO-CURSO') || el.getAttribute('NOME-DO-CURSO'),
    )
    const tipoOriRaw =
      detalhamento?.getAttribute('TIPO-DE-ORIENTACAO') || el.getAttribute('TIPO-DE-ORIENTACAO')
    const tipoOri: LattesOrientacao['tipo_orientacao'] =
      tipoOriRaw && tipoOriRaw.toUpperCase().includes('CO')
        ? 'CO_ORIENTADOR'
        : 'ORIENTADOR_PRINCIPAL'
    const bolsa =
      (detalhamento?.getAttribute('FLAG-BOLSA') || el.getAttribute('FLAG-BOLSA')) === 'SIM'
    const agencia = limparTexto(
      detalhamento?.getAttribute('NOME-DA-AGENCIA') || el.getAttribute('NOME-DA-AGENCIA'),
    )

    if (!orientando) {
      oriIgnorados++
      return
    }

    if (anoVerificacao && !noQuadrienio(anoVerificacao, anoInicio, anoFim)) {
      oriIgnorados++
      itensIgnorados.push({
        tabela: 'orientacoes',
        identificador: `${orientando} (${titulo || 'Sem título'})`,
        motivo: 'FORA_QUADRIENIO',
        ano: anoVerificacao,
      })
      return
    }

    const chave = `${normalizarChave(orientando)}|${normalizarChave(titulo || '')}|${anoVerificacao || 0}`
    if (chavesOrientacoes.has(chave)) {
      oriIgnorados++
      itensIgnorados.push({
        tabela: 'orientacoes',
        identificador: `${orientando} (${titulo || 'Sem título'})`,
        motivo: 'DUPLICADO',
        ano: anoVerificacao,
      })
      return
    }

    chavesOrientacoes.add(chave)
    orientacoes.push({
      tipo,
      situacao,
      titulo_trabalho: titulo,
      orientando,
      ano_inicio: anoInicioOri,
      ano_conclusao: anoConclusao,
      instituicao: inst,
      curso,
      tipo_orientacao: tipoOri,
      bolsa,
      agencia_fomento: agencia,
    })
  }

  // Tags concluídas
  raiz
    .querySelectorAll(
      'ORIENTACOES-CONCLUIDAS-PARA-MESTRADO, ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO, OUTRAS-ORIENTACOES-CONCLUIDAS, ORIENTACOES-CONCLUIDAS-PARA-POS-DOUTORADO',
    )
    .forEach((el) => {
      processarOrientacao(el, 'CONCLUIDA')
    })

  // Tags em andamento
  raiz
    .querySelectorAll(
      'ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO, ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO, ORIENTACAO-EM-ANDAMENTO-DE-POS-DOUTORADO, ORIENTACAO-EM-ANDAMENTO-DE-INICIACAO-CIENTIFICA, OUTRAS-ORIENTACOES-EM-ANDAMENTO',
    )
    .forEach((el) => {
      processarOrientacao(el, 'EM_ANDAMENTO')
    })

  // ==========================================
  // 4. BANCAS (Mestrado, Doutorado, Qualificações, Graduação)
  // ==========================================
  const bancas: LattesBanca[] = []
  const chavesBancas = new Set<string>()
  let bancasIgnoradas = 0

  const bancaTags = [
    'PARTICIPACAO-EM-BANCA-DE-MESTRADO',
    'PARTICIPACAO-EM-BANCA-DE-DOUTORADO',
    'PARTICIPACAO-EM-BANCA-DE-EXAME-QUALIFICACAO',
    'PARTICIPACAO-EM-BANCA-DE-GRADUACAO',
    'PARTICIPACAO-EM-BANCA-DE-APERFEICOAMENTO-ESPECIALIZACAO',
    'OUTRAS-PARTICIPACOES-EM-BANCA-JULGADORA',
  ]

  raiz.querySelectorAll(bancaTags.join(', ')).forEach((bEl) => {
    const tag = bEl.tagName.toUpperCase()
    let tipo: LattesBanca['tipo'] = 'OUTRA'
    if (tag.includes('MESTRADO')) tipo = 'MESTRADO'
    else if (tag.includes('DOUTORADO')) tipo = 'DOUTORADO'
    else if (tag.includes('QUALIFICACAO')) tipo = 'QUALIFICACAO'
    else if (tag.includes('GRADUACAO')) tipo = 'GRADUACAO'

    const dadosBasicos =
      bEl.querySelector(
        'DADOS-BASICOS-DA-PARTICIPACAO-EM-BANCA-DE-MESTRADO, DADOS-BASICOS-DA-PARTICIPACAO-EM-BANCA-DE-DOUTORADO, DADOS-BASICOS-DA-PARTICIPACAO-EM-BANCA-DE-EXAME-QUALIFICACAO, DADOS-BASICOS-DA-PARTICIPACAO-EM-BANCA-DE-GRADUACAO, DADOS-BASICOS-DA-PARTICIPACAO-EM-BANCA-DE-APERFEICOAMENTO-ESPECIALIZACAO, DADOS-BASICOS-DE-OUTRAS-PARTICIPACOES-EM-BANCA-JULGADORA',
      ) || bEl.children[0]
    const detalhamento =
      bEl.querySelector(
        'DETALHAMENTO-DA-PARTICIPACAO-EM-BANCA-DE-MESTRADO, DETALHAMENTO-DA-PARTICIPACAO-EM-BANCA-DE-DOUTORADO, DETALHAMENTO-DA-PARTICIPACAO-EM-BANCA-DE-EXAME-QUALIFICACAO, DETALHAMENTO-DA-PARTICIPACAO-EM-BANCA-DE-GRADUACAO, DETALHAMENTO-DA-PARTICIPACAO-EM-BANCA-DE-APERFEICOAMENTO-ESPECIALIZACAO, DETALHAMENTO-DE-OUTRAS-PARTICIPACOES-EM-BANCA-JULGADORA',
      ) || bEl.children[1]

    const titulo = limparTexto(dadosBasicos?.getAttribute('TITULO') || bEl.getAttribute('TITULO'))
    const ano = parseInt(dadosBasicos?.getAttribute('ANO') || bEl.getAttribute('ANO') || '', 10)
    const candidato = limparTexto(
      detalhamento?.getAttribute('NOME-DO-CANDIDATO') || bEl.getAttribute('NOME-DO-CANDIDATO'),
    )
    const inst = limparTexto(
      detalhamento?.getAttribute('NOME-INSTITUICAO') || bEl.getAttribute('NOME-INSTITUICAO'),
    )
    const curso = limparTexto(
      detalhamento?.getAttribute('NOME-CURSO') || bEl.getAttribute('NOME-CURSO'),
    )
    const participantes = extrairAutores(bEl)

    if (!titulo || !ano) {
      bancasIgnoradas++
      return
    }

    if (!noQuadrienio(ano, anoInicio, anoFim)) {
      bancasIgnoradas++
      itensIgnorados.push({
        tabela: 'bancas',
        identificador: `${titulo} (${candidato || 'Sem candidato'})`,
        motivo: 'FORA_QUADRIENIO',
        ano,
      })
      return
    }

    const chave = `${normalizarChave(titulo)}|${ano}`
    if (chavesBancas.has(chave)) {
      bancasIgnoradas++
      itensIgnorados.push({
        tabela: 'bancas',
        identificador: titulo,
        motivo: 'DUPLICADO',
        ano,
      })
      return
    }

    chavesBancas.add(chave)
    bancas.push({
      tipo,
      titulo_trabalho: titulo,
      candidato,
      ano,
      instituicao: inst,
      curso,
      participantes,
    })
  })

  // ==========================================
  // 5. PROJETOS DE PESQUISA
  // ==========================================
  const projetos: LattesProjeto[] = []
  const chavesProjetos = new Set<string>()
  let projetosIgnorados = 0

  raiz.querySelectorAll('PROJETO-DE-PESQUISA').forEach((pEl) => {
    const nome = limparTexto(pEl.getAttribute('NOME-DO-PROJETO'))
    const anoInicioProj = parseInt(pEl.getAttribute('ANO-INICIO') || '', 10) || null
    const anoFimProj = parseInt(pEl.getAttribute('ANO-FIM') || '', 10) || null
    const situacao = limparTexto(pEl.getAttribute('SITUACAO'))
    const natureza = limparTexto(pEl.getAttribute('NATUREZA'))
    const descricao = limparTexto(pEl.getAttribute('DESCRICAO-DO-PROJETO'))

    if (!nome) {
      projetosIgnorados++
      return
    }

    // Projetos: se tiver ano_inicio ou ano_fim dentro do quadriênio OU se estiver EM_ANDAMENTO
    const anoFimEfetivo = anoFimProj || 9999
    const projetoIntersectaQuadrienio =
      (anoInicioProj && anoInicioProj <= anoFim && anoFimEfetivo >= anoInicio) ||
      situacao === 'EM_ANDAMENTO'

    if (!projetoIntersectaQuadrienio) {
      projetosIgnorados++
      itensIgnorados.push({
        tabela: 'projetos_pesquisa',
        identificador: nome,
        motivo: 'FORA_QUADRIENIO',
        ano: anoInicioProj,
      })
      return
    }

    const chave = `${normalizarChave(nome)}|${anoInicioProj || 0}`
    if (chavesProjetos.has(chave)) {
      projetosIgnorados++
      itensIgnorados.push({
        tabela: 'projetos_pesquisa',
        identificador: nome,
        motivo: 'DUPLICADO',
        ano: anoInicioProj,
      })
      return
    }

    // Equipe
    const equipe: LattesProjeto['equipe'] = []
    let souResponsavel = false
    pEl.querySelectorAll('INTEGRANTES-DO-PROJETO').forEach((integ) => {
      const nomeInteg = limparTexto(integ.getAttribute('NOME-COMPLETO')) || 'Integrante'
      const flagResp = integ.getAttribute('FLAG-RESPONSAVEL') === 'SIM'
      const idCnpq = limparTexto(integ.getAttribute('NRO-ID-CNPQ'))
      if (
        flagResp &&
        (idCnpq === idLattes || normalizarChave(nomeInteg) === normalizarChave(nomeDocente))
      ) {
        souResponsavel = true
      }
      equipe.push({
        nome: nomeInteg,
        responsavel: flagResp,
        id_cnpq: idCnpq,
      })
    })

    // Financiadores
    const financiadores: string[] = []
    pEl.querySelectorAll('FINANCIADOR-DO-PROJETO').forEach((fin) => {
      const nomeFin = limparTexto(fin.getAttribute('NOME-INSTITUICAO'))
      if (nomeFin && !financiadores.includes(nomeFin)) {
        financiadores.push(nomeFin)
      }
    })

    chavesProjetos.add(chave)
    projetos.push({
      nome,
      ano_inicio: anoInicioProj,
      ano_fim: anoFimProj,
      situacao,
      natureza,
      descricao,
      responsavel: souResponsavel,
      equipe,
      financiadores,
    })
  })

  // ==========================================
  // 6. PREMIAÇÕES / TÍTULOS
  // ==========================================
  const premiacoes: LattesPremiacao[] = []
  const chavesPremiacoes = new Set<string>()
  let premIgnorados = 0

  raiz.querySelectorAll('PREMIO-TITULO').forEach((prEl) => {
    const nome = limparTexto(prEl.getAttribute('NOME-DO-PREMIO-OU-TITULO'))
    const ano = parseInt(prEl.getAttribute('ANO-DA-PREMIACAO') || '', 10)
    const entidade = limparTexto(prEl.getAttribute('NOME-DA-ENTIDADE-PROMOTORA'))

    if (!nome || !ano) {
      premIgnorados++
      return
    }

    if (!noQuadrienio(ano, anoInicio, anoFim)) {
      premIgnorados++
      itensIgnorados.push({
        tabela: 'premiacoes',
        identificador: nome,
        motivo: 'FORA_QUADRIENIO',
        ano,
      })
      return
    }

    const chave = `${normalizarChave(nome)}|${ano}`
    if (chavesPremiacoes.has(chave)) {
      premIgnorados++
      itensIgnorados.push({
        tabela: 'premiacoes',
        identificador: nome,
        motivo: 'DUPLICADO',
        ano,
      })
      return
    }

    chavesPremiacoes.add(chave)
    premiacoes.push({
      nome,
      ano,
      entidade,
    })
  })

  // ==========================================
  // 7. PRODUÇÃO TÉCNICA
  // ==========================================
  const producoesTecnicas: LattesProducaoTecnica[] = []
  const chavesProdTec = new Set<string>()
  let prodTecIgnorados = 0

  // 7.1 Trabalho Técnico
  raiz.querySelectorAll('TRABALHO-TECNICO').forEach((tEl) => {
    const dadosBasicos = tEl.querySelector('DADOS-BASICOS-DO-TRABALHO-TECNICO')
    const detalhamento = tEl.querySelector('DETALHAMENTO-DO-TRABALHO-TECNICO')
    const titulo = limparTexto(dadosBasicos?.getAttribute('TITULO-DO-TRABALHO-TECNICO'))
    const ano = parseInt(dadosBasicos?.getAttribute('ANO') || '', 10)
    const finalidade = limparTexto(detalhamento?.getAttribute('FINALIDADE'))
    const instituicaoPromotora = limparTexto(detalhamento?.getAttribute('INSTITUICAO-FINANCIADORA'))
    const autores = extrairAutores(tEl)

    if (!titulo || !ano) {
      prodTecIgnorados++
      return
    }

    if (!noQuadrienio(ano, anoInicio, anoFim)) {
      prodTecIgnorados++
      itensIgnorados.push({
        tabela: 'producao_tecnica',
        identificador: titulo,
        motivo: 'FORA_QUADRIENIO',
        ano,
      })
      return
    }

    const chave = `${normalizarChave(titulo)}|${ano}`
    if (chavesProdTec.has(chave)) {
      prodTecIgnorados++
      itensIgnorados.push({
        tabela: 'producao_tecnica',
        identificador: titulo,
        motivo: 'DUPLICADO',
        ano,
      })
      return
    }

    chavesProdTec.add(chave)
    producoesTecnicas.push({
      titulo,
      ano,
      tipo: 'TRABALHO_TECNICO',
      finalidade,
      autores,
      instituicao_promotora: instituicaoPromotora,
    })
  })

  // 7.2 Demais produções técnicas (Software, Desenvolvimento de Produto, etc.)
  raiz
    .querySelectorAll(
      'SOFTWARE, PRODUTO-TECNOLOGICO, PROCESSOS-OU-TECNICAS, DEMAIS-TIPOS-DE-PRODUCAO-TECNICA',
    )
    .forEach((pEl) => {
      const dadosBasicos = pEl.children[0]
      const detalhamento = pEl.children[1]
      const titulo = limparTexto(
        dadosBasicos?.getAttribute('TITULO') ||
          dadosBasicos?.getAttribute('TITULO-DO-SOFTWARE') ||
          pEl.getAttribute('TITULO'),
      )
      const ano = parseInt(dadosBasicos?.getAttribute('ANO') || pEl.getAttribute('ANO') || '', 10)
      const tipo = pEl.tagName.toUpperCase()
      const finalidade = limparTexto(detalhamento?.getAttribute('FINALIDADE'))
      const autores = extrairAutores(pEl)

      if (!titulo || !ano) {
        prodTecIgnorados++
        return
      }

      if (!noQuadrienio(ano, anoInicio, anoFim)) {
        prodTecIgnorados++
        itensIgnorados.push({
          tabela: 'producao_tecnica',
          identificador: titulo,
          motivo: 'FORA_QUADRIENIO',
          ano,
        })
        return
      }

      const chave = `${normalizarChave(titulo)}|${ano}`
      if (chavesProdTec.has(chave)) {
        prodTecIgnorados++
        itensIgnorados.push({
          tabela: 'producao_tecnica',
          identificador: titulo,
          motivo: 'DUPLICADO',
          ano,
        })
        return
      }

      chavesProdTec.add(chave)
      producoesTecnicas.push({
        titulo,
        ano,
        tipo,
        finalidade,
        autores,
      })
    })

  // ==========================================
  // 8. PATENTES
  // ==========================================
  const patentes: LattesPatente[] = []
  const chavesPatentes = new Set<string>()
  let patIgnorados = 0

  raiz.querySelectorAll('PATENTE').forEach((patEl) => {
    const dadosBasicos = patEl.querySelector('DADOS-BASICOS-DA-PATENTE') || patEl.children[0]
    const detalhamento = patEl.querySelector('DETALHAMENTO-DA-PATENTE') || patEl.children[1]
    const registro = patEl.querySelector('REGISTRO-OU-PATENTE')

    const titulo = limparTexto(dadosBasicos?.getAttribute('TITULO') || patEl.getAttribute('TITULO'))
    const anoDesenvolvimento =
      parseInt(dadosBasicos?.getAttribute('ANO-DESENVOLVIMENTO') || '', 10) || null
    const anoDeposito = parseInt(registro?.getAttribute('ANO-PEDIDO-DEPOSITO') || '', 10) || null
    const anoConcessao = parseInt(registro?.getAttribute('ANO-CONCESSAO') || '', 10) || null
    const numeroRegistro = limparTexto(registro?.getAttribute('CODIGO-DO-REGISTRO-OU-PATENTE'))
    const instituicaoDeposito = limparTexto(registro?.getAttribute('INSTITUICAO-DEPOSITO'))
    const categoria = limparTexto(dadosBasicos?.getAttribute('CATEGORIA'))
    const autores = extrairAutores(patEl)

    const anoRef = anoDeposito || anoDesenvolvimento || anoConcessao

    if (!titulo) {
      patIgnorados++
      return
    }

    if (anoRef && !noQuadrienio(anoRef, anoInicio, anoFim)) {
      patIgnorados++
      itensIgnorados.push({
        tabela: 'patentes',
        identificador: titulo,
        motivo: 'FORA_QUADRIENIO',
        ano: anoRef,
      })
      return
    }

    const chave = `${normalizarChave(titulo)}|${anoRef || 0}`
    if (chavesPatentes.has(chave)) {
      patIgnorados++
      itensIgnorados.push({
        tabela: 'patentes',
        identificador: titulo,
        motivo: 'DUPLICADO',
        ano: anoRef,
      })
      return
    }

    chavesPatentes.add(chave)
    patentes.push({
      titulo,
      ano_desenvolvimento: anoDesenvolvimento,
      ano_deposito: anoDeposito,
      ano_concessao: anoConcessao,
      numero_registro: numeroRegistro,
      instituicao_deposito: instituicaoDeposito,
      categoria,
      autores,
    })
  })

  // ==========================================
  // 9. EVENTOS (Participações e Trabalhos em Eventos)
  // ==========================================
  const eventos: LattesEvento[] = []
  const chavesEventos = new Set<string>()
  let eveIgnorados = 0

  // 9.1 Trabalhos em eventos
  raiz.querySelectorAll('TRABALHO-EM-EVENTOS').forEach((teEl) => {
    const dadosBasicos = teEl.querySelector('DADOS-BASICOS-DO-TRABALHO')
    const detalhamento = teEl.querySelector('DETALHAMENTO-DO-TRABALHO')
    const tituloTrab = limparTexto(dadosBasicos?.getAttribute('TITULO-DO-TRABALHO'))
    const ano = parseInt(dadosBasicos?.getAttribute('ANO-DO-TRABALHO') || '', 10)
    const nomeEvento =
      limparTexto(detalhamento?.getAttribute('NOME-DO-EVENTO')) || 'Evento sem título'
    const natureza = limparTexto(dadosBasicos?.getAttribute('NATUREZA'))
    const classificacao = limparTexto(detalhamento?.getAttribute('CLASSIFICACAO-DO-EVENTO'))
    const cidade = limparTexto(detalhamento?.getAttribute('CIDADE-DO-EVENTO'))
    const pais = limparTexto(dadosBasicos?.getAttribute('PAIS-DO-EVENTO'))
    const autores = extrairAutores(teEl)

    if (!ano) {
      eveIgnorados++
      return
    }

    if (!noQuadrienio(ano, anoInicio, anoFim)) {
      eveIgnorados++
      itensIgnorados.push({
        tabela: 'eventos',
        identificador: `[Trabalho] ${tituloTrab || nomeEvento}`,
        motivo: 'FORA_QUADRIENIO',
        ano,
      })
      return
    }

    const chave = `${normalizarChave(nomeEvento)}|${normalizarChave(tituloTrab || '')}|${ano}`
    if (chavesEventos.has(chave)) {
      eveIgnorados++
      itensIgnorados.push({
        tabela: 'eventos',
        identificador: `[Trabalho] ${tituloTrab || nomeEvento}`,
        motivo: 'DUPLICADO',
        ano,
      })
      return
    }

    chavesEventos.add(chave)
    eventos.push({
      nome: nomeEvento,
      ano,
      tipo: 'TRABALHO',
      titulo_trabalho: tituloTrab,
      natureza,
      classificacao,
      cidade,
      pais,
      autores,
    })
  })

  // 9.2 Participações em eventos (Congressos, Encontros)
  raiz.querySelectorAll('PARTICIPACAO-EM-EVENTO-CONGRESSO').forEach((peEl) => {
    const dadosBasicos =
      peEl.querySelector('DADOS-BASICOS-DA-PARTICIPACAO-EM-EVENTO-CONGRESSO') || peEl.children[0]
    const detalhamento =
      peEl.querySelector('DETALHAMENTO-DA-PARTICIPACAO-EM-EVENTO-CONGRESSO') || peEl.children[1]
    const nomeEvento = limparTexto(
      dadosBasicos?.getAttribute('NOME-DO-EVENTO') || peEl.getAttribute('NOME-DO-EVENTO'),
    )
    const ano = parseInt(dadosBasicos?.getAttribute('ANO') || peEl.getAttribute('ANO') || '', 10)
    const tipoParticipacao = limparTexto(dadosBasicos?.getAttribute('TIPO-PARTICIPACAO'))
    const classificacao = limparTexto(detalhamento?.getAttribute('CLASSIFICACAO-DO-EVENTO'))
    const cidade = limparTexto(detalhamento?.getAttribute('CIDADE-DO-EVENTO'))
    const tituloTrab = limparTexto(detalhamento?.getAttribute('TITULO-DA-APRESENTACAO-DO-TRABALHO'))

    if (!nomeEvento || !ano) {
      eveIgnorados++
      return
    }

    if (!noQuadrienio(ano, anoInicio, anoFim)) {
      eveIgnorados++
      itensIgnorados.push({
        tabela: 'eventos',
        identificador: `[Participação] ${nomeEvento}`,
        motivo: 'FORA_QUADRIENIO',
        ano,
      })
      return
    }

    const chave = `${normalizarChave(nomeEvento)}|${ano}`
    if (chavesEventos.has(chave)) {
      eveIgnorados++
      itensIgnorados.push({
        tabela: 'eventos',
        identificador: `[Participação] ${nomeEvento}`,
        motivo: 'DUPLICADO',
        ano,
      })
      return
    }

    chavesEventos.add(chave)
    eventos.push({
      nome: nomeEvento,
      ano,
      tipo: 'PARTICIPACAO',
      natureza: tipoParticipacao,
      classificacao,
      cidade,
      titulo_trabalho: tituloTrab,
    })
  })

  return {
    nome_arquivo: nomeArquivo,
    id_lattes: idLattes,
    nome_docente: nomeDocente,
    sucesso: true,
    docente,
    publicacoes,
    orientacoes,
    bancas,
    projetos,
    premiacoes,
    producoes_tecnicas: producoesTecnicas,
    patentes,
    eventos,
    estatisticas: {
      publicacoes: { a_inserir: publicacoes.length, ignorados: pubIgnorados },
      orientacoes: { a_inserir: orientacoes.length, ignorados: oriIgnorados },
      bancas: { a_inserir: bancas.length, ignorados: bancasIgnoradas },
      projetos: { a_inserir: projetos.length, ignorados: projetosIgnorados },
      premiacoes: { a_inserir: premiacoes.length, ignorados: premIgnorados },
      producoes_tecnicas: { a_inserir: producoesTecnicas.length, ignorados: prodTecIgnorados },
      patentes: { a_inserir: patentes.length, ignorados: patIgnorados },
      eventos: { a_inserir: eventos.length, ignorados: eveIgnorados },
    },
    itens_ignorados: itensIgnorados,
  }
}
