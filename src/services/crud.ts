import { supabase } from '@/lib/supabase/client'

export type CrudConfig = {
  table: string
  select?: string
  orderBy?: string
  ascending?: boolean
}

export interface CrudService<T> {
  list: () => Promise<T[]>
  getById: (id: string) => Promise<T | null>
  create: (item: Partial<T>) => Promise<T>
  update: (id: string, item: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
}

export function createCrudService<T extends { id: string }>(config: CrudConfig): CrudService<T> {
  const { table, select = '*', orderBy = 'created_at', ascending = false } = config

  async function list(): Promise<T[]> {
    const query = supabase.from(table).select(select)
    if (orderBy) query.order(orderBy, { ascending })
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as T[]
  }

  async function getById(id: string): Promise<T | null> {
    const { data, error } = await supabase.from(table).select(select).eq('id', id).single()
    if (error) throw error
    return data as T
  }

  async function create(item: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).insert(item).select().single()
    if (error) throw error
    return data as T
  }

  async function update(id: string, item: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).update(item).eq('id', id).select().single()
    if (error) throw error
    return data as T
  }

  async function remove(id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
  }

  return { list, getById, create, update, remove }
}
