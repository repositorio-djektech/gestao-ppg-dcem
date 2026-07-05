import { supabase } from '@/lib/supabase/client'

export type CrudConfig = {
  table: string
  select?: string
  orderBy?: string
  ascending?: boolean
}

export function createCrudService<T extends { id: string }>(config: CrudConfig) {
  const { table, select = '*', orderBy = 'created_at', ascending = false } = config

  async function getAll(): Promise<{ data: T[] | null; error: any }> {
    const query = supabase.from(table).select(select)
    if (orderBy) query.order(orderBy, { ascending })
    return await query
  }

  async function getById(id: string): Promise<{ data: T | null; error: any }> {
    return await supabase.from(table).select(select).eq('id', id).single()
  }

  async function create(item: Partial<T>): Promise<{ data: T | null; error: any }> {
    return await supabase.from(table).insert(item).select().single()
  }

  async function update(id: string, item: Partial<T>): Promise<{ data: T | null; error: any }> {
    return await supabase.from(table).update(item).eq('id', id).select().single()
  }

  async function remove(id: string): Promise<{ error: any }> {
    return await supabase.from(table).delete().eq('id', id)
  }

  return { getAll, getById, create, update, remove }
}
