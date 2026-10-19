import type { RelatorioIndicadoresCapes, ResultadoIndicador } from './types'

function escaparHtml(str: unknown): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Gera documento HTML para exportação em PDF (padrão Times New Roman 12pt / ABNT)
 */
export function gerarHtmlRelatorioIndicadores(
  relatorio: RelatorioIndicadoresCapes,
  filtroQuesito: string = 'TODOS',
): string {
  const dataAtualFormatada = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  })

  const quesitosFiltrados =
    filtroQuesito === 'TODOS'
      ? relatorio.quesitos
      : relatorio.quesitos.filter((q) => q.quesito === filtroQuesito)

  const secoesHtml = quesitosFiltrados
    .map((q) => {
      const cardsHtml = q.indicadores
        .map((ind) => {
          const valorFormatado =
            ind.status === 'calculado'
              ? `${ind.valorCalculado}${ind.unidade ? ind.unidade : ''}`
              : 'Indefinido'

          const statusBadge =
            ind.status === 'calculado'
              ? `<span style="background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 2px 6px; font-weight: bold; border-radius: 3px; font-size: 9pt;">CALCULADO</span>`
              : `<span style="background-color: #fffbeb; color: #92400e; border: 1px solid #fde68a; padding: 2px 6px; font-weight: bold; border-radius: 3px; font-size: 9pt;">AGUARDANDO INSUMO</span>`

          let seriesAnualHtml = ''
          if (ind.anos) {
            const linhasAnos = [2025, 2026, 2027, 2028]
              .map((ano) => {
                const dadoAno = ind.anos?.[ano]
                const valStr =
                  dadoAno?.status === 'calculado' && dadoAno.valorCalculado !== null
                    ? `${dadoAno.valorCalculado}${ind.unidade || ''}`
                    : '<span style="color: #92400e;">Aguardando insumo</span>'
                return `<td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: center;">${valStr}</td>`
              })
              .join('')

            const mmaStr =
              ind.mma && ind.mma.valor !== null
                ? `<strong>${ind.mma.valor}${ind.unidade || ''}</strong>`
                : '—'

            seriesAnualHtml = `
            <div style="margin: 6px 0; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 3px; padding: 6px;">
              <div style="font-size: 9pt; font-weight: bold; color: #334155; margin-bottom: 4px; text-transform: uppercase;">
                Evolução Anual &amp; MMA (Média das Médias Anuais):
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                <thead>
                  <tr style="background-color: #f1f5f9; color: #475569;">
                    <th style="padding: 4px; border: 1px solid #cbd5e1;">2025</th>
                    <th style="padding: 4px; border: 1px solid #cbd5e1;">2026</th>
                    <th style="padding: 4px; border: 1px solid #cbd5e1;">2027</th>
                    <th style="padding: 4px; border: 1px solid #cbd5e1;">2028</th>
                    <th style="padding: 4px; border: 1px solid #cbd5e1; background-color: #e0f2fe; color: #0369a1;">MMA Final</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    ${linhasAnos}
                    <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: center; background-color: #f0f9ff; color: #0369a1;">
                      ${mmaStr}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">
                ${escaparHtml(ind.mma?.regra || '')}
              </div>
            </div>
            `
          }

          const decompHtml =
            ind.decomposicao.length > 0
              ? `
            <div style="margin-top: 6px; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 3px; font-size: 9.5pt;">
              <strong style="font-size: 9pt; color: #475569; text-transform: uppercase;">Decomposição dos termos:</strong>
              <ul style="margin: 4px 0 0 16px; padding: 0;">
                ${ind.decomposicao
                  .map(
                    (d) =>
                      `<li><strong>${escaparHtml(d.termo)}:</strong> ${escaparHtml(d.valor)} <span style="color: #64748b;">(${escaparHtml(d.descricao)})</span></li>`,
                  )
                  .join('')}
              </ul>
            </div>
            `
              : ''

          const motivoHtml =
            ind.status === 'indefinido' && ind.motivoIndefinido
              ? `
            <div style="margin-top: 6px; background-color: #fef2f2; border-left: 3px solid #ef4444; padding: 6px 8px; font-size: 9.5pt; color: #991b1b;">
              <strong>Motivo:</strong> ${escaparHtml(ind.motivoIndefinido)}
            </div>
            `
              : ''

          return `
          <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; background-color: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              <div>
                <span style="font-size: 10pt; font-weight: bold; color: #1e3a8a; background-color: #e9effc; padding: 2px 6px; border-radius: 3px;">
                  Item ${escaparHtml(ind.itemFicha)} • ${escaparHtml(ind.codigo)}
                </span>
                <span style="margin-left: 8px; font-weight: bold; font-size: 11pt; color: #0f172a;">
                  ${escaparHtml(ind.nome)}
                </span>
                <span style="margin-left: 6px; font-size: 9pt; color: #64748b;">(Peso: ${ind.pesoPercentual}%)</span>
              </div>
              <div>${statusBadge}</div>
            </div>

            <div style="font-family: monospace; background-color: #f1f5f9; padding: 4px 8px; border-radius: 3px; font-size: 10pt; color: #0f172a; margin-bottom: 6px;">
              <strong>Fórmula:</strong> ${escaparHtml(ind.formulaTexto)}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin: 6px 0;">
              <div><strong style="font-size: 10pt;">Resultado Calculado:</strong></div>
              <div style="font-size: 13pt; font-weight: bold; color: ${ind.status === 'calculado' ? '#1e3a8a' : '#b45309'};">
                ${valorFormatado}
              </div>
            </div>

            ${seriesAnualHtml}
            ${decompHtml}
            ${motivoHtml}
          </div>
          `
        })
        .join('')

      return `
      <section style="margin-top: 18px;">
        <h2 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; color: #1e3a8a; margin-bottom: 10px;">
          ${escaparHtml(q.titulo)} (Peso Geral: ${q.pesoTotalPercentual}%)
        </h2>
        ${cardsHtml}
      </section>
      `
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Indicadores Ficha CAPES — PPG-DCEM</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .header-box {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .inst-nome {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #334155;
      margin: 0;
    }
    .titulo-relatorio {
      font-size: 15pt;
      font-weight: bold;
      color: #0f172a;
      margin: 4px 0;
    }
    .subtitulo {
      font-size: 10.5pt;
      color: #475569;
      margin: 0;
    }
    .resumo-metricas {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 16px;
      font-size: 10pt;
    }
    .rodape-doc {
      margin-top: 24px;
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      font-size: 9pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <p class="inst-nome">Universidade Federal de Sergipe — UFS • PPG-DCEM</p>
    <h1 class="titulo-relatorio">Ficha de Avaliação CAPES (Área Engenharias II) — Indicadores</h1>
    <p class="subtitulo">
      Quadriênio de Avaliação ${relatorio.quadrienio.inicio}–${relatorio.quadrienio.fim} • Ano de Referência: ${relatorio.anoReferencia} • Emissão: ${escaparHtml(dataAtualFormatada)}
    </p>
  </div>

  <div class="resumo-metricas">
    <div><strong>Total de Indicadores:</strong> ${relatorio.resumoGeral.totalIndicadores}</div>
    <div><strong>Calculados:</strong> ${relatorio.resumoGeral.calculados}</div>
    <div><strong>Aguardando Insumo:</strong> ${relatorio.resumoGeral.indefinidos}</div>
    <div><strong>Corpo DP Efetivo:</strong> ${relatorio.resumoGeral.totalDP} DP (${relatorio.resumoGeral.totalJdpValidos} JDP válidos)</div>
  </div>

  <main>
    ${secoesHtml}
  </main>

  <footer class="rodape-doc">
    <div>PPG-DCEM — Programa de Pós-Graduação em Ciência e Engenharia de Materiais</div>
    <div>Página gerada via Sistema Gestão PPG-DCEM</div>
  </footer>
</body>
</html>`
}

/**
 * Exporta relatório de indicadores em PDF utilizando iframe oculto independente
 */
export function imprimirRelatorioIndicadoresViaIframe(
  relatorio: RelatorioIndicadoresCapes,
  filtroQuesito: string = 'TODOS',
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve()
      return
    }

    const htmlCompleto = gerarHtmlRelatorioIndicadores(relatorio, filtroQuesito)
    const iframe = document.createElement('iframe')
    iframe.setAttribute(
      'style',
      'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden; pointer-events: none;',
    )
    iframe.setAttribute('title', 'RelatorioIndicadoresCapesPrintIframe')

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
          cw.focus()
          cw.print()
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

    setTimeout(dispararPrintERemover, 1200)
  })
}

/**
 * Gera e dispara download de arquivo CSV estruturado com todos os indicadores
 */
export function exportarIndicadoresCsv(relatorio: RelatorioIndicadoresCapes): void {
  const cabecalhos = [
    'Quesito',
    'Item Ficha',
    'Código',
    'Indicador',
    'Metodologia',
    'Peso (%)',
    'Fórmula',
    'Status',
    'Valor Consolidado (MMA / Estoque)',
    '2025',
    '2026',
    '2027',
    '2028',
    'MMA Completo (4 anos)',
    'Regra MMA',
    'Unidade',
    'Motivo Indefinido',
    'Decomposição',
  ]

  const formatarValorAnoCsv = (ind: ResultadoIndicador, ano: number): string => {
    if (!ind.anos) return 'N/A (Estoque)'
    const d = ind.anos[ano]
    if (!d || d.status !== 'calculado' || d.valorCalculado === null) {
      return 'Aguardando insumo'
    }
    return String(d.valorCalculado)
  }

  const linhas: string[][] = [cabecalhos]

  for (const q of relatorio.quesitos) {
    for (const ind of q.indicadores) {
      const decompStr = ind.decomposicao.map((d) => `${d.termo}=${d.valor}`).join('; ')

      linhas.push([
        `Quesito ${ind.quesito}`,
        ind.itemFicha,
        ind.codigo,
        ind.nome,
        ind.metodologia || 'anual_mma',
        String(ind.pesoPercentual),
        ind.formulaTexto,
        ind.status === 'calculado' ? 'CALCULADO' : 'AGUARDANDO INSUMO',
        ind.valorCalculado !== null ? String(ind.valorCalculado) : '',
        formatarValorAnoCsv(ind, 2025),
        formatarValorAnoCsv(ind, 2026),
        formatarValorAnoCsv(ind, 2027),
        formatarValorAnoCsv(ind, 2028),
        ind.mma ? (ind.mma.completo ? 'SIM' : 'NÃO') : 'N/A',
        ind.mma?.regra || '',
        ind.unidade || '',
        ind.motivoIndefinido || '',
        decompStr,
      ])
    }
  }

  const csvContent = linhas
    .map((linha) =>
      linha.map((celula) => `"${String(celula || '').replace(/"/g, '""')}"`).join(';'),
    )
    .join('\r\n')

  // Adiciona BOM UTF-8 para correta abertura no Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `indicadores_capes_ppg_dcem_${relatorio.quadrienio.inicio}_${relatorio.quadrienio.fim}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
