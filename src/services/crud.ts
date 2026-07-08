import { supabase } from '@/lib/supabase/client'

export type CrudConfig = {
  table: string
  select?: string
  orderBy?: string
  ascending?: boolean
}

export interface CrudService<T> {
  list: () => Promise<T[]>
  getById: (id: number | string) => Promise<T | null>
  create: (item: Partial<T>) => Promise<T>
  update: (id: number | string, item: Partial<T>) => Promise<T>
  remove: (id: number | string) => Promise<void>
}

export function createCrudService<T extends { id: number | string }>(
  config: CrudConfig,
): CrudService<T> {
  const { table, select = '*', orderBy = 'created_at', ascending = false } = config

  async function list(): Promise<T[]> {
    const query = supabase.from(table).select(select)
    if (orderBy) query.order(orderBy, { ascending })
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as T[]
  }

  async function getById(id: number | string): Promise<T | null> {
    const { data, error } = await supabase.from(table).select(select).eq('id', id).single()
    if (error) throw error
    return data as T
  }

  async function create(item: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).insert(item).select().single()
    if (error) throw error
    return data as T
  }

  async function update(id: number | string, item: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).update(item).eq('id', id).select().single()
    if (error) throw error
    return data as T
  }

  async function remove(id: number | string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
  }

  return { list, getById, create, update, remove }
}
