import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import {
  Users,
  GraduationCap,
  UserCheck,
  ClipboardList,
  Users2,
  Library,
  FlaskConical,
  FileText,
  Wrench,
  Lightbulb,
  Calendar,
  Plane,
  HeartHandshake,
  Award,
  Database,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ModuleConfig = {
  name: string
  table: string
  route: string
  icon: LucideIcon
  target: number
}

type CategoryConfig = {
  label: string
  modules: ModuleConfig[]
}

const categories: CategoryConfig[] = [
  {
    label: 'Pessoas',
    modules: [
      { name: 'Docentes', table: 'docentes', route: '/docentes', icon: Users, target: 20 },
      {
        name: 'Discentes',
        table: 'discentes',
        route: '/discentes',
        icon: GraduationCap,
        target: 50,
      },
      { name: 'Egressos', table: 'egressos', route: '/egressos', icon: UserCheck, target: 50 },
    ],
  },
  {
    label: 'Acadêmico',
    modules: [
      { name: 'Bancas', table: 'bancas', route: '/bancas', icon: ClipboardList, target: 30 },
      {
        name: 'Orientações',
        table: 'orientacoes',
        route: '/orientacoes',
        icon: Users2,
        target: 50,
      },
      {
        name: 'Disciplinas',
        table: 'disciplinas',
        route: '/disciplinas',
        icon: Library,
        target: 20,
      },
      {
        name: 'Projetos de Pesquisa',
        table: 'projetos_pesquisa',
        route: '/projetos-pesquisa',
        icon: FlaskConical,
        target: 15,
      },
    ],
  },
  {
    label: 'Produção',
    modules: [
      {
        name: 'Publicações',
        table: 'publicacoes',
        route: '/publicacoes',
        icon: FileText,
        target: 100,
      },
      {
        name: 'Produção Técnica',
        table: 'producao_tecnica',
        route: '/producao-tecnica',
        icon: Wrench,
        target: 20,
      },
      { name: 'Patentes', table: 'patentes', route: '/patentes', icon: Lightbulb, target: 10 },
    ],
  },
  {
    label: 'Difusão/Outros',
    modules: [
      { name: 'Eventos', table: 'eventos', route: '/eventos', icon: Calendar, target: 50 },
      {
        name: 'Mobilidade',
        table: 'mobilidade_docente',
        route: '/mobilidade',
        icon: Plane,
        target: 30,
      },
      {
        name: 'Impacto Social',
        table: 'impacto_social',
        route: '/impacto-social',
        icon: HeartHandshake,
        target: 20,
      },
      { name: 'Premiações', table: 'premiacoes', route: '/premiacoes', icon: Award, target: 20 },
    ],
  },
]

const allModules = categories.flatMap((c) => c.modules)

type CountMap = Record<string, number>

export default function Dashboard() {
  const [counts, setCounts] = useState<CountMap>({})
  const [loading, setLoading] = useState(true)

  const fetchCounts = useCallback(async () => {
    setLoading(true)
    const results = await Promise.all(
      allModules.map((m) =>
        (supabase.from as any)(m.table).select('*', { count: 'exact', head: true }),
      ),
    )
    const map: CountMap = {}
    results.forEach((res, i) => {
      map[allModules[i].table] = res.count ?? 0
    })
    setCounts(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  const totalRecords = allModules.reduce((sum, m) => sum + (counts[m.table] ?? 0), 0)

  const categoryStats = categories.map((cat) => {
    const subtotal = cat.modules.reduce((s, m) => s + (counts[m.table] ?? 0), 0)
    const target = cat.modules.reduce((s, m) => s + m.target, 0)
    return {
      label: cat.label,
      subtotal,
      target,
      percent: target > 0 ? Math.round((subtotal / target) * 100) : 0,
    }
  })

  const overallTarget = allModules.reduce((s, m) => s + m.target, 0)
  const overallPercent = overallTarget > 0 ? Math.round((totalRecords / overallTarget) * 100) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Visão geral do preenchimento dos módulos CAPES (Quadriênio 2025-2028).
          </p>
        </div>
        <button
          onClick={fetchCounts}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <TrendingUp className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0 shadow-sm bg-primary text-primary-foreground lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">
              Total de Registros
            </CardTitle>
            <Database className="h-5 w-5 text-primary-foreground/60" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-24 bg-primary-foreground/20" />
            ) : (
              <div className="text-4xl font-bold">{totalRecords}</div>
            )}
            <p className="text-xs text-primary-foreground/70 mt-2">
              Meta: {overallTarget} registros · {overallPercent}% concluído
            </p>
            <Progress value={overallPercent} className="mt-3 h-2 bg-primary-foreground/20" />
          </CardContent>
        </Card>

        {categoryStats.map((cat) => (
          <Card key={cat.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{cat.label}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {cat.percent}%
              </Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-slate-900">{cat.subtotal}</div>
              )}
              <p className="text-xs text-slate-500 mt-1">Meta: {cat.target} registros</p>
              <Progress value={cat.percent} className="mt-3 h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.map((cat) => {
        const catStat = categoryStats.find((c) => c.label === cat.label)
        return (
          <div key={cat.label} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{cat.label}</h2>
              <span className="text-sm text-slate-500">
                {catStat?.subtotal ?? 0} / {catStat?.target ?? 0} registros
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cat.modules.map((mod) => {
                const count = counts[mod.table] ?? 0
                const percent =
                  mod.target > 0 ? Math.min(Math.round((count / mod.target) * 100), 100) : 0
                return (
                  <Link key={mod.table} to={mod.route} className="block group">
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-primary/30 h-full">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          {mod.name}
                        </CardTitle>
                        <mod.icon className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <div className="text-2xl font-bold text-slate-900">{count}</div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-slate-500">Meta: {mod.target}</p>
                          <span className="text-xs font-medium text-slate-600">{percent}%</span>
                        </div>
                        <Progress value={percent} className="mt-2 h-1.5" />
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
