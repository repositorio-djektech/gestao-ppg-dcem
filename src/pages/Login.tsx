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
import backImgSignin from '@/assets/back-img-signin-cc601.webp'
import dcemLogo from '@/assets/dcem-logo-trans-3d28d.webp'

// Tela de Login e Cadastro do PPG DCEM

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('As senhas não coincidem. Por favor, verifique e tente novamente.')
        return
      }
    }

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
      const { error } = await signUp(email, password, name.trim())
      if (error) {
        setError(error.message || 'Erro ao cadastrar')
        setLoading(false)
      } else {
        toast.success('Cadastro realizado! Verifique seu email.')
        setMode('login')
        setName('')
        setPassword('')
        setConfirmPassword('')
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
          backgroundImage: `url(${backImgSignin})`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-900/50 to-primary/40" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <Card className="border-0 shadow-2xl backdrop-blur-md bg-slate-200/95">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-center gap-3.5">
              <img
                src={dcemLogo}
                alt="Logo DCEM"
                className="h-14 w-14 shrink-0 object-contain drop-shadow-sm"
              />
              <div className="flex flex-col text-left">
                <CardTitle className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                  Gestão PPG-DCEM
                </CardTitle>
                <p className="text-xs text-muted-foreground font-medium leading-snug mt-0.5">
                  Sistema de Avaliação para Engenharias
                </p>
              </div>
            </div>

            <CardDescription className="text-xs text-muted-foreground text-left">
              {mode === 'login'
                ? 'Insira suas credenciais para continuar.'
                : 'Preencha os dados para se cadastrar.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Digite seu nome completo..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/95 border-slate-300/80 shadow-xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:shadow-sm transition-all"
                    required
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={
                    mode === 'login'
                      ? 'Digite seu e-mail acadêmico...'
                      : 'Digite seu email acadêmico...'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/95 border-slate-300/80 shadow-xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:shadow-sm transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'login' ? 'Digite sua senha...' : '••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/95 border-slate-300/80 shadow-xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:shadow-sm transition-all pr-10"
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
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-white/95 border-slate-300/80 shadow-xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:shadow-sm transition-all pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700"
                      aria-label={
                        showConfirmPassword
                          ? 'Ocultar confirmação de senha'
                          : 'Mostrar confirmação de senha'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <Alert className="border-red-200 bg-red-50 py-2">
                  <AlertDescription className="text-sm text-red-600">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="h-10 w-full text-sm font-medium" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === 'login' ? (
                  'Entrar'
                ) : (
                  'Cadastrar'
                )}
              </Button>
            </form>

            {mode === 'login' && (
              <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="text-xs text-primary transition-colors hover:underline focus:outline-none"
                >
                  Esqueceu a senha?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setMode('register')
                  }}
                  className="text-xs text-slate-600 transition-colors hover:text-primary hover:underline focus:outline-none"
                >
                  Não tem conta? Cadastre-se.
                </button>
              </div>
            )}
            {mode === 'register' && (
              <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setMode('login')
                  }}
                  className="text-xs text-slate-600 transition-colors hover:text-primary hover:underline focus:outline-none"
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
            placeholder="Digite o e-mail cadastrado no sistema..."
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="border-slate-300/80 shadow-xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:shadow-sm transition-all"
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
