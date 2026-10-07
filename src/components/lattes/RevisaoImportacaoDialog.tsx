import { useState, useMemo } from 'react'
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

export interface RevisaoImportacaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resultado: ResultadoProcessamentoLattes | null
  onVoltarParaUpload?: () => void
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
    setTabelasSelecionadas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const alternarTodasTabelas = (marcarTodas: boolean) => {
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

  if (!resultado || !dadosPorTabela) {
    return null
  }

  const tabelaAtual = dadosPorTabela[abaAtiva]
  const limiteAtual = limitesPaginacao[abaAtiva] || ITENS_POR_PAGINA
  const itensVisiveis = tabelaAtual.itens.slice(0, limiteAtual)
  const temMaisItens = tabelaAtual.itens.length > limiteAtual

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Cabeçalho */}
        <DialogHeader className="p-5 pb-3 border-b bg-slate-50/70 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
                <Database className="h-5 w-5 text-primary" />
                Revisão de Importação Lattes
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-1">
                Revise os dados extraídos dos currículos em memória antes de gravar. Filtre quais
                tabelas deseja incluir.
              </DialogDescription>
            </div>

            {/* Badges de Contagem Geral */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs px-2.5 py-1"
                title="Itens únicos no quadriênio (2022-2025) mapeados para inclusão"
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

          {/* Banner explicativo de modo de simulação / Etapa 1C */}
          <div className="mt-3 flex items-center justify-between bg-blue-50/80 border border-blue-200/80 rounded-md px-3 py-2 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                <strong>Modo em memória (Subetapa 1C):</strong>{' '}
                {resultado.curriculosProcessadosCount} currículo(s) analisado(s). Nenhuma gravação
                no banco de dados ocorre nesta etapa.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => alternarTodasTabelas(true)}
                className="text-primary hover:underline text-[11px] font-medium"
              >
                Marcar todas
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => alternarTodasTabelas(false)}
                className="text-slate-500 hover:text-slate-700 text-[11px]"
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

            {/* Painéis de Conteúdo por Tabela */}
            {TABELAS_ORDEM.map(({ id }) => {
              const dados = dadosPorTabela[id]
              const marcada = tabelasSelecionadas[id]

              return (
                <TabsContent
                  key={id}
                  value={id}
                  className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden"
                >
                  {/* Resumo da Tabela Selecionada */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 shrink-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{dados.titulo}</h3>
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
                        Total encontrados: <strong>{dados.inseridos + dados.ignorados}</strong>
                      </span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        A inserir: <strong>{dados.inseridos}</strong>
                      </span>
                      <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        Ignorados: <strong>{dados.ignorados}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Tabela de Amostra Paginada */}
                  <div className="flex-1 overflow-auto border rounded-md bg-white">
                    {dados.itens.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                        <Filter className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm font-medium">
                          Nenhum registro encontrado nesta seção.
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Não foram detectados itens para esta categoria no recorte do quadriênio
                          (2022–2025) nos currículos processados.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                          {renderCabecalhoTabela(id)}
                        </TableHeader>
                        <TableBody>{renderLinhasTabela(id, itensVisiveis)}</TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Rodapé da tabela com paginação "Carregar mais" */}
                  {dados.itens.length > 0 && (
                    <div className="pt-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
                      <span>
                        Exibindo {Math.min(limiteAtual, dados.itens.length)} de {dados.itens.length}{' '}
                        registros
                      </span>
                      {temMaisItens && (
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
                </TabsContent>
              )
            })}
          </Tabs>
        </div>

        {/* Rodapé da Janela Modal */}
        <DialogFooter className="p-4 border-t bg-slate-50/80 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {onVoltarParaUpload && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onVoltarParaUpload}
                className="text-xs"
              >
                Voltar ao upload
              </Button>
            )}
            <span className="hidden sm:inline">
              {totaisGlobais.tabelasMarcadas} de {TABELAS_ORDEM.length} tabelas selecionadas para
              gravação
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar revisão
            </Button>

            {/* Botão de gravação: visível porém desabilitado com Tooltip na Etapa 1C */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      type="button"
                      size="sm"
                      disabled
                      className="gap-2 cursor-not-allowed bg-slate-400 text-white"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Confirmar e gravar ({totaisGlobais.inseridos} registros)
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-center bg-slate-900 text-white">
                  <p className="text-xs font-medium">A gravação no banco está desabilitada.</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    A persistência real será habilitada na <strong>Etapa 2</strong> após a reconexão
                    da infraestrutura do Supabase PPG-DCEM.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogFooter>
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

/** Renderiza as linhas dos registros correspondentes */
function renderLinhasTabela(tabelaId: TabelaAlvoId, itens: any[]) {
  switch (tabelaId) {
    case 'docentes':
      return itens.map((d: ItemAmostraDocente) => (
        <TableRow key={d.id}>
          <TableCell className="font-medium text-slate-900">{d.nome}</TableCell>
          <TableCell className="font-mono text-xs text-slate-600">{d.id_lattes}</TableCell>
          <TableCell className="font-mono text-xs text-slate-600">{d.orcid}</TableCell>
          <TableCell className="text-slate-600">{d.instituicao}</TableCell>
          <TableCell className="text-slate-600 text-xs">{d.email}</TableCell>
        </TableRow>
      ))

    case 'publicacoes':
      return itens.map((p: ItemAmostraPublicacao) => (
        <TableRow key={p.id}>
          <TableCell>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-semibold ${
                p.tipo === 'ARTIGO'
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : p.tipo === 'LIVRO'
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}
            >
              {p.tipo}
            </Badge>
          </TableCell>
          <TableCell className="font-medium text-slate-900">
            {p.titulo}
            {p.doi && p.doi !== '-' && (
              <span className="block text-[11px] font-mono text-slate-400 mt-0.5">
                DOI: {p.doi}
              </span>
            )}
          </TableCell>
          <TableCell className="text-slate-600 font-mono text-xs">{p.ano}</TableCell>
          <TableCell className="text-slate-600 text-xs">{p.veiculo}</TableCell>
          <TableCell className="text-slate-500 text-xs truncate max-w-xs" title={p.autores}>
            {p.autores}
          </TableCell>
        </TableRow>
      ))

    case 'orientacoes':
      return itens.map((o: ItemAmostraOrientacao) => (
        <TableRow key={o.id}>
          <TableCell>
            <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200">
              {o.tipo}
            </Badge>
            <span className="block text-[10px] text-slate-400 mt-0.5">{o.tipo_orientacao}</span>
          </TableCell>
          <TableCell className="font-medium text-slate-900">{o.titulo}</TableCell>
          <TableCell className="text-slate-700 font-medium text-xs">{o.orientando}</TableCell>
          <TableCell className="text-slate-600 text-xs">{o.instituicao}</TableCell>
          <TableCell className="text-slate-600 font-mono text-xs">{o.ano}</TableCell>
          <TableCell>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                o.status === 'Concluída'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {o.status}
            </Badge>
          </TableCell>
        </TableRow>
      ))

    case 'bancas':
      return itens.map((b: ItemAmostraBanca) => (
        <TableRow key={b.id}>
          <TableCell>
            <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200">
              {b.nivel}
            </Badge>
          </TableCell>
          <TableCell className="font-medium text-slate-900">{b.titulo}</TableCell>
          <TableCell className="text-slate-700 text-xs">{b.candidato}</TableCell>
          <TableCell className="text-slate-600 text-xs">{b.instituicao}</TableCell>
          <TableCell className="text-slate-600 font-mono text-xs">{b.ano}</TableCell>
        </TableRow>
      ))

    case 'projetos_pesquisa':
      return itens.map((proj: ItemAmostraProjeto) => (
        <TableRow key={proj.id}>
          <TableCell className="font-medium text-slate-900">{proj.nome}</TableCell>
          <TableCell className="font-mono text-xs text-slate-600">
            {proj.ano_inicio} - {proj.ano_fim}
          </TableCell>
          <TableCell className="text-xs text-slate-600">{proj.situacao}</TableCell>
          <TableCell className="text-xs text-slate-600">{proj.responsavel}</TableCell>
          <TableCell
            className="text-xs text-slate-500 truncate max-w-xs"
            title={proj.financiadores}
          >
            {proj.financiadores}
          </TableCell>
        </TableRow>
      ))

    case 'premiacoes':
      return itens.map((pr: ItemAmostraPremiacao) => (
        <TableRow key={pr.id}>
          <TableCell className="font-medium text-slate-900">{pr.nome}</TableCell>
          <TableCell className="font-mono text-xs text-slate-600">{pr.ano}</TableCell>
          <TableCell className="text-slate-600 text-xs">{pr.entidade}</TableCell>
        </TableRow>
      ))

    case 'producao_tecnica':
      return itens.map((pt: ItemAmostraProducaoTecnica) => (
        <TableRow key={pt.id}>
          <TableCell>
            <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200">
              {pt.tipo}
            </Badge>
          </TableCell>
          <TableCell className="font-medium text-slate-900">{pt.titulo}</TableCell>
          <TableCell className="font-mono text-xs text-slate-600">{pt.ano}</TableCell>
          <TableCell className="text-slate-500 text-xs truncate max-w-xs" title={pt.finalidade}>
            {pt.finalidade}
          </TableCell>
        </TableRow>
      ))

    case 'patentes':
      return itens.map((pat: ItemAmostraPatente) => (
        <TableRow key={pat.id}>
          <TableCell className="font-medium text-slate-900">{pat.titulo}</TableCell>
          <TableCell className="font-mono text-xs text-slate-600">{pat.numero_registro}</TableCell>
          <TableCell className="font-mono text-xs text-slate-600">{pat.ano}</TableCell>
          <TableCell className="text-xs text-slate-600">{pat.categoria}</TableCell>
          <TableCell className="text-xs text-slate-600">{pat.instituicao_deposito}</TableCell>
        </TableRow>
      ))

    case 'eventos':
      return itens.map((e: ItemAmostraEvento) => (
        <TableRow key={e.id}>
          <TableCell>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                e.tipo.includes('Trabalho')
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {e.tipo}
            </Badge>
          </TableCell>
          <TableCell className="font-medium text-slate-900">{e.nome_evento}</TableCell>
          <TableCell className="text-slate-600 text-xs">{e.titulo_trabalho}</TableCell>
          <TableCell className="font-mono text-xs text-slate-600">{e.ano}</TableCell>
          <TableCell className="text-slate-500 text-xs">{e.cidade}</TableCell>
        </TableRow>
      ))
  }
}
