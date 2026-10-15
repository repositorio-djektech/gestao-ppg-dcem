import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatarCpf } from '@/lib/utils'
import type { FieldDef } from './types'

interface CrudFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingId: string | null
  fields: FieldDef[]
  formData: Record<string, any>
  setFormData: (data: Record<string, any>) => void
  fieldOptions: Record<string, { value: string; label: string }[]>
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
  entityName: string
  campoFocoInicial?: string
  headerActions?:
    | React.ReactNode
    | ((context: {
        isEditing: boolean
        formData: any
        setFormData: React.Dispatch<React.SetStateAction<any>>
      }) => React.ReactNode)
}

export function CrudFormDialog({
  open,
  onOpenChange,
  editingId,
  fields,
  formData,
  setFormData,
  fieldOptions,
  onSubmit,
  submitting,
  entityName,
  campoFocoInicial,
  headerActions,
}: CrudFormDialogProps) {
  React.useEffect(() => {
    if (open && campoFocoInicial) {
      const timer = setTimeout(() => {
        const el = document.getElementById(campoFocoInicial)
        if (el) {
          el.focus()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open, campoFocoInicial])

  const isEditing = Boolean(editingId)
  const renderedHeaderActions =
    typeof headerActions === 'function'
      ? headerActions({
          isEditing,
          formData,
          setFormData: setFormData as React.Dispatch<React.SetStateAction<any>>,
        })
      : headerActions

  // Controle de página para campos de ano (grade de 12 anos por página)
  const anoAtual = new Date().getFullYear()
  const [paginaAnoPorCampo, setPaginaAnoPorCampo] = React.useState<Record<string, number>>({})

  const obterAnoBase = (campoKey: string, valorAtual: any): number => {
    if (paginaAnoPorCampo[campoKey] !== undefined) {
      return paginaAnoPorCampo[campoKey]
    }
    const extraido = extrairAno(valorAtual)
    const num = extraido ? parseInt(extraido, 10) : anoAtual
    return isNaN(num) ? anoAtual : num
  }

  const extrairAno = (val: any): string => {
    if (val === null || val === undefined) return ''
    const str = String(val).trim()
    if (!str) return ''
    // Tenta capturar 4 dígitos contínuos
    const match = str.match(/\b(19\d{2}|20\d{2})\b/)
    if (match) return match[1]
    return str
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        bottomSheetOnMobile
        className="md:max-w-[550px] md:max-h-[90vh] flex flex-col p-0 overflow-hidden"
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-2 p-4 md:p-6 pb-2 md:pb-4 border-b border-slate-100 dark:border-neutral-800 shrink-0 pr-12 md:pr-12">
          <DialogTitle className="text-primary font-bold text-lg md:text-xl text-left">
            {editingId ? `Editar ${entityName}` : `Adicionar ${entityName}`}
          </DialogTitle>
          {renderedHeaderActions && (
            <div className="flex items-center gap-2">{renderedHeaderActions}</div>
          )}
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Área rolável dos campos: com foco automático mantido e scroll suave */}
          <div
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0"
            onFocusCapture={(e) => {
              // Scroll suave para garantir que o campo focado fique visível ao abrir o teclado virtual
              const target = e.target as HTMLElement
              if (target && typeof target.scrollIntoView === 'function') {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            }}
          >
            {fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                {field.type !== 'switch' && (
                  <Label htmlFor={field.key} className="text-xs font-medium text-slate-700">
                    {field.label}
                    {field.required && <span className="text-destructive"> *</span>}
                  </Label>
                )}
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.key}
                    rows={field.rows ?? 3}
                    value={formData[field.key] ?? ''}
                    placeholder={field.placeholder}
                    required={field.required}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="bg-white text-sm"
                  />
                ) : field.type === 'select' ? (
                  <Select
                    value={
                      formData[field.key] !== null && formData[field.key] !== undefined
                        ? String(formData[field.key])
                        : ''
                    }
                    onValueChange={(v) => {
                      const finalVal = v === '__none__' ? '' : v
                      if (field.onValueChangeWithFormData) {
                        const updated = field.onValueChangeWithFormData(finalVal, formData)
                        setFormData(updated)
                      } else {
                        setFormData({ ...formData, [field.key]: finalVal })
                      }
                    }}
                  >
                    <SelectTrigger
                      id={field.key}
                      className="bg-white min-h-[44px] md:min-h-9 text-sm"
                    >
                      <SelectValue placeholder={field.placeholder ?? 'Selecione...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {!field.required && <SelectItem value="__none__">— Nenhum —</SelectItem>}
                      {(field.options ?? fieldOptions[field.key] ?? []).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'switch' ? (
                  <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-white">
                    <div>
                      <Label htmlFor={field.key} className="cursor-pointer text-sm font-medium">
                        {field.label}
                      </Label>
                      {field.placeholder && (
                        <p className="text-xs text-slate-500">{field.placeholder}</p>
                      )}
                    </div>
                    <Switch
                      id={field.key}
                      checked={!!formData[field.key]}
                      onCheckedChange={(c) => setFormData({ ...formData, [field.key]: c })}
                    />
                  </div>
                ) : field.type === 'year' ? (
                  (() => {
                    const valorAno = extrairAno(formData[field.key])
                    const anoBase = obterAnoBase(field.key, formData[field.key])
                    const decadaInicio = Math.floor(anoBase / 12) * 12
                    const anos = Array.from({ length: 12 }, (_, i) => decadaInicio + i)

                    return (
                      <Popover>
                        <div className="flex items-center gap-1.5">
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              id={field.key}
                              className={`w-full justify-between text-left font-normal bg-white min-h-[44px] md:min-h-9 border-input hover:bg-slate-50 ${
                                !valorAno ? 'text-muted-foreground' : 'text-slate-900'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-slate-500 shrink-0" />
                                <span className="font-medium">
                                  {valorAno || field.placeholder || 'Selecione o ano...'}
                                </span>
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {valorAno ? 'Alterar' : 'Escolher'}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          {valorAno && !field.required && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="min-h-[44px] min-w-[44px] md:h-9 md:w-9 text-slate-400 hover:text-slate-600 shrink-0"
                              title="Limpar ano"
                              onClick={() => {
                                if (field.onValueChangeWithFormData) {
                                  setFormData(field.onValueChangeWithFormData('', formData))
                                } else {
                                  setFormData({ ...formData, [field.key]: '' })
                                }
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <PopoverContent className="w-64 p-3 bg-white" align="start">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="min-h-[36px] min-w-[36px] md:h-7 md:w-7 text-slate-600 hover:bg-slate-100"
                              onClick={() =>
                                setPaginaAnoPorCampo((prev) => ({
                                  ...prev,
                                  [field.key]: decadaInicio - 12,
                                }))
                              }
                              title="Anos anteriores"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-semibold text-slate-700">
                              {decadaInicio} – {decadaInicio + 11}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="min-h-[36px] min-w-[36px] md:h-7 md:w-7 text-slate-600 hover:bg-slate-100"
                              onClick={() =>
                                setPaginaAnoPorCampo((prev) => ({
                                  ...prev,
                                  [field.key]: decadaInicio + 12,
                                }))
                              }
                              title="Próximos anos"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {anos.map((ano) => {
                              const selecionado = String(ano) === valorAno
                              const isAtual = ano === anoAtual
                              return (
                                <Button
                                  key={ano}
                                  type="button"
                                  variant={selecionado ? 'default' : 'ghost'}
                                  size="sm"
                                  className={`min-h-[40px] md:h-8 text-xs font-medium ${
                                    selecionado
                                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                      : isAtual
                                        ? 'border border-primary/40 text-primary hover:bg-primary/10 font-bold'
                                        : 'hover:bg-slate-100 text-slate-800'
                                  }`}
                                  onClick={() => {
                                    const strAno = String(ano)
                                    if (field.onValueChangeWithFormData) {
                                      setFormData(field.onValueChangeWithFormData(strAno, formData))
                                    } else {
                                      setFormData({ ...formData, [field.key]: strAno })
                                    }
                                  }}
                                >
                                  {ano}
                                </Button>
                              )
                            })}
                          </div>
                          <div className="flex items-center justify-between pt-2 mt-2 border-t text-[11px]">
                            <button
                              type="button"
                              className="text-primary hover:underline font-medium min-h-[36px] flex items-center"
                              onClick={() => {
                                const strAno = String(anoAtual)
                                setPaginaAnoPorCampo((prev) => ({
                                  ...prev,
                                  [field.key]: anoAtual,
                                }))
                                if (field.onValueChangeWithFormData) {
                                  setFormData(field.onValueChangeWithFormData(strAno, formData))
                                } else {
                                  setFormData({ ...formData, [field.key]: strAno })
                                }
                              }}
                            >
                              Ano atual ({anoAtual})
                            </button>
                            {!field.required && valorAno && (
                              <button
                                type="button"
                                className="text-slate-500 hover:underline min-h-[36px] flex items-center"
                                onClick={() => {
                                  if (field.onValueChangeWithFormData) {
                                    setFormData(field.onValueChangeWithFormData('', formData))
                                  } else {
                                    setFormData({ ...formData, [field.key]: '' })
                                  }
                                }}
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )
                  })()
                ) : (
                  <Input
                    id={field.key}
                    type={
                      field.type === 'number'
                        ? 'number'
                        : field.type === 'date'
                          ? 'date'
                          : field.type === 'url'
                            ? 'url'
                            : field.type === 'email'
                              ? 'email'
                              : 'text'
                    }
                    value={
                      field.key.toLowerCase().includes('cpf')
                        ? formatarCpf(formData[field.key])
                        : (formData[field.key] ?? '')
                    }
                    placeholder={field.placeholder}
                    required={field.required}
                    min={field.min}
                    max={field.max}
                    maxLength={field.key.toLowerCase().includes('cpf') ? 14 : undefined}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [field.key]:
                          field.type === 'number'
                            ? e.target.value === ''
                              ? null
                              : Number(e.target.value)
                            : field.key.toLowerCase().includes('cpf')
                              ? formatarCpf(e.target.value)
                              : e.target.value,
                      })
                    }
                    className="bg-white min-h-[44px] md:min-h-9 text-sm"
                  />
                )}
                {field.helperText && <p className="text-xs text-slate-500">{field.helperText}</p>}
              </div>
            ))}
          </div>

          {/* Rodapé de Ações FIXO: sempre visível, com safe-area no mobile */}
          <div className="border-t border-slate-200 dark:border-neutral-800 bg-slate-50/90 dark:bg-neutral-900/90 p-3 md:p-4 flex items-center justify-end gap-2 md:gap-3 shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-white hover:bg-slate-50 min-h-[44px] md:min-h-9 px-4 text-xs md:text-sm flex-1 md:flex-initial"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] md:min-h-9 px-5 text-xs md:text-sm flex-1 md:flex-initial"
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
