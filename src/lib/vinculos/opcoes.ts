/**
 * Listas de opções dos campos novos das telas (H-31, P-35): classificações, abrangência, tipo de
 * prêmio, item do quesito 3 da ficha e tipo do fator de impacto. Os valores são os gravados no
 * banco (as CHECKs da migração 20261122120000 aceitam exatamente estes).
 */
export interface OpcaoCampo {
  value: string
  label: string
}

/** Eventos: valores com inicial maiúscula, como já estavam gravados ("Nacional", "Internacional"). */
export const OPCOES_CLASSIFICACAO_EVENTO: OpcaoCampo[] = [
  { value: 'Nacional', label: 'Nacional' },
  { value: 'Internacional', label: 'Internacional' },
  { value: 'Regional', label: 'Regional' },
  { value: 'Local', label: 'Local' },
]

/** Mobilidade: nacional, internacional ou regional (minúsculas, como já estavam gravados). */
export const OPCOES_MODALIDADE_MOBILIDADE: OpcaoCampo[] = [
  { value: 'nacional', label: 'Nacional' },
  { value: 'internacional', label: 'Internacional' },
  { value: 'regional', label: 'Regional' },
]

/** Premiações e impacto social: alcance da ação ou do prêmio. */
export const OPCOES_ABRANGENCIA: OpcaoCampo[] = [
  { value: 'internacional', label: 'Internacional' },
  { value: 'nacional', label: 'Nacional' },
  { value: 'regional', label: 'Regional' },
  { value: 'local', label: 'Local' },
]

/** Premiações: o que o prêmio concede. */
export const OPCOES_TIPO_PREMIO: OpcaoCampo[] = [
  { value: 'recursos_pesquisa', label: 'Recursos para pesquisa' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'mencao_honrosa', label: 'Somente menção honrosa' },
  { value: 'outro', label: 'Outro' },
]

/**
 * Impacto social: item do quesito 3 da ficha de avaliação (Engenharias II). O quesito 3 trata do
 * impacto na sociedade: 3.1 impacto e caráter inovador da produção, 3.2 impacto econômico, social e
 * cultural, 3.3 internacionalização, inserção e visibilidade.
 */
export const OPCOES_ITEM_FICHA_IMPACTO: OpcaoCampo[] = [
  { value: '3.1', label: '3.1 Impacto e caráter inovador da produção intelectual' },
  { value: '3.2_economico', label: '3.2 Impacto econômico' },
  { value: '3.2_social', label: '3.2 Impacto social' },
  { value: '3.2_cultural', label: '3.2 Impacto cultural' },
  { value: '3.3.1', label: '3.3.1 Divulgação e transparência' },
  { value: '3.3.2', label: '3.3.2 Internacionalização e inserção (local, regional, nacional)' },
  { value: '3.3.3', label: '3.3.3 Outras ações de visibilidade' },
]

/** Publicações: tipo do fator de impacto informado pelo docente. */
export const OPCOES_TIPO_FATOR_IMPACTO: OpcaoCampo[] = [
  { value: 'JCR', label: 'JCR' },
  { value: 'FWCI', label: 'FWCI' },
  { value: 'OUTRO', label: 'Outro' },
]

export function rotuloDaOpcao(opcoes: OpcaoCampo[], valor: unknown): string {
  const v = String(valor ?? '')
  return opcoes.find((o) => o.value === v)?.label ?? ''
}

/**
 * Texto do fator de impacto para tabelas: "JCR 3,45", "FWCI 1,2" ou "Outro (nome) 0,8". Sem o valor
 * novo, usa o JCR antigo. Sem nenhum, vazio.
 */
export function textoFatorImpacto(p: {
  fator_impacto_tipo?: string | null
  fator_impacto_valor?: number | string | null
  fator_impacto_outro?: string | null
  fator_impacto_jcr?: number | string | null
}): string {
  const valor = p.fator_impacto_valor ?? p.fator_impacto_jcr
  if (valor === null || valor === undefined || valor === '') return ''
  const n = Number(valor)
  if (!Number.isFinite(n)) return ''
  const tipo = String(p.fator_impacto_tipo ?? (p.fator_impacto_valor == null ? 'JCR' : ''))
    .trim()
    .toUpperCase()
  const num = n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
  if (tipo === 'OUTRO') {
    const nome = String(p.fator_impacto_outro ?? '').trim()
    return `${nome ? `Outro (${nome})` : 'Outro'} ${num}`
  }
  return tipo ? `${tipo} ${num}` : num
}
