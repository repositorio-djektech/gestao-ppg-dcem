import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { Profile, Role, AnyRole } from '@/types/database'

/**
 * Normaliza qualquer valor de papel (incluindo papéis legados da transição)
 * para um dos 5 papéis oficiais: suporte, coordenador, auxiliar, docente, capes.
 */
export function normalizarPapel(role: AnyRole | string | null | undefined): Role {
  if (!role) return 'capes'
  const r = String(role).toLowerCase().trim()
  if (r === 'suporte') return 'suporte'
  if (r === 'coordenador') return 'coordenador'
  if (r === 'auxiliar') return 'auxiliar'
  if (r === 'docente') return 'docente'
  if (r === 'capes') return 'capes'

  // Mapeamento de legado:
  if (r === 'admin') return 'suporte'
  if (r === 'editor') return 'auxiliar'
  if (r === 'viewer') return 'capes'

  return 'capes'
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  role: Role | null
  isSuporte: boolean
  isCoordenador: boolean
  isAuxiliar: boolean
  isDocente: boolean
  isCapes: boolean
  isStaff: boolean
  podeEditarGlobal: boolean
  podeExcluirGlobal: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            const rawProfile = data as any
            const roleNormalizado = normalizarPapel(rawProfile.role)
            setProfile({
              ...rawProfile,
              role: roleNormalizado,
            } as Profile)
          }
        })
    } else {
      setProfile(null)
    }
  }, [user])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: name ? { name } : undefined,
      },
    })
    return { error }
  }

  const signOut = async () => {
    setProfile(null)
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const role = useMemo<Role | null>(() => {
    return profile?.role ? normalizarPapel(profile.role) : null
  }, [profile?.role])

  const isSuporte = role === 'suporte'
  const isCoordenador = role === 'coordenador'
  const isAuxiliar = role === 'auxiliar'
  const isDocente = role === 'docente'
  const isCapes = role === 'capes'
  const isStaff = isSuporte || isCoordenador || isAuxiliar
  const podeEditarGlobal = isStaff
  const podeExcluirGlobal = isSuporte || isCoordenador

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isSuporte,
        isCoordenador,
        isAuxiliar,
        isDocente,
        isCapes,
        isStaff,
        podeEditarGlobal,
        podeExcluirGlobal,
        signIn,
        signUp,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
