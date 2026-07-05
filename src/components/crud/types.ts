import type { ReactNode } from 'react'

export interface ColumnDef<T> {
  key: keyof T
  label: string
  className?: string
  render?: (item: T) => ReactNode
}

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'select' | 'switch'
  options?: { value: string; label: string }[]
  optionsLoader?: () => Promise<{ value: string; label: string }[]>
  required?: boolean
  placeholder?: string
  helperText?: string
}
