import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/stores/useAuthStore'
import { DataProvider } from '@/stores/useDataStore'

import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Docentes from './pages/Docentes'
import Publicacoes from './pages/Publicacoes'
import Mobilidade from './pages/Mobilidade'
import Eventos from './pages/Eventos'
import Patentes from './pages/Patentes'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/docentes" element={<Docentes />} />
              <Route path="/publicacoes" element={<Publicacoes />} />
              <Route path="/mobilidade" element={<Mobilidade />} />
              <Route path="/eventos" element={<Eventos />} />
              <Route path="/patentes" element={<Patentes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
