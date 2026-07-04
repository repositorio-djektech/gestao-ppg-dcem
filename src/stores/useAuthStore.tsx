import React, { createContext, useContext, useState } from 'react'

export type Role = 'admin' | 'editor' | 'viewer'
export type User = { email: string; role: Role; name: string }

interface AuthContextType {
  user: User | null
  login: (email: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = (email: string) => {
    if (email.startsWith('admin')) setUser({ email, role: 'admin', name: 'Administrador' })
    else if (email.startsWith('editor')) setUser({ email, role: 'editor', name: 'Editor' })
    else setUser({ email, role: 'viewer', name: 'Visualizador' })
  }

  const logout = () => setUser(null)

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export default function useAuthStore() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuthStore must be used within AuthProvider')
  return context
}
