/**
 * Coorientação não conta nos cálculos (P-12, ORI, ATD, SO, PSA e DP4A).
 *
 * Coorientação = vínculo NÃO principal (`flag_orientador_principal === false`) de um docente que
 * não é o orientador principal do discente (`discentes.docente_orientador_id`).
 *
 * Por que não olhar só a flag: no banco ela vale `false` por padrão, inclusive nas orientações
 * lançadas à mão na tela de Orientações. Por isso só é coorientação quando o discente tem OUTRO
 * orientador principal registrado. Sem essa informação (flag ausente, discente sem orientador ou
 * desconhecido) a orientação continua contando, como antes.
 */
type OrientacaoParaPrincipal = {
  docente_id?: number | null
  discente_id?: number | null
  flag_orientador_principal?: boolean
}

type DiscenteParaPrincipal = { id: number; docente_orientador_id?: number | null }

export function ehCoorientacao(
  orientacao: OrientacaoParaPrincipal,
  discentes: DiscenteParaPrincipal[] | undefined,
): boolean {
  if (orientacao.flag_orientador_principal !== false) return false
  if (!orientacao.docente_id || !orientacao.discente_id || !discentes) return false
  const discente = discentes.find((d) => d.id === orientacao.discente_id)
  const principal = Number(discente?.docente_orientador_id)
  if (!Number.isFinite(principal) || principal <= 0) return false
  return principal !== Number(orientacao.docente_id)
}

export function filtrarOrientacoesPrincipais<T extends OrientacaoParaPrincipal>(
  orientacoes: T[],
  discentes: DiscenteParaPrincipal[] | undefined,
): T[] {
  return orientacoes.filter((o) => !ehCoorientacao(o, discentes))
}
