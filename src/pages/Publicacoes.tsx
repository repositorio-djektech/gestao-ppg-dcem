import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrudData } from '@/hooks/use-crud-data'
import { publicacoesService } from '@/services/publicacoes'
import { discentesService } from '@/services/discentes'
import { egressosService } from '@/services/egressos'
import { docentesService } from '@/services/docentes'
import { coautoresProgramaService } from '@/services/coautores-programa'
import { publicacoesDocentesService } from '@/services/publicacoes-docentes'
import { SeletorCoautoria } from '@/components/publicacoes/SeletorCoautoria'
import { SeletorDocentesAutores } from '@/components/publicacoes/SeletorDocentesAutores'
import type {
  Publicacao,
  Discente,
  Egresso,
  Docente,
  PublicacaoDocente,
  PublicacaoCoautorPrograma,
} from '@/types/database'
import { useAuth } from '@/hooks/use-auth'
import { normalizarTituloAcademico } from '@/lib/normalizacao'
import { Badge } from '@/components/ui/badge'
import { registrarLog } from '@/services/logs'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Edit, Trash2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

const emptyForm: Omit<Publicacao, 'id'> = {
  titulo: '',
  autores: '',
  periodico: '',
  ano: 2025,
  doi: '',
  justificativa: '',
  link_comprovacao: '',
  observacoes: '',
  fator_impacto_jcr: null,
}

export default function Publicacoes() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { data: publicacoes, loading, create, update, remove } = useCrudData(publicacoesService)
  const [searchTerm, setSearchTerm] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<Omit<Publicacao, 'id'>>(emptyForm)
  const [idParaExcluir, setIdParaExcluir] = useState<number | string | null>(null)

  // Discentes e Egressos para coautoria
  const [discentesLista, setDiscentesLista] = useState<Discente[]>([])
  const [egressosLista, setEgressosLista] = useState<Egresso[]>([])
  const [docentesLista, setDocentesLista] = useState<Docente[]>([])
  const [todosCoautores, setTodosCoautores] = useState<PublicacaoCoautorPrograma[]>([])
  const [todasPubsDocentes, setTodasPubsDocentes] = useState<PublicacaoDocente[]>([])

  // Estado dos docentes vinculados na edição atual da publicação
  const [docentesAutoresSelecionados, setDocentesAutoresSelecionados] = useState<number[]>([])

  const carregarRelacionados = async () => {
    try {
      const [disc, eg, docs, coaut, pubsDocs] = await Promise.all([
        discentesService.list(),
        egressosService.list(),
        docentesService.list(),
        coautoresProgramaService.listarTodos(),
        publicacoesDocentesService.listarTodos(),
      ])
      setDiscentesLista(disc)
      setEgressosLista(eg)
      setDocentesLista(docs)
      setTodosCoautores(coaut)
      setTodasPubsDocentes(pubsDocs)
    } catch (err) {
      console.error('Erro ao carregar dados para coautoria e docentes:', err)
    }
  }

  useEffect(() => {
    carregarRelacionados()
  }, [])

  const canEdit = profile?.role === 'admin' || profile?.role === 'editor'
  const canDelete = profile?.role === 'admin'
  const PER_PAGE = 20

  const filtered = publicacoes.filter((p) => {
    const s =
      p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.autores.toLowerCase().includes(searchTerm.toLowerCase())
    return s && (yearFilter === 'all' || p.ano.toString() === yearFilter)
  })
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleOpen = async (pub?: Publicacao) => {
    setEditingId(pub?.id ?? null)
    setFormData(pub ?? emptyForm)
    if (pub?.id) {
      const vinculados = todasPubsDocentes
        .filter((pd) => pd.publicacao_id === pub.id)
        .map((pd) => pd.docente_id)
      setDocentesAutoresSelecionados(vinculados)
    } else {
      setDocentesAutoresSelecionados([])
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    if (formData.link_comprovacao) {
      try {
        new URL(formData.link_comprovacao)
      } catch {
        toast.error('Link de comprovação inválido. Use uma URL válida (ex: https://...).')
        setSubmitting(false)
        return
      }
    }
    const payload = {
      ...formData,
      titulo: normalizarTituloAcademico(formData.titulo),
    }
    try {
      let savedPubId = editingId
      if (editingId) {
        await update(editingId, payload)
        toast.success('Publicação atualizada')
        registrarLog({
          acao: 'editar',
          entidade: 'publicacoes',
          entidade_id: editingId,
          detalhes: {
            titulo: payload.titulo,
            ano: payload.ano,
          },
        })
      } else {
        const criada = (await create(payload)) as any
        savedPubId = criada?.id
        toast.success('Publicação registrada')
        if (criada && criada.id) {
          setEditingId(criada.id)
        }
        registrarLog({
          acao: 'criar',
          entidade: 'publicacoes',
          detalhes: {
            titulo: payload.titulo,
            ano: payload.ano,
          },
        })
      }

      // Sincroniza docentes autores vinculados (idempotente)
      if (savedPubId) {
        await publicacoesDocentesService.sincronizarDocentes(
          savedPubId,
          docentesAutoresSelecionados,
        )
      }

      await carregarRelacionados()
      setIsDialogOpen(false)
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number | string) => {
    try {
      await remove(id)
      toast.success('Publicação removida com sucesso')
      registrarLog({
        acao: 'excluir',
        entidade: 'publicacoes',
        entidade_id: id,
        detalhes: {
          resumo: `Exclusão de publicação ID ${id}`,
        },
      })
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setIdParaExcluir(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Publicações</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie artigos do quadriênio.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select
            value={yearFilter}
            onValueChange={(v) => {
              setYearFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[120px] bg-white">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Anos</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2028">2028</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por título ou autores..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/imprimir/publicacoes')}
            className="gap-2 shrink-0 bg-white"
            title="Versão para Impressão / Exportar PDF"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </Button>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpen()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nova Publicação</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar' : 'Registrar'} Publicação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="pub-titulo">
                      Título do Artigo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="pub-titulo"
                      placeholder="Título completo do artigo científico..."
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pub-autores">
                      Autores <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="pub-autores"
                      placeholder="Ex: Silva, J. A.; Mendes, R. C.; Santos, L. M."
                      value={formData.autores}
                      onChange={(e) => setFormData({ ...formData, autores: e.target.value })}
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Identifique claramente os docentes e discentes do programa
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pub-periodico">
                        Periódico / Revista <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="pub-periodico"
                        placeholder="Ex: Journal of Materials Chemistry A"
                        value={formData.periodico}
                        onChange={(e) => setFormData({ ...formData, periodico: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pub-ano">
                        Ano de Publicação <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="pub-ano"
                        type="number"
                        min="2015"
                        max="2035"
                        value={formData.ano}
                        onChange={(e) => setFormData({ ...formData, ano: Number(e.target.value) })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pub-doi">DOI</Label>
                      <Input
                        id="pub-doi"
                        placeholder="10.1016/j.jmatchem.2025.01.001"
                        value={formData.doi}
                        onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pub-jcr">Fator de Impacto (JCR)</Label>
                      <Input
                        id="pub-jcr"
                        type="number"
                        step="0.001"
                        min="0"
                        max="999.999"
                        placeholder="Ex: 3.850"
                        value={
                          formData.fator_impacto_jcr !== null &&
                          formData.fator_impacto_jcr !== undefined
                            ? formData.fator_impacto_jcr
                            : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value)
                          setFormData({
                            ...formData,
                            fator_impacto_jcr: val !== null && !isNaN(val) ? val : null,
                          })
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pub-justificativa">Justificativa de Impacto e Relevância</Label>{' '}
                    <Textarea
                      id="pub-justificativa"
                      rows={3}
                      placeholder="Contribuição para o quadriênio CAPES, aderência às linhas de pesquisa, colaboração internacional..."
                      value={formData.justificativa}
                      onChange={(e) => setFormData({ ...formData, justificativa: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pub-link">Link de Comprovação / Acesso Aberto</Label>
                    <Input
                      id="pub-link"
                      type="url"
                      placeholder="https://doi.org/... ou https://sciencedirect.com/..."
                      value={formData.link_comprovacao}
                      onChange={(e) =>
                        setFormData({ ...formData, link_comprovacao: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pub-obs">Observações</Label>
                    <Textarea
                      id="pub-obs"
                      rows={2}
                      placeholder="Quartis Qualis, número de citações, projetos associados..."
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    />
                  </div>

                  {/* Seção de Docentes Autores do P²CEM */}
                  <div className="pt-2">
                    <SeletorDocentesAutores
                      autoresTexto={formData.autores}
                      docentes={docentesLista}
                      docentesSelecionadosIds={docentesAutoresSelecionados}
                      onChangeDocentesIds={setDocentesAutoresSelecionados}
                      canEdit={canEdit}
                    />
                  </div>

                  {/* Seção de Coautoria com Orientandos/Egressos do P²CEM */}
                  <div className="pt-2">
                    <SeletorCoautoria
                      publicacaoId={editingId}
                      autoresTexto={formData.autores}
                      fatorImpactoJcr={formData.fator_impacto_jcr}
                      discentes={discentesLista}
                      egressos={egressosLista}
                      usuarioNome={profile?.name || profile?.email || 'Colegiado'}
                      canEdit={canEdit}
                      onCoautoriaAtualizada={carregarRelacionados}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      Salvar Publicação
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 sticky top-0">
              <TableRow>
                <TableHead className="w-[28%] font-semibold text-slate-700">
                  Título & Autores
                </TableHead>
                <TableHead className="font-semibold text-slate-700">Docentes Autores</TableHead>
                <TableHead className="font-semibold text-slate-700">Periódico</TableHead>
                <TableHead className="font-semibold text-slate-700">Ano</TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Fator de Impacto (JCR)
                </TableHead>
                <TableHead className="font-semibold text-slate-700">Coautoria P²CEM</TableHead>
                <TableHead className="font-semibold text-slate-700">DOI</TableHead>
                <TableHead className="w-[14%] font-semibold text-slate-700">Impacto</TableHead>
                {canEdit && (
                  <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
                )}{' '}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: canEdit ? 8 : 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}{' '}
                  </TableRow>
                ))
              ) : paginated.length > 0 ? (
                paginated.map((p) => {
                  const docentesVinculados = todasPubsDocentes
                    .filter((pd) => pd.publicacao_id === p.id)
                    .map((pd) => docentesLista.find((d) => d.id === pd.docente_id))
                    .filter(Boolean) as Docente[]

                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="font-medium text-slate-900 mb-1">
                          {normalizarTituloAcademico(p.titulo)}
                        </div>
                        <div className="text-xs text-slate-500">{p.autores}</div>
                      </TableCell>
                      <TableCell>
                        {docentesVinculados.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {docentesVinculados.map((doc) => {
                              const nomes = doc.nome.trim().split(' ')
                              const primeiro = nomes[0]
                              const ultimo = nomes.length > 1 ? nomes[nomes.length - 1] : ''
                              const exibicao = ultimo ? `${primeiro[0]}. ${ultimo}` : primeiro
                              return (
                                <Badge
                                  key={doc.id}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700 font-normal hover:bg-slate-200"
                                  title={doc.nome}
                                >
                                  {exibicao}
                                </Badge>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-700">{p.periodico}</TableCell>
                      <TableCell className="font-medium">{p.ano}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-800">
                        {p.fator_impacto_jcr !== null && p.fator_impacto_jcr !== undefined
                          ? Number(p.fator_impacto_jcr).toFixed(3)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const coauts = todosCoautores.filter((c) => c.publicacao_id === p.id)
                          const semCoaut = coauts.some((c) => c.tipo === 'sem_coautoria')
                          const confirmados = coauts.filter((c) => c.tipo !== 'sem_coautoria')

                          if (confirmados.length > 0) {
                            return (
                              <Badge className="bg-emerald-600 text-white text-[11px] hover:bg-emerald-700">
                                Confirmada ({confirmados.length})
                              </Badge>
                            )
                          }
                          if (semCoaut) {
                            return (
                              <Badge
                                variant="outline"
                                className="text-slate-500 text-[11px] bg-slate-100"
                              >
                                Sem coautoria
                              </Badge>
                            )
                          }
                          const isJcr =
                            p.fator_impacto_jcr !== null &&
                            p.fator_impacto_jcr !== undefined &&
                            Number(p.fator_impacto_jcr) >= 1.0
                          return isJcr ? (
                            <Badge
                              variant="outline"
                              className="text-amber-700 border-amber-300 bg-amber-50 text-[11px]"
                            >
                              Pendente
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-primary hover:underline cursor-pointer">
                        {p.doi}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 line-clamp-2">
                        {p.justificativa}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpen(p)}
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4 text-primary" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setIdParaExcluir(p.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="h-32 text-center text-slate-500">
                    Nenhuma publicação encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="border-t p-3 bg-slate-50/50">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4 text-sm font-medium text-slate-600">
                    Página {page} de {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={
                      page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Modal de confirmação antes de excluir publicação */}
      <AlertDialog
        open={idParaExcluir !== null}
        onOpenChange={(open) => {
          if (!open) setIdParaExcluir(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de Publicação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover esta publicação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (idParaExcluir !== null) {
                  handleDelete(idParaExcluir)
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
