import React, { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Trash2 } from 'lucide-react'
import type { Docente } from '@/types/database'

export interface ModalExcluirDocenteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  docente: Docente | null
  onConfirmar: (docente: Docente) => Promise<void>
  loading?: boolean
}

export function ModalExcluirDocente({
  open,
  onOpenChange,
  docente,
  onConfirmar,
  loading = false,
}: ModalExcluirDocenteProps) {
  const [nomeDigitado, setNomeDigitado] = useState('')

  // Limpa o campo digitado sempre que o modal abre ou troca de docente
  useEffect(() => {
    if (open) {
      setNomeDigitado('')
    }
  }, [open, docente?.id])

  if (!docente) return null

  const nomeExibido = docente.nome ?? ''
  // A digitação deve ser idêntica (com mesma acentuação, maiúsculas/minúsculas e pontuação)
  const nomeConfere = nomeDigitado === nomeExibido

  const handleConfirmar = async () => {
    if (!nomeConfere || loading) return
    await onConfirmar(docente)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-950/40">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Confirmar exclusão de Docente
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-600 dark:text-slate-300 text-sm space-y-3 pt-2 text-left">
            <span>
              Esta ação é permanente e não poderá ser desfeita. Se o docente possuir conta de
              usuário ou perfil vinculado no sistema, estes também serão{' '}
              <strong>excluídos em cascata</strong>.
            </span>

            <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900/60 p-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Nome completo do docente:
              </span>
              <span
                data-testid="docente-nome-alvo"
                className="font-bold text-slate-900 dark:text-slate-100 text-base select-all break-words"
              >
                {nomeExibido}
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label
                htmlFor="input-confirmacao-docente"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Para confirmar, digite exatamente o nome completo acima:
              </Label>
              <Input
                id="input-confirmacao-docente"
                data-testid="input-confirmacao-nome"
                value={nomeDigitado}
                onChange={(e) => setNomeDigitado(e.target.value)}
                placeholder="Digite o nome completo do docente"
                disabled={loading}
                autoComplete="off"
                className="bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700"
              />
              {!nomeConfere && nomeDigitado.length > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  O texto digitado ainda não é idêntico ao nome exibido.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading} onClick={() => onOpenChange(false)}>
            Cancelar
          </AlertDialogCancel>
          <Button
            data-testid="btn-confirmar-exclusao"
            variant="destructive"
            disabled={!nomeConfere || loading}
            onClick={handleConfirmar}
            className="gap-1.5 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            <span>{loading ? 'Excluindo...' : 'Sim, excluir definitivamente'}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
