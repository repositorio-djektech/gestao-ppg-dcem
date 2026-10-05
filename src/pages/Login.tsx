import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message || 'Credenciais inválidas')
        setLoading(false)
      } else {
        navigate('/')
      }
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message || 'Erro ao cadastrar')
        setLoading(false)
      } else {
        toast.success('Cadastro realizado! Verifique seu email.')
        setMode('login')
        setLoading(false)
      }
    }
  }

  const handleReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/`,
    })
    if (error) {
      toast.error('Erro ao enviar email de recuperação')
    } else {
      toast.success('Email de recuperação enviado!')
      setResetOpen(false)
      setResetEmail('')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(https://img.usecurling.com/p/1920/1080?q=university%20research%20laboratory)`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-900/75 to-primary/60" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 shadow-2xl backdrop-blur-sm">
            <span className="text-lg font-extrabold tracking-tight text-primary">DCEM</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">
            Gestão PPG Web
          </h1>
          <p className="mt-2 text-slate-200">Sistema de avaliação para Engenharias 2</p>
        </div>

        <Card className="border-0 shadow-2xl backdrop-blur-md bg-white/95">
          <CardHeader>
            <CardTitle className="text-xl">
              {mode === 'login' ? 'Entrar no Sistema' : 'Criar Conta'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Insira suas credenciais para continuar.'
                : 'Preencha os dados para se cadastrar.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@ppg.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-50 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-sm text-red-600">{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="h-11 w-full text-base font-medium"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : mode === 'login' ? (
                  'Entrar no sistema'
                ) : (
                  'Cadastrar'
                )}
              </Button>
            </form>

            {mode === 'login' && (
              <div className="mt-4 flex flex-col gap-2 text-center">
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="text-sm text-primary transition-colors hover:underline"
                >
                  Esqueceu a senha?
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-sm text-slate-600 transition-colors hover:text-primary"
                >
                  Não tem conta? Cadastre-se
                </button>
              </div>
            )}
            {mode === 'register' && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sm text-slate-600 transition-colors hover:text-primary"
                >
                  Já tem conta? Entrar
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Informe seu email para receber as instruções de recuperação.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="email"
            placeholder="seu@email.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReset}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
