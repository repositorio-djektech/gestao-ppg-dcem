import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { qualisService, type ResumoQualisPublicacoes } from '@/services/qualis'
import { Badge } from '@/components/ui/badge'
import type { Qualis } from '@/types/database'
import { TablePaginationFooter } from '@/components/crud/TablePaginationFooter'
import { FrameHorizontalScrollbar } from '@/components/crud/FrameHorizontalScrollbar'
import { useAuth } from '@/hooks/use-auth'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Edit, Trash2, Award, BookOpen, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { registrarLog } from '@/services/logs'
import { podeCriarNaTabela, podeEditarRegistro, podeExcluirRegistro } from '@/services/permissoes'

const estratoColors: Record<string, string> = {
  A1: 'bg-emerald-600 text-white',
  A2: 'bg-emerald-500 text-white',
  A3: 'bg-blue-600 text-white',
  A4: 'bg-blue-500 text-white',
  B1: 'bg-amber-500 text-white',
  B2: 'bg-amber-600 text-white',
  B3: 'bg-orange-500 text-white',
  B4: 'bg-orange-600 text-white',
  C: 'bg-slate-500 text-white',
}

export default function QualisPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const destaqueParam = searchParams.get('destaque')

  const { role, profile } = useAuth()
  const [itens, setItens] = useState<Qualis[]>([])
  const [loading, setLoading] = useState(true)
  const [resumo, setResumo] = useState<ResumoQualisPublicacoes>({
    totalEstratos: 0,
    publicacoesClassificadas: 0,
    publicacoesSemEstrato: 0,
    contagemPorEstrato: {},
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState<Qualis | null>(null)
  const [formData, setFormData] = useState({
    estrato: 'A1',
    nome: '',
    descricao: '',
  })

  // Estado para exclusão com propagação
  const [itemParaExcluir, setItemParaExcluir] = useState<Qualis | null>(null)
  const [contagemExclusao, setContagemExclusao] = useState<number | null>(null)
  const [checandoExclusao, setChecandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [destaqueId, setDestaqueId] = useState<string | null>(null)
  const jaProcessouDestaqueRef = useRef<string | null>(null)

  const docenteIdLogado = profile?.docente_id
  const canCreate = podeCriarNaTabela(role, 'qualis', docenteIdLogado)
  const isCapes = role === 'capes'
  const isStaff = role === 'suporte' || role === 'coordenador' || role === 'auxiliar'
  const hasActionsColumn = !isCapes && isStaff
  const PER_PAGE = 20

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const [lista, resumoPubs] = await Promise.all([
        qualisService.list(),
        qualisService.obterResumoEContagens(),
      ])
      setItens(lista || [])
      setResumo(resumoPubs)
    } catch (err) {
      console.error('Erro ao carregar estratos Qualis:', err)
      toast.error('Erro ao carregar catálogo Qualis.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Destaque vindo de deep-link
  useEffect(() => {
    if (!destaqueParam || loading || itens.length === 0) return
    if (jaProcessouDestaqueRef.current === destaqueParam) return

    const itemAlvo = itens.find((item) => String(item.id) === String(destaqueParam))
    if (!itemAlvo) return

    jaProcessouDestaqueRef.current = destaqueParam
    setSearchTerm('')

    const index = itens.findIndex((item) => String(item.id) === String(destaqueParam))
    const paginaAlvo = Math.floor(index / PER_PAGE) + 1

    setPage(paginaAlvo)
    setDestaqueId(String(itemAlvo.id))

    const novosParams = new URLSearchParams(searchParams)
    novosParams.delete('destaque')
    setSearchParams(novosParams, { replace: true })

    const timer = setTimeout(() => {
      setDestaqueId(null)
    }, 3200)

    return () => clearTimeout(timer)
  }, [destaqueParam, loading, itens, searchParams, setSearchParams])

  const filtered = useMemo(() => {
    const termo = searchTerm
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

    if (!termo) return itens

    return itens.filter((q) => {
      const e = (q.estrato || '').toLowerCase()
      const n = (q.nome || '').toLowerCase()
      const d = (q.descricao || '').toLowerCase()
      return e.includes(termo) || n.includes(termo) || d.includes(termo)
    })
  }, [itens, searchTerm])

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleOpenForm = (item?: Qualis) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        estrato: item.estrato,
        nome: item.nome,
        descricao: item.descricao || '',
      })
    } else {
      setEditingItem(null)
      setFormData({
        estrato: 'A1',
        nome: '',
        descricao: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    const codigoLimpo = (formData.estrato || '').trim().toUpperCase()
    if (!codigoLimpo) {
      toast.error('Informe o código do estrato (ex: A1).')
      return
    }

    setSubmitting(true)
    try {
      if (editingItem) {
        const codigoAntigo = (editingItem.estrato || '').trim()
        const mudouCodigo = codigoAntigo !== codigoLimpo

        // Atualiza o registro no catálogo qualis
        await qualisService.update(editingItem.id, {
          estrato: codigoLimpo,
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
        } as any)

        // Se o código mudou, propaga para todas as publicações em lote
        if (mudouCodigo) {
          const { alteradas } = await qualisService.propagarAlteracaoEstrato(
            codigoAntigo,
            codigoLimpo,
          )
          if (alteradas > 0) {
            toast.success(
              `Estrato atualizado! ${alteradas} publicação(ões) com código "${codigoAntigo}" foram atualizadas para "${codigoLimpo}".`,
            )
          } else {
            toast.success('Estrato atualizado com sucesso.')
          }
        } else {
          toast.success('Estrato atualizado com sucesso.')
        }

        registrarLog({
          acao: 'editar',
          entidade: 'qualis',
          entidade_id: editingItem.id,
          detalhes: {
            estratoAntigo: codigoAntigo,
            estratoNovo: codigoLimpo,
            nome: formData.nome,
          },
        })
      } else {
        // Criar estrato novo: nada a propagar
        await qualisService.create({
          estrato: codigoLimpo,
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
        } as any)

        toast.success(`Estrato "${codigoLimpo}" cadastrado com sucesso.`)
        registrarLog({
          acao: 'criar',
          entidade: 'qualis',
          detalhes: {
            estrato: codigoLimpo,
            nome: formData.nome,
          },
        })
      }

      setIsDialogOpen(false)
      await carregarDados()
    } catch (err: any) {
      console.error('Erro ao salvar estrato Qualis:', err)
      toast.error(err?.message || 'Erro ao salvar estrato.')
    } finally {
      setSubmitting(false)
    }
  }

  // Abertura do diálogo de exclusão com contagem de publicações vinculadas
  const handleSolicitarExclusao = async (item: Qualis) => {
    setItemParaExcluir(item)
    setChecandoExclusao(true)
    try {
      // Contagem exata via service
      const count = await qualisService.contarPublicacoesPorEstrato(item.estrato)
      setContagemExclusao(count)
    } catch (err) {
      console.warn('Erro ao checar publicações antes de excluir:', err)
      // Fallback para contagem do resumo em memória se falhar
      setContagemExclusao(resumo.contagemPorEstrato[item.estrato] || 0)
    } finally {
      setChecandoExclusao(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    if (!itemParaExcluir) return
    setExcluindo(true)
    try {
      const { publicacoesDesvinculadas } = await qualisService.excluirComPropagacao(
        itemParaExcluir.id,
        itemParaExcluir.estrato,
      )

      if (publicacoesDesvinculadas > 0) {
        toast.success(
          `Estrato "${itemParaExcluir.estrato}" excluído. ${publicacoesDesvinculadas} publicação(ões) agora estão sem estrato.`,
        )
      } else {
        toast.success(`Estrato "${itemParaExcluir.estrato}" excluído com sucesso.`)
      }

      registrarLog({
        acao: 'excluir',
        entidade: 'qualis',
        entidade_id: itemParaExcluir.id,
        detalhes: {
          estrato: itemParaExcluir.estrato,
          publicacoesDesvinculadas,
        },
      })

      setItemParaExcluir(null)
      setContagemExclusao(null)
      await carregarDados()
    } catch (err: any) {
      console.error('Erro ao excluir estrato:', err)
      toast.error(err?.message || 'Erro ao excluir estrato.')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="flex flex-col md:h-[calc(100vh-4rem-3rem)] min-h-0 animate-fade-in gap-3 md:gap-4">
      {/* Cabeçalho */}
      <div className="shrink-0 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Award className="h-6 w-6 text-primary shrink-0" />
              <span>Qualis</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Gerencie os estratos Qualis/CAPES de referência do programa e visualize a
              classificação das publicações.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Buscar estrato..."
                className="pl-9 bg-white border-slate-200 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            {canCreate && (
              <Button onClick={() => handleOpenForm()} className="gap-2 shrink-0 h-9 px-4">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Estrato</span>
              </Button>
            )}
          </div>
        </div>

        {/* Resumo acima da tabela conforme Decisão 3:
            "X estratos cadastrados", "Y publicações classificadas" (estrato_qualis não nulo), "Z sem estrato" */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{resumo.totalEstratos}</div>
              <div className="text-xs text-slate-500 font-medium">estratos cadastrados</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-emerald-700">
                {resumo.publicacoesClassificadas}
              </div>
              <div className="text-xs text-slate-500 font-medium">publicações classificadas</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-amber-700">{resumo.publicacoesSemEstrato}</div>
              <div className="text-xs text-slate-500 font-medium">sem estrato</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex flex-col flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div
          ref={tableContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-auto table-scroll-container"
        >
          <Table>
            <TableHeader className="bg-[#e9effc] dark:bg-neutral-900/90 sticky top-0 z-10 backdrop-blur-xs">
              <TableRow className="bg-[#e9effc] hover:bg-[#e9effc]">
                <TableHead className="w-24 font-semibold text-left text-slate-700 bg-[#e9effc] whitespace-nowrap">
                  Estrato
                </TableHead>
                <TableHead className="w-48 font-semibold text-left text-slate-700 bg-[#e9effc] whitespace-nowrap">
                  Nome / Rótulo
                </TableHead>
                <TableHead className="w-36 font-semibold text-left text-slate-700 bg-[#e9effc] whitespace-nowrap">
                  Publicações
                </TableHead>
                <TableHead className="font-semibold text-left text-slate-700 bg-[#e9effc] whitespace-nowrap">
                  Descrição
                </TableHead>
                {hasActionsColumn && (
                  <TableHead className="w-24 text-center font-semibold text-slate-700 bg-[#e9effc] whitespace-nowrap">
                    Ações
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="h-14">
                    {Array.from({ length: hasActionsColumn ? 5 : 4 }).map((_, j) => (
                      <TableCell key={j} className="py-3">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length > 0 ? (
                paginated.map((q) => {
                  const canEditThisItem = podeEditarRegistro(role, docenteIdLogado, 'qualis', q)
                  const canDeleteThisItem = podeExcluirRegistro(role, docenteIdLogado, 'qualis', q)
                  const contagemPubs = resumo.contagemPorEstrato[q.estrato] || 0
                  const estaDestaque = destaqueId !== null && String(q.id) === String(destaqueId)

                  return (
                    <TableRow
                      key={q.id}
                      data-item-id={String(q.id)}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        estaDestaque ? 'linha-destacada-fade bg-amber-100/90' : ''
                      }`}
                    >
                      <TableCell className="font-mono font-bold text-slate-900 w-24">
                        <Badge
                          variant="secondary"
                          className={`border-0 font-mono font-bold text-xs px-2 py-0.5 ${
                            estratoColors[q.estrato] ?? 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {q.estrato}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-medium text-slate-900 w-48">{q.nome}</TableCell>

                      {/* Nova coluna "Publicações" com contagem real */}
                      <TableCell className="w-36">
                        {contagemPubs > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/publicacoes?qualis=${encodeURIComponent(q.estrato)}`)
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                            title={`Ver as ${contagemPubs} publicações classificadas como ${q.estrato}`}
                          >
                            <span>{contagemPubs}</span>
                            <span className="text-[10px] font-normal text-blue-500">pub(s)</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">0</span>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-slate-600">
                        <span className="text-sm text-slate-600 line-clamp-2">
                          {q.descricao || '—'}
                        </span>
                      </TableCell>

                      {hasActionsColumn && (
                        <TableCell className="text-center w-24">
                          <div className="flex items-center justify-center gap-1.5">
                            {canEditThisItem && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenForm(q)}
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                title="Editar estrato"
                              >
                                <Edit className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                            {canDeleteThisItem && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSolicitarExclusao(q)}
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Excluir estrato"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={hasActionsColumn ? 5 : 4}
                    className="h-32 text-center text-slate-500"
                  >
                    Nenhum estrato Qualis encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <FrameHorizontalScrollbar targetRef={tableContainerRef} />
        <TablePaginationFooter
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          targetRef={tableContainerRef}
          totalItems={filtered.length}
        />
      </div>

      {/* Formulário Novo / Editar Estrato Qualis */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-primary font-bold text-lg">
              {editingItem ? 'Editar' : 'Novo'} Estrato Qualis
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="qualis-estrato">
                Código do Estrato <span className="text-destructive">*</span>
              </Label>
              <Input
                id="qualis-estrato"
                value={formData.estrato}
                onChange={(e) =>
                  setFormData({ ...formData, estrato: e.target.value.toUpperCase() })
                }
                placeholder="Ex: A1, A2, B1..."
                className="font-mono uppercase font-bold"
                required
              />
              <p className="text-xs text-slate-500">
                Identificador oficial CAPES. Ao alterar o código de um estrato existente, todas as
                publicações vinculadas serão atualizadas automaticamente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualis-nome">
                Nome / Rótulo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="qualis-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Qualis A1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualis-descricao">Descrição</Label>
              <Textarea
                id="qualis-descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Critérios e notas conceituais do estrato..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar Estrato'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação inteligente antes de excluir estrato */}
      <AlertDialog
        open={itemParaExcluir !== null}
        onOpenChange={(open) => {
          if (!open) {
            setItemParaExcluir(null)
            setContagemExclusao(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {contagemExclusao && contagemExclusao > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : null}
              <span>Confirmar exclusão de estrato Qualis</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm text-slate-600">
              {checandoExclusao ? (
                <span>Verificando vínculo com publicações...</span>
              ) : contagemExclusao && contagemExclusao > 0 ? (
                <>
                  <p className="font-medium text-amber-900 bg-amber-50 p-2.5 rounded border border-amber-200">
                    Este estrato é usado por {contagemExclusao} publicações. Ao excluir, essas
                    publicações ficarão sem estrato.
                  </p>
                  <p>
                    Tem certeza de que deseja excluir o estrato{' '}
                    <strong>"{itemParaExcluir?.estrato}"</strong>? Esta ação não pode ser desfeita.
                  </p>
                </>
              ) : (
                <p>
                  Tem certeza de que deseja remover o estrato{' '}
                  <strong>"{itemParaExcluir?.estrato}"</strong> ({itemParaExcluir?.nome})? Nenhuma
                  publicação vinculada será afetada.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              disabled={checandoExclusao || excluindo}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {excluindo ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
