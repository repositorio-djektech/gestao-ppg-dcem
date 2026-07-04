import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/client'
import { Users, BookOpen, Plane, Lightbulb } from 'lucide-react'

type PpgInfo = { nome: string; modalidade: string; nivel: string; uf: string }

export default function Dashboard() {
  const [counts, setCounts] = useState({ docentes: 0, publicacoes: 0, mobilidades: 0, patentes: 0 })
  const [ppg, setPpg] = useState<PpgInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('docentes').select('*', { count: 'exact', head: true }),
      supabase.from('publicacoes').select('*', { count: 'exact', head: true }),
      supabase.from('mobilidade_docente').select('*', { count: 'exact', head: true }),
      supabase.from('patentes').select('*', { count: 'exact', head: true }),
      supabase.from('ppg').select('*').limit(1).single(),
    ]).then(([d, p, m, pat, ppgRes]) => {
      setCounts({
        docentes: d.count ?? 0,
        publicacoes: p.count ?? 0,
        mobilidades: m.count ?? 0,
        patentes: pat.count ?? 0,
      })
      if (ppgRes.data) setPpg(ppgRes.data as PpgInfo)
      setLoading(false)
    })
  }, [])

  const metrics = [
    {
      title: 'Total Docentes',
      value: counts.docentes,
      icon: Users,
      description: 'Corpo docente permanente',
    },
    {
      title: 'Total Publicações',
      value: counts.publicacoes,
      icon: BookOpen,
      description: 'Quadriênio atual',
    },
    {
      title: 'Mobilidade Ativa',
      value: counts.mobilidades,
      icon: Plane,
      description: 'Discentes e docentes',
    },
    {
      title: 'Patentes/Softwares',
      value: counts.patentes,
      icon: Lightbulb,
      description: 'Propriedade intelectual',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Visão geral do Programa de Pós-Graduação (Quadriênio 2025-2028).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-slate-900">{metric.value}</div>
              )}
              <p className="text-xs text-slate-500 mt-1">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Informações do Programa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Nome do PPG', value: ppg?.nome ?? '—' },
            { label: 'Modalidade', value: ppg?.modalidade ?? '—' },
            { label: 'Nível', value: ppg?.nivel ?? '—' },
            { label: 'UF', value: ppg?.uf ?? '—' },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="text-base font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
