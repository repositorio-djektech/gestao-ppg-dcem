import { useState } from 'react'
import useAuthStore from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { BookOpen, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Login() {
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) login(email)
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

        <Card className="border-0 shadow-elevation">
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
              <Button type="submit" className="w-full h-11 text-base font-medium">
                Entrar no sistema
              </Button>
            </form>

            <Alert className="mt-6 bg-slate-50 border-slate-200">
              <Info className="h-4 w-4 text-slate-500" />
              <AlertDescription className="text-sm text-slate-600 mt-0.5 font-mono">
                <strong className="font-sans block mb-1">Credenciais de Teste:</strong>
                admin@ppg.edu
                <br />
                editor@ppg.edu
                <br />
                viewer@ppg.edu
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
