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
import ProjetosPesquisa from '@/pages/ProjetosPesquisa'
import Publicacoes from '@/pages/Publicacoes'
import ProducaoTecnica from '@/pages/ProducaoTecnica'
import Patentes from '@/pages/Patentes'
import Eventos from '@/pages/Eventos'
import Mobilidade from '@/pages/Mobilidade'
import ImpactoSocial from '@/pages/ImpactoSocial'
import Premiacoes from '@/pages/Premiacoes'
import NotFound from '@/pages/NotFound'

const App = () => (
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
            <Route path="/docentes" element={<Docentes />} />
            <Route path="/discentes" element={<Discentes />} />
            <Route path="/egressos" element={<Egressos />} />
            <Route path="/bancas" element={<Bancas />} />
            <Route path="/orientacoes" element={<Orientacoes />} />
            <Route path="/disciplinas" element={<Disciplinas />} />
            <Route path="/projetos-pesquisa" element={<ProjetosPesquisa />} />
            <Route path="/publicacoes" element={<Publicacoes />} />
            <Route path="/producao-tecnica" element={<ProducaoTecnica />} />
            <Route path="/patentes" element={<Patentes />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/mobilidade" element={<Mobilidade />} />
            <Route path="/impacto-social" element={<ImpactoSocial />} />
            <Route path="/premiacoes" element={<Premiacoes />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
