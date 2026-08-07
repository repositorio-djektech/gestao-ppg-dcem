import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

const KEEP_ALIVE_INTERVAL_MS = 6 * 60 * 60 * 1000

const pingSupabase = async () => {
  try {
    await supabase.from('profiles').select('id').limit(1).maybeSingle()
  } catch {
    // Silently ignore — keep-alive must never disrupt the user
  }
}

export function useKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    pingSupabase()

    intervalRef.current = setInterval(() => {
      pingSupabase()
    }, KEEP_ALIVE_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
}
