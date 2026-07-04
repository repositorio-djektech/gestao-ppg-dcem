import { useState, useEffect, useCallback } from 'react'
import type { CrudService } from '@/services/crud'

export function useCrudData<T extends { id: string }>(service: CrudService<T>) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    service
      .list()
      .then((result) => {
        if (mounted) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [service])

  const create = useCallback(
    async (item: Omit<T, 'id'>) => {
      await service.create(item)
      setData(await service.list())
    },
    [service],
  )

  const update = useCallback(
    async (id: string, item: Omit<T, 'id'>) => {
      await service.update(id, item)
      setData(await service.list())
    },
    [service],
  )

  const remove = useCallback(
    async (id: string) => {
      await service.remove(id)
      setData(await service.list())
    },
    [service],
  )

  return { data, loading, create, update, remove }
}
