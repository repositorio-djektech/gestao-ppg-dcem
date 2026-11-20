/**
 * Conclusão prevista sugerida para o discente (D-34), com a mesma regra das orientações:
 * mestrado 24 meses e doutorado 48 a partir do ingresso. Só preenche conclusão vazia ou ainda igual
 * à sugestão anterior; conclusão digitada (prorrogação) nunca é sobrescrita. O status acompanha a
 * conclusão (D-29), como em `aplicarConclusaoNoForm`.
 */
import { normalizarMesAno } from '@/lib/datas/mes-ano'
import { sugerirTermino } from '@/lib/orientacoes/previsao'
import { aplicarConclusaoNoForm } from '@/lib/discentes/status'

export function aplicarSugestaoConclusao<F extends Record<string, any>>(
  anterior: F,
  novo: F,
  hoje: Date = new Date(),
): F {
  const sugestaoAntiga = sugerirTermino(anterior.tipo_curso, anterior.data_ingresso)
  const atual = normalizarMesAno(novo.ano_conclusao) ?? ''
  if (atual !== '' && atual !== sugestaoAntiga) return novo
  const sugestao = sugerirTermino(novo.tipo_curso, novo.data_ingresso)
  if (sugestao) return aplicarConclusaoNoForm(novo, sugestao, hoje)
  return atual !== '' && atual === sugestaoAntiga ? aplicarConclusaoNoForm(novo, '', hoje) : novo
}
