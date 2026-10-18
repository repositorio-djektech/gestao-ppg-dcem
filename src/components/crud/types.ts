import type { ReactNode } from 'react'

export interface ColumnDef<T> {
  key: keyof T
  label: string
  className?: string
  headerClassName?: string
  render?: (item: T) => ReactNode
  /** Define esta coluna como o título principal em destaque do card mobile (< 768px) */
  mobileTitle?: boolean
  /** Define esta coluna como subtítulo do card mobile (abaixo do título) */
  mobileSubtitle?: boolean
  /** Define esta coluna explicitamente entre os campos de apoio do card mobile */
  mobileSupport?: boolean
  /** Se true, a coluna não aparece no card mobile — exibida apenas na tabela desktop */
  desktopOnly?: boolean
}

// Objeto namespace/agrupador de tipos para compatibilidade com a menção de CrudPageTypes
export type CrudPageColumnDef<T> = ColumnDef<T>
export type CrudPageFieldDef = FieldDef

export const CrudPageTypes = {} as {
  ColumnDef: <T>() => ColumnDef<T>
  FieldDef: FieldDef
}

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'select' | 'switch' | 'date' | 'url' | 'email' | 'year'
  options?: { value: string; label: string }[]
  optionsLoader?: () => Promise<{ value: string; label: string }[]>
  required?: boolean
  placeholder?: string
  helperText?: string
  min?: number | string
  max?: number | string
  rows?: number
  onValueChangeWithFormData?: (
    value: any,
    currentFormData: Record<string, any>,
  ) => Record<string, any>
  customRender?: (props: {
    formData: Record<string, any>
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>
    submitting: boolean
  }) => React.ReactNode
}
