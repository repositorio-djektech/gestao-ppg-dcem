import {
  normalizarTextoNome,
  dividirAutoresTexto,
  calcularSimilaridadeNome,
} from '@/lib/reconducao/matching-coautoria'
import type { Docente, Discente, Egresso } from '@/types/database'

export const LIMIAR_ALTA_CONFIANCA = 0.85

export interface SugestaoVinculoDocenteAutor {
  docenteId: number
  nome: string
  grauConfianca: number
  motivoMatch: string
  altaConfianca: boolean
  aceita: boolean
  rejeitada: boolean
}

export interface SugestaoVinculoCoautor {
  pessoaId: number
  tipo: 'orientando' | 'egresso'
  discenteId?: number | null
  egressoId?: number | null
  nome: string
  grauConfianca: number
  motivoMatch: string
  altaConfianca: boolean
  aceita: boolean
  rejeitada: boolean
}

export interface SugestaoVinculoOrientador {
  docenteId: number
  docenteNome: string
  discenteId?: number
  discenteNome: string
  grauConfianca: number
  motivoMatch: string
  altaConfianca: boolean
  aceita: boolean
  rejeitada: boolean
}

/**
 * Resolve e sugere docentes autores para o texto de autores de uma publicação.
 * Respeita docentes já rejeitados para a chave da publicação.
 */
export function sugerirDocentesAutoresParaTexto(params: {
  autoresTexto: string | null | undefined
  docentes: Array<Pick<Docente, 'id' | 'nome' | 'categoria'>>
  chaveOrigem?: string
  idsRejeitados?: Set<string | number>
  idsJaVinculados?: Set<number>
}): SugestaoVinculoDocenteAutor[] {
  const { autoresTexto, docentes, idsRejeitados = new Set(), idsJaVinculados = new Set() } = params

  if (!autoresTexto || docentes.length === 0) return []
  const segmentos = dividirAutoresTexto(autoresTexto)
  const sugestoes: SugestaoVinculoDocenteAutor[] = []
  const vistos = new Set<number>()

  for (const seg of segmentos) {
    for (const d of docentes) {
      if (vistos.has(d.id)) continue

      const sim = calcularSimilaridadeNome(seg, d.nome)
      if (sim.match) {
        vistos.add(d.id)
        const isRejeitado = idsRejeitados.has(d.id) || idsRejeitados.has(String(d.id))
        const isJaVinculado = idsJaVinculados.has(d.id)
        const altaConfianca = sim.score >= LIMIAR_ALTA_CONFIANCA

        sugestoes.push({
          docenteId: d.id,
          nome: d.nome,
          grauConfianca: sim.score,
          motivoMatch: `${sim.motivo} (Autor no Lattes: "${seg.trim()}")`,
          altaConfianca,
          // Alta confiança vem pré-marcada como aceita por padrão se não foi rejeitada
          aceita: !isRejeitado && (isJaVinculado || altaConfianca),
          rejeitada: isRejeitado,
        })
      }
    }
  }

  return sugestoes.sort((a, b) => b.grauConfianca - a.grauConfianca)
}

/**
 * Resolve e sugere coautores (discentes ou egressos) para o texto de autores de uma publicação.
 * Respeita rejeições prévias e marca alta confiança.
 */
export function sugerirCoautoresParaTexto(params: {
  autoresTexto: string | null | undefined
  discentes: Array<Pick<Discente, 'id' | 'nome' | 'status'>>
  egressos?: Array<Pick<Egresso, 'id' | 'nome'>>
  chaveOrigem?: string
  alvosRejeitados?: Set<string>
  alvosJaConfirmados?: Set<string>
}): SugestaoVinculoCoautor[] {
  const {
    autoresTexto,
    discentes,
    egressos = [],
    alvosRejeitados = new Set(),
    alvosJaConfirmados = new Set(),
  } = params

  if (!autoresTexto) return []
  const segmentos = dividirAutoresTexto(autoresTexto)
  const sugestoes: SugestaoVinculoCoautor[] = []
  const vistos = new Set<string>()

  for (const seg of segmentos) {
    // 1. Testa contra discentes
    for (const d of discentes) {
      const chaveId = `discente:${d.id}`
      if (vistos.has(chaveId)) continue

      const sim = calcularSimilaridadeNome(seg, d.nome)
      if (sim.match) {
        vistos.add(chaveId)
        const isRejeitado =
          alvosRejeitados.has(chaveId) ||
          alvosRejeitados.has(String(d.id)) ||
          alvosRejeitados.has(normalizarTextoNome(d.nome))
        const isJaConfirmado =
          alvosJaConfirmados.has(chaveId) || alvosJaConfirmados.has(String(d.id))
        const altaConfianca = sim.score >= LIMIAR_ALTA_CONFIANCA

        sugestoes.push({
          pessoaId: d.id,
          tipo: 'orientando',
          discenteId: d.id,
          egressoId: null,
          nome: d.nome,
          grauConfianca: sim.score,
          motivoMatch: `${sim.motivo} (Autor no Lattes: "${seg.trim()}")`,
          altaConfianca,
          aceita: !isRejeitado && (isJaConfirmado || altaConfianca),
          rejeitada: isRejeitado,
        })
      }
    }

    // 2. Testa contra egressos
    for (const e of egressos) {
      const chaveId = `egresso:${e.id}`
      if (vistos.has(chaveId)) continue

      const sim = calcularSimilaridadeNome(seg, e.nome)
      if (sim.match) {
        vistos.add(chaveId)
        const isRejeitado =
          alvosRejeitados.has(chaveId) ||
          alvosRejeitados.has(String(e.id)) ||
          alvosRejeitados.has(normalizarTextoNome(e.nome))
        const isJaConfirmado =
          alvosJaConfirmados.has(chaveId) || alvosJaConfirmados.has(String(e.id))
        const altaConfianca = sim.score >= LIMIAR_ALTA_CONFIANCA

        sugestoes.push({
          pessoaId: e.id,
          tipo: 'egresso',
          discenteId: null,
          egressoId: e.id,
          nome: e.nome,
          grauConfianca: sim.score,
          motivoMatch: `${sim.motivo} (Egresso P²CEM; Autor no Lattes: "${seg.trim()}")`,
          altaConfianca,
          aceita: !isRejeitado && (isJaConfirmado || altaConfianca),
          rejeitada: isRejeitado,
        })
      }
    }
  }

  return sugestoes.sort((a, b) => b.grauConfianca - a.grauConfianca)
}

/**
 * Tenta resolver um docente orientador para um discente a partir do nome em texto livre
 * ou a partir do contexto de um currículo Lattes de docente.
 */
export function resolverDocenteOrientador(params: {
  nomeOrientadorTexto?: string | null
  docenteContexto?: { id?: number; nome?: string; id_lattes?: string } | null
  docentes: Array<Pick<Docente, 'id' | 'nome' | 'id_lattes'>>
  idsRejeitados?: Set<string | number>
}): SugestaoVinculoOrientador | null {
  const { nomeOrientadorTexto, docenteContexto, docentes, idsRejeitados = new Set() } = params

  // Se o contexto é de um docente específico (importação do próprio docente orientando alguém)
  if (docenteContexto?.id) {
    const doc = docentes.find((d) => d.id === docenteContexto.id)
    if (doc) {
      const isRej = idsRejeitados.has(doc.id) || idsRejeitados.has(String(doc.id))
      return {
        docenteId: doc.id,
        docenteNome: doc.nome,
        discenteNome: '',
        grauConfianca: 1.0,
        motivoMatch: 'Currículo Lattes do próprio docente orientador',
        altaConfianca: true,
        aceita: !isRej,
        rejeitada: isRej,
      }
    }
  }

  if (docenteContexto?.id_lattes) {
    const doc = docentes.find((d) => d.id_lattes === docenteContexto.id_lattes)
    if (doc) {
      const isRej = idsRejeitados.has(doc.id) || idsRejeitados.has(String(doc.id))
      return {
        docenteId: doc.id,
        docenteNome: doc.nome,
        discenteNome: '',
        grauConfianca: 1.0,
        motivoMatch: 'Correspondência direta por ID Lattes do docente',
        altaConfianca: true,
        aceita: !isRej,
        rejeitada: isRej,
      }
    }
  }

  // Compara texto livre do orientador contra docentes cadastrados
  if (!nomeOrientadorTexto) return null
  const textoLimpo = nomeOrientadorTexto.trim()
  if (!textoLimpo) return null

  let melhor: {
    docente: Pick<Docente, 'id' | 'nome'>
    sim: ReturnType<typeof calcularSimilaridadeNome>
  } | null = null

  for (const d of docentes) {
    const sim = calcularSimilaridadeNome(textoLimpo, d.nome)
    if (sim.match) {
      if (!melhor || sim.score > melhor.sim.score) {
        melhor = { docente: d, sim }
      }
    }
  }

  if (melhor) {
    const isRej =
      idsRejeitados.has(melhor.docente.id) || idsRejeitados.has(String(melhor.docente.id))
    const altaConfianca = melhor.sim.score >= LIMIAR_ALTA_CONFIANCA

    return {
      docenteId: melhor.docente.id,
      docenteNome: melhor.docente.nome,
      discenteNome: '',
      grauConfianca: melhor.sim.score,
      motivoMatch: `${melhor.sim.motivo} (Orientador informado: "${textoLimpo}")`,
      altaConfianca,
      aceita: !isRej && altaConfianca,
      rejeitada: isRej,
    }
  }

  return null
}
