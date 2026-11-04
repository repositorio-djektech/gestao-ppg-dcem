import type { Role } from '@/types/database'

/**
 * Regras do campo "Orientador (docente)" do formulário de discente (D-11, H-03).
 * Extraído de `pages/Discentes.tsx` para ser testável.
 * - Coordenação: escolhe qualquer docente (é quem altera o orientador principal).
 * - Docente: só pode ser ele mesmo (a RLS reforça no banco, ver migração 20261104120000).
 */

type DocenteBasico = { id: number; nome: string }

export function opcoesDeOrientador(
  role: Role | null | undefined,
  docenteIdLogado: number | null | undefined,
  docentes: DocenteBasico[],
): { value: string; label: string }[] {
  if (role === 'docente' && docenteIdLogado) {
    return docentes
      .filter((d) => d.id === docenteIdLogado)
      .map((d) => ({ value: String(d.id), label: `${d.nome} (Você)` }))
  }
  return docentes.map((d) => ({ value: String(d.id), label: d.nome }))
}

export function aplicarOrientadorSelecionado<F extends Record<string, any>>(params: {
  role: Role | null | undefined
  docenteIdLogado: number | null | undefined
  valorSelecionado: string
  docentes: DocenteBasico[]
  formAtual: F
}): F {
  const { role, docenteIdLogado, valorSelecionado, docentes, formAtual } = params
  const valorFinal =
    role === 'docente' && docenteIdLogado ? String(docenteIdLogado) : valorSelecionado
  const id = valorFinal ? Number(valorFinal) : null
  const docente = id ? docentes.find((d) => d.id === id) : null
  return {
    ...formAtual,
    docente_orientador_id: valorFinal,
    orientador: docente ? docente.nome : formAtual.orientador || '',
  }
}
