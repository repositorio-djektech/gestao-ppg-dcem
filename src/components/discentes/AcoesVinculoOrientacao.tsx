import { UserCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Role } from '@/types/database'
import { podeAssumirOrientacao, podeIncluirComoCoorientador } from '@/services/permissoes'

interface AcoesVinculoOrientacaoProps {
  role: Role | null | undefined
  docenteId: number | null | undefined
  discente: { id: number; docente_orientador_id?: number | null }
  /** O docente já tem orientação registrada com este discente. */
  jaVinculado?: boolean
  ocupado?: boolean
  onAssumir: () => void
  onCoorientar: () => void
}

/**
 * Ações de vínculo do docente na linha do discente (D-11):
 * - sem orientador: "Assumir orientação" (H-01);
 * - já orientado por outro docente: "Incluir-me como coorientador" (H-02).
 */
export function AcoesVinculoOrientacao({
  role,
  docenteId,
  discente,
  jaVinculado = false,
  ocupado = false,
  onAssumir,
  onCoorientar,
}: AcoesVinculoOrientacaoProps) {
  if (podeAssumirOrientacao(role, docenteId, discente)) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onAssumir}
        disabled={ocupado}
        className="h-8 w-8 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 shrink-0"
        title="Assumir orientação"
        aria-label="Assumir orientação"
      >
        <UserCheck className="h-4 w-4" />
      </Button>
    )
  }

  if (podeIncluirComoCoorientador(role, docenteId, discente, jaVinculado)) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onCoorientar}
        disabled={ocupado}
        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 shrink-0"
        title="Incluir-me como coorientador"
        aria-label="Incluir-me como coorientador"
      >
        <UserPlus className="h-4 w-4" />
      </Button>
    )
  }

  return null
}
