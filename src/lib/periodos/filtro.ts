/**
 * Filtros por período das telas Docentes, Discentes e Egressos (H-28, D-32).
 *
 * Funções puras, em ANOS inteiros. O intervalo do filtro é livre (ex.: 2021–2023) e independe do
 * período de avaliação ativo.
 */
import { anoDoValor } from '@/lib/datas/ano'
import { anoDeMesAno } from '@/lib/datas/mes-ano'
import { conclusaoDoDiscente } from '@/lib/discentes/status'
import { extrairAnoNumerico, intervaloCruzaJanela, type JanelaAnos } from '@/lib/lattes/quadrienio'

export type IntervaloAnos = JanelaAnos

/** Filtro sem restrição: o filtro de período só vale quando há intervalo. */
export type FiltroPeriodo = IntervaloAnos | null

function anoDeTexto(valor: unknown): number | null {
  const mesAno = anoDeMesAno(valor)
  if (mesAno !== null) return mesAno
  const ano = anoDoValor(valor)
  return ano === null ? null : Number(ano)
}

/**
 * Lê os campos de ano digitados no filtro. Vazio nos dois = sem filtro. Só o início: vale dali em
 * diante; só o fim: até ali. Início maior que o fim = inválido (null com `erro`).
 */
export function lerFiltroPeriodo(
  inicio: string,
  fim: string,
): { filtro: FiltroPeriodo; erro: string | null } {
  const ini = inicio.trim() ? Number(inicio) : null
  const f = fim.trim() ? Number(fim) : null
  if ((ini !== null && !Number.isInteger(ini)) || (f !== null && !Number.isInteger(f))) {
    return { filtro: null, erro: 'Use anos com 4 dígitos.' }
  }
  if (ini === null && f === null) return { filtro: null, erro: null }
  if (ini !== null && f !== null && ini > f) {
    return { filtro: null, erro: 'O ano inicial não pode ser maior que o final.' }
  }
  return {
    filtro: { anoInicio: ini ?? Number.NEGATIVE_INFINITY, anoFim: f ?? Number.POSITIVE_INFINITY },
    erro: null,
  }
}

/**
 * Discente com vínculo no período: ingressou até o fim do intervalo e não concluiu antes do início.
 * Sem ingresso informado vale desde sempre; sem conclusão vale em aberto.
 */
export function discenteNoPeriodo(
  discente: {
    data_ingresso?: string | null
    ano_conclusao?: string | number | null
    data_conclusao?: string | null
  },
  filtro: FiltroPeriodo,
): boolean {
  if (!filtro) return true
  const ingresso = anoDeTexto(discente.data_ingresso)
  const conclusao = anoDeTexto(conclusaoDoDiscente(discente))
  if (ingresso === null && conclusao === null) return true
  return intervaloCruzaJanela(ingresso ?? Number.NEGATIVE_INFINITY, conclusao, filtro)
}

/** Egresso titulado no período. Sem ano de titulação não dá para saber: fica de fora do filtro. */
export function egressoNoPeriodo(
  egresso: { ano_titulacao?: number | string | null },
  filtro: FiltroPeriodo,
): boolean {
  if (!filtro) return true
  const ano = extrairAnoNumerico(egresso.ano_titulacao)
  return ano !== null && ano >= filtro.anoInicio && ano <= filtro.anoFim
}

export interface DadosAtividadeDocente {
  publicacoes: Array<{ id: number; ano?: number | string | null }>
  publicacoesDocentes: Array<{ publicacao_id: number; docente_id: number }>
  orientacoes: Array<{
    docente_id: number | null
    inicio?: string | null
    fim?: string | null
  }>
  projetos: Array<{
    id: number
    coordenador_id: number | null
    inicio?: string | null
    fim?: string | null
  }>
  participantes: Array<{ projeto_id: number; docente_id: number }>
}

/**
 * Docentes com atividade no período: autoria de publicação do ano, orientação cujo intervalo cruza
 * o período ou projeto (coordenação ou participação) que cruza o período. Aproximação: o cadastro
 * não guarda entrada e saída do docente no programa.
 */
export function docentesComAtividadeNoPeriodo(
  dados: DadosAtividadeDocente,
  filtro: FiltroPeriodo,
): Set<number> | null {
  if (!filtro) return null
  const ativos = new Set<number>()

  const anoPublicacao = new Map<number, number | null>()
  for (const p of dados.publicacoes) anoPublicacao.set(p.id, extrairAnoNumerico(p.ano))
  for (const pd of dados.publicacoesDocentes) {
    const ano = anoPublicacao.get(pd.publicacao_id)
    if (ano !== null && ano !== undefined && ano >= filtro.anoInicio && ano <= filtro.anoFim) {
      ativos.add(Number(pd.docente_id))
    }
  }

  for (const o of dados.orientacoes) {
    if (o.docente_id === null || o.docente_id === undefined) continue
    if (intervaloCruzaJanela(anoDeTexto(o.inicio), anoDeTexto(o.fim), filtro)) {
      ativos.add(Number(o.docente_id))
    }
  }

  const projetosNoPeriodo = new Set<number>()
  for (const pr of dados.projetos) {
    if (!intervaloCruzaJanela(anoDeTexto(pr.inicio), anoDeTexto(pr.fim), filtro)) continue
    projetosNoPeriodo.add(Number(pr.id))
    if (pr.coordenador_id !== null && pr.coordenador_id !== undefined) {
      ativos.add(Number(pr.coordenador_id))
    }
  }
  for (const part of dados.participantes) {
    if (projetosNoPeriodo.has(Number(part.projeto_id))) ativos.add(Number(part.docente_id))
  }

  return ativos
}
