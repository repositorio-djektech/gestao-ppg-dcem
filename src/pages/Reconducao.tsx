import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Award,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Search,
  Calendar,
  Users,
  Eye,
  BookOpen,
  GraduationCap,
  FlaskConical,
  FileText,
  Info,
} from 'lucide-react'
import { obterAvaliacaoReconducao } from '@/services/reconducao'
import { useIsMobile } from '@/hooks/use-mobile'
import type {
  AvaliacaoDocenteReconducao,
  RelatorioReconducaoResposta,
  VereditoReconducao,
  PublicacaoComStatusCoautoria,
} from '@/lib/reconducao/types'

export type FiltroVeredito = 'TODOS' | VereditoReconducao

export interface ReconducaoProps {
  /** Injeção de loader para testes unitários */
  carregarDadosFn?: () => ReturnType<typeof obterAvaliacaoReconducao>
}

// Ordem de prioridade definida na especificação:
// reconduzidos primeiro, depois não atendem, depois insuficientes, depois não aplicáveis
const ORDEM_VEREDITO: Record<VereditoReconducao, number> = {
  RECONDUZIDO: 1,
  NAO_ATENDE: 2,
  PDQ_INSUFICIENTE: 3,
  NAO_APLICAVEL: 4,
}

export default function Reconducao({ carregarDadosFn }: ReconducaoProps = {}) {
  const isMobile = useIsMobile()
  const [relatorio, setRelatorio] = useState<RelatorioReconducaoResposta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [origem, setOrigem] = useState<'edge_function' | 'local_fallback' | null>(null)

  // Filtros e busca
  const [buscaNome, setBuscaNome] = useState('')
  const [filtroVeredito, setFiltroVeredito] = useState<FiltroVeredito>('TODOS')

  // Drill-down do docente selecionado
  const [docenteSelecionado, setDocenteSelecionado] = useState<AvaliacaoDocenteReconducao | null>(
    null,
  )
  const [dialogAberto, setDialogAberto] = useState(false)

  const carregarRelatorio = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const loader = carregarDadosFn ?? obterAvaliacaoReconducao
      const res = await loader()
      if (res.sucesso && res.dados) {
        setRelatorio(res.dados)
        setOrigem(res.origem ?? null)
      } else {
        setErro(res.mensagemErro || 'Não foi possível carregar a avaliação de recondução.')
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado ao consultar avaliação de recondução.')
    } finally {
      setCarregando(false)
    }
  }, [carregarDadosFn])

  useEffect(() => {
    carregarRelatorio()
  }, [carregarRelatorio])

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

  // Filtragem e ordenação da tabela de docentes
  const docentesFiltrados = useMemo(() => {
    if (!relatorio?.avaliacoes) return []

    return relatorio.avaliacoes
      .filter((doc) => {
        // Filtro por veredito
        if (filtroVeredito !== 'TODOS' && doc.veredito !== filtroVeredito) {
          return false
        }
        // Busca textual por nome
        if (buscaNome.trim()) {
          const nomeNorm = doc.nome.toLowerCase()
          const termoNorm = buscaNome.toLowerCase().trim()
          if (!nomeNorm.includes(termoNorm)) return false
        }
        return true
      })
      .sort((a, b) => {
        const ordemA = ORDEM_VEREDITO[a.veredito] ?? 99
        const ordemB = ORDEM_VEREDITO[b.veredito] ?? 99
        if (ordemA !== ordemB) {
          return ordemA - ordemB
        }
        return a.nome.localeCompare(b.nome, 'pt-BR')
      })
  }, [relatorio?.avaliacoes, filtroVeredito, buscaNome])

  const handleAbrirDetalhes = (doc: AvaliacaoDocenteReconducao) => {
    setDocenteSelecionado(doc)
    setDialogAberto(true)
  }

  const renderBadgeVeredito = (
    veredito: VereditoReconducao,
    tamanho: 'normal' | 'pequeno' = 'normal',
  ) => {
    const classesBase =
      tamanho === 'pequeno' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1 font-semibold'

    switch (veredito) {
      case 'RECONDUZIDO':
        return (
          <Badge
            variant="outline"
            className={`bg-emerald-50 text-emerald-800 border-emerald-300 gap-1 inline-flex items-center ${classesBase}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            RECONDUZIDO
          </Badge>
        )
      case 'NAO_ATENDE':
        return (
          <Badge
            variant="outline"
            className={`bg-red-50 text-red-800 border-red-300 gap-1 inline-flex items-center ${classesBase}`}
          >
            <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
            NÃO ATENDE
          </Badge>
        )
      case 'PDQ_INSUFICIENTE':
        return (
          <Badge
            variant="outline"
            className={`bg-amber-50 text-amber-800 border-amber-300 gap-1 inline-flex items-center ${classesBase}`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            PDQ INSUFICIENTE
          </Badge>
        )
      case 'NAO_APLICAVEL':
      default:
        return (
          <Badge
            variant="outline"
            className={`bg-slate-100 text-slate-700 border-slate-300 gap-1 inline-flex items-center ${classesBase}`}
          >
            <HelpCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            NÃO APLICÁVEL
          </Badge>
        )
    }
  }

  const renderBadgeCategoria = (categoria: AvaliacaoDocenteReconducao['categoria']) => {
    if (categoria === 'permanente') {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-semibold"
        >
          Permanente
        </Badge>
      )
    }
    if (categoria === 'colaborador') {
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-semibold"
        >
          Colaborador
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
        Sem Categoria
      </Badge>
    )
  }

  const renderStatusCriterioIcon = (atendido: boolean) => {
    return atendido ? (
      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>Sim</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-red-600 font-medium text-xs">
        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
        <span>Não</span>
      </span>
    )
  }

  const resumo = relatorio?.resumo

  // Conteúdo detalhado do Drill-down (compartilhado entre Dialog desktop e Drawer mobile)
  const renderDrilldownConteudo = (doc: AvaliacaoDocenteReconducao) => {
    const { pdq_detalhes } = doc
    const todasPublicacoes: PublicacaoComStatusCoautoria[] = [
      ...(doc.publicacoes_confirmadas || []),
      ...(doc.publicacoes_pendentes || []),
      ...(doc.publicacoes_sem_coautoria || []),
    ]

    return (
      <div className="space-y-6 text-sm text-slate-800">
        {/* Identificação e Veredito */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                Docente Avaliado
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {doc.nome}
                {renderBadgeCategoria(doc.categoria)}
              </h3>
            </div>
            <div>{renderBadgeVeredito(doc.veredito)}</div>
          </div>

          {/* Scopus e Lattes */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-1 border-t border-slate-200">
            <div>
              <span className="font-semibold text-slate-700">Scopus ID: </span>
              {doc.scopus_id ? (
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {doc.scopus_id}
                </span>
              ) : (
                <span className="text-slate-400">Não informado</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-slate-700">ID Lattes: </span>
              {doc.id_lattes ? (
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {doc.id_lattes}
                </span>
              ) : (
                <span className="text-slate-400">Não informado</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Quadriênio: </span>
              <span>
                {relatorio?.quadrienio.ano_inicio ?? 2025}–{relatorio?.quadrienio.ano_fim ?? 2028}
              </span>
            </div>
          </div>

          {/* Motivos / Pendências se houver */}
          {doc.motivos.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <AlertCircle className="h-4 w-4 text-amber-700" />
                <span>Critérios Pendentes / Motivo do Veredito:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                {doc.motivos.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Avaliação dos 4 Critérios */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Critérios da Norma de Recondução (§ 4º)
          </h4>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Critério I */}
            <div className="rounded-lg border border-slate-200 p-3 bg-white space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-slate-900 text-xs">
                    Critério I: Orientação Principal
                  </span>
                </div>
                {renderStatusCriterioIcon(doc.criterio_i.atendido)}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{doc.criterio_i.detalhe}</p>
              {doc.criterio_i.itens && doc.criterio_i.itens.length > 0 && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 max-h-24 overflow-y-auto space-y-1">
                  <div className="font-semibold text-slate-700">Orientações consideradas:</div>
                  {doc.criterio_i.itens.map((item: any, i: number) => (
                    <div key={i} className="truncate">
                      • {item.tipo || 'Orientação'} ({item.inicio || '?'}
                      {item.fim ? `–${item.fim}` : ''}){item.status ? ` - ${item.status}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Critério II */}
            <div className="rounded-lg border border-slate-200 p-3 bg-white space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-slate-900 text-xs">
                    Critério II: Disciplina Ministrada
                  </span>
                </div>
                {renderStatusCriterioIcon(doc.criterio_ii.atendido)}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{doc.criterio_ii.detalhe}</p>
              {doc.criterio_ii.itens && doc.criterio_ii.itens.length > 0 && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 max-h-24 overflow-y-auto space-y-1">
                  <div className="font-semibold text-slate-700">Disciplinas consideradas:</div>
                  {doc.criterio_ii.itens.map((item: any, i: number) => (
                    <div key={i} className="truncate">
                      • {item.codigo ? `[${item.codigo}] ` : ''}
                      {item.nome}
                      {item.ano_semestre ? ` (${item.ano_semestre})` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Critério III */}
            <div className="rounded-lg border border-slate-200 p-3 bg-white space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-slate-900 text-xs">
                    Critério III: Projeto Financiado
                  </span>
                </div>
                {renderStatusCriterioIcon(doc.criterio_iii.atendido)}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{doc.criterio_iii.detalhe}</p>
              {doc.criterio_iii.itens && doc.criterio_iii.itens.length > 0 && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 max-h-24 overflow-y-auto space-y-1">
                  <div className="font-semibold text-slate-700">Projetos considerados:</div>
                  {doc.criterio_iii.itens.map((item: any, i: number) => (
                    <div key={i} className="truncate" title={item.titulo}>
                      • {item.titulo} ({item.orgao_fomento || 'Financiamento registrado'})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Critério IV */}
            <div className="rounded-lg border border-slate-200 p-3 bg-white space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-slate-900 text-xs">
                    Critério IV: Índice PDQ ≥ 1.0
                  </span>
                </div>
                {renderStatusCriterioIcon(doc.criterio_iv.atendido)}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{doc.criterio_iv.detalhe}</p>
              <div className="text-xs font-medium text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
                <span>Resultado PDQ:</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {pdq_detalhes.pdq !== null ? pdq_detalhes.pdq.toFixed(2) : '— (Indefinido)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detalhamento do Cálculo PDQ e Fórmula */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Detalhamento da Fórmula do PDQ
            </h4>
            <div className="bg-slate-100 px-2 py-1 rounded font-mono text-xs text-slate-800 font-semibold">
              PDQ = NP / (MSc + DSc)
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">NP Estrito (Confirmadas)</div>
              <div className="text-xl font-bold text-primary mt-0.5">{pdq_detalhes.np}</div>
              <div className="text-[10px] text-slate-400">JCR ≥ 1,0 c/ orientando</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">NP Teto (Potenciais)</div>
              <div className="text-xl font-bold text-slate-700 mt-0.5">
                {pdq_detalhes.np_teto ?? doc.np_teto ?? 0}
              </div>
              <div className="text-[10px] text-slate-400">Todas JCR ≥ 1,0</div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Titulações Concluídas</div>
              <div className="text-xl font-bold text-slate-700 mt-0.5">
                {pdq_detalhes.titulacoes_total}
              </div>
              <div className="text-[10px] text-slate-400">
                MSc ({pdq_detalhes.msc}) + DSc ({pdq_detalhes.dsc})
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Valor PDQ Final</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {pdq_detalhes.pdq !== null ? pdq_detalhes.pdq.toFixed(2) : '—'}
              </div>
              <div className="text-[10px] text-slate-400">
                {pdq_detalhes.pdq !== null
                  ? pdq_detalhes.pdq >= 1.0
                    ? 'Meta atingida (≥ 1,0)'
                    : 'Abaixo da meta (< 1,0)'
                  : 'Pré-condição não atingida'}
              </div>
            </div>
          </div>

          {/* Justificativa para caso de pré-condição não atendida */}
          {!pdq_detalhes.precondicao_atendida && (
            <div className="rounded bg-amber-50/70 border border-amber-200 p-2.5 text-xs text-amber-900">
              <span className="font-semibold">Pré-condição da Norma (§ 4º): </span>
              O cálculo de PDQ requer no mínimo 2 titulações concluídas no período ((MSc + DSc) ≥
              2). Com menos de 2 defesas concluídas ({pdq_detalhes.titulacoes_total}), o PDQ é{' '}
              <strong className="underline">indefinido</strong> (e não zero), pois a fração não
              atinge a base mínima estipulada pelo regulamento.
            </div>
          )}
        </div>

        {/* Publicações que compuseram o NP */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Publicações Consideradas para o NP ({todasPublicacoes.length})
            </h4>
            <span className="text-xs text-slate-500">Fator de Impacto JCR ≥ 1,0 no quadriênio</span>
          </div>

          {todasPublicacoes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
              Nenhuma publicação JCR ≥ 1.0 localizada no quadriênio para este docente.
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {todasPublicacoes.map((pub) => {
                  let badgeStatus = (
                    <Badge
                      variant="outline"
                      className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]"
                    >
                      Sem coautoria
                    </Badge>
                  )
                  if (pub.status_coautoria === 'confirmado') {
                    badgeStatus = (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-semibold"
                      >
                        Confirmada (NP Estrito)
                      </Badge>
                    )
                  } else if (pub.status_coautoria === 'pendente') {
                    badgeStatus = (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-semibold"
                      >
                        Pendente (NP Teto)
                      </Badge>
                    )
                  }

                  return (
                    <div key={pub.id} className="p-3 text-xs space-y-1 hover:bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900 leading-snug">
                          {pub.titulo}
                        </span>
                        {badgeStatus}
                      </div>
                      <div className="text-slate-600 text-[11px] truncate" title={pub.autores}>
                        {pub.autores}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span className="italic">{pub.periodico}</span>
                        <span>• Ano: {pub.ano}</span>
                        {pub.fator_impacto_jcr && (
                          <span className="font-medium text-primary">
                            • JCR: {Number(pub.fator_impacto_jcr).toFixed(2)}
                          </span>
                        )}
                        {pub.coautores_programa_nomes &&
                          pub.coautores_programa_nomes.length > 0 && (
                            <span className="text-emerald-700 font-medium">
                              • Coautor(es): {pub.coautores_programa_nomes.join(', ')}
                            </span>
                          )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Nota Metodológica Institucional */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Info className="h-4 w-4 text-slate-500" />
            <span>Nota Metodológica da Norma de Recondução:</span>
          </div>
          <p className="leading-relaxed">{relatorio?.nota_metodologica.criterio_iv_np_coautoria}</p>
          <p className="leading-relaxed text-[11px] text-slate-500 border-t border-slate-200 pt-1">
            {relatorio?.nota_metodologica.criterio_ii_disciplinas_temporais}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="pagina-reconducao">
      {/* Topo da página: título, descrição e ações */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Norma de Recondução Docente
            </h1>
          </div>
          <p className="text-slate-500 mt-1 max-w-3xl text-sm leading-relaxed">
            Avaliação quadrienal de permanência docente no PPG-DCEM conforme o regulamento interno
            (§ 4º). Monitoramento dos 4 critérios normativos: orientação principal, disciplinas
            ministradas, projetos com financiamento e índice de produção docente qualificada (PDQ).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dataFormatada && (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-md"
              title="Momento da última avaliação consolidada"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Avaliado em: {dataFormatada}
              {origem === 'local_fallback' && (
                <span className="text-[10px] text-amber-700 font-medium ml-1">(cálculo local)</span>
              )}
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={carregarRelatorio}
            disabled={carregando}
            className="inline-flex items-center gap-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
            data-testid="btn-atualizar-reconducao"
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
                Falha ao carregar os dados de recondução
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

      {/* Cards de Métricas no Topo (ResumoReconducao) */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {/* Total Avaliado */}
        <Card className="border border-slate-200 shadow-sm bg-white col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Docentes
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-slate-900" data-testid="card-total-docentes">
                {resumo?.total_docentes ?? 0}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              {resumo
                ? `${resumo.total_permanentes} perm. / ${resumo.total_colaboradores} colab.`
                : 'Avaliados no quadriênio'}
            </p>
          </CardContent>
        </Card>

        {/* RECONDUZIDOS */}
        <Card className="border border-emerald-200 shadow-sm bg-emerald-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">
              Reconduzidos
            </CardTitle>
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-8 w-16 bg-emerald-100" />
            ) : (
              <div className="text-2xl font-bold text-emerald-700" data-testid="card-reconduzidos">
                {resumo?.reconduzidos ?? 0}
              </div>
            )}
            <p className="text-[11px] text-emerald-700 mt-1">Atendem aos 4 critérios</p>
          </CardContent>
        </Card>

        {/* NÃO ATENDEM */}
        <Card className="border border-red-200 shadow-sm bg-red-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-red-900 uppercase tracking-wider">
              Não Atendem
            </CardTitle>
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-8 w-16 bg-red-100" />
            ) : (
              <div className="text-2xl font-bold text-red-600" data-testid="card-nao-atendem">
                {resumo?.nao_atendem ?? 0}
              </div>
            )}
            <p className="text-[11px] text-red-700 mt-1">Com pendências em I, II, III ou IV</p>
          </CardContent>
        </Card>

        {/* PDQ INSUFICIENTE / INDEFINIDO */}
        <Card className="border border-amber-200 shadow-sm bg-amber-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
              PDQ Insuficiente
            </CardTitle>
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-8 w-16 bg-amber-100" />
            ) : (
              <div
                className="text-2xl font-bold text-amber-600"
                data-testid="card-pdq-insuficiente"
              >
                {resumo?.pdq_insuficiente ?? 0}
              </div>
            )}
            <p className="text-[11px] text-amber-700 mt-1">Menos de 2 titulações concluídas</p>
          </CardContent>
        </Card>

        {/* NÃO APLICÁVEL */}
        <Card className="border border-slate-200 shadow-sm bg-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Não Aplicáveis
            </CardTitle>
            <HelpCircle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-slate-700" data-testid="card-nao-aplicavel">
                {resumo?.nao_aplicavel ?? 0}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Colaboradores / sem categoria</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar docente por nome..."
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            className="pl-9 bg-slate-50/50 border-slate-200 text-sm"
            data-testid="input-busca-docente-reconducao"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 shrink-0">Filtrar por Veredito:</span>
          <Select
            value={filtroVeredito}
            onValueChange={(val) => setFiltroVeredito(val as FiltroVeredito)}
          >
            <SelectTrigger
              className="w-[180px] bg-slate-50/50 border-slate-200 text-xs"
              data-testid="select-filtro-veredito"
            >
              <SelectValue placeholder="Todos os vereditos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os Vereditos</SelectItem>
              <SelectItem value="RECONDUZIDO">Reconduzidos</SelectItem>
              <SelectItem value="NAO_ATENDE">Não Atendem</SelectItem>
              <SelectItem value="PDQ_INSUFICIENTE">PDQ Insuficiente</SelectItem>
              <SelectItem value="NAO_APLICAVEL">Não Aplicáveis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela Principal de Docentes */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-semibold text-slate-700 min-w-[200px]">
                  Docente
                </TableHead>
                <TableHead className="text-center font-semibold text-slate-700">
                  Critério I<br />
                  <span className="text-[10px] font-normal text-slate-500">Orientação</span>
                </TableHead>
                <TableHead className="text-center font-semibold text-slate-700">
                  Critério II
                  <br />
                  <span className="text-[10px] font-normal text-slate-500">Disciplina</span>
                </TableHead>
                <TableHead className="text-center font-semibold text-slate-700">
                  Critério III
                  <br />
                  <span className="text-[10px] font-normal text-slate-500">Projeto</span>
                </TableHead>
                <TableHead className="text-center font-semibold text-slate-700">
                  Índice PDQ
                  <br />
                  <span className="text-[10px] font-normal text-slate-500">NP / (MSc+DSc)</span>
                </TableHead>
                <TableHead className="text-center font-semibold text-slate-700 min-w-[150px]">
                  Veredito
                </TableHead>
                <TableHead className="text-right font-semibold text-slate-700">
                  Evidências
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : docentesFiltrados.length > 0 ? (
                docentesFiltrados.map((doc) => {
                  const pdq = doc.pdq_detalhes.pdq
                  const precondicaoAtendida = doc.pdq_detalhes.precondicao_atendida

                  return (
                    <TableRow
                      key={doc.docente_id}
                      className="hover:bg-slate-50/60 cursor-pointer"
                      onClick={() => handleAbrirDetalhes(doc)}
                      data-testid={`linha-docente-${doc.docente_id}`}
                    >
                      {/* Nome e Categoria */}
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-semibold">{doc.nome}</span>
                          <div>{renderBadgeCategoria(doc.categoria)}</div>
                        </div>
                      </TableCell>

                      {/* Critério I */}
                      <TableCell className="text-center">
                        <div className="inline-flex flex-col items-center">
                          {renderStatusCriterioIcon(doc.criterio_i.atendido)}
                          <span className="text-[10px] text-slate-500">
                            {doc.criterio_i.quantidade} princ.
                          </span>
                        </div>
                      </TableCell>

                      {/* Critério II */}
                      <TableCell className="text-center">
                        <div className="inline-flex flex-col items-center">
                          {renderStatusCriterioIcon(doc.criterio_ii.atendido)}
                          <span className="text-[10px] text-slate-500">
                            {doc.criterio_ii.quantidade} disc.
                          </span>
                        </div>
                      </TableCell>

                      {/* Critério III */}
                      <TableCell className="text-center">
                        <div className="inline-flex flex-col items-center">
                          {renderStatusCriterioIcon(doc.criterio_iii.atendido)}
                          <span className="text-[10px] text-slate-500">
                            {doc.criterio_iii.quantidade} financ.
                          </span>
                        </div>
                      </TableCell>

                      {/* PDQ */}
                      <TableCell className="text-center">
                        {precondicaoAtendida && pdq !== null ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`font-mono font-bold text-sm ${
                                pdq >= 1.0 ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {pdq.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              NP {doc.pdq_detalhes.np} / {doc.pdq_detalhes.titulacoes_total}
                            </span>
                          </div>
                        ) : (
                          <div
                            className="inline-flex flex-col items-center"
                            title="Menos de 2 titulações concluídas no período"
                          >
                            <span className="font-mono text-slate-400 font-semibold">—</span>
                            <span className="text-[10px] text-slate-400 max-w-[120px] truncate">
                              &lt;2 titulações ({doc.pdq_detalhes.titulacoes_total})
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Veredito */}
                      <TableCell className="text-center">
                        {renderBadgeVeredito(doc.veredito)}
                      </TableCell>

                      {/* Ação de Evidências */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAbrirDetalhes(doc)
                          }}
                          className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
                          data-testid={`btn-detalhes-${doc.docente_id}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Evidências</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500 text-sm">
                    Nenhum docente localizado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Drill-down de Evidências: Dialog para telas médias/grandes e Drawer para mobile */}
      {!isMobile ? (
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-primary" />
                Dossiê e Evidências de Recondução Docente
              </DialogTitle>
              <DialogDescription>
                Detalhamento dos 4 critérios normativos, cálculo do PDQ e composições do NP estrito
                vs. teto.
              </DialogDescription>
            </DialogHeader>

            {docenteSelecionado && renderDrilldownConteudo(docenteSelecionado)}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={dialogAberto} onOpenChange={setDialogAberto}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="text-left border-b border-slate-100">
              <DrawerTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Evidências de Recondução
              </DrawerTitle>
              <DrawerDescription className="text-xs">
                Dossiê detalhado dos critérios de avaliação normativa
              </DrawerDescription>
            </DrawerHeader>

            <div className="overflow-y-auto p-4 max-h-[70vh]">
              {docenteSelecionado && renderDrilldownConteudo(docenteSelecionado)}
            </div>

            <DrawerFooter className="border-t border-slate-100 pt-2">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  Fechar
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}
