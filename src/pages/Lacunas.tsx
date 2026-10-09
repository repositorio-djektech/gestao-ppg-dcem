import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Users,
  GraduationCap,
  FileText,
  Share2,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { obterRelatorioLacunas } from '@/services/lacunas'
import type { RelatorioLacunasResposta, ResumoRegraLacuna } from '@/lib/lacunas/types'

export type GrupoVisualId = 'pessoas' | 'academico' | 'producao' | 'difusao'

export interface GrupoVisualTheme {
  border: string
  hoverBorder: string
  badge: string
  accentBar: string
  iconColor: string
  bgSoft: string
}

export interface GrupoVisualConfig {
  id: GrupoVisualId
  label: string
  subtitulo: string
  icon: LucideIcon
  theme: GrupoVisualTheme
}

export const GRUPOS_VISUAIS: GrupoVisualConfig[] = [
  {
    id: 'pessoas',
    label: 'Pessoas',
    subtitulo: 'Docentes, Discentes e Egressos',
    icon: Users,
    theme: {
      border: 'border-blue-200',
      hoverBorder: 'hover:border-blue-400',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      accentBar: 'bg-blue-500',
      iconColor: 'text-blue-500',
      bgSoft: 'bg-blue-50/40',
    },
  },
  {
    id: 'academico',
    label: 'Acadêmico',
    subtitulo: 'Bancas, Orientações, Disciplinas e Projetos',
    icon: GraduationCap,
    theme: {
      border: 'border-emerald-200',
      hoverBorder: 'hover:border-emerald-400',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      accentBar: 'bg-emerald-500',
      iconColor: 'text-emerald-500',
      bgSoft: 'bg-emerald-50/40',
    },
  },
  {
    id: 'producao',
    label: 'Produção',
    subtitulo: 'Publicações, Produção Técnica e Patentes',
    icon: FileText,
    theme: {
      border: 'border-amber-200',
      hoverBorder: 'hover:border-amber-400',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      accentBar: 'bg-amber-500',
      iconColor: 'text-amber-500',
      bgSoft: 'bg-amber-50/40',
    },
  },
  {
    id: 'difusao',
    label: 'Difusão/Outros',
    subtitulo: 'Eventos, Mobilidade, Impacto Social e Prêmios',
    icon: Share2,
    theme: {
      border: 'border-purple-200',
      hoverBorder: 'hover:border-purple-400',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      accentBar: 'bg-purple-500',
      iconColor: 'text-purple-500',
      bgSoft: 'bg-purple-50/40',
    },
  },
]

/**
 * Mapeia o nome do grupo da regra (ou tabela) para um dos 4 grupos visuais do Dashboard.
 */
export function mapearGrupoParaVisual(grupoOuTabela: string): GrupoVisualId {
  const norm = grupoOuTabela.toLowerCase()

  // Pessoas (Docentes e Discentes)
  if (
    norm.includes('pessoa') ||
    norm.includes('docente') ||
    norm.includes('discente') ||
    norm.includes('egresso') ||
    norm.includes('identificadores e métricas') ||
    norm.includes('fomento e bolsas') ||
    norm.includes('identificação cadastral') ||
    norm.includes('situação acadêmica')
  ) {
    return 'pessoas'
  }

  // Acadêmico
  if (
    norm.includes('acadêm') ||
    norm.includes('academ') ||
    norm.includes('banca') ||
    norm.includes('orienta') ||
    norm.includes('disciplina') ||
    norm.includes('projeto')
  ) {
    return 'academico'
  }

  // Produção
  if (
    norm.includes('produç') ||
    norm.includes('produc') ||
    norm.includes('publica') ||
    norm.includes('patente')
  ) {
    return 'producao'
  }

  // Difusão / Outros
  if (
    norm.includes('difus') ||
    norm.includes('evento') ||
    norm.includes('mobili') ||
    norm.includes('impacto') ||
    norm.includes('prem')
  ) {
    return 'difusao'
  }

  return 'pessoas'
}

export interface GrupoEstatisticas {
  grupoConfig: GrupoVisualConfig
  regras: ResumoRegraLacuna[]
  totalCriticas: number
  totalAtencao: number
  totalLacunas: number
}

interface LacunasProps {
  /** Injeção de loader para testes unitários */
  carregarDadosFn?: () => ReturnType<typeof obterRelatorioLacunas>
}

export default function Lacunas({ carregarDadosFn }: LacunasProps = {}) {
  const [relatorio, setRelatorio] = useState<RelatorioLacunasResposta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [origem, setOrigem] = useState<'edge_function' | 'local_fallback' | null>(null)

  const carregarRelatorio = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const loader = carregarDadosFn ?? obterRelatorioLacunas
      const res = await loader()
      if (res.sucesso && res.dados) {
        setRelatorio(res.dados)
        setOrigem(res.origem ?? null)
      } else {
        setErro(res.mensagemErro || 'Não foi possível carregar o relatório de lacunas.')
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado ao consultar lacunas.')
    } finally {
      setCarregando(false)
    }
  }, [carregarDadosFn])

  useEffect(() => {
    carregarRelatorio()
  }, [carregarRelatorio])

  const { dadosPorGrupo, totalGeralCriticas, totalGeralAtencao, totalGeralLacunas } =
    useMemo(() => {
      const mapa = new Map<GrupoVisualId, ResumoRegraLacuna[]>()
      for (const g of GRUPOS_VISUAIS) {
        mapa.set(g.id, [])
      }

      if (relatorio?.resumo) {
        for (const item of relatorio.resumo) {
          const visualId = mapearGrupoParaVisual(item.grupo || item.tabela)
          const lista = mapa.get(visualId) || []
          lista.push(item)
          mapa.set(visualId, lista)
        }
      }

      let criticasTotal = 0
      let atencaoTotal = 0
      let lacunasTotal = 0

      const grupos: GrupoEstatisticas[] = GRUPOS_VISUAIS.map((grupoConfig) => {
        const regras = mapa.get(grupoConfig.id) || []
        let criticas = 0
        let atencao = 0
        let total = 0

        for (const r of regras) {
          const qtd = r.total_lacunas ?? 0
          total += qtd
          if (r.severidade === 'critica') {
            criticas += qtd
          } else {
            atencao += qtd
          }
        }

        criticasTotal += criticas
        atencaoTotal += atencao
        lacunasTotal += total

        return {
          grupoConfig,
          regras,
          totalCriticas: criticas,
          totalAtencao: atencao,
          totalLacunas: total,
        }
      })

      return {
        dadosPorGrupo: grupos,
        totalGeralCriticas: criticasTotal,
        totalGeralAtencao: atencaoTotal,
        totalGeralLacunas: lacunasTotal,
      }
    }, [relatorio])

  const dataFormatada = useMemo(() => {
    if (!relatorio?.gerado_em) return null
    try {
      const d = new Date(relatorio.gerado_em)
      if (isNaN(d.getTime())) return relatorio.gerado_em
      return d.toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
      })
    } catch {
      return relatorio.gerado_em
    }
  }, [relatorio?.gerado_em])

  return (
    <div className="space-y-6 animate-fade-in" data-testid="pagina-lacunas">
      {/* Topo da página: título, descrição e ações */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Relatório de Lacunas
            </h1>
          </div>
          <p className="text-slate-500 mt-1 max-w-3xl text-sm leading-relaxed">
            Diagnóstico de campos e identificadores faltantes no cadastro do PPG-DCEM (Quadriênio
            2025-2028). Acompanhe pendências críticas e pontos de atenção para manter a base de
            dados completa e pronta para avaliação da CAPES.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dataFormatada && (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-md"
              title="Momento da última consolidação dos dados"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Atualizado em: {dataFormatada}
              {origem === 'local_fallback' && (
                <span className="text-[10px] text-amber-700 font-medium ml-1">(banco direto)</span>
              )}
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={carregarRelatorio}
            disabled={carregando}
            className="inline-flex items-center gap-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
          >
            <RefreshCw className={`h-4 w-4 text-primary ${carregando ? 'animate-spin' : ''}`} />
            {carregando ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* Alerta de erro com botão Tentar novamente */}
      {erro && (
        <Alert variant="destructive" className="border-red-300 bg-red-50 text-red-900">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div>
              <AlertTitle className="font-semibold text-red-800">
                Falha ao carregar o relatório de lacunas
              </AlertTitle>
              <AlertDescription className="text-xs text-red-700 mt-0.5">{erro}</AlertDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={carregarRelatorio}
              className="border-red-300 bg-white hover:bg-red-100 text-red-800 shrink-0 self-start sm:self-auto"
            >
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {/* Cards de métricas gerais no topo */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Geral de Lacunas */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Total de Lacunas</CardTitle>
            <Layers className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">{totalGeralLacunas}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Campos com preenchimento ausente ou pendente
            </p>
          </CardContent>
        </Card>

        {/* Lacunas Críticas */}
        <Card className="border border-red-200 shadow-sm bg-red-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Lacunas Críticas</CardTitle>
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-9 w-20 bg-red-100" />
            ) : (
              <div className="text-3xl font-bold text-red-600">{totalGeralCriticas}</div>
            )}
            <p className="text-xs text-red-700 mt-1">
              Exigem preenchimento prioritário (ex.: Scopus ID, Lattes, CPF)
            </p>
          </CardContent>
        </Card>

        {/* Lacunas de Atenção */}
        <Card className="border border-amber-200 shadow-sm bg-amber-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">Pontos de Atenção</CardTitle>
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-9 w-20 bg-amber-100" />
            ) : (
              <div className="text-3xl font-bold text-amber-600">{totalGeralAtencao}</div>
            )}
            <p className="text-xs text-amber-700 mt-1">
              Dados recomendados para enriquecimento e métricas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards-resumo por grupo de informação (os 4 grupos do Dashboard) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Resumo por Grupo de Informação</h2>
          <span className="text-xs text-slate-500">
            {GRUPOS_VISUAIS.length} grupos mapeados · 4 áreas temáticas
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {dadosPorGrupo.map((grupo) => {
            const { grupoConfig, regras, totalCriticas, totalAtencao, totalLacunas } = grupo
            const { theme } = grupoConfig
            const Icon = grupoConfig.icon
            const semLacunas = totalLacunas === 0

            return (
              <Card
                key={grupoConfig.id}
                data-testid={`card-grupo-${grupoConfig.id}`}
                className={`border ${theme.border} ${theme.hoverBorder} shadow-sm hover:shadow-md transition-all duration-200 bg-white flex flex-col justify-between`}
              >
                <div>
                  {/* Cabeçalho do Card */}
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-lg ${theme.bgSoft} border ${theme.border} shrink-0`}
                        >
                          <Icon className={`h-5 w-5 ${theme.iconColor}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold text-slate-900">
                              {grupoConfig.label}
                            </CardTitle>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{grupoConfig.subtitulo}</p>
                        </div>
                      </div>

                      {/* Badges de severidade no topo do card */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {carregando ? (
                          <Skeleton className="h-5 w-16" />
                        ) : semLacunas ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />0 pendências
                          </Badge>
                        ) : (
                          <>
                            {totalCriticas > 0 && (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 border-red-200 text-xs font-semibold flex items-center gap-1"
                                title={`${totalCriticas} lacunas críticas`}
                              >
                                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                                {totalCriticas} crítica{totalCriticas > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {totalAtencao > 0 && (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold flex items-center gap-1"
                                title={`${totalAtencao} lacunas de atenção`}
                              >
                                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                                {totalAtencao} atenção
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Conteúdo com a lista de regras do grupo */}
                  <CardContent className="pt-4 space-y-3">
                    {carregando ? (
                      <div className="space-y-2.5">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : regras.length === 0 ? (
                      /* Estado para grupos que ainda não possuem regras cadastradas no backend */
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
                        <p className="text-sm font-medium text-slate-700">Nenhuma lacuna</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Sem pendências cadastradas para este módulo no quadriênio atual.
                        </p>
                      </div>
                    ) : semLacunas ? (
                      /* Estado positivo quando o grupo tem regras, mas nenhuma lacuna pendente */
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-center">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
                        <p className="text-sm font-semibold text-emerald-800">
                          Nenhuma lacuna identificada
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Todos os registros avaliados cumprem os requisitos ({regras.length}{' '}
                          {regras.length === 1 ? 'regra' : 'regras'} validadas).
                        </p>
                      </div>
                    ) : (
                      /* Lista de regras do grupo com suas contagens individuais */
                      <div className="space-y-2">
                        {regras.map((regra) => {
                          const temPendencia = (regra.total_lacunas ?? 0) > 0
                          const isCritica = regra.severidade === 'critica'

                          return (
                            <div
                              key={regra.regra_id}
                              data-testid={`item-regra-${regra.regra_id}`}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                                temPendencia
                                  ? isCritica
                                    ? 'border-red-100 bg-red-50/40 text-slate-800'
                                    : 'border-amber-100 bg-amber-50/40 text-slate-800'
                                  : 'border-slate-100 bg-slate-50/30 text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span
                                  className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                    temPendencia
                                      ? isCritica
                                        ? 'bg-red-500'
                                        : 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  title={
                                    temPendencia ? (isCritica ? 'Crítica' : 'Atenção') : 'Concluído'
                                  }
                                />
                                <span className="font-medium truncate text-slate-800">
                                  {regra.descricao}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {regra.total_registros > 0 && (
                                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                                    de {regra.total_registros}
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded font-semibold text-xs ${
                                    temPendencia
                                      ? isCritica
                                        ? 'bg-red-100 text-red-800 border border-red-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {regra.total_lacunas}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Rodapé com barra de acentuação visual com a cor do Dashboard */}
                <div
                  className={`h-1.5 w-full rounded-b-[calc(var(--radius)-1px)] ${theme.accentBar}`}
                />
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
