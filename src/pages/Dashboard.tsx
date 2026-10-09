import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { ImportarLattesDialog } from '@/components/lattes/ImportarLattesDialog'
import type { ResultadoProcessamentoLattes } from '@/lib/lattes/processor'
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
  FileUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ModuleConfig = {
  name: string
  table: string
  route: string
  icon: LucideIcon
  target: number
}

type CategoryTheme = {
  border: string
  hoverBorder: string
  badge: string
  accentBar: string
  progressBar: string
  iconColor: string
  bgSoft: string
}

type CategoryConfig = {
  label: string
  theme: CategoryTheme
  modules: ModuleConfig[]
}

const categories: CategoryConfig[] = [
  {
    label: 'Pessoas',
    theme: {
      border: 'border-blue-200',
      hoverBorder: 'hover:border-blue-400',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      accentBar: 'bg-blue-500',
      progressBar: 'bg-blue-500',
      iconColor: 'text-blue-500 group-hover:text-blue-600',
      bgSoft: 'bg-blue-50/40',
    },
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
    theme: {
      border: 'border-emerald-200',
      hoverBorder: 'hover:border-emerald-400',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      accentBar: 'bg-emerald-500',
      progressBar: 'bg-emerald-500',
      iconColor: 'text-emerald-500 group-hover:text-emerald-600',
      bgSoft: 'bg-emerald-50/40',
    },
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
    theme: {
      border: 'border-amber-200',
      hoverBorder: 'hover:border-amber-400',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      accentBar: 'bg-amber-500',
      progressBar: 'bg-amber-500',
      iconColor: 'text-amber-500 group-hover:text-amber-600',
      bgSoft: 'bg-amber-50/40',
    },
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
    theme: {
      border: 'border-purple-200',
      hoverBorder: 'hover:border-purple-400',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      accentBar: 'bg-purple-500',
      progressBar: 'bg-purple-500',
      iconColor: 'text-purple-500 group-hover:text-purple-600',
      bgSoft: 'bg-purple-50/40',
    },
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
  const { toast } = useToast()
  const [counts, setCounts] = useState<CountMap>({})
  const [loading, setLoading] = useState(true)
  const [lattesDialogOpen, setLattesDialogOpen] = useState(false)
  const [_dadosLattesProcessados, setDadosLattesProcessados] =
    useState<ResultadoProcessamentoLattes | null>(null)

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
      theme: cat.theme,
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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={fetchCounts}
            className="inline-flex items-center gap-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
          >
            <TrendingUp className="h-4 w-4 text-primary" />
            Atualizar
          </Button>

          <Button
            type="button"
            onClick={() => setLattesDialogOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <FileUp className="h-4 w-4" />
            Importar Lattes
          </Button>
        </div>
      </div>

      <ImportarLattesDialog
        open={lattesDialogOpen}
        onOpenChange={setLattesDialogOpen}
        onProcessado={(res) => {
          setDadosLattesProcessados(res)
        }}
        onGravacaoSucesso={(relatorio) => {
          // Atualiza os contadores do Dashboard refletindo os novos dados gravados
          fetchCounts()
          const totalInseridos = relatorio.docentes.inseridos + relatorio.publicacoes.inseridos
          const totalAtualizados =
            relatorio.docentes.atualizados + relatorio.publicacoes.atualizados

          toast({
            title: 'Gravação concluída com sucesso!',
            description: `Docentes: ${relatorio.docentes.inseridos} inseridos, ${relatorio.docentes.atualizados} atualizados. Publicações: ${relatorio.publicacoes.inseridos} inseridas, ${relatorio.publicacoes.atualizados} atualizadas. (Total: ${totalInseridos + totalAtualizados} registros afetados)`,
          })
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-primary/20 shadow-md hover:shadow-lg transition-all duration-200 bg-primary text-primary-foreground lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/90">
              Total de Registros
            </CardTitle>
            <Database className="h-5 w-5 text-primary-foreground/75" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-24 bg-primary-foreground/20" />
            ) : (
              <div className="text-4xl font-bold">{totalRecords}</div>
            )}
            <p className="text-xs text-primary-foreground/80 mt-2">
              Meta: {overallTarget} registros · {overallPercent}% concluído
            </p>
            <Progress
              value={overallPercent}
              className="mt-3 h-2 bg-primary-foreground/25"
              indicatorClassName="bg-primary-foreground"
            />
          </CardContent>
        </Card>

        {categoryStats.map((cat) => (
          <Card
            key={cat.label}
            className={`border ${cat.theme.border} shadow-md hover:shadow-lg transition-all duration-200 bg-white`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">{cat.label}</CardTitle>
              <Badge variant="outline" className={`text-xs font-semibold ${cat.theme.badge}`}>
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
              <Progress
                value={cat.percent}
                className="mt-3 h-2 bg-slate-100"
                indicatorClassName={cat.theme.progressBar}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.map((cat) => {
        const catStat = categoryStats.find((c) => c.label === cat.label)
        return (
          <div key={cat.label} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-4 w-1.5 rounded-full ${cat.theme.accentBar}`} />
                <h2 className="text-lg font-semibold text-slate-900">{cat.label}</h2>
              </div>
              <span className="text-sm text-slate-500 font-medium">
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
                    <Card
                      className={`border ${cat.theme.border} ${cat.theme.hoverBorder} shadow-sm hover:shadow-md transition-all duration-200 h-full bg-white`}
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-700">
                          {mod.name}
                        </CardTitle>
                        <mod.icon className={`h-4 w-4 ${cat.theme.iconColor} transition-colors`} />
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
                        <Progress
                          value={percent}
                          className="mt-2 h-1.5 bg-slate-100"
                          indicatorClassName={cat.theme.progressBar}
                        />
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
