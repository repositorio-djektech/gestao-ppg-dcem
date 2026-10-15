import { normalizarNomePessoa } from '@/lib/normalizacao'
import {
  resolverDocenteOrientador,
  type SugestaoVinculoOrientador,
} from '@/lib/lattes/resolucao-vinculos'
import type { Docente } from '@/types/database'

export interface FormacaoConcluidaEgresso {
  tipoCurso: 'Graduação' | 'Mestrado' | 'Doutorado'
  anoConclusao: string // 4 dígitos
  anoInicio: string | null // 4 dígitos se houver
  curso: string
  instituicao: string
  tituloTrabalho: string
  nomeOrientador: string
  order: number // Para ordenar por mais alta e mais recente
}

export interface DadosLattesEgressoExtraidos {
  lattesId: string
  nomeCompleto: string
  nacionalidade: string
  linkLattes: string
  // Dados da formação concluída (conforme Regra do Concluinte)
  tipoCurso: 'Graduação' | 'Mestrado' | 'Doutorado' | null
  anoTitulacao: string | null // 4 dígitos (ano de conclusão)
  anoIngresso: string | null // 4 dígitos (ano de início da formação mais alta concluída)
  nomeOrientadorCitado: string
  // Resolução do orientador contra a lista de docentes
  sugestaoOrientador: SugestaoVinculoOrientador | null
  // Resumo de formações concluídas encontradas
  formacoesConcluidas: FormacaoConcluidaEgresso[]
}

const PESO_TITULACAO: Record<string, number> = {
  DOUTORADO: 3,
  MESTRADO: 2,
  GRADUACAO: 1,
}

const ROTULO_TITULACAO: Record<string, 'Graduação' | 'Mestrado' | 'Doutorado'> = {
  DOUTORADO: 'Doutorado',
  MESTRADO: 'Mestrado',
  GRADUACAO: 'Graduação',
}

/**
 * Extrai 4 dígitos de um texto de ano ou data.
 */
function extrairAno4Digitos(val: string | null | undefined): string | null {
  if (!val) return null
  const m = String(val).match(/\b(19\d{2}|20\d{2})\b/)
  return m ? m[1] : null
}

/**
 * Faz o parser de uma string XML do Lattes extraindo os dados relevantes para Egresso,
 * aplicando a Regra do Concluinte e resolvendo o orientador contra a lista de docentes.
 */
export function extrairDadosLattesEgresso(
  xmlString: string,
  docentesCadastrados: Array<Pick<Docente, 'id' | 'nome' | 'id_lattes'>> = [],
): DadosLattesEgressoExtraidos {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error('Erro ao ler a estrutura do arquivo XML.')
  }

  const raiz = doc.querySelector('CURRICULO-VITAE')
  if (!raiz) {
    throw new Error('XML não contém a raiz <CURRICULO-VITAE> oficial do Lattes.')
  }

  // 1. NUMERO-IDENTIFICADOR (lattes_id, 16 dígitos)
  const lattesIdBruto = (raiz.getAttribute('NUMERO-IDENTIFICADOR') || '').trim()
  const matchId = lattesIdBruto.match(/\d{16}/)
  const lattesId = matchId ? matchId[0] : lattesIdBruto

  // 2. DADOS-GERAIS
  const dadosGeraisEl = raiz.querySelector('DADOS-GERAIS')
  const nomeCompletoBruto = dadosGeraisEl?.getAttribute('NOME-COMPLETO') || ''
  const nomeCompleto = normalizarNomePessoa(nomeCompletoBruto)

  const nacionalidade =
    dadosGeraisEl?.getAttribute('PAIS-DE-NACIONALIDADE') ||
    dadosGeraisEl?.getAttribute('PAIS-DE-NASCIMENTO') ||
    dadosGeraisEl?.getAttribute('NACIONALIDADE') ||
    ''

  const linkLattes = lattesId ? `http://lattes.cnpq.br/${lattesId}` : ''

  // 3. FORMACAO-ACADEMICA-TITULACAO com Regra do Concluinte
  // Considerar apenas formações CONCLUÍDAS de Graduação, Mestrado ou Doutorado.
  // Formação em andamento NÃO gera egresso.
  // Prevalece a titulação mais alta concluída (Doutorado > Mestrado > Graduação).
  // Em caso de empate de nível, prevalece a com ano de conclusão mais recente.
  const formacaoEl = raiz.querySelector('FORMACAO-ACADEMICA-TITULACAO')
  const formacoesConcluidas: FormacaoConcluidaEgresso[] = []

  if (formacaoEl) {
    const tagsAlvo = ['DOUTORADO', 'MESTRADO', 'GRADUACAO']
    tagsAlvo.forEach((tagName) => {
      formacaoEl.querySelectorAll(tagName).forEach((el) => {
        // Verifica se a formação está concluída
        const statusFormacao = (el.getAttribute('STATUS-DO-CURSO') || '').toUpperCase()
        const anoConclusaoRaw =
          el.getAttribute('ANO-DE-CONCLUSAO') || el.getAttribute('ANO-DE-OBTENCAO-DO-TITULO') || ''
        const anoConclusao = extrairAno4Digitos(anoConclusaoRaw)

        // Se STATUS-DO-CURSO for 'EM_ANDAMENTO' ou se não houver ano de conclusão, NÃO está concluída
        if (statusFormacao === 'EM_ANDAMENTO' || !anoConclusao) {
          return
        }

        const anoInicioRaw = el.getAttribute('ANO-DE-INICIO') || ''
        const anoInicio = extrairAno4Digitos(anoInicioRaw)

        const pesoNivel = PESO_TITULACAO[tagName] || 0
        const anoFimNum = parseInt(anoConclusao, 10) || 0
        // Ordem: prioridade do peso da titulação (Doutorado 3 > Mestrado 2 > Graduação 1),
        // desempatando por ano de conclusão mais recente
        const order = pesoNivel * 10000 + anoFimNum

        const curso = (
          el.getAttribute('NOME-CURSO') ||
          el.getAttribute('TITULO-DA-DISSERTACAO-TESE') ||
          el.getAttribute('TITULO-DO-TRABALHO-DE-CONCLUSAO-DE-CURSO') ||
          ''
        ).trim()

        const instituicao = (el.getAttribute('NOME-INSTITUICAO') || '').trim()

        const tituloTrabalho = (
          el.getAttribute('TITULO-DA-DISSERTACAO-TESE') ||
          el.getAttribute('TITULO-DO-TRABALHO-DE-CONCLUSAO-DE-CURSO') ||
          ''
        ).trim()

        const nomeOrientador = (
          el.getAttribute('NOME-COMPLETO-DO-ORIENTADOR') ||
          el.getAttribute('NOME-ORIENTADOR-DOUT') ||
          el.getAttribute('NOME-DO-ORIENTADOR') ||
          ''
        ).trim()

        formacoesConcluidas.push({
          tipoCurso: ROTULO_TITULACAO[tagName],
          anoConclusao,
          anoInicio,
          curso,
          instituicao,
          tituloTrabalho,
          nomeOrientador,
          order,
        })
      })
    })
  }

  // Ordenar decrescente: maior titulação concluída primeiro, depois ano de conclusão mais recente
  formacoesConcluidas.sort((a, b) => b.order - a.order)

  const melhorFormacao = formacoesConcluidas[0] || null

  const tipoCurso = melhorFormacao ? melhorFormacao.tipoCurso : null
  const anoTitulacao = melhorFormacao ? melhorFormacao.anoConclusao : null
  const anoIngresso = melhorFormacao ? melhorFormacao.anoInicio : null
  const nomeOrientadorCitado = melhorFormacao ? melhorFormacao.nomeOrientador : ''

  // 4. Resolução do orientador por nome contra docentes
  let sugestaoOrientador: SugestaoVinculoOrientador | null = null
  if (nomeOrientadorCitado && docentesCadastrados.length > 0) {
    sugestaoOrientador = resolverDocenteOrientador({
      nomeOrientadorTexto: nomeOrientadorCitado,
      docentes: docentesCadastrados,
    })
  }

  return {
    lattesId,
    nomeCompleto,
    nacionalidade,
    linkLattes,
    tipoCurso,
    anoTitulacao,
    anoIngresso,
    nomeOrientadorCitado,
    sugestaoOrientador,
    formacoesConcluidas,
  }
}
