import React from 'react'
import { cn } from '@/lib/utils'
import { normalizarNomePessoa } from '@/lib/normalizacao'
import { toTitleCase } from '@/lib/titleCase'

export interface DocenteNomeProps extends React.HTMLAttributes<HTMLSpanElement> {
  nome: string
  /**
   * status do docente: quando false (ou booleano falso), exibe o nome em laranja.
   * Se omitido / true / undefined, mantém cor padrão.
   */
  status?: boolean | null
  normalizar?: boolean
}

/**
   Retorna a classe de cor laranja para quando o docente estiver com status = false.
   Padrão: text-orange-600 dark:text-orange-400 font-medium
*/
export function getDocenteNomeColorClass(status?: boolean | null): string {
  if (status === false) {
    return 'text-orange-600 dark:text-orange-400'
  }
  return ''
}

export function DocenteNome({
  nome,
  status,
  normalizar = true,
  className,
  children,
  ...props
}: DocenteNomeProps) {
  const isStatusFalse = status === false
  const nomeExibicao = normalizar ? toTitleCase(nome) : toTitleCase(nome)

  return (
    <span
      className={cn(
        isStatusFalse && 'text-orange-600 dark:text-orange-400 font-semibold',
        className,
      )}
      title={isStatusFalse ? `${nomeExibicao} (Inativo no programa)` : undefined}
      {...props}
    >
      {children || nomeExibicao}
    </span>
  )
}
