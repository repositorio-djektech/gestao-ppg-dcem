import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  FileText,
  Users2,
  ClipboardList,
  FlaskConical,
  Award,
  Wrench,
  Lightbulb,
  Calendar,
  Lock,
  ChevronDown,
  ArrowRight,
  Database,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  Check,
  AlertOctagon,
} from 'lucide-react'
import type { ResultadoProcessamentoLattes } from '@/lib/lattes/processor'
import type { TabelaAlvoId } from '@/lib/lattes/types'
import {
  mapearDadosParaRevisao,
  type TabelaRevisaoAgrupada,
  type ItemAmostraDocente,
  type ItemAmostraPublicacao,
  type ItemAmostraOrientacao,
  type ItemAmostraBanca,
  type ItemAmostraProjeto,
  type ItemAmostraPremiacao,
  type ItemAmostraProducaoTecnica,
  type ItemAmostraPatente,
  type ItemAmostraEvento,
} from '@/lib/lattes/revisao'
import { ANO_INICIO, ANO_FIM } from '@/lib/lattes/quadrienio'

import {
  gravarDadosLattes,
  converterLattesDocente,
  converterLattesPublicacao,
  converterLattesOrientacao,
  converterLattesBanca,
  converterLattesProjeto,
  converterLattesPremiacao,
  converterLattesProducaoTecnica,
  converterLattesPatente,
  converterLattesEvento,
  type RelatorioGravacaoLattes,
  type SupabaseClientLike,
} from '@/lib/lattes/gravar'

import { RevisaoBoundary, RevisaoErrorBoundary } from './RevisaoBoundary'
export { RevisaoBoundary, RevisaoErrorBoundary }

export interface RevisaoImportacaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resultado: ResultadoProcessamentoLattes | null
  onVoltarParaUpload?: () => void
  onGravacaoSucesso?: (relatorio: RelatorioGravacaoLattes) => void
  supabaseClient?: SupabaseClientLike
}

const TABELAS_ORDEM: Array<{
  id: TabelaAlvoId
  rotulo: string
  icone: React.ComponentType<{ className?: string }>
}> = [
  { id: 'docentes', rotulo: 'Docentes', icone: Users },
  { id: 'publicacoes', rotulo: 'Publicações', icone: FileText },
  { id: 'orientacoes', rotulo: 'Orientações', icone: Users2 },
  { id: 'bancas', rotulo: 'Bancas', icone: ClipboardList },
  { id: 'projetos_pesquisa', rotulo: 'Projetos', icone: FlaskConical },
  { id: 'premiacoes', rotulo: 'Premiações', icone: Award },
  { id: 'producao_tecnica', rotulo: 'Produção Técnica', icone: Wrench },
  { id: 'patentes', rotulo: 'Patentes', icone: Lightbulb },
  { id: 'eventos', rotulo: 'Eventos', icone: Calendar },
]

const ITENS_POR_PAGINA = 10

export function RevisaoImportacaoDialog({
  open,
  onOpenChange,
  resultado,
  onVoltarParaUpload,
  onGravacaoSucesso,
  supabaseClient,
}: RevisaoImportacaoDialogProps) {
  // Estado de tabelas selecionadas (todos marcados por padrão)
  const [tabelasSelecionadas, setTabelasSelecionadas] = useState<Record<TabelaAlvoId, boolean>>({
    docentes: true,
    publicacoes: true,
    orientacoes: true,
    bancas: true,
    projetos_pesquisa: true,
    premiacoes: true,
    producao_tecnica: true,
    patentes: true,
    eventos: true,
  })

  // Estados de gravação
  const [gravando, setGravando] = useState(false)
  const [relatorioGravacao, setRelatorioGravacao] = useState<RelatorioGravacaoLattes | null>(null)
  const [erroFatalGravacao, setErroFatalGravacao] = useState<string | null>(null)

  // Aba ativa
  const [abaAtiva, setAbaAtiva] = useState<TabelaAlvoId>('publicacoes')

  // Limite de registros visíveis por tabela (paginação com "carregar mais")
  const [limitesPaginacao, setLimitesPaginacao] = useState<Record<TabelaAlvoId, number>>({
    docentes: ITENS_POR_PAGINA,
    publicacoes: ITENS_POR_PAGINA,
    orientacoes: ITENS_POR_PAGINA,
    bancas: ITENS_POR_PAGINA,
    projetos_pesquisa: ITENS_POR_PAGINA,
    premiacoes: ITENS_POR_PAGINA,
    producao_tecnica: ITENS_POR_PAGINA,
    patentes: ITENS_POR_PAGINA,
    eventos: ITENS_POR_PAGINA,
  })

  // Processa mapeamento das tabelas
  const dadosPorTabela: Record<TabelaAlvoId, TabelaRevisaoAgrupada> | null = useMemo(() => {
    if (!resultado) return null
    return mapearDadosParaRevisao(resultado)
  }, [resultado])

  // Contagens totais globais
  const totaisGlobais = useMemo(() => {
    if (!dadosPorTabela) {
      return { inseridos: 0, atualizados: 0, ignorados: 0, tabelasMarcadas: 0 }
    }
    let inseridos = 0
    let atualizados = 0
    let ignorados = 0
    let tabelasMarcadas = 0

    TABELAS_ORDEM.forEach(({ id }) => {
      const marcada = tabelasSelecionadas[id]
      if (marcada) {
        tabelasMarcadas++
        inseridos += dadosPorTabela[id].inseridos
        atualizados += dadosPorTabela[id].atualizados
        ignorados += dadosPorTabela[id].ignorados
      }
    })

    return { inseridos, atualizados, ignorados, tabelasMarcadas }
  }, [dadosPorTabela, tabelasSelecionadas])

  const toggleTabela = (id: TabelaAlvoId) => {
    if (gravando) return
    setTabelasSelecionadas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const alternarTodasTabelas = (marcarTodas: boolean) => {
    if (gravando) return
    setTabelasSelecionadas({
      docentes: marcarTodas,
      publicacoes: marcarTodas,
      orientacoes: marcarTodas,
      bancas: marcarTodas,
      projetos_pesquisa: marcarTodas,
      premiacoes: marcarTodas,
      producao_tecnica: marcarTodas,
      patentes: marcarTodas,
      eventos: marcarTodas,
    })
  }

  const carregarMaisItens = (tabelaId: TabelaAlvoId) => {
    setLimitesPaginacao((prev) => ({
      ...prev,
      [tabelaId]: (prev[tabelaId] || ITENS_POR_PAGINA) + ITENS_POR_PAGINA,
    }))
  }

  // Prepara dados para gravação respeitando TODAS as tabelas marcadas
  const itensParaGravar = useMemo(() => {
    if (!resultado) {
      return {
        docentes: [],
        publicacoes: [],
        orientacoes: [],
        bancas: [],
        projetos_pesquisa: [],
        premiacoes: [],
        producao_tecnica: [],
        patentes: [],
        eventos: [],
      }
    }

    const resList = Array.isArray(resultado.resultados) ? resultado.resultados : []

    // 1. Docentes se marcados
    const listaDocentes = tabelasSelecionadas.docentes
      ? resList
          .map((r) => r.docente)
          .filter((d): d is NonNullable<typeof d> => Boolean(d))
          .map(converterLattesDocente)
      : []

    // 2. Publicações se marcadas
    const listaPublicacoes = tabelasSelecionadas.publicacoes
      ? resList
          .flatMap((r) => (Array.isArray(r.publicacoes) ? r.publicacoes : []))
          .map(converterLattesPublicacao)
      : []

    // 3. Orientações se marcadas
    const listaOrientacoes = tabelasSelecionadas.orientacoes
      ? resList.flatMap((r) =>
          (Array.isArray(r.orientacoes) ? r.orientacoes : []).map((ori) =>
            converterLattesOrientacao(ori, {
              id_lattes: r.id_lattes,
              nome: r.nome_docente,
            }),
          ),
        )
      : []

    // 4. Bancas se marcadas
    const listaBancas = tabelasSelecionadas.bancas
      ? resList.flatMap((r) => (Array.isArray(r.bancas) ? r.bancas : [])).map(converterLattesBanca)
      : []

    // 5. Projetos de pesquisa se marcados
    const listaProjetos = tabelasSelecionadas.projetos_pesquisa
      ? resList.flatMap((r) =>
          (Array.isArray(r.projetos) ? r.projetos : []).map((proj) =>
            converterLattesProjeto(proj, {
              id_lattes: r.id_lattes,
              nome: r.nome_docente,
            }),
          ),
        )
      : []

    // 6. Premiações se marcadas
    const listaPremiacoes = tabelasSelecionadas.premiacoes
      ? resList.flatMap((r) =>
          (Array.isArray(r.premiacoes) ? r.premiacoes : []).map((prem) =>
            converterLattesPremiacao(prem, {
              nome: r.nome_docente,
            }),
          ),
        )
      : []

    // 7. Produção técnica se marcada
    const listaProducoesTecnicas = tabelasSelecionadas.producao_tecnica
      ? resList
          .flatMap((r) => (Array.isArray(r.producoes_tecnicas) ? r.producoes_tecnicas : []))
          .map(converterLattesProducaoTecnica)
      : []

    // 8. Patentes se marcadas
    const listaPatentes = tabelasSelecionadas.patentes
      ? resList
          .flatMap((r) => (Array.isArray(r.patentes) ? r.patentes : []))
          .map(converterLattesPatente)
      : []

    // 9. Eventos se marcados
    const listaEventos = tabelasSelecionadas.eventos
      ? resList.flatMap((r) =>
          (Array.isArray(r.eventos) ? r.eventos : []).map((eve) =>
            converterLattesEvento(eve, {
              nome: r.nome_docente,
            }),
          ),
        )
      : []

    return {
      docentes: listaDocentes,
      publicacoes: listaPublicacoes,
      orientacoes: listaOrientacoes,
      bancas: listaBancas,
      projetos_pesquisa: listaProjetos,
      premiacoes: listaPremiacoes,
      producao_tecnica: listaProducoesTecnicas,
      patentes: listaPatentes,
      eventos: listaEventos,
    }
  }, [resultado, tabelasSelecionadas])

  // Contagem de registros a serem processados pelo gravarDadosLattes
  const totalRegistrosAptosGravacao =
    itensParaGravar.docentes.length +
    itensParaGravar.publicacoes.length +
    itensParaGravar.orientacoes.length +
    itensParaGravar.bancas.length +
    itensParaGravar.projetos_pesquisa.length +
    itensParaGravar.premiacoes.length +
    itensParaGravar.producao_tecnica.length +
    itensParaGravar.patentes.length +
    itensParaGravar.eventos.length

  const handleConfirmarEGravar = async () => {
    if (gravando || totaisGlobais.tabelasMarcadas === 0) return

    setGravando(true)
    setErroFatalGravacao(null)
    setRelatorioGravacao(null)

    try {
      const relatorio = await gravarDadosLattes(itensParaGravar, supabaseClient)

      setRelatorioGravacao(relatorio)

      // Notifica o componente pai se ao menos uma tabela gravou com sucesso (inseridos ou atualizados > 0)
      const gravouAlgo =
        relatorio.docentes.inseridos > 0 ||
        relatorio.docentes.atualizados > 0 ||
        relatorio.publicacoes.inseridos > 0 ||
        relatorio.publicacoes.atualizados > 0 ||
        relatorio.orientacoes.inseridos > 0 ||
        relatorio.orientacoes.atualizados > 0 ||
        relatorio.bancas.inseridos > 0 ||
        relatorio.bancas.atualizados > 0 ||
        relatorio.projetos_pesquisa.inseridos > 0 ||
        relatorio.projetos_pesquisa.atualizados > 0 ||
        relatorio.premiacoes.inseridos > 0 ||
        relatorio.premiacoes.atualizados > 0 ||
        relatorio.producao_tecnica.inseridos > 0 ||
        relatorio.producao_tecnica.atualizados > 0 ||
        relatorio.patentes.inseridos > 0 ||
        relatorio.patentes.atualizados > 0 ||
        relatorio.eventos.inseridos > 0 ||
        relatorio.eventos.atualizados > 0

      if (gravouAlgo && onGravacaoSucesso) {
        onGravacaoSucesso(relatorio)
      }
    } catch (err) {
      console.error('Erro ao executar gravação dos dados Lattes:', err)
      setErroFatalGravacao(
        err instanceof Error ? err.message : 'Erro inesperado durante a gravação dos dados.',
      )
    } finally {
      setGravando(false)
    }
  }

  if (!resultado || !dadosPorTabela) {
    return null
  }

  const tabelaAtual = dadosPorTabela[abaAtiva]
  const limiteAtual = limitesPaginacao[abaAtiva] || ITENS_POR_PAGINA
  const itensVisiveis = tabelaAtual.itens.slice(0, limiteAtual)
  const temMaisItens = tabelaAtual.itens.length > limiteAtual

  const handleDialogChange = (novoOpen: boolean) => {
    // Bloqueia fechar durante a gravação
    if (gravando) return
    onOpenChange(novoOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        className="max-w-5xl w-[95vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden"
        onEscapeKeyDown={(e) => {
          if (gravando) {
            e.preventDefault()
          }
        }}
        onPointerDownOutside={(e) => {
          if (gravando) {
            e.preventDefault()
          }
        }}
      >
        <RevisaoErrorBoundary onVoltar={onVoltarParaUpload || (() => onOpenChange(false))}>
          {/* Cabeçalho */}
          <DialogHeader className="p-5 pb-3 border-b bg-slate-50/70 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
                  <Database className="h-5 w-5 text-primary" />
                  Revisão de Importação Lattes
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 mt-1">
                  Revise os dados extraídos dos currículos e selecione as tabelas para confirmação e
                  gravação no banco Supabase.
                </DialogDescription>
              </div>

              {/* Badges de Contagem Geral */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs px-2.5 py-1"
                  title={`Itens únicos no quadriênio (${ANO_INICIO}-${ANO_FIM}) mapeados para inclusão`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  <strong>{totaisGlobais.inseridos}</strong> novos a inserir
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-sky-50 text-sky-800 border-sky-200 text-xs px-2.5 py-1"
                  title="Registros para atualização cadastral no banco"
                >
                  <Info className="h-3.5 w-3.5 mr-1 text-sky-600" />
                  <strong>{totaisGlobais.atualizados}</strong> a atualizar
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 border-amber-200 text-xs px-2.5 py-1"
                  title="Descartados pelo filtro do quadriênio ou deduplicação interna de título + ano"
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-600" />
                  <strong>{totaisGlobais.ignorados}</strong> ignorados / duplicados
                </Badge>
              </div>
            </div>

            {/* Banner explicativo de escopo de gravação e ações de marcação */}
            <div className="mt-3 flex items-center justify-between bg-blue-50/80 border border-blue-200/80 rounded-md px-3 py-2 text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Subetapa 2C — Gravação Completa no Banco:</strong> Disponível para todas
                  as <strong>9 tabelas</strong> do sistema. {resultado.curriculosProcessadosCount}{' '}
                  currículo(s) pronto(s) para sincronização.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => alternarTodasTabelas(true)}
                  disabled={gravando}
                  className="text-primary hover:underline text-[11px] font-medium disabled:opacity-50"
                >
                  Marcar todas
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => alternarTodasTabelas(false)}
                  disabled={gravando}
                  className="text-slate-500 hover:text-slate-700 text-[11px] disabled:opacity-50"
                >
                  Desmarcar todas
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Corpo principal: Navegação por abas de tabelas + Amostra de Dados */}
          <div className="flex-1 overflow-hidden p-5 flex flex-col">
            <Tabs
              value={abaAtiva}
              onValueChange={(val) => setAbaAtiva(val as TabelaAlvoId)}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Barra de Seleção de Tabelas */}
              <div className="overflow-x-auto pb-2 shrink-0 border-b">
                <TabsList className="bg-slate-100 p-1 h-auto flex flex-nowrap w-max min-w-full justify-start gap-1">
                  {TABELAS_ORDEM.map(({ id, rotulo, icone: Icone }) => {
                    const info = dadosPorTabela[id]
                    const marcada = tabelasSelecionadas[id]

                    return (
                      <div
                        key={id}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                          abaAtiva === id ? 'bg-white shadow-sm' : 'hover:bg-slate-200/60'
                        }`}
                      >
                        <Checkbox
                          id={`chk-${id}`}
                          checked={marcada}
                          onCheckedChange={() => toggleTabela(id)}
                          disabled={gravando}
                          className="data-[state=checked]:bg-primary h-3.5 w-3.5"
                          title="Incluir/excluir tabela da gravação"
                        />
                        <TabsTrigger
                          value={id}
                          className={`text-xs px-2 py-1 gap-1.5 flex items-center shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold ${
                            !marcada ? 'opacity-50' : ''
                          }`}
                        >
                          <Icone className="h-3.5 w-3.5" />
                          <span>{rotulo}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              info.inseridos > 0
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {info.inseridos}
                          </span>
                        </TabsTrigger>
                      </div>
                    )
                  })}
                </TabsList>
              </div>

              {/* Painéis de Conteúdo por Tabela - Cada aba isolada com RevisaoBoundary */}
              {TABELAS_ORDEM.map(({ id, rotulo }) => {
                const dados = dadosPorTabela[id] || {
                  titulo: rotulo,
                  descricao: '',
                  inseridos: 0,
                  atualizados: 0,
                  ignorados: 0,
                  itens: [],
                }
                const marcada = Boolean(tabelasSelecionadas[id])
                const itensSecao = Array.isArray(dados.itens) ? dados.itens : []
                const limiteSecao = limitesPaginacao[id] || ITENS_POR_PAGINA
                const itensVisiveisSecao = itensSecao.slice(0, limiteSecao)
                const temMaisItensSecao = itensSecao.length > limiteSecao

                return (
                  <TabsContent
                    key={id}
                    value={id}
                    className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden"
                  >
                    <RevisaoBoundary nomeSecao={dados.titulo || rotulo}>
                      {/* Resumo da Tabela Selecionada */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 shrink-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">
                              {dados.titulo}
                            </h3>
                            {!marcada && (
                              <Badge
                                variant="outline"
                                className="text-slate-400 border-slate-300 text-[10px]"
                              >
                                Excluída da gravação
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{dados.descricao}</p>
                        </div>

                        {/* Contadores da seção */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            Total encontrados:{' '}
                            <strong>{(dados.inseridos || 0) + (dados.ignorados || 0)}</strong>
                          </span>
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                            A inserir: <strong>{dados.inseridos || 0}</strong>
                          </span>
                          <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                            Ignorados: <strong>{dados.ignorados || 0}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Tabela de Amostra Paginada */}
                      <div className="flex-1 overflow-auto border rounded-md bg-white">
                        {itensSecao.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                            <Filter className="h-8 w-8 text-slate-300 mb-2" />
                            <p className="text-sm font-medium">
                              Nenhum registro encontrado nesta seção.
                            </p>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                              Não foram detectados itens para esta categoria no recorte do
                              quadriênio ({ANO_INICIO}–{ANO_FIM}) nos currículos processados.
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                              {renderCabecalhoTabela(id)}
                            </TableHeader>
                            <TableBody>{renderLinhasTabela(id, itensVisiveisSecao)}</TableBody>
                          </Table>
                        )}
                      </div>

                      {/* Rodapé da tabela com paginação "Carregar mais" */}
                      {itensSecao.length > 0 && (
                        <div className="pt-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
                          <span>
                            Exibindo {Math.min(limiteSecao, itensSecao.length)} de{' '}
                            {itensSecao.length} registros
                          </span>
                          {temMaisItensSecao && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => carregarMaisItens(id)}
                              className="h-8 gap-1.5 text-xs text-slate-700"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                              Carregar mais 10 registros
                            </Button>
                          )}
                        </div>
                      )}
                    </RevisaoBoundary>
                  </TabsContent>
                )
              })}
            </Tabs>

            {/* Painel de Resultado pós-gravação ou Erro */}
            {relatorioGravacao && (
              <div className="mt-3 p-3.5 rounded-md border bg-slate-50 text-xs space-y-2 shrink-0 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Resultado da gravação:</span>
                  </div>
                  {relatorioGravacao.erros.length > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-800 border-amber-300"
                    >
                      {relatorioGravacao.erros.length} aviso(s)/erro(s) isolado(s)
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {TABELAS_ORDEM.map(({ id, rotulo, icone: Icone }) => {
                    const cont = (relatorioGravacao as any)[id] as
                      | { inseridos: number; atualizados: number; ignorados: number }
                      | undefined
                    const marcada = tabelasSelecionadas[id]

                    return (
                      <div key={id} className="bg-white p-2.5 rounded border border-slate-200">
                        <div className="flex items-center justify-between font-medium text-slate-800 mb-1">
                          <span className="flex items-center gap-1.5">
                            <Icone className="h-3.5 w-3.5 text-primary" />
                            {rotulo}
                          </span>
                          {!marcada && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              Não selecionada
                            </span>
                          )}
                        </div>
                        {marcada && cont ? (
                          <div className="text-slate-600 text-[11px] space-y-0.5">
                            <p>
                              <strong className="text-emerald-700 font-semibold">
                                {cont.inseridos} inserido(s)
                              </strong>
                              ,{' '}
                              <strong className="text-sky-700 font-semibold">
                                {cont.atualizados} atualizado(s)
                              </strong>
                              {cont.ignorados > 0 && (
                                <span className="text-slate-400">
                                  {' '}
                                  ({cont.ignorados} ignorado(s))
                                </span>
                              )}
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-[11px]">
                            Tabela excluída pelo usuário.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Erros detalhados se houver */}
                {relatorioGravacao.erros.length > 0 && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded p-2 text-[11px] text-amber-900 max-h-24 overflow-y-auto">
                    <p className="font-semibold mb-1">Ocorrências durante a gravação:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {relatorioGravacao.erros.map((e, idx) => (
                        <li key={idx}>
                          <span className="capitalize font-medium">[{e.tabela}]</span> {e.item}:{' '}
                          {e.mensagem}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {erroFatalGravacao && (
              <div className="mt-3 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 shrink-0">
                <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Falha na gravação: {erroFatalGravacao}</span>
              </div>
            )}
          </div>

          {/* Rodapé da Janela Modal */}
          <DialogFooter className="p-4 border-t bg-slate-50/80 shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {onVoltarParaUpload && !gravando && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onVoltarParaUpload}
                  disabled={gravando}
                  className="text-xs"
                >
                  Voltar ao upload
                </Button>
              )}
              <span className="hidden sm:inline">
                {totaisGlobais.tabelasMarcadas} de {TABELAS_ORDEM.length} tabelas selecionadas
                {totalRegistrosAptosGravacao > 0 && (
                  <> ({totalRegistrosAptosGravacao} registros aptos para gravação)</>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={gravando}
                onClick={() => onOpenChange(false)}
              >
                {relatorioGravacao ? 'Concluir e fechar' : 'Fechar revisão'}
              </Button>

              {/* Botão de gravação: habilitado quando há tabelas marcadas */}
              {totaisGlobais.tabelasMarcadas === 0 ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          type="button"
                          size="sm"
                          disabled
                          className="gap-2 cursor-not-allowed bg-slate-300 text-slate-600 hover:bg-slate-300"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Confirmar e gravar
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs text-center bg-slate-900 text-white"
                    >
                      <p className="text-xs font-medium">Selecione ao menos uma tabela</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmarEGravar}
                  disabled={gravando}
                  className="gap-2 bg-primary hover:bg-primary/90 text-white min-w-[170px]"
                >
                  {gravando ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Gravando...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Confirmar e gravar ({totalRegistrosAptosGravacao} registros)
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </RevisaoErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}

/** Renderiza o cabeçalho correspondente à tabela */
function renderCabecalhoTabela(tabelaId: TabelaAlvoId) {
  switch (tabelaId) {
    case 'docentes':
      return (
        <TableRow>
          <TableHead className="w-[30%]">Nome do Docente</TableHead>
          <TableHead className="w-[18%]">ID Lattes</TableHead>
          <TableHead className="w-[18%]">ORCID</TableHead>
          <TableHead className="w-[20%]">Instituição / Vínculo</TableHead>
          <TableHead className="w-[14%]">E-mail</TableHead>
        </TableRow>
      )
    case 'publicacoes':
      return (
        <TableRow>
          <TableHead className="w-[12%]">Tipo</TableHead>
          <TableHead className="w-[40%]">Título</TableHead>
          <TableHead className="w-[8%]">Ano</TableHead>
          <TableHead className="w-[20%]">Periódico / Livro / Editora</TableHead>
          <TableHead className="w-[20%]">Autores</TableHead>
        </TableRow>
      )
    case 'orientacoes':
      return (
        <TableRow>
          <TableHead className="w-[15%]">Nível / Tipo</TableHead>
          <TableHead className="w-[30%]">Título do Trabalho</TableHead>
          <TableHead className="w-[18%]">Orientando</TableHead>
          <TableHead className="w-[15%]">Instituição</TableHead>
          <TableHead className="w-[10%]">Ano</TableHead>
          <TableHead className="w-[12%]">Situação</TableHead>
        </TableRow>
      )
    case 'bancas':
      return (
        <TableRow>
          <TableHead className="w-[12%]">Nível</TableHead>
          <TableHead className="w-[38%]">Título da Banca / Trabalho</TableHead>
          <TableHead className="w-[20%]">Candidato</TableHead>
          <TableHead className="w-[20%]">Instituição</TableHead>
          <TableHead className="w-[10%]">Ano</TableHead>
        </TableRow>
      )
    case 'projetos_pesquisa':
      return (
        <TableRow>
          <TableHead className="w-[40%]">Nome do Projeto</TableHead>
          <TableHead className="w-[12%]">Período</TableHead>
          <TableHead className="w-[12%]">Situação</TableHead>
          <TableHead className="w-[14%]">Papel</TableHead>
          <TableHead className="w-[22%]">Financiadores</TableHead>
        </TableRow>
      )
    case 'premiacoes':
      return (
        <TableRow>
          <TableHead className="w-[45%]">Nome da Premiação / Título</TableHead>
          <TableHead className="w-[12%]">Ano</TableHead>
          <TableHead className="w-[43%]">Entidade Promotora</TableHead>
        </TableRow>
      )
    case 'producao_tecnica':
      return (
        <TableRow>
          <TableHead className="w-[18%]">Tipo</TableHead>
          <TableHead className="w-[42%]">Título da Produção Técnica</TableHead>
          <TableHead className="w-[10%]">Ano</TableHead>
          <TableHead className="w-[30%]">Autores / Finalidade</TableHead>
        </TableRow>
      )
    case 'patentes':
      return (
        <TableRow>
          <TableHead className="w-[40%]">Título da Patente</TableHead>
          <TableHead className="w-[15%]">Registro / Código</TableHead>
          <TableHead className="w-[10%]">Ano</TableHead>
          <TableHead className="w-[15%]">Categoria</TableHead>
          <TableHead className="w-[20%]">Instituição de Depósito</TableHead>
        </TableRow>
      )
    case 'eventos':
      return (
        <TableRow>
          <TableHead className="w-[16%]">Tipo</TableHead>
          <TableHead className="w-[32%]">Nome do Evento</TableHead>
          <TableHead className="w-[32%]">Título Apresentado / Trabalho</TableHead>
          <TableHead className="w-[8%]">Ano</TableHead>
          <TableHead className="w-[12%]">Local</TableHead>
        </TableRow>
      )
  }
}

/** Renderiza texto de forma segura ou travessão '—' se nulo/vazio */
function textoSeguro(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (Array.isArray(val)) {
    const limpo = val.filter((x) => x !== null && x !== undefined && String(x).trim() !== '')
    return limpo.length > 0 ? limpo.join(', ') : '—'
  }
  const str = String(val).trim()
  return str.length > 0 ? str : '—'
}

/** Renderiza as linhas dos registros correspondentes */
function renderLinhasTabela(tabelaId: TabelaAlvoId, itens: any[]) {
  if (!Array.isArray(itens)) return null

  switch (tabelaId) {
    case 'docentes':
      return itens.map((d: ItemAmostraDocente, idx: number) => {
        const item = d ?? ({} as Partial<ItemAmostraDocente>)
        const key = item.id ?? `docente-${idx}`
        return (
          <TableRow key={key}>
            <TableCell className="font-medium text-slate-900">{textoSeguro(item.nome)}</TableCell>
            <TableCell className="font-mono text-xs text-slate-600">
              {textoSeguro(item.id_lattes)}
            </TableCell>
            <TableCell className="font-mono text-xs text-slate-600">
              {textoSeguro(item.orcid)}
            </TableCell>
            <TableCell className="text-slate-600">{textoSeguro(item.instituicao)}</TableCell>
            <TableCell className="text-slate-600 text-xs">{textoSeguro(item.email)}</TableCell>
          </TableRow>
        )
      })

    case 'publicacoes':
      return itens.map((p: ItemAmostraPublicacao, idx: number) => {
        const item = p ?? ({} as Partial<ItemAmostraPublicacao>)
        const key = item.id ?? `pub-${idx}`
        const tipoStr = String(item.tipo ?? '').toUpperCase()
        const doiStr = item.doi ? String(item.doi).trim() : ''
        const autoresStr = textoSeguro(item.autores)
        return (
          <TableRow key={key}>
            <TableCell>
              <Badge
                variant="outline"
                className={`text-[10px] uppercase font-semibold ${
                  tipoStr === 'ARTIGO'
                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                    : tipoStr === 'LIVRO'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                }`}
              >
                {textoSeguro(item.tipo)}
              </Badge>
            </TableCell>
            <TableCell className="font-medium text-slate-900">
              {textoSeguro(item.titulo)}
              {doiStr && doiStr !== '-' && doiStr !== '—' && (
                <span className="block text-[11px] font-mono text-slate-400 mt-0.5">
                  DOI: {doiStr}
                </span>
              )}
            </TableCell>
            <TableCell className="text-slate-600 font-mono text-xs">
              {textoSeguro(item.ano)}
            </TableCell>
            <TableCell className="text-slate-600 text-xs">{textoSeguro(item.veiculo)}</TableCell>
            <TableCell className="text-slate-500 text-xs truncate max-w-xs" title={autoresStr}>
              {autoresStr}
            </TableCell>
          </TableRow>
        )
      })

    case 'orientacoes':
      return itens.map((o: ItemAmostraOrientacao, idx: number) => {
        const item = o ?? ({} as Partial<ItemAmostraOrientacao>)
        const key = item.id ?? `ori-${idx}`
        const statusStr = String(item.status ?? '').trim()
        const tipoOri = item.tipo_orientacao ? String(item.tipo_orientacao).trim() : ''
        return (
          <TableRow key={key}>
            <TableCell>
              <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200">
                {textoSeguro(item.tipo)}
              </Badge>
              {tipoOri && tipoOri !== '—' && (
                <span className="block text-[10px] text-slate-400 mt-0.5">{tipoOri}</span>
              )}
            </TableCell>
            <TableCell className="font-medium text-slate-900">{textoSeguro(item.titulo)}</TableCell>
            <TableCell className="text-slate-700 font-medium text-xs">
              {textoSeguro(item.orientando)}
            </TableCell>
            <TableCell className="text-slate-600 text-xs">
              {textoSeguro(item.instituicao)}
            </TableCell>
            <TableCell className="text-slate-600 font-mono text-xs">
              {textoSeguro(item.ano)}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  (statusStr ?? '').toLowerCase().includes('conclu')
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {textoSeguro(item.status)}
              </Badge>
            </TableCell>
          </TableRow>
        )
      })

    case 'bancas':
      return itens.map((b: ItemAmostraBanca, idx: number) => {
        const item = b ?? ({} as Partial<ItemAmostraBanca>)
        const key = item.id ?? `banca-${idx}`
        return (
          <TableRow key={key}>
            <TableCell>
              <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200">
                {textoSeguro(item.nivel)}
              </Badge>
            </TableCell>
            <TableCell className="font-medium text-slate-900">{textoSeguro(item.titulo)}</TableCell>
            <TableCell className="text-slate-700 text-xs">{textoSeguro(item.candidato)}</TableCell>
            <TableCell className="text-slate-600 text-xs">
              {textoSeguro(item.instituicao)}
            </TableCell>
            <TableCell className="text-slate-600 font-mono text-xs">
              {textoSeguro(item.ano)}
            </TableCell>
          </TableRow>
        )
      })

    case 'projetos_pesquisa':
      return itens.map((proj: ItemAmostraProjeto, idx: number) => {
        const item = proj ?? ({} as Partial<ItemAmostraProjeto>)
        const key = item.id ?? `proj-${idx}`
        const financStr = textoSeguro(item.financiadores)
        const anoIni = item.ano_inicio ? String(item.ano_inicio).trim() : ''
        const anoFim = item.ano_fim ? String(item.ano_fim).trim() : ''
        const periodoStr = anoIni || anoFim ? `${anoIni || '—'} - ${anoFim || 'atual'}` : '—'
        return (
          <TableRow key={key}>
            <TableCell className="font-medium text-slate-900">{textoSeguro(item.nome)}</TableCell>
            <TableCell className="font-mono text-xs text-slate-600">{periodoStr}</TableCell>
            <TableCell className="text-xs text-slate-600">{textoSeguro(item.situacao)}</TableCell>
            <TableCell className="text-xs text-slate-600">
              {textoSeguro(item.responsavel)}
            </TableCell>
            <TableCell className="text-xs text-slate-500 truncate max-w-xs" title={financStr}>
              {financStr}
            </TableCell>
          </TableRow>
        )
      })

    case 'premiacoes':
      return itens.map((pr: ItemAmostraPremiacao, idx: number) => {
        const item = pr ?? ({} as Partial<ItemAmostraPremiacao>)
        const key = item.id ?? `prem-${idx}`
        return (
          <TableRow key={key}>
            <TableCell className="font-medium text-slate-900">{textoSeguro(item.nome)}</TableCell>
            <TableCell className="font-mono text-xs text-slate-600">
              {textoSeguro(item.ano)}
            </TableCell>
            <TableCell className="text-slate-600 text-xs">{textoSeguro(item.entidade)}</TableCell>
          </TableRow>
        )
      })

    case 'producao_tecnica':
      return itens.map((pt: ItemAmostraProducaoTecnica, idx: number) => {
        const item = pt ?? ({} as Partial<ItemAmostraProducaoTecnica>)
        const key = item.id ?? `pt-${idx}`
        const finStr = textoSeguro(item.finalidade)
        return (
          <TableRow key={key}>
            <TableCell>
              <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200">
                {textoSeguro(item.tipo)}
              </Badge>
            </TableCell>
            <TableCell className="font-medium text-slate-900">{textoSeguro(item.titulo)}</TableCell>
            <TableCell className="font-mono text-xs text-slate-600">
              {textoSeguro(item.ano)}
            </TableCell>
            <TableCell className="text-slate-500 text-xs truncate max-w-xs" title={finStr}>
              {finStr}
            </TableCell>
          </TableRow>
        )
      })

    case 'patentes':
      return itens.map((pat: ItemAmostraPatente, idx: number) => {
        const item = pat ?? ({} as Partial<ItemAmostraPatente>)
        const key = item.id ?? `pat-${idx}`
        return (
          <TableRow key={key}>
            <TableCell className="font-medium text-slate-900">{textoSeguro(item.titulo)}</TableCell>
            <TableCell className="font-mono text-xs text-slate-600">
              {textoSeguro(item.numero_registro)}
            </TableCell>
            <TableCell className="font-mono text-xs text-slate-600">
              {textoSeguro(item.ano)}
            </TableCell>
            <TableCell className="text-xs text-slate-600">{textoSeguro(item.categoria)}</TableCell>
            <TableCell className="text-xs text-slate-600">
              {textoSeguro(item.instituicao_deposito)}
            </TableCell>
          </TableRow>
        )
      })

    case 'eventos':
      return itens.map((e: ItemAmostraEvento, idx: number) => {
        const item = e ?? ({} as Partial<ItemAmostraEvento>)
        const key = item.id ?? `evento-${idx}`
        const tipoStr = String(item.tipo ?? '')
        const isTrabalho = (tipoStr ?? '').toLowerCase().includes('trabalho')
        return (
          <TableRow key={key}>
            <TableCell>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  isTrabalho
                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {textoSeguro(item.tipo)}
              </Badge>
            </TableCell>
            <TableCell className="font-medium text-slate-900">
              {textoSeguro(item.nome_evento)}
            </TableCell>
            <TableCell className="text-slate-600 text-xs">
              {textoSeguro(item.titulo_trabalho)}
            </TableCell>
            <TableCell className="font-mono text-xs text-slate-600">
              {textoSeguro(item.ano)}
            </TableCell>
            <TableCell className="text-slate-500 text-xs">{textoSeguro(item.cidade)}</TableCell>
          </TableRow>
        )
      })
  }
}
