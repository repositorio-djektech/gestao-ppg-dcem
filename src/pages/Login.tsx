import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { usuariosService } from '@/services/usuarios'
import { formatarCpf } from '@/lib/utils'
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
import logoP2cem from '@/assets/logo-p2cem.png'
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt'

// Tela de Login e Cadastro do PPG DCEM

export default function Login() {
  const { signIn, reloadProfile } = useAuth()
  const navigate = useNavigate()
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permite apenas números (bloqueia letras e caracteres especiais no input)
    // e formata dinamicamente com máscara 000.000.000-00
    const apenasNumeros = e.target.value.replace(/\D/g, '').slice(0, 11)
    const mascarado = formatarCpf(apenasNumeros)
    setCpf(mascarado)
  }

  const handleUsuarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // Se o usuário estiver digitando CPF (contém apenas dígitos, pontos, traço e não contém @)
    const digitos = val.replace(/\D/g, '')
    const temArroba = val.includes('@')

    if (!temArroba && digitos.length > 0 && /^[0-9.\- ]*$/.test(val)) {
      if (digitos.length <= 11) {
        setUsuario(formatarCpf(digitos))
        return
      }
    }
    setUsuario(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      const cpfDigitos = cpf.replace(/\D/g, '')
      if (cpfDigitos.length !== 11) {
        setError('Por favor, informe um CPF completo com 11 dígitos.')
        return
      }

      if (password.length < 8) {
        setError('A senha deve conter no mínimo 8 caracteres.')
        return
      }

      if (password !== confirmPassword) {
        setError('As senhas não coincidem. Por favor, verifique e tente novamente.')
        return
      }
    }

    setLoading(true)
    if (mode === 'login') {
      const entrada = usuario.trim()
      let emailParaAutenticar = entrada

      const digitosEntrada = entrada.replace(/\D/g, '')
      const ehCpf = !entrada.includes('@') && digitosEntrada.length === 11

      if (ehCpf) {
        // Verificar no servidor se o CPF está vinculado a algum usuário
        try {
          const resCpf = await usuariosService.resolverEmailPorCpf(digitosEntrada)
          if (!resCpf.sucesso || !resCpf.email) {
            setError(
              resCpf.mensagem || 'Nenhum usuário cadastrado foi encontrado para o CPF informado.',
            )
            setLoading(false)
            return
          }
          emailParaAutenticar = resCpf.email
        } catch (err: any) {
          setError(err?.message || 'Nenhum usuário cadastrado foi encontrado para o CPF informado.')
          setLoading(false)
          return
        }
      }

      const { error: signInError } = await signIn(emailParaAutenticar, password)
      if (signInError) {
        setError(signInError.message || 'Credenciais inválidas')
        setLoading(false)
      } else {
        navigate('/')
      }
    } else {
      // Fluxo de criação de conta confrontando o CPF com a tabela docentes no servidor
      try {
        const resultado = await usuariosService.signupDocente(cpf, email, password)

        if (!resultado.sucesso) {
          setError(resultado.mensagem)
          setLoading(false)
          return
        }

        // Caso o CPF conste na tabela docentes:
        // Toast com o texto exato exigido:
        // "Bem-vindo(a), <nome_do_docente>! Sua conta criada com sucesso."
        const nomeDocente = resultado.docente_nome || 'Docente'
        toast.success(`Bem-vindo(a), ${nomeDocente}! Sua conta criada com sucesso.`)

        // Autentica o usuário recém-criado e redireciona para o dashboard
        const { data: signInData, error: signInError } = await signIn(email, password)
        if (signInError) {
          console.warn('Conta criada com sucesso, mas o auto-login falhou:', signInError)
          // Se o auto-login falhar, orienta a fazer o login com as credenciais criadas
          setMode('login')
          setPassword('')
          setConfirmPassword('')
          setLoading(false)
          return
        }

        // Garante que o profile atualizado (com papel docente e docente_id) seja recarregado
        if (signInData?.user) {
          await reloadProfile(signInData.user)
        }

        navigate('/')
      } catch (err: any) {
        const mensagem =
          err?.message || 'CPF não consta como registrado em nome de nenhum docente do PPG-DCEM.'
        setError(mensagem)
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
            <div className="flex items-center justify-center">
              <img
                src={logoP2cem}
                alt="P²CEM"
                className="h-14 max-w-[200px] shrink-0 object-contain drop-shadow-sm"
              />
            </div>

            <CardDescription className="text-xs text-muted-foreground text-center">
              {mode === 'login'
                ? 'Insira suas credenciais para continuar.'
                : 'Preencha os dados para se cadastrar.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={cpf}
                    onChange={handleCpfChange}
                    onKeyDown={(e) => {
                      // Bloqueia letras e caracteres não numéricos diretamente no teclado
                      // permitindo teclas de controle (Backspace, Tab, Delete, setas etc.)
                      const allowedKeys = [
                        'Backspace',
                        'Tab',
                        'ArrowLeft',
                        'ArrowRight',
                        'ArrowUp',
                        'ArrowDown',
                        'Delete',
                        'Enter',
                        'Home',
                        'End',
                      ]
                      if (
                        allowedKeys.includes(e.key) ||
                        e.ctrlKey ||
                        e.metaKey // atalhos Ctrl+C, Ctrl+V, etc.
                      ) {
                        return
                      }
                      if (!/^[0-9]$/.test(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    className="bg-white/95 border-slate-300/80 shadow-xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:shadow-sm transition-all"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Informe seu CPF para validação junto ao corpo docente do programa.
                  </p>
                </div>
              )}
              {mode === 'login' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="usuario">Usuário</Label>
                  <Input
                    id="usuario"
                    type="text"
                    autoComplete="username"
                    placeholder="E-mail ou CPF..."
                    value={usuario}
                    onChange={handleUsuarioChange}
                    className="bg-white/95 border-slate-300/80 shadow-xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:shadow-sm transition-all"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Insira um endereço de e-mail..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/95 border-slate-300/80 shadow-xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:shadow-sm transition-all"
                    required
                  />
                </div>
              )}
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
                    setCpf('')
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
                    setCpf('')
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
            <DialogTitle className="text-primary font-bold">Recuperar Senha</DialogTitle>
            <DialogDescription>
              Informe seu email para receber as instruções de recuperação.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="email"
            placeholder="Digite o e-mail cadastrado no sistema..."
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="bg-white border-slate-300/80 shadow-xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:shadow-sm transition-all"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetOpen(false)}
              className="bg-white hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button onClick={handleReset}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt PWA também disponível na tela de Login */}
      <PwaInstallPrompt />
    </div>
  )
}
