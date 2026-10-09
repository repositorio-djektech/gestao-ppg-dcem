import type { Docente } from '@/types/database'
import type { DadosDocenteCompleto, TabKey } from '@/components/docentes/DocentePrintDocument'

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

export function gerarHtmlDocenteRelatorio(
  docente: Docente,
  dados: DadosDocenteCompleto,
  abasSelecionadas: Record<TabKey, boolean>,
): string {
  const doc = dados.docente || docente

  const currentDateFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const totalGeralRegistros =
    dados.publicacoes.length +
    dados.orientacoes.length +
    dados.bancas.length +
    dados.projetos.length +
    dados.premiacoes.length +
    dados.producaoTecnica.length +
    dados.patentes.length +
    dados.eventos.length +
    dados.mobilidade.length +
    dados.impactoSocial.length

  const secoesHtml: string[] = []

  // 1. Geral (Identificação e Índices Bibliométricos)
  if (abasSelecionadas.geral) {
    secoesHtml.push(`
      <section class="print-section">
        <h2>1. Identificação e Índices Bibliométricos</h2>
        <table class="print-table">
          <tbody>
            <tr>
              <td class="rotulo w-25">Nome Completo</td>
              <td class="w-25 font-bold">${escaparHtml(doc.nome)}</td>
              <td class="rotulo w-25">ID Lattes (CNPq)</td>
              <td class="w-25 font-mono">${escaparHtml(doc.id_lattes)}</td>
            </tr>
            <tr>
              <td class="rotulo">Scopus Author ID</td>
              <td class="font-mono">${escaparHtml(doc.scopus_id)}</td>
              <td class="rotulo">OpenAlex ID</td>
              <td class="font-mono">${escaparHtml(doc.openalex_id)}</td>
            </tr>
            <tr>
              <td class="rotulo">Índice-H</td>
              <td class="font-mono font-bold">${doc.indice_h ?? 0}</td>
              <td class="rotulo">Bolsa Produtividade CNPq</td>
              <td>${escaparHtml(doc.bolsa_cnpq)}</td>
            </tr>
            <tr>
              <td class="rotulo">Jovem Doutor Pesquisador (JDP)</td>
              <td>${doc.jdp ? 'Sim' : 'Não'}</td>
              <td class="rotulo">Licença</td>
              <td>${escaparHtml(doc.licenca)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    `)
  }

  // 2. Publicações
  if (abasSelecionadas.publicacoes) {
    const conteudoTabela =
      dados.publicacoes.length === 0
        ? '<p class="sem-registros">Nenhuma publicação registrada.</p>'
        : `
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">Ano</th>
                <th style="width: 44%;">Título</th>
                <th style="width: 22%;">Periódico</th>
                <th style="width: 26%;">Autores</th>
              </tr>
            </thead>
            <tbody>
              ${dados.publicacoes
                .map(
                  (pub) => `
                <tr>
                  <td style="text-align: center;" class="font-mono font-semibold">${escaparHtml(pub.ano)}</td>
                  <td>
                    <div class="font-semibold">${escaparHtml(pub.titulo)}</div>
                    ${
                      pub.doi
                        ? `<div class="subtexto font-mono">DOI: ${escaparHtml(pub.doi)}</div>`
                        : ''
                    }
                  </td>
                  <td>${escaparHtml(pub.periodico)}</td>
                  <td class="texto-secundario">${escaparHtml(pub.autores)}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `

    secoesHtml.push(`
      <section class="print-section">
        <h2>Publicações em Periódicos (${dados.publicacoes.length})</h2>
        ${conteudoTabela}
      </section>
    `)
  }

  // 3. Orientações
  if (abasSelecionadas.orientacoes) {
    const conteudoTabela =
      dados.orientacoes.length === 0
        ? '<p class="sem-registros">Nenhuma orientação registrada.</p>'
        : `
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 18%;">Tipo</th>
                <th style="width: 32%;">Discente</th>
                <th style="width: 18%;">Período</th>
                <th style="width: 12%;">Status</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${dados.orientacoes
                .map((ori) => {
                  const periodo = `${escaparHtml(ori.inicio)} ${ori.fim ? `– ${escaparHtml(ori.fim)}` : ''}`
                  return `
                    <tr>
                      <td class="font-semibold">${escaparHtml(ori.tipo)}</td>
                      <td class="font-medium">${escaparHtml(ori.discente_nome)}</td>
                      <td class="font-mono">${periodo}</td>
                      <td style="text-transform: capitalize;">${escaparHtml(ori.status)}</td>
                      <td class="texto-secundario">${escaparHtml(ori.observacoes)}</td>
                    </tr>
                  `
                })
                .join('')}
            </tbody>
          </table>
        `

    secoesHtml.push(`
      <section class="print-section">
        <h2>Orientações e Supervisões (${dados.orientacoes.length})</h2>
        ${conteudoTabela}
      </section>
    `)
  }

  // 4. Bancas
  if (abasSelecionadas.bancas) {
    const conteudoTabela =
      dados.bancas.length === 0
        ? '<p class="sem-registros">Nenhuma banca registrada.</p>'
        : `
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 15%;">Tipo</th>
                <th style="width: 38%;">Trabalho</th>
                <th style="width: 20%;">Candidato</th>
                <th style="width: 12%;">Data</th>
                <th>Membros</th>
              </tr>
            </thead>
            <tbody>
              ${dados.bancas
                .map(
                  (banca) => `
                <tr>
                  <td>${escaparHtml(banca.tipo)}</td>
                  <td class="font-medium">${escaparHtml(banca.titulo_trabalho)}</td>
                  <td>${escaparHtml(banca.discente_nome)}</td>
                  <td class="font-mono">${escaparHtml(banca.data)}</td>
                  <td class="texto-secundario">${escaparHtml(banca.membros)}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `

    secoesHtml.push(`
      <section class="print-section">
        <h2>Bancas Examinadoras (${dados.bancas.length})</h2>
        ${conteudoTabela}
      </section>
    `)
  }

  // 5. Projetos
  if (abasSelecionadas.projetos) {
    const conteudoTabela =
      dados.projetos.length === 0
        ? '<p class="sem-registros">Nenhum projeto registrado.</p>'
        : `
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 38%;">Título</th>
                <th style="width: 18%;">Período</th>
                <th style="width: 18%;">Financiamento</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              ${dados.projetos
                .map((proj) => {
                  const periodo = `${escaparHtml(proj.inicio)} ${proj.fim ? `– ${escaparHtml(proj.fim)}` : ''}`
                  const financ = proj.financiamento
                    ? `Sim (${escaparHtml(proj.orgao_fomento || 'Fomento')})`
                    : 'Não'
                  return `
                    <tr>
                      <td class="font-medium">${escaparHtml(proj.titulo)}</td>
                      <td class="font-mono">${periodo}</td>
                      <td>${financ}</td>
                      <td class="texto-secundario">${escaparHtml(proj.descricao)}</td>
                    </tr>
                  `
                })
                .join('')}
            </tbody>
          </table>
        `

    secoesHtml.push(`
      <section class="print-section">
        <h2>Projetos de Pesquisa (${dados.projetos.length})</h2>
        ${conteudoTabela}
      </section>
    `)
  }

  // 6. Premiações
  if (abasSelecionadas.premiacoes) {
    const conteudoTabela =
      dados.premiacoes.length === 0
        ? '<p class="sem-registros">Nenhuma premiação registrada.</p>'
        : `
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 60px; text-align: center;">Ano</th>
                <th style="width: 50%;">Título</th>
                <th>Entidade Promotora</th>
              </tr>
            </thead>
            <tbody>
              ${dados.premiacoes
                .map(
                  (prem) => `
                <tr>
                  <td style="text-align: center;" class="font-mono">${escaparHtml(prem.ano)}</td>
                  <td class="font-medium">${escaparHtml(prem.titulo)}</td>
                  <td class="texto-secundario">${escaparHtml(prem.instituicao)}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `

    secoesHtml.push(`
      <section class="print-section">
        <h2>Premiações e Distinções (${dados.premiacoes.length})</h2>
        ${conteudoTabela}
      </section>
    `)
  }

  // 7. Produção Técnica
  if (abasSelecionadas.producao_tecnica) {
    const conteudoTabela =
      dados.producaoTecnica.length === 0
        ? '<p class="sem-registros">Nenhuma produção técnica registrada.</p>'
        : `
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 16%;">Tipo</th>
                <th style="width: 60px; text-align: center;">Ano</th>
                <th style="width: 44%;">Título</th>
                <th>Autores</th>
              </tr>
            </thead>
            <tbody>
              ${dados.producaoTecnica
                .map(
                  (pt) => `
                <tr>
                  <td>${escaparHtml(pt.tipo)}</td>
                  <td style="text-align: center;" class="font-mono">${escaparHtml(pt.ano)}</td>
                  <td class="font-medium">${escaparHtml(pt.titulo)}</td>
                  <td class="texto-secundario">${escaparHtml(pt.autores)}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `

    secoesHtml.push(`
      <section class="print-section">
        <h2>Produção Técnica e Tecnológica (${dados.producaoTecnica.length})</h2>
        ${conteudoTabela}
      </section>
    `)
  }

  // 8. Patentes
  if (abasSelecionadas.patentes) {
    const conteudoTabela =
      dados.patentes.length === 0
        ? '<p class="sem-registros">Nenhuma patente registrada.</p>'
        : `
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 40%;">Título</th>
                <th style="width: 20%;">Registro INPI</th>
                <th style="width: 15%;">Status</th>
                <th>Autores</th>
              </tr>
            </thead>
            <tbody>
              ${dados.patentes
                .map(
                  (pat) => `
                <tr>
                  <td class="font-medium">${escaparHtml(pat.titulo)}</td>
                  <td class="font-mono">${escaparHtml(pat.inpi)}</td>
                  <td>${escaparHtml(pat.status || 'Pendente')}</td>
                  <td class="texto-secundario">${escaparHtml(pat.autores)}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `

    secoesHtml.push(`
      <section class="print-section">
        <h2>Patentes e Propriedade Intelectual (${dados.patentes.length})</h2>
        ${conteudoTabela}
      </section>
    `)
  }

  // 9. Eventos
  if (abasSelecionadas.eventos) {
    const conteudoTabela =
      dados.eventos.length === 0
        ? '<p class="sem-registros">Nenhum evento registrado.</p>'
        : `
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 35%;">Evento</th>
                <th style="width: 20%;">Papel</th>
                <th style="width: 20%;">Local / Data</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${dados.eventos
                .map(
                  (eve) => `
                <tr>
                  <td class="font-medium">${escaparHtml(eve.evento)}</td>
                  <td>${escaparHtml(eve.papel)}</td>
                  <td>${escaparHtml(eve.local_data)}</td>
                  <td class="texto-secundario">${escaparHtml(eve.observacoes)}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `

    secoesHtml.push(`
      <section class="print-section">
        <h2>Participação em Eventos (${dados.eventos.length})</h2>
        ${conteudoTabela}
      </section>
    `)
  }

  // 10. Mobilidade
  if (abasSelecionadas.mobilidade) {
    const conteudoTabela =
      dados.mobilidade.length === 0
        ? '<p class="sem-registros">Nenhum registro de mobilidade.</p>'
        : `
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 18%;">Modalidade</th>
                <th style="width: 35%;">Instituição</th>
                <th style="width: 20%;">Período</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${dados.mobilidade
                .map(
                  (mob) => `
                <tr>
                  <td style="text-transform: capitalize;">${escaparHtml(mob.modalidade)}</td>
                  <td class="font-medium">${escaparHtml(mob.instituicao)}</td>
                  <td class="font-mono">${escaparHtml(mob.periodo)}</td>
                  <td class="texto-secundario">${escaparHtml(mob.observacoes)}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `

    secoesHtml.push(`
      <section class="print-section">
        <h2>Mobilidade Acadêmica e Cooperação (${dados.mobilidade.length})</h2>
        ${conteudoTabela}
      </section>
    `)
  }

  // 11. Impacto Social
  if (abasSelecionadas.impacto_social) {
    const conteudoTabela =
      dados.impactoSocial.length === 0
        ? '<p class="sem-registros">Nenhum registro de impacto social.</p>'
        : `
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 60px; text-align: center;">Ano</th>
                <th style="width: 40%;">Título da Ação</th>
                <th>Descrição e Impacto</th>
              </tr>
            </thead>
            <tbody>
              ${dados.impactoSocial
                .map(
                  (imp) => `
                <tr>
                  <td style="text-align: center;" class="font-mono">${escaparHtml(imp.ano)}</td>
                  <td class="font-medium">${escaparHtml(imp.titulo)}</td>
                  <td class="texto-secundario">${escaparHtml(imp.descricao)}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        `

    secoesHtml.push(`
      <section class="print-section">
        <h2>Impacto Social e Extensão (${dados.impactoSocial.length})</h2>
        ${conteudoTabela}
      </section>
    `)
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório Curricular Individual — ${escaparHtml(doc.nome)}</title>
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
      margin-bottom: 20px;
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
      margin: 0 0 10px 0;
      color: #0f172a;
      page-break-after: avoid;
      break-after: avoid;
    }

    table.print-table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
      break-inside: auto;
      margin-bottom: 12px;
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
    }

    table.print-table th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8pt;
      letter-spacing: 0.03em;
    }

    table.print-table td.rotulo {
      font-weight: 700;
      background-color: #f1f5f9;
      color: #1e293b;
    }

    .sem-registros {
      font-size: 8.5pt;
      font-style: italic;
      color: #64748b;
      margin: 4px 0 12px 0;
    }

    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .subtexto { font-size: 7.5pt; color: #64748b; margin-top: 2px; }
    .texto-secundario { color: #475569; }
    .w-25 { width: 25%; }

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
          Relatório Curricular Individual — ${escaparHtml(doc.nome)}
        </h1>
        <p class="print-header-sub">
          Dados cadastrais e produção acadêmica registrada no sistema de avaliação
        </p>
      </div>
      <div class="print-header-meta">
        <div><span class="data-emissao">Data de emissão:</span> ${escaparHtml(currentDateFormatted)}</div>
        <div class="total-registros">${totalGeralRegistros} registro(s) associado(s)</div>
      </div>
    </div>
  </header>

  <main>
    ${secoesHtml.join('\n')}
  </main>

  <footer class="print-footer">
    <div>PPG-DCEM — Programa de Pós-Graduação em Ciência e Engenharia de Materiais / UFS</div>
    <div>Documento gerado automaticamente pelo Sistema Gestão PPG-DCEM</div>
  </footer>
</body>
</html>`
}

/**
 * Imprime o relatório do docente usando a técnica de iframe oculto independente.
 * Monta o documento HTML completo, espera o evento de load (ou fallback assíncrono),
 * aciona iframe.contentWindow.print() e descarta o iframe da DOM após o fluxo.
 */
export function imprimirDocenteViaIframe(
  docente: Docente,
  dados: DadosDocenteCompleto,
  abasSelecionadas: Record<TabKey, boolean>,
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve()
      return
    }

    const htmlCompleto = gerarHtmlDocenteRelatorio(docente, dados, abasSelecionadas)

    const iframe = document.createElement('iframe')
    iframe.setAttribute(
      'style',
      'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden; pointer-events: none;',
    )
    iframe.setAttribute('title', 'RelatorioDocentePrintIframe')

    let printAcionado = false

    const dispararPrintERemover = () => {
      if (printAcionado) return
      printAcionado = true

      try {
        const cw = iframe.contentWindow
        if (cw) {
          cw.focus()
          // Ouve o evento afterprint se disponível
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
            cw.addEventListener('afterprint', limpar, { once: true })
          } catch {
            // noop
          }

          cw.print()

          // Fallback para caso afterprint não dispare (ex: Safari ou fechamento rápido)
          setTimeout(limpar, 1000)
        } else {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
          resolve()
        }
      } catch (err) {
        console.error('Erro ao acionar impressão via iframe:', err)
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
        resolve()
      }
    }

    iframe.onload = () => {
      // Dispara o print assim que o conteúdo do iframe estiver totalmente pronto
      setTimeout(dispararPrintERemover, 50)
    }

    document.body.appendChild(iframe)

    // Escreve o documento HTML no iframe
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

    // Fallback de segurança se onload não disparar por qualquer motivo
    setTimeout(dispararPrintERemover, 1200)
  })
}
