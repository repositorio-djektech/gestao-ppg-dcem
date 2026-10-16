import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { KeepAlive } from '@/components/KeepAlive'

import { Layout } from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Docentes from '@/pages/Docentes'
import Discentes from '@/pages/Discentes'
import Egressos from '@/pages/Egressos'
import Bancas from '@/pages/Bancas'
import Orientacoes from '@/pages/Orientacoes'
import Disciplinas from '@/pages/Disciplinas'
import IniciacaoCientificaPage from '@/pages/IniciacaoCientifica'
import LinhasPesquisa from '@/pages/LinhasPesquisa'
import ProjetosPesquisa from '@/pages/ProjetosPesquisa'
import Publicacoes from '@/pages/Publicacoes'
import ProducaoTecnica from '@/pages/ProducaoTecnica'
import Patentes from '@/pages/Patentes'
import Eventos from '@/pages/Eventos'
import Mobilidade from '@/pages/Mobilidade'
import ImpactoSocial from '@/pages/ImpactoSocial'
import Premiacoes from '@/pages/Premiacoes'
import Lacunas from '@/pages/Lacunas'
import Reconducao from '@/pages/Reconducao'
import Indicadores from '@/pages/Indicadores'
import Usuarios from '@/pages/Usuarios'
import PrintView from '@/pages/PrintView'
import NotFound from '@/pages/NotFound'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'

/**
 * Route guard para tela de Usuários: apenas papéis 'suporte' e 'coordenador'.
 * Usuários com outros papéis (ou não autenticados) são redirecionados para a raiz.
 */
function UsuariosRouteGuard() {
  const { isSuporte, isCoordenador, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        Carregando permissões...
      </div>
    )
  }

  if (!isSuporte && !isCoordenador) {
    return <Navigate to="/" replace />
  }

  return <Usuarios />
}

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <KeepAlive />
          <Toaster />
          <Sonner position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/usuarios" element={<UsuariosRouteGuard />} />
              <Route path="/lacunas" element={<Lacunas />} />
              <Route path="/reconducao" element={<Reconducao />} />
              <Route path="/indicadores" element={<Indicadores />} />
              <Route path="/docentes" element={<Docentes />} />
              <Route path="/discentes" element={<Discentes />} />
              <Route path="/egressos" element={<Egressos />} />
              <Route path="/bancas" element={<Bancas />} />
              <Route path="/orientacoes" element={<Orientacoes />} />
              <Route path="/disciplinas" element={<Disciplinas />} />
              <Route path="/iniciacao-cientifica" element={<IniciacaoCientificaPage />} />
              <Route path="/linhas-pesquisa" element={<LinhasPesquisa />} />
              <Route path="/projetos-pesquisa" element={<ProjetosPesquisa />} />
              <Route path="/publicacoes" element={<Publicacoes />} />
              <Route path="/producao-tecnica" element={<ProducaoTecnica />} />
              <Route path="/patentes" element={<Patentes />} />
              <Route path="/eventos" element={<Eventos />} />
              <Route path="/mobilidade" element={<Mobilidade />} />
              <Route path="/impacto-social" element={<ImpactoSocial />} />
              <Route path="/premiacoes" element={<Premiacoes />} />
              <Route path="/imprimir/:modulo" element={<PrintView />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

if (typeof window !== 'undefined' && !(import.meta as any).env?.VITE_SUPABASE_URL) {
  throw new Error('MISSING_SUPABASE_URL: ' + JSON.stringify((import.meta as any).env))
}

export default App
