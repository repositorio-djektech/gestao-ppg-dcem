import { supabase } from '@/lib/supabase/client'

export interface CrudService<T extends { id: string }> {
  list(): Promise<T[]>
  create(item: Omit<T, 'id'>): Promise<T>
  update(id: string, item: Omit<T, 'id'>): Promise<T>
  remove(id: string): Promise<void>
}

export function createCrudService<T extends { id: string }>(
  tableName: string,
  orderColumn: string = 'created_at',
): CrudService<T> {
  return {
    async list(): Promise<T[]> {
      const { data, error } = await supabase.from(tableName).select('*').order(orderColumn)
      if (error) throw error
      return (data || []) as T[]
    },
    async create(item: Omit<T, 'id'>): Promise<T> {
      const { data, error } = await supabase.from(tableName).insert(item).select().single()
      if (error) throw error
      return data as T
    },
    async update(id: string, item: Omit<T, 'id'>): Promise<T> {
      const { data, error } = await supabase
        .from(tableName)
        .update(item)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as T
    },
    async remove(id: string): Promise<void> {
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw error
    },
  }
}
