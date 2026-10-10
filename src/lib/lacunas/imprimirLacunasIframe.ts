import type { RelatorioLacunasResposta, ItemLacunaRegistro } from '@/lib/lacunas/types'
import {
  GRUPOS_VISUAIS,
  mapearGrupoParaVisual,
  type GrupoVisualId,
  type FiltroGrupo,
  type FiltroSeveridade,
} from '@/pages/Lacunas'

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

export interface OpcoesImpressaoLacunas {
  filtroGrupo?: FiltroGrupo
  filtroSeveridade?: FiltroSeveridade
  filtroRegra?: string
  termoBusca?: string
}

export interface ItemLacunaParaImpressao {
  idRegistro: number
  nome: string
  motivo: string
  regraId: string
  regraDescricao: string
  grupoVisualId: GrupoVisualId
  grupoVisualLabel: string
  severidade: 'critica' | 'atencao'
  tabela: string
}

/**
 * Filtra e agrupa as lacunas do relatório de acordo com os filtros ativos.
 */
export function prepararLacunasParaImpressao(
  relatorio: RelatorioLacunasResposta,
  opcoes: OpcoesImpressaoLacunas = {},
): {
  itensFiltrados: ItemLacunaParaImpressao[]
  gruposComItens: Array<{
    id: GrupoVisualId
    label: string
    subtitulo: string
    itens: ItemLacunaParaImpressao[]
    criticas: number
    atencao: number
  }>
  totalCriticas: number
  totalAtencao: number
  totalGeral: number
} {
  const {
    filtroGrupo = 'todos',
    filtroSeveridade = 'todas',
    filtroRegra = 'todas',
    termoBusca = '',
  } = opcoes

  // Mapa de resumo das regras
  const mapaResumo = new Map<string, { descricao: string; grupo?: string; tabela?: string }>()
  if (relatorio.resumo) {
    for (const r of relatorio.resumo) {
      mapaResumo.set(r.regra_id, {
        descricao: r.descricao,
        grupo: r.grupo,
        tabela: r.tabela,
      })
    }
  }

  const itens: ItemLacunaParaImpressao[] = []
  if (relatorio.lacunas && Array.isArray(relatorio.lacunas)) {
    for (const det of relatorio.lacunas) {
      const resumo = mapaResumo.get(det.regra_id)
      const regraDescricao = resumo?.descricao || det.regra_id
      const grupoOrig = det.grupo || resumo?.grupo || ''
      const grupoVisualId = mapearGrupoParaVisual(grupoOrig)
      const configVisual = GRUPOS_VISUAIS.find((g) => g.id === grupoVisualId)
      const grupoVisualLabel = configVisual?.label || 'Pessoas'
      const tabela =
        resumo?.tabela || (det.regra_id.startsWith('docente') ? 'docentes' : 'discentes')

      if (Array.isArray(det.registros)) {
        for (const reg of det.registros) {
          itens.push({
            idRegistro: reg.id,
            nome: reg.nome || `ID ${reg.id}`,
            motivo: reg.motivo || regraDescricao,
            regraId: det.regra_id,
            regraDescricao,
            grupoVisualId,
            grupoVisualLabel,
            severidade: det.severidade,
            tabela,
          })
        }
      }
    }
  }

  // Filtragem
  const itensFiltrados = itens.filter((item) => {
    if (filtroGrupo !== 'todos' && item.grupoVisualId !== filtroGrupo) return false
    if (filtroSeveridade !== 'todas' && item.severidade !== filtroSeveridade) return false
    if (filtroRegra !== 'todas' && item.regraId !== filtroRegra) return false
    if (termoBusca.trim()) {
      const b = termoBusca.toLowerCase().trim()
      const n = item.nome.toLowerCase()
      const m = item.motivo.toLowerCase()
      const r = item.regraDescricao.toLowerCase()
      if (!n.includes(b) && !m.includes(b) && !r.includes(b)) return false
    }
    return true
  })

  // Agrupamento por Grupo Visual
  let totalCriticas = 0
  let totalAtencao = 0

  const gruposMap = new Map<GrupoVisualId, ItemLacunaParaImpressao[]>()
  for (const g of GRUPOS_VISUAIS) {
    gruposMap.set(g.id, [])
  }

  for (const item of itensFiltrados) {
    if (item.severidade === 'critica') totalCriticas++
    else totalAtencao++
    gruposMap.get(item.grupoVisualId)?.push(item)
  }

  // Apenas grupos que contêm itens (ou se o filtro for específico para um grupo)
  const gruposComItens = GRUPOS_VISUAIS.map((g) => {
    const list = gruposMap.get(g.id) || []
    const criticas = list.filter((i) => i.severidade === 'critica').length
    const atencao = list.filter((i) => i.severidade === 'atencao').length
    return {
      id: g.id,
      label: g.label,
      subtitulo: g.subtitulo,
      itens: list,
      criticas,
      atencao,
    }
  }).filter((g) => g.itens.length > 0)

  return {
    itensFiltrados,
    gruposComItens,
    totalCriticas,
    totalAtencao,
    totalGeral: itensFiltrados.length,
  }
}

/**
 * Gera documento HTML ABNT independente para impressão ou exportação em PDF.
 */
export function gerarHtmlRelatorioLacunas(
  relatorio: RelatorioLacunasResposta,
  opcoes: OpcoesImpressaoLacunas = {},
): string {
  const dados = prepararLacunasParaImpressao(relatorio, opcoes)

  const currentDateFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // Descrição dos filtros aplicados
  const filtrosTexto: string[] = []
  if (opcoes.filtroGrupo && opcoes.filtroGrupo !== 'todos') {
    const cfg = GRUPOS_VISUAIS.find((g) => g.id === opcoes.filtroGrupo)
    filtrosTexto.push(`Grupo: ${cfg?.label || opcoes.filtroGrupo}`)
  }
  if (opcoes.filtroSeveridade && opcoes.filtroSeveridade !== 'todas') {
    filtrosTexto.push(
      `Severidade: ${opcoes.filtroSeveridade === 'critica' ? 'Crítica' : 'Atenção'}`,
    )
  }
  if (opcoes.filtroRegra && opcoes.filtroRegra !== 'todas') {
    filtrosTexto.push(`Regra: ${opcoes.filtroRegra}`)
  }
  if (opcoes.termoBusca && opcoes.termoBusca.trim()) {
    filtrosTexto.push(`Busca: "${opcoes.termoBusca.trim()}"`)
  }

  const descricaoFiltros =
    filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Todos os registros (sem filtros)'

  const secoesGruposHtml = dados.gruposComItens
    .map((grupo) => {
      const linhasTabela = grupo.itens
        .map((item) => {
          const isCritica = item.severidade === 'critica'
          const badgeClass = isCritica ? 'badge-critica' : 'badge-atencao'
          const labelSeveridade = isCritica ? 'Crítica' : 'Atenção'

          return `
            <tr>
              <td class="col-quem">
                <span class="nome-quem font-bold">${escaparHtml(item.nome)}</span>
                <span class="subtexto">(${escaparHtml(item.tabela)} #${item.idRegistro})</span>
              </td>
              <td class="col-falta">
                <div class="font-semibold">${escaparHtml(item.regraDescricao)}</div>
                ${
                  item.motivo && item.motivo !== item.regraDescricao
                    ? `<div class="subtexto">${escaparHtml(item.motivo)}</div>`
                    : ''
                }
              </td>
              <td class="col-severidade text-center">
                <span class="badge ${badgeClass}">${labelSeveridade}</span>
              </td>
            </tr>
          `
        })
        .join('')

      return `
        <section class="print-section">
          <h2>${escaparHtml(grupo.label)} — ${escaparHtml(grupo.subtitulo)} (${grupo.itens.length})</h2>
          <div class="grupo-resumo-mini">
            <span><strong>Total no grupo:</strong> ${grupo.itens.length}</span>
            <span><strong>Críticas:</strong> ${grupo.criticas}</span>
            <span><strong>Atenção:</strong> ${grupo.atencao}</span>
          </div>
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 40%;">Quem</th>
                <th style="width: 45%;">O que falta</th>
                <th style="width: 15%; text-align: center;">Severidade</th>
              </tr>
            </thead>
            <tbody>
              ${linhasTabela}
            </tbody>
          </table>
        </section>
      `
    })
    .join('')

  const conteudoPrincipal =
    dados.gruposComItens.length === 0
      ? `
        <section class="print-section">
          <p class="sem-registros">Nenhuma lacuna encontrada para os critérios de filtro selecionados.</p>
        </section>
      `
      : secoesGruposHtml

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório de Lacunas de Dados — PPG-DCEM</title>
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
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.35;
    }

    .print-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 18px;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: avoid;
      break-after: avoid;
    }

    .print-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .print-header-inst {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #334155;
      margin: 0;
    }

    .print-header-title {
      font-size: 15pt;
      font-weight: 700;
      color: #0f172a;
      margin: 4px 0 0 0;
    }

    .print-header-sub {
      font-size: 8.5pt;
      color: #475569;
      margin: 3px 0 0 0;
    }

    .print-header-meta {
      text-align: right;
      font-size: 8pt;
      color: #64748b;
      white-space: nowrap;
    }

    .print-header-meta .data-emissao {
      font-weight: 600;
      color: #334155;
    }

    .print-header-meta .total-registros {
      margin-top: 4px;
      font-family: monospace;
      font-weight: 600;
      color: #0f172a;
    }

    .metricas-resumo-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .metrica-card {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 12px;
      background: #f8fafc;
    }

    .metrica-card.critica {
      border-color: #fca5a5;
      background: #fef2f2;
    }

    .metrica-card.atencao {
      border-color: #fde68a;
      background: #fffbeb;
    }

    .metrica-titulo {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #475569;
      margin-bottom: 2px;
    }

    .metrica-card.critica .metrica-titulo {
      color: #991b1b;
    }

    .metrica-card.atencao .metrica-titulo {
      color: #92400e;
    }

    .metrica-valor {
      font-size: 16pt;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.1;
    }

    .metrica-card.critica .metrica-valor {
      color: #dc2626;
    }

    .metrica-card.atencao .metrica-valor {
      color: #d97706;
    }

    .metrica-desc {
      font-size: 7pt;
      color: #64748b;
      margin-top: 2px;
    }

    .filtros-aplicados-box {
      font-size: 8pt;
      color: #475569;
      background: #f1f5f9;
      padding: 6px 10px;
      border-radius: 4px;
      margin-bottom: 18px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .print-section {
      margin-bottom: 22px;
      page-break-inside: auto;
      break-inside: auto;
    }

    .print-section + .print-section {
      page-break-before: always;
      break-before: page;
    }

    .print-section h2 {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #94a3b8;
      padding-bottom: 4px;
      margin: 0 0 6px 0;
      color: #0f172a;
      page-break-after: avoid;
      break-after: avoid;
    }

    .grupo-resumo-mini {
      display: flex;
      gap: 16px;
      font-size: 8pt;
      color: #475569;
      margin-bottom: 8px;
    }

    table.print-table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
      break-inside: auto;
      margin-bottom: 12px;
      table-layout: fixed;
    }

    table.print-table thead {
      display: table-header-group;
    }

    table.print-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: auto;
      break-after: auto;
    }

    table.print-table th,
    table.print-table td {
      border: 1px solid #94a3b8;
      padding: 6px 8px;
      text-align: left;
      font-size: 9pt;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }

    table.print-table th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8pt;
      letter-spacing: 0.03em;
    }

    .col-quem {
      width: 40%;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }

    .col-falta {
      width: 45%;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }

    .col-severidade {
      width: 15%;
      text-align: center;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border: 1px solid transparent;
    }

    .badge-critica {
      background-color: #fee2e2;
      color: #991b1b;
      border-color: #fca5a5;
    }

    .badge-atencao {
      background-color: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
    }

    .sem-registros {
      font-size: 8.5pt;
      font-style: italic;
      color: #64748b;
      margin: 8px 0;
    }

    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .subtexto { font-size: 7.5pt; color: #64748b; margin-top: 2px; }
    .text-center { text-align: center; }

    .print-footer {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #64748b;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <header class="print-header">
    <div class="print-header-top">
      <div style="flex: 1;">
        <p class="print-header-inst">
          Programa de Pós-Graduação em Ciência e Engenharia de Materiais — PPG DCEM
        </p>
        <h1 class="print-header-title">
          Relatório de Lacunas de Dados — PPG-DCEM
        </h1>
        <p class="print-header-sub">
          Diagnóstico de pendências cadastrais e campos faltantes para avaliação CAPES (Quadriênio 2025–2028)
        </p>
      </div>
      <div class="print-header-meta">
        <div><span class="data-emissao">Data de emissão:</span> ${escaparHtml(currentDateFormatted)}</div>
        <div class="total-registros">${dados.totalGeral} lacuna(s) encontrada(s)</div>
      </div>
    </div>
  </header>

  <div class="metricas-resumo-container">
    <div class="metrica-card">
      <div class="metrica-titulo">Total de Lacunas</div>
      <div class="metrica-valor">${dados.totalGeral}</div>
      <div class="metrica-desc">Pendências listadas no relatório</div>
    </div>
    <div class="metrica-card critica">
      <div class="metrica-titulo">Lacunas Críticas</div>
      <div class="metrica-valor">${dados.totalCriticas}</div>
      <div class="metrica-desc">Exigem preenchimento prioritário</div>
    </div>
    <div class="metrica-card atencao">
      <div class="metrica-titulo">Pontos de Atenção</div>
      <div class="metrica-valor">${dados.totalAtencao}</div>
      <div class="metrica-desc">Recomendados para enriquecimento</div>
    </div>
  </div>

  <div class="filtros-aplicados-box">
    <strong>Filtros aplicados:</strong> ${escaparHtml(descricaoFiltros)}
  </div>

  <main>
    ${conteudoPrincipal}
  </main>

  <footer class="print-footer">
    <div>PPG-DCEM — Programa de Pós-Graduação em Ciência e Engenharia de Materiais / UFS</div>
    <div>Documento gerado automaticamente pelo Sistema Gestão PPG-DCEM</div>
  </footer>
</body>
</html>`
}

/**
 * Imprime o relatório de lacunas usando iframe oculto independente.
 * Monta o documento HTML completo, espera onload, chama iframe.contentWindow.print()
 * e remove o iframe da DOM após afterprint ou timeout de fallback.
 */
export function imprimirRelatorioLacunasViaIframe(
  relatorio: RelatorioLacunasResposta,
  opcoes: OpcoesImpressaoLacunas = {},
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve()
      return
    }

    const htmlCompleto = gerarHtmlRelatorioLacunas(relatorio, opcoes)

    const iframe = document.createElement('iframe')
    iframe.setAttribute(
      'style',
      'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden; pointer-events: none;',
    )
    iframe.setAttribute('title', 'RelatorioLacunasPrintIframe')

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
