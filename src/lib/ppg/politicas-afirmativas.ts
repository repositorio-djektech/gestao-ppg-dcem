/**
 * Item 1.3 da ficha (políticas afirmativas de inclusão, permanência e acessibilidade).
 * D-12: entra no MVP como TEXTO CURTO editável pela coordenação. Sem cálculo nem indicador.
 */
export const CHAVE_ITEM_1_3 = 'item_1_3_politicas_afirmativas'

/** "Texto curto" (D-12). Ajustável se a coordenação precisar de mais espaço. */
export const LIMITE_CARACTERES_POLITICAS_AFIRMATIVAS = 4000

export type ValidacaoTextoPoliticas =
  | { ok: true; texto: string }
  | { ok: false; motivo: 'muito_longo' }

export function validarTextoPoliticasAfirmativas(
  texto: string,
  limite = LIMITE_CARACTERES_POLITICAS_AFIRMATIVAS,
): ValidacaoTextoPoliticas {
  const limpo = (texto ?? '').trim()
  if (limpo.length > limite) return { ok: false, motivo: 'muito_longo' }
  return { ok: true, texto: limpo }
}
