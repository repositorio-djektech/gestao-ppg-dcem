import type {
  RelatorioReconducaoResposta,
  AvaliacaoDocenteReconducao,
  VereditoReconducao,
} from './types'

export const TEXTO_PARAGRAFO_4 =
  '§ 4º - Serão reconduzidos automaticamente à categoria de docente permanente aqueles docentes que, nos últimos 04 (quatro) anos atendem a todos os 04 (quatro) critérios a seguir: I. Orientaram alunos no P²CEM como orientador principal; II. Ministraram disciplinas no P²CEM; III. Participaram de projetos com financiamento; IV. Alcançam índice de produção docente qualificada (PDQ) igual ou superior a 1,0 calculado conforme equação: PDQ = NP / (MSc + DSc). Sendo: NP = Número de publicações em revistas com fator de impacto JCR maior ou igual a 1,0 com seus orientandos ou egressos do P²CEM nos últimos 4 (quatro) anos civis; MSc = Número de mestres formados no Programa nos últimos 4 (quatro) anos civis; DSc = Número de doutores formados no Programa nos últimos 4 (quatro) anos civis; (MSc + DSc) ≥ 2.'

export interface OpcoesImpressaoReconducao {
  filtroVeredito?: 'TODOS' | VereditoReconducao
  termoBusca?: string
  /** Se informado, gera apenas o relatório individual desse docente */
  docenteUnicoId?: number
}

function escaparHtml(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (Array.isArray(val)) {
    const limpo = val.filter((x) => x !== null && x !== undefined && String(x).trim() !== '')
    return limpo.length > 0 ? limpo.map(escaparHtml).join(', ') : '—'
  }
  const str = String(val).trim()
  if (str.length === 0) return '—'
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const ORDEM_VEREDITO: Record<VereditoReconducao, number> = {
  RECONDUZIDO: 1,
  NAO_ATENDE: 2,
  PDQ_INSUFICIENTE: 3,
  NAO_APLICAVEL: 4,
}

function labelVeredito(v: VereditoReconducao): string {
  switch (v) {
    case 'RECONDUZIDO':
      return 'RECONDUZIDO'
    case 'NAO_ATENDE':
      return 'NÃO ATENDE'
    case 'PDQ_INSUFICIENTE':
      return 'PDQ INSUFICIENTE'
    case 'NAO_APLICAVEL':
      return 'NÃO APLICÁVEL'
    default:
      return String(v)
  }
}

function classeBadgeVeredito(v: VereditoReconducao): string {
  switch (v) {
    case 'RECONDUZIDO':
      return 'badge-reconduzido'
    case 'NAO_ATENDE':
      return 'badge-nao-atende'
    case 'PDQ_INSUFICIENTE':
      return 'badge-pdq-insuficiente'
    case 'NAO_APLICAVEL':
    default:
      return 'badge-nao-aplicavel'
  }
}

function labelCategoria(cat: AvaliacaoDocenteReconducao['categoria']): string {
  if (cat === 'permanente') return 'Docente Permanente'
  if (cat === 'colaborador') return 'Docente Colaborador'
  return 'Sem Categoria Cadastrada'
}

/**
 * Prepara e filtra a lista de docentes para a emissão do relatório.
 */
export function prepararDocentesParaImpressao(
  relatorio: RelatorioReconducaoResposta,
  opcoes: OpcoesImpressaoReconducao = {},
): AvaliacaoDocenteReconducao[] {
  const { filtroVeredito = 'TODOS', termoBusca = '', docenteUnicoId } = opcoes

  const lista = relatorio.avaliacoes || []

  return lista
    .filter((doc) => {
      if (docenteUnicoId !== undefined && doc.docente_id !== docenteUnicoId) {
        return false
      }
      if (filtroVeredito !== 'TODOS' && doc.veredito !== filtroVeredito) {
        return false
      }
      if (termoBusca && termoBusca.trim()) {
        const nomeNorm = doc.nome.toLowerCase()
        const b = termoBusca.toLowerCase().trim()
        if (!nomeNorm.includes(b)) return false
      }
      return true
    })
    .sort((a, b) => {
      const oA = ORDEM_VEREDITO[a.veredito] ?? 99
      const oB = ORDEM_VEREDITO[b.veredito] ?? 99
      if (oA !== oB) {
        return oA - oB
      }
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
}

/**
 * Gera o fragmento HTML de uma seção de docente (folha nova).
 */
function gerarSecaoDocenteHtml(doc: AvaliacaoDocenteReconducao): string {
  const isNaoAplicavel = doc.veredito === 'NAO_APLICAVEL'
  const isColaboradorOuSemCat = doc.categoria !== 'permanente'

  // Critério I itens
  const itensI = (doc.criterio_i.itens || [])
    .map(
      (item: any) =>
        `<li>${escaparHtml(item.tipo || 'Orientação')} — ${escaparHtml(item.discente || 'Discente')} (${escaparHtml(item.inicio || '?')}${item.fim ? `–${escaparHtml(item.fim)}` : ''})${item.data_defesa ? ` | Defesa: ${escaparHtml(item.data_defesa)}` : ''}${item.status ? ` [${escaparHtml(item.status)}]` : ''}</li>`,
    )
    .join('')

  // Critério II itens
  const itensII = (doc.criterio_ii.itens || [])
    .map(
      (item: any) =>
        `<li>${item.codigo ? `[${escaparHtml(item.codigo)}] ` : ''}${escaparHtml(item.nome)}${item.ano_semestre ? ` (${escaparHtml(item.ano_semestre)})` : ''}</li>`,
    )
    .join('')

  // Critério III itens
  const itensIII = (doc.criterio_iii.itens || [])
    .map(
      (item: any) =>
        `<li>${escaparHtml(item.titulo)} — Órgão: ${escaparHtml(item.orgao_fomento || 'Financiamento registrado')} (${escaparHtml(item.inicio || '?')}${item.fim ? `–${escaparHtml(item.fim)}` : ''})</li>`,
    )
    .join('')

  // Publicações JCR >= 1.0 (NP)
  const todasPubs = [
    ...(doc.publicacoes_confirmadas || []),
    ...(doc.publicacoes_pendentes || []),
    ...(doc.publicacoes_sem_coautoria || []),
  ]

  const itensPubsHtml =
    todasPubs.length > 0
      ? todasPubs
          .map((pub) => {
            let statusLabel = 'Sem coautoria registrada'
            let statusClass = 'pub-sem-coautoria'
            if (pub.status_coautoria === 'confirmado') {
              statusLabel = 'Coautoria confirmada (NP Estrito)'
              statusClass = 'pub-confirmada'
            } else if (pub.status_coautoria === 'pendente') {
              statusLabel = 'Coautoria pendente de confirmação (NP Teto)'
              statusClass = 'pub-pendente'
            }

            const coautores =
              pub.coautores_programa_nomes && pub.coautores_programa_nomes.length > 0
                ? `<div class="subtexto"><strong>Coautor(es) do programa:</strong> ${escaparHtml(pub.coautores_programa_nomes.join(', '))}</div>`
                : ''

            return `
              <li class="pub-item">
                <div class="pub-topo">
                  <span class="pub-titulo font-bold">${escaparHtml(pub.titulo)}</span>
                  <span class="badge ${statusClass}">${escaparHtml(statusLabel)}</span>
                </div>
                <div class="subtexto">${escaparHtml(pub.autores)}</div>
                <div class="subtexto meta-linha">
                  <em>${escaparHtml(pub.periodico)}</em> | Ano: ${pub.ano} | JCR: ${pub.fator_impacto_jcr !== null && pub.fator_impacto_jcr !== undefined ? Number(pub.fator_impacto_jcr).toFixed(2) : '—'}
                </div>
                ${coautores}
              </li>
            `
          })
          .join('')
      : '<p class="sem-itens">Nenhuma publicação com Fator de Impacto JCR &ge; 1,0 registrada no quadriênio.</p>'

  const pdq = doc.pdq_detalhes
  const pdqFormatado = pdq.pdq !== null && pdq.pdq !== undefined ? pdq.pdq.toFixed(2) : '—'

  let motivoIndefinidoHtml = ''
  if (!pdq.precondicao_atendida) {
    motivoIndefinidoHtml = `
      <div class="aviso-precondicao">
        <strong>Pré-condição (MSc + DSc) &ge; 2 não atendida:</strong> O docente registra um total de ${pdq.titulacoes_total} titulação(ões) concluída(s) no quadriênio (MSc: ${pdq.msc}, DSc: ${pdq.dsc}). Por exigência do § 4º da norma, o índice PDQ permanece <span class="destaque-indefinido">indefinido</span> (não assume valor zero), impossibilitando a recondução automática pelo Critério IV.
      </div>
    `
  }

  let notaNaoAplicavelHtml = ''
  if (isNaoAplicavel || isColaboradorOuSemCat) {
    notaNaoAplicavelHtml = `
      <div class="aviso-nao-aplicavel">
        <strong>Nota de Aplicabilidade:</strong> A Norma de Recondução Docente (§ 4º) aplica-se estritamente à categoria de <em>Docentes Permanentes</em> do PPG-DCEM. Os indicadores foram calculados a título de diagnóstico institucional, constando a condição formal de <em>Não Aplicável</em>.
      </div>
    `
  }

  const motivosHtml =
    doc.motivos && doc.motivos.length > 0
      ? `
        <div class="caixa-motivos">
          <div class="motivos-titulo">Pendências e Justificativas Normativas:</div>
          <ul class="lista-motivos">
            ${doc.motivos.map((m) => `<li>${escaparHtml(m)}</li>`).join('')}
          </ul>
        </div>
      `
      : ''

  return `
    <section class="docente-section">
      <div class="docente-header">
        <div class="docente-identificacao">
          <h2 class="docente-nome">${escaparHtml(doc.nome)}</h2>
          <div class="docente-meta">
            <span class="categoria-label font-bold">${escaparHtml(labelCategoria(doc.categoria))}</span>
            ${doc.scopus_id ? `<span>| Scopus ID: <code>${escaparHtml(doc.scopus_id)}</code></span>` : ''}
            ${doc.id_lattes ? `<span>| Lattes: <code>${escaparHtml(doc.id_lattes)}</code></span>` : ''}
          </div>
        </div>
        <div class="docente-veredito-box">
          <span class="badge ${classeBadgeVeredito(doc.veredito)}">${labelVeredito(doc.veredito)}</span>
        </div>
      </div>

      ${notaNaoAplicavelHtml}
      ${motivosHtml}

      <div class="bloco-criterios">
        <h3 class="subtitulo-bloco">1. Avaliação dos Quatro Critérios Regulamentares (§ 4º)</h3>
        <table class="tabela-criterios">
          <thead>
            <tr>
              <th style="width: 26%;">Critério</th>
              <th style="width: 14%; text-align: center;">Atendido?</th>
              <th style="width: 12%; text-align: center;">Qtd.</th>
              <th style="width: 48%;">Detalhamento / Evidências</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>I. Orientação Principal</strong><br /><span class="subtexto">Alunos no P²CEM</span></td>
              <td class="text-center font-bold ${doc.criterio_i.atendido ? 'criterio-sim' : 'criterio-nao'}">${doc.criterio_i.atendido ? 'SIM' : 'NÃO'}</td>
              <td class="text-center font-bold">${doc.criterio_i.quantidade}</td>
              <td>
                <div>${escaparHtml(doc.criterio_i.detalhe)}</div>
                ${itensI ? `<ul class="lista-evidencias">${itensI}</ul>` : ''}
              </td>
            </tr>
            <tr>
              <td><strong>II. Disciplinas Ministradas</strong><br /><span class="subtexto">Disciplinas no P²CEM</span></td>
              <td class="text-center font-bold ${doc.criterio_ii.atendido ? 'criterio-sim' : 'criterio-nao'}">${doc.criterio_ii.atendido ? 'SIM' : 'NÃO'}</td>
              <td class="text-center font-bold">${doc.criterio_ii.quantidade}</td>
              <td>
                <div>${escaparHtml(doc.criterio_ii.detalhe)}</div>
                ${itensII ? `<ul class="lista-evidencias">${itensII}</ul>` : ''}
              </td>
            </tr>
            <tr>
              <td><strong>III. Projetos Financiados</strong><br /><span class="subtexto">Coord. ou participante</span></td>
              <td class="text-center font-bold ${doc.criterio_iii.atendido ? 'criterio-sim' : 'criterio-nao'}">${doc.criterio_iii.atendido ? 'SIM' : 'NÃO'}</td>
              <td class="text-center font-bold">${doc.criterio_iii.quantidade}</td>
              <td>
                <div>${escaparHtml(doc.criterio_iii.detalhe)}</div>
                ${itensIII ? `<ul class="lista-evidencias">${itensIII}</ul>` : ''}
              </td>
            </tr>
            <tr>
              <td><strong>IV. Índice PDQ &ge; 1,0</strong><br /><span class="subtexto">PDQ = NP / (MSc + DSc)</span></td>
              <td class="text-center font-bold ${doc.criterio_iv.atendido ? 'criterio-sim' : 'criterio-nao'}">${doc.criterio_iv.atendido ? 'SIM' : 'NÃO'}</td>
              <td class="text-center font-bold">${pdqFormatado}</td>
              <td>
                <div>${escaparHtml(doc.criterio_iv.detalhe)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bloco-pdq">
        <h3 class="subtitulo-bloco">2. Detalhamento do Índice de Produção Docente Qualificada (PDQ)</h3>
        <div class="formula-box">
          <span class="formula-texto">Equação Regulamentar: <strong>PDQ = NP / (MSc + DSc)</strong>, com a pré-condição obrigatória <strong>(MSc + DSc) &ge; 2</strong></span>
        </div>

        <table class="tabela-metricas-pdq">
          <thead>
            <tr>
              <th>NP Estrito (Confirmadas)</th>
              <th>NP Teto (Potenciais)</th>
              <th>Coautorias Pendentes</th>
              <th>Mestres (MSc)</th>
              <th>Doutores (DSc)</th>
              <th>Total Titulações</th>
              <th>PDQ Calculado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center font-bold valor-destaque">${pdq.np}</td>
              <td class="text-center font-bold">${pdq.np_teto ?? doc.np_teto ?? 0}</td>
              <td class="text-center font-bold">${pdq.np_pendente ?? (doc.publicacoes_pendentes ? doc.publicacoes_pendentes.length : 0)}</td>
              <td class="text-center font-bold">${pdq.msc}</td>
              <td class="text-center font-bold">${pdq.dsc}</td>
              <td class="text-center font-bold">${pdq.titulacoes_total}</td>
              <td class="text-center font-bold valor-pdq-final">${pdqFormatado}</td>
            </tr>
          </tbody>
        </table>

        ${motivoIndefinidoHtml}
      </div>

      <div class="bloco-publicacoes">
        <h3 class="subtitulo-bloco">3. Publicações Consideradas para o NP (JCR &ge; 1,0 no Quadriênio)</h3>
        <ul class="lista-publicacoes">
          ${itensPubsHtml}
        </ul>
      </div>
    </section>
  `
}

/**
 * Gera documento HTML ABNT independente para impressão ou exportação em PDF.
 */
export function gerarHtmlRelatorioReconducao(
  relatorio: RelatorioReconducaoResposta,
  opcoes: OpcoesImpressaoReconducao = {},
): string {
  const docentes = prepararDocentesParaImpressao(relatorio, opcoes)
  const isDocenteUnico = opcoes.docenteUnicoId !== undefined && docentes.length === 1
  const docenteUnico = isDocenteUnico ? docentes[0] : null

  const dataAtualFormatada = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // Descrição dos filtros aplicados
  const filtrosTexto: string[] = []
  if (isDocenteUnico && docenteUnico) {
    filtrosTexto.push(`Dossiê Individual: ${docenteUnico.nome}`)
  } else {
    if (opcoes.filtroVeredito && opcoes.filtroVeredito !== 'TODOS') {
      filtrosTexto.push(`Veredito: ${labelVeredito(opcoes.filtroVeredito)}`)
    }
    if (opcoes.termoBusca && opcoes.termoBusca.trim()) {
      filtrosTexto.push(`Busca: "${opcoes.termoBusca.trim()}"`)
    }
  }
  const descricaoFiltros =
    filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Todos os docentes avaliados'

  const resumo = relatorio.resumo

  // Linhas do Quadro Geral
  const linhasQuadroGeral = docentes
    .map((doc, idx) => {
      const pdqVal =
        doc.pdq_detalhes.pdq !== null && doc.pdq_detalhes.pdq !== undefined
          ? doc.pdq_detalhes.pdq.toFixed(2)
          : '—'

      return `
        <tr>
          <td class="col-num">${idx + 1}</td>
          <td>
            <div class="font-bold">${escaparHtml(doc.nome)}</div>
            <div class="subtexto">${escaparHtml(labelCategoria(doc.categoria))}</div>
          </td>
          <td class="text-center font-bold ${doc.criterio_i.atendido ? 'criterio-sim' : 'criterio-nao'}">
            ${doc.criterio_i.atendido ? 'SIM' : 'NÃO'}
            <div class="subtexto">${doc.criterio_i.quantidade} princ.</div>
          </td>
          <td class="text-center font-bold ${doc.criterio_ii.atendido ? 'criterio-sim' : 'criterio-nao'}">
            ${doc.criterio_ii.atendido ? 'SIM' : 'NÃO'}
            <div class="subtexto">${doc.criterio_ii.quantidade} disc.</div>
          </td>
          <td class="text-center font-bold ${doc.criterio_iii.atendido ? 'criterio-sim' : 'criterio-nao'}">
            ${doc.criterio_iii.atendido ? 'SIM' : 'NÃO'}
            <div class="subtexto">${doc.criterio_iii.quantidade} proj.</div>
          </td>
          <td class="text-center font-bold">
            ${pdqVal}
            <div class="subtexto">NP ${doc.pdq_detalhes.np} / Tit. ${doc.pdq_detalhes.titulacoes_total}</div>
          </td>
          <td class="text-center">
            <span class="badge ${classeBadgeVeredito(doc.veredito)}">${labelVeredito(doc.veredito)}</span>
          </td>
        </tr>
      `
    })
    .join('')

  // Seções por docente (cada uma em folha nova)
  const secoesDocentesHtml = docentes.map(gerarSecaoDocenteHtml).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${isDocenteUnico && docenteUnico ? `Dossiê de Recondução — ${escaparHtml(docenteUnico.nome)}` : 'Relatório de Avaliação de Recondução de Docentes — PPG-DCEM'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin-top: 25mm;
      margin-left: 25mm;
      margin-right: 20mm;
      margin-bottom: 20mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111827;
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 12pt;
      line-height: 1.5;
    }

    p, .texto-justificado {
      text-align: justify;
      text-justify: inter-word;
    }

    /* Cabeçalho ABNT */
    .print-header {
      border-bottom: 2px solid #111827;
      padding-bottom: 12px;
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .print-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .print-header-inst {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #1f2937;
      margin: 0;
      text-align: left;
    }

    .print-header-title {
      font-size: 15pt;
      font-weight: 700;
      color: #111827;
      margin: 4px 0 0 0;
      text-align: left;
    }

    .print-header-sub {
      font-size: 10.5pt;
      color: #374151;
      margin: 4px 0 0 0;
      line-height: 1.4;
    }

    .print-header-meta {
      text-align: right;
      font-size: 9.5pt;
      color: #4b5563;
      white-space: nowrap;
    }

    .data-emissao {
      font-weight: 700;
      color: #1f2937;
    }

    /* Transcrição literal do § 4º */
    .transcricao-norma-box {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-left: 4px solid #1e3a8a;
      border-radius: 4px;
      padding: 10px 14px;
      margin-top: 12px;
      margin-bottom: 18px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .transcricao-titulo {
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #1e3a8a;
      margin-bottom: 4px;
    }

    .transcricao-texto {
      font-size: 10pt;
      line-height: 1.45;
      color: #1f2937;
      text-align: justify;
      text-justify: inter-word;
      margin: 0;
    }

    /* Resumo das Métricas */
    .resumo-section {
      margin-bottom: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .metricas-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }

    .metrica-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
      background: #f8fafc;
      text-align: center;
    }

    .metrica-card.reconduzido {
      border-color: #059669;
      background: #ecfdf5;
    }

    .metrica-card.nao-atende {
      border-color: #dc2626;
      background: #fef2f2;
    }

    .metrica-card.pdq-insuficiente {
      border-color: #d97706;
      background: #fffbeb;
    }

    .metrica-titulo {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #374151;
      margin-bottom: 2px;
    }

    .metrica-card.reconduzido .metrica-titulo { color: #065f46; }
    .metrica-card.nao-atende .metrica-titulo { color: #991b1b; }
    .metrica-card.pdq-insuficiente .metrica-titulo { color: #92400e; }

    .metrica-valor {
      font-size: 16pt;
      font-weight: 700;
      color: #111827;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }

    .metrica-card.reconduzido .metrica-valor { color: #047857; }
    .metrica-card.nao-atende .metrica-valor { color: #b91c1c; }
    .metrica-card.pdq-insuficiente .metrica-valor { color: #b45309; }

    .metrica-sub {
      font-size: 8pt;
      color: #6b7280;
      margin-top: 2px;
    }

    .filtros-box {
      font-size: 9.5pt;
      color: #1f2937;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    /* Tabelas ABNT */
    table.print-table, table.tabela-criterios, table.tabela-metricas-pdq {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
      break-inside: auto;
      margin-bottom: 14px;
      font-size: 10.5pt;
      line-height: 1.35;
    }

    thead {
      display: table-header-group;
    }

    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th, td {
      border: 1px solid #4b5563;
      padding: 6px 8px;
      text-align: left;
      font-size: 10.5pt;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    th {
      background-color: #f1f5f9;
      color: #111827;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9pt;
      letter-spacing: 0.03em;
    }

    .col-num {
      width: 32px;
      text-align: right;
      font-weight: 700;
    }

    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .subtexto { font-size: 9pt; color: #4b5563; margin-top: 2px; }

    .criterio-sim { color: #047857; }
    .criterio-nao { color: #b91c1c; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border: 1px solid transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .badge-reconduzido {
      background-color: #ecfdf5;
      color: #065f46;
      border-color: #6ee7b7;
    }

    .badge-nao-atende {
      background-color: #fee2e2;
      color: #991b1b;
      border-color: #ef4444;
    }

    .badge-pdq-insuficiente {
      background-color: #fef3c7;
      color: #92400e;
      border-color: #f59e0b;
    }

    .badge-nao-aplicavel {
      background-color: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }

    /* Seção por Docente (Folha Nova) */
    .docente-section {
      margin-top: 20px;
      page-break-before: always;
      break-before: page;
      page-break-inside: auto;
      break-inside: auto;
    }

    .docente-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111827;
      padding-bottom: 6px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: avoid;
      break-after: avoid;
    }

    .docente-nome {
      font-size: 13.5pt;
      font-weight: 700;
      color: #111827;
      margin: 0;
      text-transform: uppercase;
    }

    .docente-meta {
      font-size: 9.5pt;
      color: #4b5563;
      margin-top: 2px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .categoria-label {
      color: #1e3a8a;
    }

    .subtitulo-bloco {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #111827;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
      margin: 14px 0 8px 0;
      page-break-after: avoid;
      break-after: avoid;
    }

    .formula-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      border-radius: 3px;
      margin-bottom: 10px;
      font-size: 9.5pt;
    }

    .valor-destaque {
      color: #1e3a8a;
      font-size: 12pt;
    }

    .valor-pdq-final {
      color: #111827;
      font-size: 12pt;
    }

    .aviso-precondicao {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #d97706;
      padding: 8px 12px;
      font-size: 9.5pt;
      color: #92400e;
      margin-top: 8px;
      border-radius: 3px;
      text-align: justify;
    }

    .destaque-indefinido {
      font-weight: 700;
      text-decoration: underline;
    }

    .aviso-nao-aplicavel {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #475569;
      padding: 8px 12px;
      font-size: 9.5pt;
      color: #334155;
      margin-bottom: 12px;
      border-radius: 3px;
      text-align: justify;
    }

    .caixa-motivos {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #dc2626;
      padding: 8px 12px;
      margin-bottom: 12px;
      border-radius: 3px;
    }

    .motivos-titulo {
      font-size: 9.5pt;
      font-weight: 700;
      color: #991b1b;
      margin-bottom: 4px;
    }

    .lista-motivos {
      margin: 0;
      padding-left: 18px;
      font-size: 9.5pt;
      color: #7f1d1d;
    }

    .lista-evidencias {
      margin: 4px 0 0 0;
      padding-left: 16px;
      font-size: 9pt;
      color: #374151;
    }

    .lista-publicacoes {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .pub-item {
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 6px 8px;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .pub-topo {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .pub-titulo {
      font-size: 9.5pt;
      color: #0f172a;
    }

    .pub-confirmada {
      background-color: #ecfdf5;
      color: #065f46;
      border-color: #a7f3d0;
      font-size: 7.5pt;
    }

    .pub-pendente {
      background-color: #fffbeb;
      color: #92400e;
      border-color: #fde68a;
      font-size: 7.5pt;
    }

    .pub-sem-coautoria {
      background-color: #f1f5f9;
      color: #475569;
      border-color: #e2e8f0;
      font-size: 7.5pt;
    }

    .meta-linha {
      margin-top: 2px;
    }

    .sem-itens {
      font-size: 9.5pt;
      font-style: italic;
      color: #64748b;
      margin: 6px 0;
    }

    /* Nota Metodológica Final */
    .nota-metodologica-section {
      margin-top: 24px;
      border-top: 1.5px solid #111827;
      padding-top: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .nota-metodologica-titulo {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #111827;
      margin-bottom: 6px;
    }

    .nota-metodologica-texto {
      font-size: 9.5pt;
      line-height: 1.45;
      color: #374151;
      text-align: justify;
      margin-bottom: 6px;
    }

    /* Rodapé */
    .print-footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      color: #475569;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <!-- Cabeçalho ABNT -->
  <header class="print-header">
    <div class="print-header-top">
      <div style="flex: 1;">
        <p class="print-header-inst">
          Programa de Pós-Graduação em Ciência e Engenharia de Materiais — PPG DCEM / P²CEM
        </p>
        <h1 class="print-header-title">
          Relatório de Avaliação de Recondução de Docentes — PPG-DCEM
        </h1>
        <p class="print-header-sub">
          Avaliação de Recondução Automática à Categoria Permanente — Quadriênio ${relatorio.quadrienio.ano_inicio}–${relatorio.quadrienio.ano_fim}
        </p>
      </div>
      <div class="print-header-meta">
        <div><span class="data-emissao">Data de emissão:</span> ${escaparHtml(dataAtualFormatada)}</div>
        <div style="margin-top: 4px;"><strong>${docentes.length}</strong> docente(s) no relatório</div>
      </div>
    </div>

    <!-- Transcrição Literal do § 4º da Norma -->
    <div class="transcricao-norma-box">
      <div class="transcricao-titulo">Norma de Recondução — Regulamento PPG-DCEM</div>
      <p class="transcricao-texto">
        ${escaparHtml(TEXTO_PARAGRAFO_4)}
      </p>
    </div>
  </header>

  ${
    !isDocenteUnico
      ? `
  <!-- Resumo das Métricas -->
  <section class="resumo-section">
    <div class="metricas-grid">
      <div class="metrica-card">
        <div class="metrica-titulo">Total Docentes</div>
        <div class="metrica-valor">${resumo.total_docentes}</div>
        <div class="metrica-sub">${resumo.total_permanentes} perm. / ${resumo.total_colaboradores} colab.</div>
      </div>
      <div class="metrica-card reconduzido">
        <div class="metrica-titulo">Reconduzidos</div>
        <div class="metrica-valor">${resumo.reconduzidos}</div>
        <div class="metrica-sub">Atendem 4 critérios</div>
      </div>
      <div class="metrica-card nao-atende">
        <div class="metrica-titulo">Não Atendem</div>
        <div class="metrica-valor">${resumo.nao_atendem}</div>
        <div class="metrica-sub">Pendências I, II, III ou IV</div>
      </div>
      <div class="metrica-card pdq-insuficiente">
        <div class="metrica-titulo">PDQ Insuficiente</div>
        <div class="metrica-valor">${resumo.pdq_insuficiente}</div>
        <div class="metrica-sub">&lt; 2 titulações (MSc+DSc)</div>
      </div>
      <div class="metrica-card">
        <div class="metrica-titulo">Não Aplicáveis</div>
        <div class="metrica-valor">${resumo.nao_aplicavel}</div>
        <div class="metrica-sub">Colab. / sem categoria</div>
      </div>
    </div>

    <div class="filtros-box">
      <strong>Filtros aplicados:</strong> ${escaparHtml(descricaoFiltros)}
    </div>
  </section>

  <!-- Quadro Geral de Docentes -->
  <section class="quadro-geral-section">
    <h2 class="subtitulo-bloco" style="margin-top: 0;">Quadro Geral Consolidado de Docentes</h2>
    <table class="print-table">
      <thead>
        <tr>
          <th style="width: 28px; text-align: right;">#</th>
          <th style="width: 28%;">Docente / Categoria</th>
          <th style="width: 14%; text-align: center;">Critério I<br /><span style="font-size: 8pt; font-weight: normal;">Orientação</span></th>
          <th style="width: 14%; text-align: center;">Critério II<br /><span style="font-size: 8pt; font-weight: normal;">Disciplina</span></th>
          <th style="width: 14%; text-align: center;">Critério III<br /><span style="font-size: 8pt; font-weight: normal;">Projeto</span></th>
          <th style="width: 14%; text-align: center;">Índice PDQ<br /><span style="font-size: 8pt; font-weight: normal;">NP/(MSc+DSc)</span></th>
          <th style="width: 16%; text-align: center;">Veredito</th>
        </tr>
      </thead>
      <tbody>
        ${linhasQuadroGeral}
      </tbody>
    </table>
  </section>
  `
      : `
  <div class="filtros-box">
    <strong>Emissão:</strong> Dossiê Individual do Docente — ${escaparHtml(docenteUnico?.nome)}
  </div>
  `
  }

  <!-- Seções detalhadas por Docente (uma em folha nova) -->
  <main>
    ${secoesDocentesHtml}
  </main>

  <!-- Nota Metodológica ao Final -->
  <footer class="nota-metodologica-section">
    <div class="nota-metodologica-titulo">Nota Metodológica e Ressalvas Técnicas</div>
    <p class="nota-metodologica-texto">
      <strong>Critério IV (Produção Docente Qualificada - NP Estrito vs. Teto):</strong> ${escaparHtml(
        relatorio.nota_metodologica.criterio_iv_np_coautoria ||
          'O NP estrito considera somente publicações com fator de impacto JCR >= 1,0 cuja coautoria com orientandos ou egressos do P²CEM esteja formalmente confirmada na base de dados (tabela publicacoes_coautores_programa). Publicações em periódicos de impacto que aguardam comprovação compõem o NP Teto e demandam deliberação do Colegiado.',
      )}
    </p>
    <p class="nota-metodologica-texto">
      <strong>Coautorias Pendentes e Deliberação do Colegiado:</strong> As coautorias pendentes de validação não são contabilizadas no veredito automatizado de recondução e demandam apreciação e homologação pela comissão coordenadora / colegiado do PPG-DCEM.
    </p>
    <p class="nota-metodologica-texto">
      <strong>Declarações Cadastrais:</strong> Os valores de Fator de Impacto JCR e a categoria docente (Permanente/Colaborador) constituem declarações do programa registradas no sistema de gestão.
    </p>
    <p class="nota-metodologica-texto">
      <strong>Critério II (Disciplinas):</strong> ${escaparHtml(
        relatorio.nota_metodologica.criterio_ii_disciplinas_temporais ||
          'Considera disciplinas vinculadas ao docente no quadriênio de avaliação.',
      )}
    </p>

    <div class="print-footer">
      <div>PPG-DCEM — Programa de Pós-Graduação em Ciência e Engenharia de Materiais / UFS</div>
      <div>Documento gerado automaticamente pelo Sistema Gestão PPG-DCEM</div>
    </div>
  </footer>
</body>
</html>`
}

/**
 * Imprime o relatório de recondução usando iframe oculto independente.
 * Monta o documento HTML completo, espera onload, chama iframe.contentWindow.print()
 * e remove o iframe da DOM após afterprint ou timeout de fallback.
 */
export function imprimirRelatorioReconducaoViaIframe(
  relatorio: RelatorioReconducaoResposta,
  opcoes: OpcoesImpressaoReconducao = {},
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve()
      return
    }

    const htmlCompleto = gerarHtmlRelatorioReconducao(relatorio, opcoes)

    const iframe = document.createElement('iframe')
    iframe.setAttribute(
      'style',
      'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden; pointer-events: none;',
    )
    iframe.setAttribute('title', 'RelatorioReconducaoPrintIframe')

    let printAcionado = false

    const dispararPrintERemover = () => {
      if (printAcionado) return
      printAcionado = true

      let removido = false
      const limpar = () => {
        if (removido) return
        removido = true
        try {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe)
          }
        } catch {
          // noop
        }
        try {
          if (document.body && document.body.style.pointerEvents === 'none') {
            document.body.style.pointerEvents = ''
          }
          window.focus()
        } catch {
          // noop
        }
        resolve()
      }

      try {
        const cw = iframe.contentWindow
        if (cw) {
          try {
            cw.addEventListener('afterprint', limpar, { once: true })
          } catch {
            // noop
          }
          try {
            window.addEventListener('afterprint', limpar, { once: true })
          } catch {
            // noop
          }

          try {
            cw.focus()
          } catch {
            // noop
          }

          try {
            cw.print()
          } catch (printErr) {
            console.warn('cw.print() falhou ou não suportada:', printErr)
          }

          // Fallback para Safari / cancelamento ou ausência de afterprint
          setTimeout(limpar, 1000)
        } else {
          limpar()
        }
      } catch (err) {
        console.error('Erro ao acionar impressão via iframe:', err)
        limpar()
      }
    }

    iframe.onload = () => {
      setTimeout(dispararPrintERemover, 50)
    }

    document.body.appendChild(iframe)

    try {
      const doc = iframe.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(htmlCompleto)
        doc.close()
      } else {
        iframe.srcdoc = htmlCompleto
      }
    } catch {
      iframe.srcdoc = htmlCompleto
    }

    // Fallback de segurança se onload não disparar
    setTimeout(dispararPrintERemover, 1200)
  })
}
