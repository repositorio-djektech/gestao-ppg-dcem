import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  CheckCheck,
  RefreshCw,
  BookOpen,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { EstratoQualis, Publicacao, Qualis } from '@/types/database'
import { SugestaoEstratoQualis, GrauConfiancaSugestao } from '@/lib/publicacoes/estimativa-qualis'
import { estimativaQualisService, ItemGravacaoQualis } from '@/services/estimativa-qualis'
import { qualisService } from '@/services/qualis'

export interface SugerirQualisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSucesso: () => void
}

export function SugerirQualisDialog({ open, onOpenChange, onSucesso }: SugerirQualisDialogProps) {
  const [loading, setLoading] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [progresso, setProgresso] = useState<{
    atual: number
    total: number
    titulo: string
  } | null>(null)
  const [sugestoes, setSugestoes] = useState<SugestaoEstratoQualis[]>([])

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroConfianca, setFiltroConfianca] = useState<'todas' | GrauConfiancaSugestao>('todas')
  const [filtroPresencaMetrica, setFiltroPresencaMetrica] = useState<
    'todos' | 'com_sugestao' | 'sem_sugestao'
  >('todos')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [qualisTabelaLista, setQualisTabelaLista] = useState<Qualis[]>([])

  // Chaves selecionadas para confirmação em lote: Set de publicacaoId
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set())

  // Estratos manuais selecionados direto na linha para as publicações sem sugestão
  const [estratosManuais, setEstratosManuais] = useState<Map<number, EstratoQualis>>(new Map())
  const [totalGeralBanco, setTotalGeralBanco] = useState<{
    total: number
    jaComEstrato: number
  }>({ total: 0, jaComEstrato: 0 })

  // Carrega contagens do banco e roda a estimativa
  const carregarContagensBanco = async () => {
    try {
      const { count: totalPubs } = await estimativaQualisService.obterContagemTotalPublicacoes()
      const { count: pubsComEstrato } =
        await estimativaQualisService.obterContagemPublicacoesComEstrato()
      setTotalGeralBanco({
        total: totalPubs || 0,
        jaComEstrato: pubsComEstrato || 0,
      })
    } catch (err) {
      console.warn('Erro ao carregar contagens gerais de publicações:', err)
    }
  }

  // Carrega e roda a estimativa
  const carregarSugestoes = async () => {
    setLoading(true)
    setProgresso(null)
    try {
      const pubsSemEstrato = await estimativaQualisService.obterPublicacoesSemEstrato()
      if (pubsSemEstrato.length === 0) {
        setSugestoes([])
        setLoading(false)
        return
      }

      const res = await estimativaQualisService.processarSugestoes(pubsSemEstrato, (p) =>
        setProgresso(p),
      )
      setSugestoes(res)

      // Pré-marca as de ALTA confiança que possuem estrato sugerido
      const pre = new Set<number>()
      for (const item of res) {
        if (item.grauConfianca === 'alta' && item.estratoSugerido) {
          pre.add(item.publicacaoId)
        }
      }
      setSelecionadas(pre)
    } catch (err: any) {
      console.error('Erro ao processar estimativas Qualis:', err)
      toast.error('Erro ao consultar métricas e estimar Qualis.')
    } finally {
      setLoading(false)
      setProgresso(null)
    }
  }

  useEffect(() => {
    if (open) {
      carregarContagensBanco()
      carregarSugestoes()
      qualisService
        .list()
        .then(setQualisTabelaLista)
        .catch(() => {})
    } else {
      setSugestoes([])
      setSelecionadas(new Set())
      setEstratosManuais(new Map())
      setBusca('')
    }
  }, [open])

  // Métricas do topo com contagens ao vivo exigidas pela especificação da D2:
  // (analisadas, com sugestão, sem sugestão, já com estrato)
  const estatisticas = useMemo(() => {
    const analisadas = sugestoes.length
    const comSugestao = sugestoes.filter((s) => Boolean(s.estratoSugerido)).length
    const semSugestao = sugestoes.filter((s) => !s.estratoSugerido).length
    const jaComEstrato = totalGeralBanco.jaComEstrato
    const altaConf = sugestoes.filter(
      (s) => s.grauConfianca === 'alta' && Boolean(s.estratoSugerido),
    ).length
    const mediaConf = sugestoes.filter(
      (s) => s.grauConfianca === 'media' && Boolean(s.estratoSugerido),
    ).length
    return {
      analisadas,
      comSugestao,
      semSugestao,
      jaComEstrato,
      altaConf,
      mediaConf,
    }
  }, [sugestoes, totalGeralBanco])
  // Filtragem dos itens exibidos
  const itensFiltrados = useMemo(() => {
    return sugestoes.filter((item) => {
      // Filtro de presença de métrica
      if (filtroPresencaMetrica === 'com_sugestao' && !item.estratoSugerido) return false
      if (filtroPresencaMetrica === 'sem_sugestao' && item.estratoSugerido) return false

      // Filtro de confiança
      if (filtroConfianca !== 'todas' && item.grauConfianca !== filtroConfianca) return false

      // Filtro por tipo de produção
      if (filtroTipo !== 'todos') {
        const tp = item.tipoProducao || 'nenhum'
        if (filtroTipo === 'nenhum' && item.tipoProducao) return false
        if (filtroTipo !== 'nenhum' && tp !== filtroTipo) return false
      }

      // Busca por título, periódico ou DOI
      if (busca.trim()) {
        const termo = busca.toLowerCase()
        const bateTitulo = item.titulo.toLowerCase().includes(termo)
        const batePeriodico = item.periodico.toLowerCase().includes(termo)
        const bateDoi = item.doi.toLowerCase().includes(termo)
        if (!bateTitulo && !batePeriodico && !bateDoi) return false
      }

      return true
    })
  }, [sugestoes, filtroPresencaMetrica, filtroConfianca, filtroTipo, busca])

  // Toggle de seleção individual
  const toggleSelecao = (pubId: number) => {
    setSelecionadas((prev) => {
      const next = new Set(prev)
      if (next.has(pubId)) next.delete(pubId)
      else next.add(pubId)
      return next
    })
  }

  // Ações de marcação
  const handleSelecionarTodasComSugestao = () => {
    const next = new Set<number>()
    for (const item of itensFiltrados) {
      if (item.estratoSugerido) next.add(item.publicacaoId)
    }
    setSelecionadas(next)
  }

  const handleSelecionarApenasAlta = () => {
    const next = new Set<number>()
    for (const item of itensFiltrados) {
      if (item.grauConfianca === 'alta' && item.estratoSugerido) {
        next.add(item.publicacaoId)
      }
    }
    setSelecionadas(next)
  }

  const handleDesmarcarTodas = () => {
    setSelecionadas(new Set())
  }

  // Muda estrato manual de uma linha específica
  const handleSetEstratoManual = (pubId: number, estrato: EstratoQualis) => {
    setEstratosManuais((prev) => {
      const next = new Map(prev)
      next.set(pubId, estrato)
      return next
    })
  }

  // Gravação individual com 1 clique (sugerido)
  const handleConfirmarIndividual = async (item: SugestaoEstratoQualis) => {
    if (!item.estratoSugerido) return
    setProcessando(true)
    try {
      const payload: ItemGravacaoQualis[] = [
        {
          publicacaoId: item.publicacaoId,
          estrato: item.estratoSugerido,
          origem: 'sugerido_confirmado',
          justificativa: item.justificativa,
        },
      ]

      const res = await estimativaQualisService.gravarConfirmacoes(payload)
      if (res.sucessos > 0) {
        toast.success(
          `Estrato ${item.estratoSugerido} confirmado para "${item.titulo.substring(0, 40)}..."`,
        )
        // Remove do estado local
        setSugestoes((prev) => prev.filter((s) => s.publicacaoId !== item.publicacaoId))
        setSelecionadas((prev) => {
          const next = new Set(prev)
          next.delete(item.publicacaoId)
          return next
        })
        onSucesso()
      } else if (res.ignorados > 0) {
        toast.info('Item preservado (já continha atribuição manual no banco).')
      }
    } catch {
      toast.error('Erro ao gravar confirmação.')
    } finally {
      setProcessando(false)
    }
  }

  // Gravação manual individual com 1 clique (quando sem sugestão)
  const handleGravarManualIndividual = async (pubId: number, titulo: string) => {
    const estrato = estratosManuais.get(pubId)
    if (!estrato) {
      toast.warning('Selecione um estrato no dropdown antes de confirmar.')
      return
    }

    setProcessando(true)
    try {
      const payload: ItemGravacaoQualis[] = [
        {
          publicacaoId: pubId,
          estrato,
          origem: 'manual',
          justificativa: 'Atribuição manual realizada pelo usuário',
        },
      ]

      const res = await estimativaQualisService.gravarConfirmacoes(payload)
      if (res.sucessos > 0) {
        toast.success(`Estrato ${estrato} (manual) gravado com sucesso!`)
        setSugestoes((prev) => prev.filter((s) => s.publicacaoId !== pubId))
        setEstratosManuais((prev) => {
          const next = new Map(prev)
          next.delete(pubId)
          return next
        })
        onSucesso()
      }
    } catch {
      toast.error('Erro ao gravar estrato manual.')
    } finally {
      setProcessando(false)
    }
  }

  // Confirmação em lote das selecionadas
  const handleConfirmarEmLote = async () => {
    if (selecionadas.size === 0) {
      toast.warning('Nenhuma sugestão selecionada para confirmar.')
      return
    }

    setProcessando(true)
    try {
      const itensParaGravar: ItemGravacaoQualis[] = []
      for (const pubId of selecionadas) {
        const item = sugestoes.find((s) => s.publicacaoId === pubId)
        if (item && item.estratoSugerido) {
          itensParaGravar.push({
            publicacaoId: item.publicacaoId,
            estrato: item.estratoSugerido,
            origem: 'sugerido_confirmado',
            justificativa: item.justificativa,
          })
        }
      }

      const res = await estimativaQualisService.gravarConfirmacoes(itensParaGravar)
      if (res.sucessos > 0) {
        toast.success(`${res.sucessos} estrato(s) Qualis confirmado(s) e gravado(s) com sucesso!`)
      }
      if (res.ignorados > 0) {
        toast.info(`${res.ignorados} registro(s) preservado(s) por já possuírem Qualis manual.`)
      }
      if (res.erros.length > 0) {
        toast.error(`${res.erros.length} item(ns) falharam ao gravar.`)
      }

      // Remove os salvos da lista local
      const salvosSet = new Set(res.atualizadosIds)
      setSugestoes((prev) => prev.filter((s) => !salvosSet.has(s.publicacaoId)))
      setSelecionadas(new Set())
      onSucesso()
    } catch {
      toast.error('Erro ao processar gravação em lote.')
    } finally {
      setProcessando(false)
    }
  }

  // Badge visual do estrato sugerido
  const renderEstratoBadge = (estrato: EstratoQualis | null) => {
    if (!estrato) {
      return (
        <Badge variant="outline" className="text-slate-400 bg-slate-50 border-slate-200 text-xs">
          Sem sugestão
        </Badge>
      )
    }
    switch (estrato) {
      case 'A1':
      case 'A2':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold px-2 py-0.5">
            {estrato}
          </Badge>
        )
      case 'A3':
      case 'A4':
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold px-2 py-0.5">
            {estrato}
          </Badge>
        )
      case 'B1':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-bold px-2 py-0.5">
            {estrato}
          </Badge>
        )
    }
  }

  const renderConfiancaBadge = (grau: GrauConfiancaSugestao) => {
    switch (grau) {
      case 'alta':
        return (
          <Badge className="bg-emerald-600 text-white text-[11px] gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Alta
          </Badge>
        )
      case 'media':
        return (
          <Badge className="bg-amber-500 text-white text-[11px] gap-1 font-medium">
            <AlertCircle className="h-3 w-3" />
            Média
          </Badge>
        )
      case 'baixa':
        return (
          <Badge
            variant="outline"
            className="text-slate-500 border-slate-300 text-[11px] font-medium"
          >
            Baixa / Manual
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl md:max-h-[90vh] md:h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
        {' '}
        {/* Cabeçalho padrão (#e9effc / primary) */}
        <DialogHeader className="p-4 md:p-5 pb-3 border-b border-slate-200 bg-[#e9effc] dark:bg-slate-900 shrink-0 pr-12">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-primary font-bold text-lg md:text-xl text-left">
                Sugestão Automática de Estrato Qualis (OpenAlex / Scopus)
              </DialogTitle>
              <p className="text-xs text-slate-600 mt-0.5">
                Etapa D2: Estimativa preliminar (A1–B1) baseada em métricas de periódicos. A
                gravação exige confirmação explícita.
              </p>
            </div>
          </div>
        </DialogHeader>
        {/* Barra de métricas ao vivo com contagens exigidas: analisadas, com sugestão, sem sugestão, já com estrato */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-700 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span title="Publicações analisadas nesta rodada (ainda sem estrato)">
              <strong>{estatisticas.analisadas}</strong> analisadas
            </span>
            <span>•</span>
            <span
              className="text-emerald-700 font-medium"
              title="Publicações com sugestão de estrato calculada"
            >
              <strong>{estatisticas.comSugestao}</strong> com sugestão ({estatisticas.altaConf}{' '}
              alta, {estatisticas.mediaConf} média)
            </span>
            <span>•</span>
            <span
              className="text-amber-700 font-medium"
              title="Sem métricas disponíveis para sugestão automática"
            >
              <strong>{estatisticas.semSugestao}</strong> sem sugestão
            </span>
            <span>•</span>
            <span
              className="text-blue-700"
              title="Publicações preservadas que já possuem estrato_qualis definido no banco"
            >
              <strong>{estatisticas.jaComEstrato}</strong> já com estrato
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                carregarContagensBanco()
                carregarSugestoes()
              }}
              disabled={loading || processando}
              className="h-7 text-xs text-slate-600 gap-1 px-2"
              title="Recarregar estimativas"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Recarregar</span>
            </Button>
          </div>
        </div>
        {/* Filtros e Controles de Seleção */}
        <div className="p-3 md:px-5 border-b border-slate-200 bg-white space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Filtrar por periódico, título ou DOI..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 text-xs h-8 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={filtroPresencaMetrica}
                onValueChange={(v) => setFiltroPresencaMetrica(v as any)}
              >
                <SelectTrigger className="text-xs h-8 w-[140px] bg-slate-50">
                  <SelectValue placeholder="Métrica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as pubs</SelectItem>
                  <SelectItem value="com_sugestao">Com sugestão</SelectItem>
                  <SelectItem value="sem_sugestao">Sem métrica</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroConfianca} onValueChange={(v) => setFiltroConfianca(v as any)}>
                <SelectTrigger className="text-xs h-8 w-[120px] bg-slate-50">
                  <Filter className="h-3 w-3 mr-1 text-slate-500" />
                  <SelectValue placeholder="Confiança" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="text-xs h-8 w-[130px] bg-slate-50">
                  <SelectValue placeholder="Tipo produção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos tipos</SelectItem>
                  <SelectItem value="Artigo em periódico">Artigo periódico</SelectItem>
                  <SelectItem value="Trabalho em anais">Trabalho anais</SelectItem>
                  <SelectItem value="Capítulo">Capítulo</SelectItem>
                  <SelectItem value="nenhum">Sem tipo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões de marcação em lote */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelecionarApenasAlta}
                className="h-7 text-xs border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              >
                Marcar Alta Confiança ({estatisticas.altaConf})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelecionarTodasComSugestao}
                className="h-7 text-xs"
              >
                Marcar Todas c/ Sugestão ({estatisticas.comSugestao})
              </Button>
              {selecionadas.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDesmarcarTodas}
                  className="h-7 text-xs text-slate-500 hover:text-slate-700"
                >
                  Desmarcar
                </Button>
              )}
            </div>

            <div className="text-xs font-semibold text-primary">
              {selecionadas.size} selecionada(s) para confirmação
            </div>
          </div>
        </div>
        {/* Lista de Publicações com sugestão / sem métrica */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3 min-h-0 bg-slate-50/50">
          {loading ? (
            <div className="space-y-3">
              {progresso && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
                  <span>
                    Consultando OpenAlex/Scopus: {progresso.atual} de {progresso.total}...
                  </span>
                  <span className="font-mono">
                    {Math.round((progresso.atual / progresso.total) * 100)}%
                  </span>
                </div>
              )}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : itensFiltrados.length > 0 ? (
            itensFiltrados.map((item) => {
              const temSugestao = Boolean(item.estratoSugerido)
              const isSelecionada = selecionadas.has(item.publicacaoId)
              const estratoManualEscolhido = estratosManuais.get(item.publicacaoId)

              return (
                <div
                  key={item.publicacaoId}
                  className={`rounded-lg border p-3.5 shadow-xs space-y-2.5 transition-colors ${
                    temSugestao
                      ? isSelecionada
                        ? 'bg-blue-50/70 border-blue-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-amber-50/30 border-amber-200/70 hover:border-amber-300'
                  }`}
                >
                  {/* Topo: Seleção + Título + Periódico */}
                  <div className="flex items-start gap-2.5">
                    {temSugestao ? (
                      <Checkbox
                        id={`check-qualis-${item.publicacaoId}`}
                        checked={isSelecionada}
                        onCheckedChange={() => toggleSelecao(item.publicacaoId)}
                        className="mt-1 shrink-0"
                      />
                    ) : (
                      <HelpCircle className="h-4 w-4 text-amber-500 mt-1 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900 text-xs md:text-sm leading-snug flex-1">
                          {item.titulo}
                        </h4>
                        <Badge variant="outline" className="text-[11px] font-mono shrink-0">
                          {item.ano}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-600 flex-wrap">
                        <span className="font-medium text-slate-800">
                          <strong>Periódico:</strong> {item.periodico || '—'}
                        </span>
                        {item.tipoProducao && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                              {item.tipoProducao}
                            </span>
                          </>
                        )}
                        {item.doi && (
                          <>
                            <span>•</span>
                            <a
                              href={`https://doi.org/${item.doi.replace(/^https?:\/\/doi\.org\//i, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-primary hover:underline flex items-center gap-0.5"
                            >
                              DOI <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Miolo: Métricas, Sugestão e Justificativa */}
                  <div className="pl-6 md:pl-7 pt-1 border-t border-slate-100 space-y-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-slate-700">Sugestão:</span>
                        {renderEstratoBadge(item.estratoSugerido)}
                        {renderConfiancaBadge(item.grauConfianca)}
                        <span className="text-[11px] text-slate-500 font-mono">
                          [{item.metricasResumo}]
                        </span>
                      </div>

                      {/* Botão de confirmação 1 clique para com sugestão */}
                      {temSugestao && (
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <Button
                            type="button"
                            size="sm"
                            disabled={processando}
                            onClick={() => handleConfirmarIndividual(item)}
                            className="text-[11px] gap-1 px-3 bg-blue-600 hover:bg-blue-700 h-7"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Confirmar {item.estratoSugerido}</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Justificativa Legível */}
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200/80">
                      <strong>Justificativa da estimativa:</strong> {item.justificativa}
                    </p>

                    {/* Caso sem sugestão: Seção direta de atribuição manual na linha */}
                    {!temSugestao && (
                      <div className="flex items-center justify-between gap-2 p-2 bg-amber-50 rounded border border-amber-200/80 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-amber-900">
                            Atribuir manualmente:
                          </span>
                          <Select
                            value={estratoManualEscolhido || 'nenhum'}
                            onValueChange={(val) =>
                              val !== 'nenhum' &&
                              handleSetEstratoManual(item.publicacaoId, val as EstratoQualis)
                            }
                          >
                            <SelectTrigger className="h-7 w-[100px] text-xs bg-white border-amber-300">
                              <SelectValue placeholder="Estrato" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nenhum">Selecione</SelectItem>
                              {qualisTabelaLista.length > 0 ? (
                                qualisTabelaLista.map((q) => (
                                  <SelectItem key={q.id} value={q.estrato}>
                                    {q.estrato}
                                  </SelectItem>
                                ))
                              ) : (
                                <>
                                  <SelectItem value="A1">A1</SelectItem>
                                  <SelectItem value="A2">A2</SelectItem>
                                  <SelectItem value="A3">A3</SelectItem>
                                  <SelectItem value="A4">A4</SelectItem>
                                  <SelectItem value="B1">B1</SelectItem>
                                  <SelectItem value="B2">B2</SelectItem>
                                  <SelectItem value="B3">B3</SelectItem>
                                  <SelectItem value="B4">B4</SelectItem>
                                  <SelectItem value="C">C</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          disabled={!estratoManualEscolhido || processando}
                          onClick={() =>
                            handleGravarManualIndividual(item.publicacaoId, item.titulo)
                          }
                          className="text-[11px] gap-1 bg-amber-600 hover:bg-amber-700 text-white h-7"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          <span>Gravar Manual</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs md:text-sm bg-white rounded-lg border border-dashed border-slate-200 space-y-1">
              <p className="font-semibold text-slate-700">
                Nenhuma publicação pendente encontrada.
              </p>
              <p>
                {busca.trim() || filtroConfianca !== 'todas' || filtroPresencaMetrica !== 'todos'
                  ? 'Ajuste os filtros de busca para visualizar outros registros.'
                  : 'Todas as publicações já possuem estrato Qualis definido no banco de dados!'}
              </p>
            </div>
          )}
        </div>
        {/* Rodapé Fixo */}
        <div className="border-t border-slate-200 bg-white p-3 md:p-4 flex items-center justify-between gap-2 md:gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs md:text-sm"
          >
            Fechar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={selecionadas.size === 0 || processando}
            onClick={handleConfirmarEmLote}
            className="h-9 px-5 text-xs md:text-sm bg-primary hover:bg-primary/90 gap-1.5"
          >
            {processando ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Gravando estratos...</span>
              </>
            ) : (
              <>
                <CheckCheck className="h-4 w-4" />
                <span>Confirmar Selecionadas ({selecionadas.size})</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
