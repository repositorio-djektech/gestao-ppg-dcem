/**
 * Desempenho dos docentes (H-32): os indicadores de cada docente (PDQ e seus termos), separados dos
 * indicadores do programa (tela Indicadores). Os dados vêm da avaliação do docente (IN 02/2026, D-36):
 * a mesma da tela de Credenciamento, sem o veredito.
 */
import { ordenarPorNome } from '@/lib/ordenacao'
import type { AvaliacaoDocenteReconducao } from './types'

export interface LinhaDesempenhoDocente {
  docenteId: number
  nome: string
  categoria: string
  mestrados: number
  doutorados: number
  publicacoesComCoautoria: number
  publicacoesTotal: number
  atd: number | null
  dpide1: number | null
  dptde1: number | null
  pdq: number | null
  notaCorte: number | null
  metaAtingida: boolean | null
}

const ROTULO_CATEGORIA: Record<string, string> = {
  permanente: 'Permanente',
  colaborador: 'Colaborador',
  visitante: 'Visitante',
}

/** Uma linha por docente, em ordem alfabética (P-35). */
export function montarDesempenhoDocentes(
  avaliacoes: AvaliacaoDocenteReconducao[],
): LinhaDesempenhoDocente[] {
  const linhas = avaliacoes.map((a) => {
    const p = a.pdq_detalhes
    const temPdq = p.pdq !== null && p.pdq !== undefined
    return {
      docenteId: Number(a.docente_id),
      nome: a.nome,
      categoria: ROTULO_CATEGORIA[String(a.categoria)] ?? 'Sem categoria',
      mestrados: p.msc,
      doutorados: p.dsc,
      publicacoesComCoautoria: p.np,
      publicacoesTotal: p.np_teto ?? p.np,
      // ATD não calculável (M + 2D = 0) aparece como vazio, não como 0
      atd: p.atd_calculavel === false ? null : (p.atd ?? null),
      dpide1: p.dpide1 ?? null,
      dptde1: p.dptde1 ?? null,
      pdq: temPdq ? (p.pdq as number) : null,
      notaCorte: p.nota_corte ?? null,
      metaAtingida: temPdq ? Boolean(p.meta_atingida) : null,
    }
  })
  return ordenarPorNome(linhas)
}

function celula(v: unknown): string {
  if (v === null || v === undefined) return ''
  const t = String(v)
  return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

function numero(n: number | null): string {
  return n === null ? '' : String(n).replace('.', ',')
}

/** CSV (separador ponto e vírgula, decimais com vírgula) para abrir direto no Excel em português. */
export function gerarCsvDesempenhoDocentes(
  linhas: LinhaDesempenhoDocente[],
  info: { anoAvaliacao: number; anoInicio: number; anoFim: number },
): string {
  const cabecalho = [
    'Docente',
    'Categoria',
    'Mestrados concluídos',
    'Doutorados concluídos',
    'Publicações com coautoria',
    'Publicações no período',
    'ATD',
    'DPIDE1',
    'DPTDE1',
    'PDQ',
    'Nota de corte',
    'Atinge a nota de corte',
  ]
  const corpo = linhas.map((l) =>
    [
      l.nome,
      l.categoria,
      l.mestrados,
      l.doutorados,
      l.publicacoesComCoautoria,
      l.publicacoesTotal,
      numero(l.atd),
      numero(l.dpide1),
      numero(l.dptde1),
      numero(l.pdq),
      numero(l.notaCorte),
      l.metaAtingida === null ? '' : l.metaAtingida ? 'Sim' : 'Não',
    ]
      .map(celula)
      .join(';'),
  )
  return [
    `Desempenho dos docentes - avaliação de ${info.anoAvaliacao} (produção ${info.anoInicio}-${info.anoFim})`,
    cabecalho.join(';'),
    ...corpo,
  ].join('\r\n')
}
