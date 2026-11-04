import { UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Role } from '@/types/database'
import { podeAssumirOrientacao } from '@/services/permissoes'

interface AcoesVinculoOrientacaoProps {
  role: Role | null | undefined
  docenteId: number | null | undefined
  discente: { id: number; docente_orientador_id?: number | null }
  ocupado?: boolean
  onAssumir: () => void
}

/**
 * Ação de vínculo do docente na linha do discente: "Assumir orientação" (H-01), só para discente
 * sem orientador. O docente NÃO se inclui como coorientador (D-25); quem vincula é a coordenação.
 */
export function AcoesVinculoOrientacao({
  role,
  docenteId,
  discente,
  ocupado = false,
  onAssumir,
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

  return null
}
