import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import useDataStore from '@/stores/useDataStore'
import { Users, BookOpen, Plane, Lightbulb } from 'lucide-react'

export default function Dashboard() {
  const { docentes, publicacoes, mobilidades, patentes } = useDataStore()

  const metrics = [
    {
      title: 'Total Docentes',
      value: docentes.length,
      icon: Users,
      description: 'Corpo docente permanente',
    },
    {
      title: 'Total Publicações',
      value: publicacoes.length,
      icon: BookOpen,
      description: 'Quadriênio atual',
    },
    {
      title: 'Mobilidade Ativa',
      value: mobilidades.length,
      icon: Plane,
      description: 'Discentes e docentes',
    },
    {
      title: 'Patentes/Softwares',
      value: patentes.length,
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
          <Card
            key={metric.title}
            className="border-0 shadow-subtle hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{metric.value}</div>
              <p className="text-xs text-slate-500 mt-1">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-subtle mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Informações do Programa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">Nome do PPG</p>
            <p className="text-base font-semibold text-slate-900">
              Engenharia de Sistemas e Processos
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">Modalidade</p>
            <p className="text-base font-semibold text-slate-900">Acadêmico</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">Nível</p>
            <p className="text-base font-semibold text-slate-900">Mestrado/Doutorado</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">UF</p>
            <p className="text-base font-semibold text-slate-900">SP</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
