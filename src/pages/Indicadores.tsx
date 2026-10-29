import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Search,
  BookOpen,
  Info,
  HelpCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { obterIndicadoresCapes } from '@/services/indicadores-capes'
import {
  imprimirRelatorioIndicadoresViaIframe,
  exportarIndicadoresCsv,
} from '@/lib/capes/exportacao'
import type { RelatorioIndicadoresCapes, ResultadoIndicador, QuesitoFicha } from '@/lib/capes/types'

export type FiltroQuesito = 'TODOS' | QuesitoFicha

export interface IndicadoresProps {
  carregarDadosFn?: () => ReturnType<typeof obterIndicadoresCapes>
}

export default function Indicadores({ carregarDadosFn }: IndicadoresProps = {}) {
  const [relatorio, setRelatorio] = useState<RelatorioIndicadoresCapes | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroQuesito, setFiltroQuesito] = useState<FiltroQuesito>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'calculado' | 'indefinido'>('TODOS')
  const [filtroAno, setFiltroAno] = useState<'TODOS' | '2025' | '2026' | '2027' | '2028'>('TODOS')

  // Modais de detalhe e nota metodológica
  const [indicadorModal, setIndicadorModal] = useState<ResultadoIndicador | null>(null)
  const [modalNotaAberta, setModalNotaAberta] = useState(false)
  const [imprimindo, setImprimindo] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const loader = carregarDadosFn ?? obterIndicadoresCapes
      const res = await loader()
      if (res.sucesso && res.dados) {
        setRelatorio(res.dados)
      } else {
        setErro(res.mensagemErro || 'Não foi possível carregar os indicadores da Ficha CAPES.')
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado ao consultar o motor de indicadores.')
    } finally {
      setCarregando(false)
    }
  }, [carregarDadosFn])

  useEffect(() => {
    carregar()
  }, [carregar])

  const handleExportarPdf = async () => {
    if (!relatorio) return
    setImprimindo(true)
    try {
      await imprimirRelatorioIndicadoresViaIframe(relatorio, filtroQuesito)
    } catch (err) {
      console.error('Erro na impressão de indicadores:', err)
    } finally {
      setImprimindo(false)
    }
  }

  const handleExportarCsv = () => {
    if (!relatorio) return
    exportarIndicadoresCsv(relatorio)
  }

  // Filtragem dos indicadores
  const quesitosFiltrados = useMemo(() => {
    if (!relatorio) return []

    return relatorio.quesitos
      .filter((q) => filtroQuesito === 'TODOS' || q.quesito === filtroQuesito)
      .map((q) => {
        const indicadoresFiltrados = q.indicadores.filter((ind) => {
          if (filtroStatus !== 'TODOS' && ind.status !== filtroStatus) {
            return false
          }
          if (busca.trim()) {
            const b = busca.toLowerCase().trim()
            const matchCod = ind.codigo.toLowerCase().includes(b)
            const matchNome = ind.nome.toLowerCase().includes(b)
            const matchItem = ind.itemFicha.toLowerCase().includes(b)
            const matchForm = ind.formulaTexto.toLowerCase().includes(b)
            return matchCod || matchNome || matchItem || matchForm
          }
          return true
        })

        return {
          ...q,
          indicadores: indicadoresFiltrados,
        }
      })
      .filter((q) => q.indicadores.length > 0)
  }, [relatorio, filtroQuesito, filtroStatus, busca])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho da Página */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary shrink-0" />
              <span>Indicadores de Avaliação</span>
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={carregar}
            disabled={carregando}
            className="inline-flex items-center justify-center gap-2 border-blue-300 bg-white hover:bg-blue-50 text-blue-700 h-9 px-3.5 text-sm font-medium flex-1 sm:flex-initial cursor-pointer"
          >
            <RefreshCw
              className={`h-4 w-4 text-blue-600 shrink-0 ${carregando ? 'animate-spin' : ''}`}
            />
            <span>Atualizar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportarCsv}
            disabled={!relatorio || carregando}
            className="inline-flex items-center justify-center gap-2 border-emerald-400 bg-white hover:bg-emerald-50 text-emerald-700 h-9 px-3.5 text-sm font-medium flex-1 sm:flex-initial cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Exportar CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportarPdf}
            disabled={!relatorio || imprimindo}
            className="inline-flex items-center justify-center gap-2 border-red-300 bg-white hover:bg-red-50 text-red-600 h-9 px-3.5 text-sm font-medium flex-1 sm:flex-initial cursor-pointer"
          >
            <Printer className="h-4 w-4 text-red-600 shrink-0" />
            <span>{imprimindo ? 'Gerando...' : 'Exportar PDF'}</span>
          </Button>
        </div>
      </div>

      {/* Erro de carga se houver */}
      {erro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao calcular indicadores</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{erro}</span>
            <Button variant="outline" size="sm" onClick={carregar} className="ml-4 shrink-0">
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Resumo Geral */}
      {relatorio && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 pb-2 bg-[#e9effc] rounded-t-lg border-b border-blue-100">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary">
                Total de Fórmulas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <div className="text-2xl font-bold text-slate-900">
                {relatorio.resumoGeral.totalIndicadores}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Quesitos 1, 2 e 3.1 da ficha</p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 pb-2 bg-[#e9effc] rounded-t-lg border-b border-blue-100">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Calculados com Insumo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <div className="text-2xl font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                {relatorio.resumoGeral.calculados}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Com base nos registros atuais</p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 pb-2 bg-[#e9effc] rounded-t-lg border-b border-blue-100">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                Aguardando Insumos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <div className="text-2xl font-bold text-amber-700 flex items-center gap-1.5">
                <HelpCircle className="h-5 w-5 text-amber-600 shrink-0" />
                {relatorio.resumoGeral.indefinidos}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Sem zeros fictícios</p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-4 pb-2 bg-[#e9effc] rounded-t-lg border-b border-blue-100">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary">
                Denominador Efetivo (DP − JDP)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <div className="text-2xl font-bold text-slate-900">
                {relatorio.resumoGeral.denominadorEfetivo}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {relatorio.resumoGeral.totalDP} permanentes ({relatorio.resumoGeral.totalJdpValidos}{' '}
                JDP válidos)
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou termo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8 bg-white h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Quesito */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-600 shrink-0">Quesito:</span>
            <Select
              value={filtroQuesito}
              onValueChange={(val) => setFiltroQuesito(val as FiltroQuesito)}
            >
              <SelectTrigger className="w-[180px] bg-white h-9 text-xs">
                <SelectValue placeholder="Selecione o Quesito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Quesitos</SelectItem>
                <SelectItem value="1">Quesito 1 (ADE)</SelectItem>
                <SelectItem value="2">Quesito 2 (Produção/Formação)</SelectItem>
                <SelectItem value="3.1">Quesito 3.1 (Patentes/Índice-H)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-600 shrink-0">Status:</span>
            <Select value={filtroStatus} onValueChange={(val) => setFiltroStatus(val as any)}>
              <SelectTrigger className="w-[150px] bg-white h-9 text-xs">
                <SelectValue placeholder="Status do Indicador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                <SelectItem value="calculado">Calculados</SelectItem>
                <SelectItem value="indefinido">Aguardando Insumo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Ano (Detalhamento Anual) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-600 shrink-0">Ano:</span>
            <Select value={filtroAno} onValueChange={(val) => setFiltroAno(val as any)}>
              <SelectTrigger className="w-[155px] bg-white h-9 text-xs">
                <SelectValue placeholder="Ano de análise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Quadriênio (MMA)</SelectItem>
                <SelectItem value="2025">Ano 2025</SelectItem>
                <SelectItem value="2026">Ano 2026</SelectItem>
                <SelectItem value="2027">Ano 2027</SelectItem>
                <SelectItem value="2028">Ano 2028</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Estado de Carregamento */}
      {carregando && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* Lista de Quesitos e Indicadores */}
      {!carregando && relatorio && (
        <div className="space-y-8">
          {quesitosFiltrados.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg p-6 bg-slate-50">
              <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Nenhum indicador encontrado.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente ajustar os termos de busca ou os filtros de quesito e status.
              </p>
            </div>
          ) : (
            quesitosFiltrados.map((q) => (
              <section key={q.quesito} className="space-y-3">
                {/* Cabeçalho do Quesito no padrão visual #e9effc */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#e9effc] px-4 py-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <h2 className="text-base font-bold text-primary">{q.titulo}</h2>
                      <span className="text-xs text-slate-600">
                        Peso geral na avaliação CAPES: <strong>{q.pesoTotalPercentual}%</strong>
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-white text-primary border border-blue-200 self-start sm:self-auto text-xs"
                  >
                    {q.indicadores.length} indicador(es)
                  </Badge>
                </div>

                {/* Grid de Cards dos Indicadores do Quesito */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {q.indicadores.map((ind) => (
                    <Card
                      key={ind.id}
                      className="border border-slate-200 shadow-sm hover:shadow transition-shadow flex flex-col justify-between bg-white"
                    >
                      {/* Topo do Card com cabeçalho característico #e9effc */}
                      <CardHeader className="p-3.5 pb-2.5 bg-[#e9effc] rounded-t-lg border-b border-blue-100 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5">
                              {ind.codigo}
                            </Badge>
                            <span className="text-[11px] font-semibold text-slate-700">
                              Item {ind.itemFicha}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="bg-white text-slate-700 border-slate-300 text-[10px] font-semibold shrink-0"
                          >
                            Peso: {ind.pesoPercentual}%
                          </Badge>
                        </div>
                        <CardTitle className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                          {ind.nome}
                        </CardTitle>
                      </CardHeader>

                      {/* Corpo do Card */}
                      <CardContent className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          {/* Fórmula exibida */}
                          <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[11px] font-mono text-slate-800 break-words leading-relaxed">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5 font-sans">
                              Fórmula Ficha CAPES:
                            </span>
                            {ind.formulaTexto}
                          </div>

                          {/* Valor Calculado ou Aguardando Insumo (adaptado ao filtro de ano) */}
                          {(() => {
                            const isFiltroAnoEspecifico = filtroAno !== 'TODOS'
                            const anoNum = isFiltroAnoEspecifico ? Number(filtroAno) : null
                            const dadoAno = anoNum && ind.anos ? ind.anos[anoNum] : null

                            if (isFiltroAnoEspecifico && ind.metodologia === 'estoque') {
                              return (
                                <div className="p-2.5 rounded-lg border bg-slate-50 flex items-center justify-between">
                                  <div className="text-xs font-medium text-slate-600">
                                    Resultado (Estoque):
                                  </div>
                                  <div className="text-lg font-bold text-primary flex items-baseline gap-1">
                                    <span>{ind.valorCalculado}</span>
                                    {ind.unidade && (
                                      <span className="text-xs font-medium text-slate-500">
                                        {ind.unidade}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            }

                            if (isFiltroAnoEspecifico && ind.anos) {
                              const calcNoAno =
                                dadoAno?.status === 'calculado' && dadoAno.valorCalculado !== null
                              return (
                                <div className="p-2.5 rounded-lg border bg-white flex items-center justify-between">
                                  <div>
                                    <div className="text-xs font-medium text-slate-600">
                                      Resultado em {filtroAno}:
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      MMA quadriênio: {ind.valorCalculado ?? '—'}
                                    </span>
                                  </div>
                                  {calcNoAno ? (
                                    <div className="text-xl font-bold text-primary flex items-baseline gap-1">
                                      <span>{dadoAno.valorCalculado}</span>
                                      {ind.unidade && (
                                        <span className="text-xs font-medium text-slate-500">
                                          {ind.unidade}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-50 text-amber-800 border-amber-300 text-xs py-1"
                                    >
                                      Aguardando Insumo
                                    </Badge>
                                  )}
                                </div>
                              )
                            }

                            // Visão consolidada (MMA / Estoque)
                            return (
                              <div className="p-2.5 rounded-lg border bg-white flex items-center justify-between">
                                <div className="text-xs font-medium text-slate-600">
                                  {ind.metodologia === 'estoque'
                                    ? 'Estoque Período:'
                                    : 'Resultado MMA:'}
                                </div>
                                {ind.status === 'calculado' ? (
                                  <div className="text-xl font-bold text-primary flex items-baseline gap-1">
                                    <span>{ind.valorCalculado}</span>
                                    {ind.unidade && (
                                      <span className="text-xs font-medium text-slate-500">
                                        {ind.unidade}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-800 border-amber-300 text-xs py-1"
                                  >
                                    Indefinido
                                  </Badge>
                                )}
                              </div>
                            )
                          })()}

                          {/* Decomposição Anual tipo "2025: X · 2026: Y · 2027: Z · 2028: W → MMA: M" */}
                          {ind.anos && (
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] leading-relaxed text-slate-700">
                              <div className="font-semibold text-slate-600 text-[10px] uppercase mb-1 flex items-center justify-between">
                                <span>Série Anual &amp; MMA:</span>
                                {ind.mma?.completo ? (
                                  <span className="text-emerald-700 font-bold text-[9px] bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                    4/4 Anos
                                  </span>
                                ) : (
                                  <span className="text-amber-800 font-bold text-[9px] bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                    {ind.mma?.anosConsiderados.length || 0}/4 Anos
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[11px] text-slate-800">
                                {[2025, 2026, 2027, 2028].map((ano, idx) => {
                                  const d = ind.anos?.[ano]
                                  const temValor =
                                    d?.status === 'calculado' && d.valorCalculado !== null
                                  const isSel = filtroAno === String(ano)
                                  return (
                                    <span key={ano}>
                                      {idx > 0 && <span className="text-slate-400 mx-1">·</span>}
                                      <span
                                        className={
                                          isSel
                                            ? 'bg-blue-100 text-primary font-bold px-0.5 rounded'
                                            : ''
                                        }
                                      >
                                        <span className="text-slate-500">{ano}: </span>
                                        {temValor ? (
                                          <span className="font-semibold text-slate-900">
                                            {d.valorCalculado}
                                          </span>
                                        ) : (
                                          <span className="text-amber-700 italic text-[10px]">
                                            aguardando
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                  )
                                })}
                                <span className="text-primary font-bold ml-1.5">
                                  → MMA: {ind.valorCalculado !== null ? ind.valorCalculado : '—'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Indicador de estoque (sem anualização) */}
                          {ind.metodologia === 'estoque' && (
                            <div className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600">
                              <span className="font-semibold text-slate-700">Tipo Estoque:</span>{' '}
                              Medido no período (sem anualização).
                            </div>
                          )}

                          {/* Motivo se indefinido */}
                          {ind.status === 'indefinido' && ind.motivoIndefinido && (
                            <div className="text-[11px] bg-amber-50/90 text-amber-900 p-2 rounded border border-amber-200 flex items-start gap-1.5 leading-snug">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                              <span>{ind.motivoIndefinido}</span>
                            </div>
                          )}

                          {/* Decomposição compacta dos termos */}
                          {ind.decomposicao.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                                Termos da fórmula:
                              </span>
                              <div className="grid grid-cols-2 gap-1 text-[11px]">
                                {ind.decomposicao.slice(0, 4).map((d, i) => (
                                  <div
                                    key={i}
                                    className="bg-slate-50 px-1.5 py-1 rounded border border-slate-100 truncate"
                                    title={`${d.descricao}: ${d.valor}`}
                                  >
                                    <span className="font-semibold text-slate-700">{d.termo}:</span>{' '}
                                    <span className="text-slate-900">{d.valor}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Botão de Detalhes / Insumos */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            {ind.status === 'calculado'
                              ? 'Valores conferidos'
                              : 'Requer preenchimento'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIndicadorModal(ind)}
                            className="text-xs h-7 text-primary hover:text-primary hover:bg-primary/10 gap-1 px-2"
                          >
                            <Info className="h-3.5 w-3.5" />
                            Ver Insumos
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {/* Modal de Detalhes do Indicador com Insumos Existentes vs Esperados */}
      <Dialog
        open={Boolean(indicadorModal)}
        onOpenChange={(open) => !open && setIndicadorModal(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {indicadorModal && (
            <>
              <DialogHeader className="p-6 pb-4 border-b border-slate-100 shrink-0 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-primary text-white text-xs">{indicadorModal.codigo}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Item {indicadorModal.itemFicha} • Peso {indicadorModal.pesoPercentual}%
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900 mt-1">
                  {indicadorModal.nome}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Detalhamento dos termos, premissas da ficha CAPES e auditoria de insumos no banco.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-800 min-h-0">
                {/* Fórmula */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Fórmula Oficial:
                  </span>
                  <div className="font-mono text-xs font-semibold text-slate-900">
                    {indicadorModal.formulaTexto}
                  </div>
                  {indicadorModal.observacoes && (
                    <p className="text-[11px] text-slate-600 mt-1 italic">
                      {indicadorModal.observacoes}
                    </p>
                  )}
                </div>

                {/* Status e Valor */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-white">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Resultado Atual:
                    </span>
                    <span className="font-bold text-base text-primary">
                      {indicadorModal.status === 'calculado'
                        ? `${indicadorModal.valorCalculado}${indicadorModal.unidade || ''}`
                        : 'Indefinido'}
                    </span>
                  </div>
                  <div>
                    {indicadorModal.status === 'calculado' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Calculado
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1">
                        <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                        Aguardando Insumo
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Insumos Existentes vs Esperados */}
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                    Insumos no Banco de Dados:
                  </h4>
                  <div className="space-y-1.5">
                    {indicadorModal.insumos.map((ins, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded border flex items-center justify-between ${
                          ins.atendido
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-amber-50/70 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {ins.atendido ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          )}
                          <span>{ins.descricao}</span>
                        </div>
                        <div className="font-semibold shrink-0">
                          {ins.totalEsperado !== undefined ? (
                            <span>
                              {ins.totalExistente} / {ins.totalEsperado}
                            </span>
                          ) : (
                            <span>{ins.totalExistente}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabela de Decomposição Anual detalhada se houver */}
                {indicadorModal.anos && (
                  <div className="space-y-2">
                    <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                      Série Temporal Ano a Ano e MMA:
                    </h4>
                    <div className="rounded border border-slate-200 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                          <tr>
                            <th className="p-2">Ano</th>
                            <th className="p-2">Status</th>
                            <th className="p-2 text-right">Resultado</th>
                            <th className="p-2">Detalhamento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[2025, 2026, 2027, 2028].map((ano) => {
                            const dadoAno = indicadorModal.anos?.[ano]
                            const isCalc =
                              dadoAno?.status === 'calculado' && dadoAno.valorCalculado !== null
                            const termosStr = dadoAno?.decomposicao
                              ? dadoAno.decomposicao
                                  .map((t) => `${t.termo}: ${t.valor}`)
                                  .join(' · ')
                              : '—'
                            return (
                              <tr key={ano} className="hover:bg-slate-50">
                                <td className="p-2 font-bold font-mono text-slate-900">{ano}</td>
                                <td className="p-2">
                                  {isCalc ? (
                                    <span className="text-emerald-700 font-semibold">
                                      Calculado
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 italic">Aguardando insumo</span>
                                  )}
                                </td>
                                <td className="p-2 text-right font-bold text-primary">
                                  {isCalc
                                    ? `${dadoAno.valorCalculado}${indicadorModal.unidade || ''}`
                                    : '—'}
                                </td>
                                <td
                                  className="p-2 text-slate-500 text-[11px] truncate max-w-[200px]"
                                  title={termosStr}
                                >
                                  {termosStr}
                                </td>
                              </tr>
                            )
                          })}
                          <tr className="bg-blue-50/50 font-bold">
                            <td className="p-2 text-primary">MMA Final</td>
                            <td className="p-2 text-slate-700">
                              {indicadorModal.mma?.completo
                                ? '4/4 anos completos'
                                : `${indicadorModal.mma?.anosConsiderados.length || 0}/4 anos`}
                            </td>
                            <td className="p-2 text-right text-primary text-sm">
                              {indicadorModal.valorCalculado !== null
                                ? `${indicadorModal.valorCalculado}${indicadorModal.unidade || ''}`
                                : '—'}
                            </td>
                            <td className="p-2 text-xs text-slate-600 font-normal">
                              {indicadorModal.mma?.regra || ''}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Decomposição dos Termos */}
                {indicadorModal.decomposicao.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                      Decomposição Geral dos Termos:
                    </h4>
                    <div className="rounded border border-slate-200 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                          <tr>
                            <th className="p-2">Termo</th>
                            <th className="p-2">Descrição</th>
                            <th className="p-2 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {indicadorModal.decomposicao.map((d, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2 font-mono font-semibold text-primary">
                                {d.termo}
                              </td>
                              <td className="p-2 text-slate-600">{d.descricao}</td>
                              <td className="p-2 text-right font-bold text-slate-900">{d.valor}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal da Nota Metodológica (Ficha Engenharias II 2025) */}
      <Dialog open={modalNotaAberta} onOpenChange={setModalNotaAberta}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <BookOpen className="h-5 w-5 text-primary" />
              Nota Metodológica — Ficha de Avaliação CAPES Engenharias II (2025)
            </DialogTitle>
            <DialogDescription>
              Critérios, pesos e regras de negócio implementados na Etapa Q4.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-xs text-slate-700 py-2 leading-relaxed">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
              <strong>Base Documental:</strong> Ficha de Avaliação CAPES Engenharias II 2025
              (DAV/CAPES) e Documento de Área 2025–2028, complementada pelas deliberações de cálculo
              anual do Programa de Pós-Graduação em Ciência e Engenharia de Materiais (PPG-DCEM).
            </div>

            <div className="space-y-2 p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
              <h3 className="font-bold text-amber-950 text-sm">
                ★ Decisão do Programa: Média das Médias Anuais (MMA) no Quadriênio
              </h3>
              <p className="text-amber-900">
                A Ficha de Avaliação CAPES (Área Engenharias II) define formalmente dois blocos de
                indicadores:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-amber-900">
                <li>
                  <strong>
                    Indicadores &quot;no ano&quot; (SO, PSA, DP4A, ATI, NICT, NDISC, DPD):
                  </strong>{' '}
                  calculados ano a ano (2025, 2026, 2027, 2028) e agregados pela média das médias
                  anuais (MMA) diretamente conforme estipulado pela ficha CAPES.
                </li>
                <li>
                  <strong>
                    Indicadores de quadriênio (DPI, DPIDE1, DPIDE2, DPI2, DPT, ORI, ATD, DPPn,
                    DPPi):
                  </strong>{' '}
                  embora a ficha de avaliação CAPES os defina como totais acumulados no quadriênio,{' '}
                  <strong>o PPG-DCEM adotou formalmente a Média das Médias Anuais (MMA)</strong>{' '}
                  para estes indicadores, permitindo auditoria contínua, detecção precoce de
                  oscilações na produção/formação e acompanhamento ano a ano.
                </li>
                <li>
                  <strong>Indicadores de estoque (ADE, H2, H médio, H mediano):</strong> mantêm-se
                  sem anualização, sendo medidos diretamente pelo estado acumulado do período.
                </li>
                <li>
                  <strong>Regra Anti-Zero Fictício para anos sem insumo:</strong> um ano sem insumos
                  cadastrados permanece como &quot;aguardando insumo&quot; e{' '}
                  <strong>não entra como zero na média</strong>. A MMA apenas considera anos com
                  registros preenchidos e sinaliza se o quadriênio está completo (4/4 anos) ou
                  parcial.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">
                1. Corpo Docente e Jovens Doutores (JDP)
              </h3>
              <p>
                O corpo permanente (DP) engloba os docentes classificados como categoria{' '}
                <code>permanente</code>. A ficha permite indicar até 20% do DP como Jovens Doutores
                Pesquisadores (JDP, com doutorado há menos de 10 anos e até 4 anos como JDP). O
                número de JDP válidos é subtraído do denominador nos indicadores de produção
                intelectual, resultando no denominador efetivo <code>DP − JDP</code>.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">2. Saturação Qualis em B1</h3>
              <p>
                Nas fórmulas ponderadas de produção intelectual (DPI, DPIDE1, DPIDE2, DPI2), a
                pontuação segue os pesos oficiais: A1=1.0; A2=0.875; A3=0.75; A4=0.675; B1=0.5.
                Adota-se obrigatoriamente a regra de saturação <code>min(B1, DP)</code>: artigos B1
                excedentes ao tamanho do corpo permanente não são computados.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">3. Patentes (DPPn e DPPi)</h3>
              <p>
                Para patentes nacionais e internacionais, aplica-se a ponderação: Licenciada = 1.0;
                Concedida = 0.6; Depositada = 0.3, dividida por <code>DP − JDP</code>, calculada ano
                a ano e consolidada pela MMA.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">
                4. Bloco Bibliométrico (Índice H2 Scopus)
              </h3>
              <p>
                O índice H2 do programa é formalmente definido no Documento de Área como o maior
                valor H2 tal que existam pelo menos H2 docentes permanentes do programa com índice H
                maior ou igual a H2. O cálculo inclui também o H médio, H mediano e % DP acima de H2
                (estoque do período).
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">5. Política Anti-Zero Fictício</h3>
              <p>
                Quando uma tabela ou conjunto de vínculos não possui dados cadastrados no banco
                (ex.: patentes internacionais vazias, sem publicações com Qualis preenchido), o
                indicador é exibido como <strong>indefinido — aguardando insumo</strong> com o
                motivo textual explícito, guiando o preenchimento pelo usuário em vez de sugerir um
                desempenho nulo.
              </p>
            </div>
          </div>{' '}
        </DialogContent>
      </Dialog>
    </div>
  )
}
