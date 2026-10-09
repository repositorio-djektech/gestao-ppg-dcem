import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Printer } from 'lucide-react'
import type { TabKey } from './DocentePrintDocument'

export interface DefinicaoAbaImpressao {
  id: TabKey
  rotulo: string
  icone: React.ComponentType<{ className?: string }>
  total: number
}

export interface ModalSelecaoAbasImpressaoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  abasDefinicao: DefinicaoAbaImpressao[]
  abasSelecionadas: Record<TabKey, boolean>
  onAlternarTodas: (marcar: boolean) => void
  onAlternarAba: (tab: TabKey, checked: boolean) => void
  onConfirmarImpressao: () => void
}

export function ModalSelecaoAbasImpressao({
  open,
  onOpenChange,
  abasDefinicao,
  abasSelecionadas,
  onAlternarTodas,
  onAlternarAba,
  onConfirmarImpressao,
}: ModalSelecaoAbasImpressaoProps) {
  const todasAbasSelecionadas = useMemo(() => {
    return Object.values(abasSelecionadas).every(Boolean)
  }, [abasSelecionadas])

  const totalAbasSelecionadas = useMemo(() => {
    return Object.values(abasSelecionadas).filter(Boolean).length
  }, [abasSelecionadas])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[92vw] p-5 gap-4">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-neutral-100">
            <Printer className="h-4 w-4 text-primary" />
            <span>Imprimir Dados do Docente</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-neutral-400">
            Selecione as abas que deseja incluir no relatório de impressão formatado.
          </DialogDescription>
        </DialogHeader>

        {/* Opção Selecionar Todas */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800">
          <label
            htmlFor="select-all-tabs"
            className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-neutral-200 cursor-pointer select-none"
          >
            <Checkbox
              id="select-all-tabs"
              checked={todasAbasSelecionadas}
              onCheckedChange={(checked) => onAlternarTodas(Boolean(checked))}
            />
            <span>Selecionar todas as abas</span>
          </label>
          <span className="text-[11px] font-mono text-slate-500">
            {totalAbasSelecionadas} de {abasDefinicao.length} selecionadas
          </span>
        </div>

        {/* Lista de Checkboxes por Aba */}
        <div className="grid grid-cols-1 gap-2 max-h-[48vh] overflow-y-auto pr-1">
          {abasDefinicao.map(({ id, rotulo, icone: Icone, total }) => {
            const selecionada = !!abasSelecionadas[id]
            return (
              <label
                key={id}
                htmlFor={`tab-print-${id}`}
                className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                  selecionada
                    ? 'bg-primary/5 border-primary/30 text-slate-900 dark:text-neutral-100'
                    : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Checkbox
                    id={`tab-print-${id}`}
                    checked={selecionada}
                    onCheckedChange={(checked) => onAlternarAba(id, Boolean(checked))}
                  />
                  <Icone className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate font-medium">{rotulo}</span>
                </div>
                {id !== 'geral' ? (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      total > 0
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-500'
                    }`}
                  >
                    {total}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Cadastral</span>
                )}
              </label>
            )
          })}
        </div>

        <DialogFooter className="pt-2 flex flex-row items-center justify-between gap-2 border-t border-slate-200 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={totalAbasSelecionadas === 0}
            onClick={onConfirmarImpressao}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Gerar Impressão</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
