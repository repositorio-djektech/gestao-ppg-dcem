/**
 * Fator de impacto da publicação com tipo (JCR, FWCI ou outro) e valor, informados pelo docente
 * (H-31, P-35). O campo antigo `fator_impacto_jcr` continua existindo e só vale quando o tipo é JCR:
 * é ele que as regras que falam de JCR leem (lacunas, estimativa de Qualis).
 */
export type TipoFatorImpacto = 'JCR' | 'FWCI' | 'OUTRO'

export interface CamposFatorImpacto {
  fator_impacto_tipo?: TipoFatorImpacto | null
  fator_impacto_valor?: number | null
  fator_impacto_outro?: string
  fator_impacto_jcr?: number | null
}

/** Ao abrir o formulário: publicação antiga (só JCR) aparece com tipo JCR e o mesmo valor. */
export function fatorImpactoParaFormulario<T extends CamposFatorImpacto>(
  pub: T,
): T & CamposFatorImpacto {
  if (pub.fator_impacto_tipo) return pub
  if (pub.fator_impacto_jcr !== null && pub.fator_impacto_jcr !== undefined) {
    return { ...pub, fator_impacto_tipo: 'JCR', fator_impacto_valor: pub.fator_impacto_jcr }
  }
  return pub
}

/**
 * Atualiza tipo, valor e/ou nome do "outro". Sem tipo, o valor e o nome somem. O JCR antigo acompanha
 * o valor só quando o tipo é JCR; nos demais tipos fica vazio.
 */
export function atualizarFatorImpacto<T extends CamposFatorImpacto>(
  form: T,
  mudanca: { tipo?: TipoFatorImpacto | null; valor?: number | null; outro?: string },
): T & CamposFatorImpacto {
  const tipo = 'tipo' in mudanca ? (mudanca.tipo ?? null) : (form.fator_impacto_tipo ?? null)
  if (!tipo) {
    return {
      ...form,
      fator_impacto_tipo: null,
      fator_impacto_valor: null,
      fator_impacto_outro: '',
      fator_impacto_jcr: null,
    }
  }
  const valorBruto = 'valor' in mudanca ? mudanca.valor : (form.fator_impacto_valor ?? null)
  const valor =
    valorBruto !== null && valorBruto !== undefined && Number.isFinite(Number(valorBruto))
      ? Number(valorBruto)
      : null
  const outro = tipo === 'OUTRO' ? (mudanca.outro ?? form.fator_impacto_outro ?? '') : ''
  return {
    ...form,
    fator_impacto_tipo: tipo,
    fator_impacto_valor: valor,
    fator_impacto_outro: outro,
    fator_impacto_jcr: tipo === 'JCR' ? valor : null,
  }
}
