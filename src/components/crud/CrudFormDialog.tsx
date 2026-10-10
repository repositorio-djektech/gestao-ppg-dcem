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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? `Editar ${entityName}` : `Adicionar ${entityName}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              {field.type !== 'switch' && (
                <Label htmlFor={field.key}>
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
                />
              ) : field.type === 'select' ? (
                <Select
                  value={
                    formData[field.key] !== null && formData[field.key] !== undefined
                      ? String(formData[field.key])
                      : ''
                  }
                  onValueChange={(v) =>
                    setFormData({ ...formData, [field.key]: v === '__none__' ? '' : v })
                  }
                >
                  <SelectTrigger id={field.key}>
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
                <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  <div>
                    <Label htmlFor={field.key} className="cursor-pointer">
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
                />
              )}
              {field.helperText && <p className="text-xs text-slate-500">{field.helperText}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
