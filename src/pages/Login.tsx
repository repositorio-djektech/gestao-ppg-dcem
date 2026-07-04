import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { BookOpen, Info, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message || 'Credenciais inválidas')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-4 shadow-lg">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestão PPG Web</h1>
          <p className="text-slate-500 mt-2">Sistema de avaliação para Engenharias 2</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Acesso ao Sistema</CardTitle>
            <CardDescription>Insira suas credenciais para continuar.</CardDescription>
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
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-50"
                  required
                />
              </div>
              {error && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertDescription className="text-sm text-red-600">{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar no sistema'}
              </Button>
            </form>

            <Alert className="mt-6 bg-slate-50 border-slate-200">
              <Info className="h-4 w-4 text-slate-500" />
              <AlertDescription className="text-sm text-slate-600 mt-0.5 font-mono">
                <strong className="font-sans block mb-1">Credenciais de Teste:</strong>
                ppgdcem@djektech.com.br — Admin
                <br />
                editor@ppg.edu.br — Editor
                <br />
                viewer@ppg.edu.br — Viewer
                <br />
                <span className="font-sans">Senha: ppg@dcem</span>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
