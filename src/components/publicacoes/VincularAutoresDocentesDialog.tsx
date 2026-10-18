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
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  CheckCheck,
  RefreshCw,
  XCircle,
  GraduationCap,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  casamentoDocentesService,
  type ItemConfirmacaoCasamento,
} from '@/services/casamento-docentes'
import type {
  RelatorioCasamentoGeral,
  SugestaoCasamentoDocente,
  GrauConfiancaCategoria,
} from '@/lib/publicacoes/matching-docentes'
import { DocenteNome } from '@/components/docentes/DocenteNome'

export interface VincularAutoresDocentesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSucesso: () => void
  usuarioNome?: string
}

export function VincularAutoresDocentesDialog({
  open,
  onOpenChange,
  onSucesso,
  usuarioNome,
}: VincularAutoresDocentesDialogProps) {
  const [loading, setLoading] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [relatorio, setRelatorio] = useState<RelatorioCasamentoGeral | null>(null)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroConfianca, setFiltroConfianca] = useState<'todas' | GrauConfiancaCategoria>('todas')
  const [filtroStatus, setFiltroStatus] = useState<'pendentes' | 'todas' | 'vinculadas'>(
    'pendentes',
  )

  // Conjunto de chaves selecionadas para confirmação em lote: "pubId_docId"
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())

  // Carrega e roda a análise de sugestões
  const carregarSugestoes = async () => {
    setLoading(true)
    try {
      const resultado = await casamentoDocentesService.gerarSugestoesCasamento()
      setRelatorio(resultado)

      // Pré-marca as de alta confiança que ainda não foram vinculadas nem rejeitadas
      const preSelecionadas = new Set<string>()
      for (const pub of resultado.itens) {
        for (const sug of pub.sugestoes) {
          if (sug.selecionadoPadrao) {
            preSelecionadas.add(`${pub.publicacaoId}_${sug.docenteId}`)
          }
        }
      }
      setSelecionadas(preSelecionadas)
    } catch (err: any) {
      console.error('Erro ao gerar sugestões de casamento autor->docente:', err)
      toast.error('Erro ao analisar publicações para casamento autor→docente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      carregarSugestoes()
    } else {
      setRelatorio(null)
      setSelecionadas(new Set())
      setBusca('')
    }
  }, [open])

  // Filtragem dos itens exibidos
  const itensFiltrados = useMemo(() => {
    if (!relatorio) return []

    return relatorio.itens
      .map((pub) => {
        // Filtra sugestões da publicação
        const sugestoesFiltradas = pub.sugestoes.filter((sug) => {
          // Filtro por status
          if (filtroStatus === 'pendentes' && (sug.jaVinculado || sug.rejeitadoAnteriormente)) {
            return false
          }
          if (filtroStatus === 'vinculadas' && !sug.jaVinculado) {
            return false
          }

          // Filtro por grau de confiança
          if (filtroConfianca !== 'todas' && sug.grauConfianca !== filtroConfianca) {
            return false
          }

          // Filtro por texto de busca
          if (busca.trim()) {
            const termo = busca.toLowerCase()
            const bateNome = sug.docenteNome.toLowerCase().includes(termo)
            const bateAutor = sug.autorTrecho.toLowerCase().includes(termo)
            const bateTitulo = pub.publicacaoTitulo.toLowerCase().includes(termo)
            if (!bateNome && !bateAutor && !bateTitulo) return false
          }

          return true
        })

        return {
          ...pub,
          sugestoes: sugestoesFiltradas,
        }
      })
      .filter((pub) => pub.sugestoes.length > 0)
  }, [relatorio, filtroStatus, filtroConfianca, busca])

  // Contagem de sugestões atualmente filtradas e elegíveis para lote
  const totalSugestoesFiltradas = useMemo(() => {
    return itensFiltrados.reduce((acc, p) => acc + p.sugestoes.length, 0)
  }, [itensFiltrados])

  const totalPendentesFiltradas = useMemo(() => {
    return itensFiltrados.reduce(
      (acc, p) =>
        acc + p.sugestoes.filter((s) => !s.jaVinculado && !s.rejeitadoAnteriormente).length,
      0,
    )
  }, [itensFiltrados])

  // Toggle de seleção individual
  const toggleSelecao = (pubId: number, docId: number) => {
    const chave = `${pubId}_${docId}`
    setSelecionadas((prev) => {
      const next = new Set(prev)
      if (next.has(chave)) next.delete(chave)
      else next.add(chave)
      return next
    })
  }

  // Marcar todas pendentes filtradas
  const handleSelecionarTodasPendentes = () => {
    setSelecionadas((prev) => {
      const next = new Set(prev)
      for (const pub of itensFiltrados) {
        for (const sug of pub.sugestoes) {
          if (!sug.jaVinculado && !sug.rejeitadoAnteriormente) {
            next.add(`${pub.publicacaoId}_${sug.docenteId}`)
          }
        }
      }
      return next
    })
  }

  // Desmarcar todas
  const handleDesmarcarTodas = () => {
    setSelecionadas(new Set())
  }

  // Marcar apenas as de alta confiança pendentes
  const handleSelecionarApenasAltaConfianca = () => {
    setSelecionadas((prev) => {
      const next = new Set(prev)
      for (const pub of itensFiltrados) {
        for (const sug of pub.sugestoes) {
          const chave = `${pub.publicacaoId}_${sug.docenteId}`
          if (!sug.jaVinculado && !sug.rejeitadoAnteriormente && sug.grauConfianca === 'alta') {
            next.add(chave)
          } else {
            next.delete(chave)
          }
        }
      }
      return next
    })
  }

  // Confirmação individual
  const handleConfirmarIndividual = async (pubId: number, sug: SugestaoCasamentoDocente) => {
    setProcessando(true)
    try {
      await casamentoDocentesService.confirmarIndividual({
        publicacaoId: pubId,
        docenteId: sug.docenteId,
        usuarioNome,
        justificativa: sug.justificativa,
      })

      toast.success(`Vínculo confirmado: ${sug.docenteNome}`)
      // Atualiza estado local para refletir imediatamente sem recarregar tudo
      setRelatorio((prev) => {
        if (!prev) return null
        return {
          ...prev,
          totalJaVinculadas: prev.totalJaVinculadas + 1,
          itens: prev.itens.map((p) => {
            if (p.publicacaoId !== pubId) return p
            return {
              ...p,
              sugestoes: p.sugestoes.map((s) => {
                if (s.docenteId !== sug.docenteId) return s
                return { ...s, jaVinculado: true, selecionadoPadrao: false }
              }),
            }
          }),
        }
      })

      // Remove da seleção
      setSelecionadas((prev) => {
        const next = new Set(prev)
        next.delete(`${pubId}_${sug.docenteId}`)
        return next
      })

      onSucesso()
    } catch {
      toast.error('Erro ao confirmar vínculo individual.')
    } finally {
      setProcessando(false)
    }
  }

  // Rejeição individual
  const handleRejeitarIndividual = async (pubId: number, docId: number, nome: string) => {
    setProcessando(true)
    try {
      await casamentoDocentesService.rejeitarSugestao({
        publicacaoId: pubId,
        docenteId: docId,
        usuarioNome,
      })

      toast.info(`Sugestão rejeitada: ${nome}`)
      setRelatorio((prev) => {
        if (!prev) return null
        return {
          ...prev,
          itens: prev.itens.map((p) => {
            if (p.publicacaoId !== pubId) return p
            return {
              ...p,
              sugestoes: p.sugestoes.map((s) => {
                if (s.docenteId !== docId) return s
                return { ...s, rejeitadoAnteriormente: true, selecionadoPadrao: false }
              }),
            }
          }),
        }
      })

      setSelecionadas((prev) => {
        const next = new Set(prev)
        next.delete(`${pubId}_${docId}`)
        return next
      })
    } catch {
      toast.error('Erro ao registrar rejeição.')
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
      const itensParaConfirmar: ItemConfirmacaoCasamento[] = []
      for (const chave of selecionadas) {
        const [pubIdStr, docIdStr] = chave.split('_')
        itensParaConfirmar.push({
          publicacaoId: Number(pubIdStr),
          docenteId: Number(docIdStr),
        })
      }

      const res = await casamentoDocentesService.confirmarEmLote({
        itens: itensParaConfirmar,
        usuarioNome,
      })

      if (res.sucessos > 0) {
        toast.success(
          `${res.sucessos} vínculo(s) autor→docente confirmado(s) com sucesso na base de dados!`,
        )
      }
      if (res.erros > 0) {
        toast.error(`${res.erros} vínculo(s) apresentaram falha ao gravar.`)
      }

      // Recarrega lista para atualizar todos os status
      await carregarSugestoes()
      onSucesso()
    } catch {
      toast.error('Erro ao processar confirmação em lote.')
    } finally {
      setProcessando(false)
    }
  }

  // Renderiza badge com cor específica por confiança
  const renderConfiancaBadge = (grau: GrauConfiancaCategoria, score: number) => {
    const pct = Math.round(score * 100)
    switch (grau) {
      case 'alta':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Alta ({pct}%)
          </Badge>
        )
      case 'media':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium text-[11px] gap-1">
            <AlertCircle className="h-3 w-3" />
            Média ({pct}%)
          </Badge>
        )
      case 'baixa':
        return (
          <Badge
            variant="outline"
            className="text-slate-600 border-slate-300 font-medium text-[11px]"
          >
            Baixa ({pct}%)
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl md:max-h-[90vh] md:h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
        {' '}
        {/* Cabeçalho no padrão do sistema (#e9effc / primary) */}
        <DialogHeader className="p-4 md:p-5 pb-3 border-b border-slate-200 bg-[#e9effc] dark:bg-slate-900 shrink-0 pr-12">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-primary font-bold text-lg md:text-xl text-left">
                Casamento Automático Autor → Docente
              </DialogTitle>
              <p className="text-xs text-slate-600 mt-0.5">
                Etapa D1: Vincula autores de publicações ao corpo docente cadastrado no PPG-DCEM.
              </p>
            </div>
          </div>
        </DialogHeader>
        {/* Barra de Estatísticas Resumidas */}
        {relatorio && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-700 shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                <strong>{relatorio.publicacoesAnalisadas}</strong> pubs analisadas
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-medium">
                <strong>{relatorio.totalAltaConfianca}</strong> alta conf.
              </span>
              <span>•</span>
              <span className="text-amber-700 font-medium">
                <strong>{relatorio.totalMediaConfianca}</strong> média
              </span>
              {relatorio.totalBaixaConfianca > 0 && (
                <>
                  <span>•</span>
                  <span className="text-slate-500">
                    <strong>{relatorio.totalBaixaConfianca}</strong> baixa
                  </span>
                </>
              )}
              <span>•</span>
              <span className="text-blue-700">
                <strong>{relatorio.totalJaVinculadas}</strong> já vinculadas
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={carregarSugestoes}
                disabled={loading || processando}
                className="h-7 text-xs text-slate-600 gap-1 px-2"
                title="Reprocessar sugestões"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Reprocessar</span>
              </Button>
            </div>
          </div>
        )}
        {/* Filtros e Ações Rápidas de Seleção */}
        <div className="p-3 md:px-5 border-b border-slate-200 bg-white space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Filtrar por docente, autor no artigo ou título..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 text-xs h-8 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={filtroConfianca} onValueChange={(v) => setFiltroConfianca(v as any)}>
                <SelectTrigger className="text-xs h-8 w-[130px] bg-slate-50">
                  <Filter className="h-3 w-3 mr-1 text-slate-500" />
                  <SelectValue placeholder="Confiança" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas confianças</SelectItem>
                  <SelectItem value="alta">Apenas Alta</SelectItem>
                  <SelectItem value="media">Apenas Média</SelectItem>
                  <SelectItem value="baixa">Apenas Baixa</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
                <SelectTrigger className="text-xs h-8 w-[130px] bg-slate-50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="vinculadas">Já Vinculadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões rápidos de marcação em lote */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelecionarApenasAltaConfianca}
                className="h-7 text-xs border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              >
                Marcar apenas Alta Confiança
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelecionarTodasPendentes}
                className="h-7 text-xs"
              >
                Marcar todas ({totalPendentesFiltradas})
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
              {selecionadas.size} selecionada(s)
            </div>
          </div>
        </div>
        {/* Lista de Publicações e Sugestões (Scrollável) */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3 min-h-0 bg-slate-50/50">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : itensFiltrados.length > 0 ? (
            itensFiltrados.map((pub) => (
              <div
                key={pub.publicacaoId}
                className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5 transition-colors hover:border-slate-300"
              >
                {/* Cabeçalho da publicação */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5 flex-1">
                      <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <h4 className="font-semibold text-slate-900 text-xs md:text-sm leading-snug">
                        {pub.publicacaoTitulo}
                      </h4>
                    </div>
                    <Badge variant="outline" className="text-[11px] shrink-0 font-mono">
                      {pub.publicacaoAno}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 pl-5.5">
                    <strong>Autores no artigo:</strong> {pub.publicacaoAutoresTexto}
                  </p>
                </div>

                {/* Lista de Sugestões de Docentes para esta publicação */}
                <div className="space-y-1.5 pt-1 pl-2 md:pl-5">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                    <Label className="text-[11px] font-semibold text-blue-900">
                      Sugestões de Docentes Encontradas:
                    </Label>
                  </div>

                  <div className="space-y-1.5">
                    {pub.sugestoes.map((sug) => {
                      const chave = `${pub.publicacaoId}_${sug.docenteId}`
                      const isSelecionada = selecionadas.has(chave)
                      const desabilitada = sug.jaVinculado || sug.rejeitadoAnteriormente

                      return (
                        <div
                          key={sug.docenteId}
                          className={`rounded-md border p-2.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-colors ${
                            sug.jaVinculado
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                              : sug.rejeitadoAnteriormente
                                ? 'bg-slate-100/60 border-slate-200 text-slate-500 opacity-75'
                                : isSelecionada
                                  ? 'bg-blue-50/90 border-blue-300 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Lado Esquerdo: Checkbox + Detalhes do Match */}
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {!desabilitada && (
                              <Checkbox
                                id={`check-${chave}`}
                                checked={isSelecionada}
                                onCheckedChange={() =>
                                  toggleSelecao(pub.publicacaoId, sug.docenteId)
                                }
                                className="mt-0.5 shrink-0"
                              />
                            )}

                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <DocenteNome
                                  nome={sug.docenteNome}
                                  status={sug.docenteStatus}
                                  className="font-semibold text-slate-900"
                                />
                                {sug.docenteCategoria && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] py-0 px-1 capitalize"
                                  >
                                    {sug.docenteCategoria}
                                  </Badge>
                                )}
                                {renderConfiancaBadge(sug.grauConfianca, sug.grauConfiancaScore)}
                                {sug.jaVinculado && (
                                  <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5 gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Vínculo Existente
                                  </Badge>
                                )}
                                {sug.rejeitadoAnteriormente && (
                                  <Badge
                                    variant="outline"
                                    className="text-slate-500 bg-slate-100 text-[10px] py-0 px-1.5"
                                  >
                                    Rejeitado
                                  </Badge>
                                )}
                              </div>

                              <p
                                className="text-[11px] text-slate-600 break-words"
                                title={sug.justificativa}
                              >
                                {sug.justificativa}
                              </p>
                            </div>
                          </div>

                          {/* Lado Direito: Ações Individuais (Confirmar 1 clique / Rejeitar) */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {!sug.jaVinculado && !sug.rejeitadoAnteriormente && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={processando}
                                  onClick={() =>
                                    handleRejeitarIndividual(
                                      pub.publicacaoId,
                                      sug.docenteId,
                                      sug.docenteNome,
                                    )
                                  }
                                  className="h-7 text-[11px] text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 gap-1"
                                  title="Ignorar esta sugestão"
                                >
                                  <XCircle className="h-3 w-3" />
                                  <span>Ignorar</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={processando}
                                  onClick={() => handleConfirmarIndividual(pub.publicacaoId, sug)}
                                  className="h-7 text-[11px] gap-1 px-3 bg-blue-600 hover:bg-blue-700 min-h-[36px] sm:min-h-7"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Confirmar</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs md:text-sm bg-white rounded-lg border border-dashed border-slate-200 space-y-1">
              <p className="font-semibold text-slate-700">Nenhuma sugestão encontrada.</p>
              <p>
                {busca.trim() || filtroConfianca !== 'todas' || filtroStatus !== 'pendentes'
                  ? 'Ajuste os filtros de busca ou confiança para visualizar outros registros.'
                  : 'Todas as publicações já foram vinculadas aos docentes ou não possuem correspondência.'}
              </p>
            </div>
          )}
        </div>
        {/* Rodapé fixo */}
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
                <span>Gravando vínculos...</span>
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
