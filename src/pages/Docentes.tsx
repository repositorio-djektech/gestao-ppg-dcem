import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrudData } from '@/hooks/use-crud-data'
import { docentesService } from '@/services/docentes'
import type { Docente } from '@/types/database'
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
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Edit, Trash2, Printer, Eye } from 'lucide-react'
import {
  VincularOpenAlexDialog,
  type FonteIdentificador,
} from '@/components/docentes/VincularOpenAlexDialog'
import { VisualizarDocenteDialog } from '@/components/docentes/VisualizarDocenteDialog'
import {
  ModalSelecaoAbasImpressao,
  type DefinicaoAbaImpressao,
} from '@/components/docentes/ModalSelecaoAbasImpressao'
import { type TabKey, type DadosDocenteCompleto } from '@/components/docentes/DocentePrintDocument'
import { imprimirDocenteViaIframe } from '@/lib/docentes/imprimirDocenteIframe'
import {
  User as UserIcon,
  FileText as FileTextIcon,
  Users2 as Users2Icon,
  ClipboardList as ClipboardListIcon,
  FlaskConical as FlaskConicalIcon,
  Award as AwardIcon,
  Wrench as WrenchIcon,
  Lightbulb as LightbulbIcon,
  Calendar as CalendarIcon,
  Plane as PlaneIcon,
  HeartHandshake as HeartHandshakeIcon,
} from 'lucide-react'
import type { OpenAlexAutorCandidato } from '@/lib/openalex/buscar'
import type { ScopusAutorCandidato } from '@/services/scopus'
import { Database } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

const emptyForm: Omit<Docente, 'id'> = {
  nome: '',
  scopus_id: '',
  indice_h: 0,
  bolsa_cnpq: '',
  jdp: false,
  licenca: '',
}

export default function Docentes() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { data: docentes, loading, create, update, remove } = useCrudData(docentesService)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [dialogoVinculoAberto, setDialogoVinculoAberto] = useState(false)
  const [docenteParaVinculo, setDocenteParaVinculo] = useState<Docente | null>(null)
  const [abaInicialVinculo, setAbaInicialVinculo] = useState<FonteIdentificador>('openalex')
  const [docenteParaVisualizar, setDocenteParaVisualizar] = useState<Docente | null>(null)
  const [dialogoVisualizarAberto, setDialogoVisualizarAberto] = useState(false)

  // Estados para Impressão de Docente
  const [modalImprimirAberto, setModalImprimirAberto] = useState(false)
  const [docenteParaImprimir, setDocenteParaImprimir] = useState<Docente | null>(null)
  const [dadosParaImprimir, setDadosParaImprimir] = useState<DadosDocenteCompleto | null>(null)
  const [abasSelecionadasParaImprimir, setAbasSelecionadasParaImprimir] = useState<
    Record<TabKey, boolean>
  >({
    geral: true,
    publicacoes: true,
    orientacoes: true,
    bancas: true,
    projetos: true,
    premiacoes: true,
    producao_tecnica: true,
    patentes: true,
    eventos: true,
    mobilidade: true,
    impacto_social: true,
  })

  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<Omit<Docente, 'id'>>(emptyForm)
  const [idParaExcluir, setIdParaExcluir] = useState<number | string | null>(null)

  const canEdit = profile?.role === 'admin' || profile?.role === 'editor'
  const canDelete = profile?.role === 'admin'
  const PER_PAGE = 10

  const filtered = docentes.filter((d) => d.nome.toLowerCase().includes(searchTerm.toLowerCase()))
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleOpen = (docente?: Docente) => {
    setEditingId(docente?.id ?? null)
    setFormData(docente ?? emptyForm)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingId) {
        await update(editingId, formData)
        toast.success('Docente atualizado')
      } else {
        await create(formData)
        toast.success('Docente adicionado')
      }
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
      toast.success('Docente removido com sucesso')
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setIdParaExcluir(null)
    }
  }

  const handleAbrirVinculo = (docente: Docente, fonte: FonteIdentificador = 'openalex') => {
    setDocenteParaVinculo(docente)
    setAbaInicialVinculo(fonte)
    setDialogoVinculoAberto(true)
  }

  const handleVisualizarDocente = (docente: Docente) => {
    setDocenteParaVisualizar(docente)
    setDialogoVisualizarAberto(true)
  }

  const handleAbrirSelecaoImpressao = (docente: Docente, dadosDocente: DadosDocenteCompleto) => {
    // Requisito anti-empilhamento Radix:
    // NUNCA empilhar dois dialogs Radix simultâneos (causa bloqueio de pointer-events no body).
    // Primeiro fecha o dialog de Visualizar Docente.
    setDialogoVisualizarAberto(false)

    setDocenteParaImprimir(docente)
    setDadosParaImprimir(dadosDocente)
    setAbasSelecionadasParaImprimir({
      geral: true,
      publicacoes: true,
      orientacoes: true,
      bancas: true,
      projetos: true,
      premiacoes: true,
      producao_tecnica: true,
      patentes: true,
      eventos: true,
      mobilidade: true,
      impacto_social: true,
    })

    // Abre o modal de seleção apenas após a desmontagem do diálogo de Visualizar
    // usando requestAnimationFrame / pequeno defer para garantir que a pilha de dialogs Radix liberou o body
    setTimeout(() => {
      setModalImprimirAberto(true)
    }, 100)
  }

  const alternarTodasAbasImpressao = (marcar: boolean) => {
    setAbasSelecionadasParaImprimir({
      geral: marcar,
      publicacoes: marcar,
      orientacoes: marcar,
      bancas: marcar,
      projetos: marcar,
      premiacoes: marcar,
      producao_tecnica: marcar,
      patentes: marcar,
      eventos: marcar,
      mobilidade: marcar,
      impacto_social: marcar,
    })
  }

  const alternarAbaIndividualImpressao = (tab: TabKey, checked: boolean) => {
    setAbasSelecionadasParaImprimir((prev) => ({
      ...prev,
      [tab]: checked,
    }))
  }

  const handleConfirmarImpressao = () => {
    if (!docenteParaImprimir || !dadosParaImprimir) return

    // Fecha o modal de seleção imediatamente
    setModalImprimirAberto(false)

    // Impressão via técnica de iframe oculto independente:
    // Monta um documento HTML completo e autônomo, sem depender de CSS do app,
    // :has() ou setTimeout de animações do Radix.
    imprimirDocenteViaIframe(
      docenteParaImprimir,
      dadosParaImprimir,
      abasSelecionadasParaImprimir,
    ).catch((err) => {
      console.error('Falha ao imprimir via iframe:', err)
    })
  }

  const definicoesAbasImpressao: DefinicaoAbaImpressao[] = [
    { id: 'geral', rotulo: 'Dados Cadastrais', icone: UserIcon, total: 1 },
    {
      id: 'publicacoes',
      rotulo: 'Publicações',
      icone: FileTextIcon,
      total: dadosParaImprimir?.publicacoes.length ?? 0,
    },
    {
      id: 'orientacoes',
      rotulo: 'Orientações',
      icone: Users2Icon,
      total: dadosParaImprimir?.orientacoes.length ?? 0,
    },
    {
      id: 'bancas',
      rotulo: 'Bancas',
      icone: ClipboardListIcon,
      total: dadosParaImprimir?.bancas.length ?? 0,
    },
    {
      id: 'projetos',
      rotulo: 'Projetos',
      icone: FlaskConicalIcon,
      total: dadosParaImprimir?.projetos.length ?? 0,
    },
    {
      id: 'premiacoes',
      rotulo: 'Premiações',
      icone: AwardIcon,
      total: dadosParaImprimir?.premiacoes.length ?? 0,
    },
    {
      id: 'producao_tecnica',
      rotulo: 'Produção Técnica',
      icone: WrenchIcon,
      total: dadosParaImprimir?.producaoTecnica.length ?? 0,
    },
    {
      id: 'patentes',
      rotulo: 'Patentes',
      icone: LightbulbIcon,
      total: dadosParaImprimir?.patentes.length ?? 0,
    },
    {
      id: 'eventos',
      rotulo: 'Eventos',
      icone: CalendarIcon,
      total: dadosParaImprimir?.eventos.length ?? 0,
    },
    {
      id: 'mobilidade',
      rotulo: 'Mobilidade',
      icone: PlaneIcon,
      total: dadosParaImprimir?.mobilidade.length ?? 0,
    },
    {
      id: 'impacto_social',
      rotulo: 'Impacto Social',
      icone: HeartHandshakeIcon,
      total: dadosParaImprimir?.impactoSocial.length ?? 0,
    },
  ]

  const handleVincularOpenAlex = async (
    docenteId: number | string,
    candidato: OpenAlexAutorCandidato,
  ) => {
    try {
      // Atualiza o docente no Supabase gravando openalex_id e indice_h (h_index do OpenAlex)
      await update(docenteId, {
        openalex_id: candidato.openalex_id,
        indice_h: candidato.h_index,
      })
      toast.success(
        `Docente vinculado com sucesso ao OpenAlex (${candidato.openalex_id}, h-index ${candidato.h_index})`,
      )
    } catch (err: any) {
      toast.error(`Erro ao vincular perfil OpenAlex: ${err?.message || 'Falha na gravação'}`)
      throw err
    }
  }

  const handleVincularScopus = async (
    docenteId: number | string,
    candidato: ScopusAutorCandidato,
  ) => {
    try {
      // Grava APENAS o campo scopus_id. NÃO atualiza indice_h (entitlement básico não traz h-index)
      await update(docenteId, {
        scopus_id: candidato.scopus_id,
      })
      toast.success(`Docente vinculado com sucesso ao Scopus (Scopus ID: ${candidato.scopus_id})`)
    } catch (err: any) {
      toast.error(`Erro ao vincular perfil Scopus: ${err?.message || 'Falha na gravação'}`)
      throw err
    }
  }

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Docentes</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie o corpo docente permanente.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar docente..."
              className="pl-9 bg-white border-slate-200"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/imprimir/docentes')}
            className="gap-2 shrink-0 bg-white"
            title="Versão para Impressão / Exportar PDF"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </Button>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpen()} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo Docente</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar Docente' : 'Adicionar Docente'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">
                      Nome Completo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Prof. Dr. Carlos Alberto..."
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scopusId">Scopus Author ID</Label>
                      <Input
                        id="scopusId"
                        placeholder="Ex: 57201234567"
                        value={formData.scopus_id}
                        onChange={(e) => setFormData({ ...formData, scopus_id: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="indiceH">Índice-H</Label>
                      <Input
                        id="indiceH"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.indice_h}
                        onChange={(e) =>
                          setFormData({ ...formData, indice_h: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bolsaCnpq">Bolsa de Produtividade CNPq</Label>
                    <Select
                      value={formData.bolsa_cnpq || '__none__'}
                      onValueChange={(v) =>
                        setFormData({ ...formData, bolsa_cnpq: v === '__none__' ? '' : v })
                      }
                    >
                      <SelectTrigger id="bolsaCnpq">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhuma Bolsa —</SelectItem>
                        <SelectItem value="PQ-1A">PQ 1A</SelectItem>
                        <SelectItem value="PQ-1B">PQ 1B</SelectItem>
                        <SelectItem value="PQ-1C">PQ 1C</SelectItem>
                        <SelectItem value="PQ-1D">PQ 1D</SelectItem>
                        <SelectItem value="PQ-2">PQ 2</SelectItem>
                        <SelectItem value="DT-1A">DT 1A</SelectItem>
                        <SelectItem value="DT-1B">DT 1B</SelectItem>
                        <SelectItem value="DT-2">DT 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                    <div className="space-y-0.5">
                      <Label htmlFor="jdp" className="cursor-pointer">
                        Indicado como JDP?
                      </Label>
                      <p className="text-xs text-slate-500">
                        Jovem Doutor Pesquisador (até 5 anos pós-doc)
                      </p>
                    </div>
                    <Switch
                      id="jdp"
                      checked={formData.jdp}
                      onCheckedChange={(c) => setFormData({ ...formData, jdp: c })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenca">Licença Saúde / Parental</Label>
                    <Input
                      id="licenca"
                      placeholder="Ex: Licença Maternidade (6 meses em 2024)"
                      value={formData.licenca}
                      onChange={(e) => setFormData({ ...formData, licenca: e.target.value })}
                    />
                    <p className="text-xs text-slate-500">
                      Impacta na flexibilização dos critérios de produtividade CAPES
                    </p>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      Salvar Docente
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
            <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Nome do Docente</TableHead>
                <TableHead className="font-semibold text-slate-700">Scopus ID</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Índice-H</TableHead>
                <TableHead className="font-semibold text-slate-700">Bolsa CNPq</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">JDP</TableHead>
                <TableHead className="font-semibold text-slate-700">Licença</TableHead>
                <TableHead className="font-semibold text-slate-700">OpenAlex</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length > 0 ? (
                paginated.map((d) => (
                  <TableRow key={d.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">{d.nome}</TableCell>
                    <TableCell>
                      {d.scopus_id ? (
                        canEdit ? (
                          <button
                            type="button"
                            onClick={() => handleAbrirVinculo(d, 'scopus')}
                            className="inline-flex items-center gap-1.5 group cursor-pointer focus:outline-none"
                            title="Clique para gerenciar a vinculação Scopus"
                          >
                            <Badge
                              variant="outline"
                              className="font-mono text-xs text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            >
                              <Database className="h-3 w-3 text-emerald-600 mr-1" />
                              {d.scopus_id}
                            </Badge>
                          </button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs text-emerald-800 border-emerald-300 bg-emerald-50"
                          >
                            <Database className="h-3 w-3 text-emerald-600 mr-1" />
                            {d.scopus_id}
                          </Badge>
                        )
                      ) : canEdit ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAbrirVinculo(d, 'scopus')}
                          className="h-7 px-2 text-xs gap-1 text-orange-700 hover:text-orange-800 border-orange-300 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 transition-colors"
                          title="Buscar autor no Scopus"
                        >
                          <Database className="h-3 w-3 text-orange-600" />
                          <span className="font-medium">Buscar Scopus</span>
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="font-mono text-xs text-orange-700 border-orange-300 bg-orange-50"
                        >
                          Buscar Scopus
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-700">
                      {d.indice_h}
                    </TableCell>
                    <TableCell>
                      {d.bolsa_cnpq ? (
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          {d.bolsa_cnpq}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {d.jdp ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0">
                          Sim
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.licenca ? (
                        <span className="text-sm text-amber-600 font-medium">{d.licenca}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.openalex_id ? (
                        canEdit ? (
                          <button
                            type="button"
                            onClick={() => handleAbrirVinculo(d, 'openalex')}
                            className="inline-flex items-center gap-1.5 group cursor-pointer focus:outline-none"
                            title="Clique para alterar a vinculação OpenAlex"
                          >
                            <Badge
                              variant="outline"
                              className="font-mono text-xs text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 transition-colors"
                            >
                              {d.openalex_id}
                            </Badge>
                          </button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs text-indigo-700 border-indigo-200 bg-indigo-50/70"
                          >
                            {d.openalex_id}
                          </Badge>
                        )
                      ) : canEdit ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAbrirVinculo(d, 'openalex')}
                          className="h-7 px-2.5 text-xs gap-1.5 text-orange-700 hover:text-orange-800 border-orange-300 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 transition-colors"
                          title="Buscar autor no OpenAlex"
                        >
                          <span className="font-medium">Buscar OpenAlex</span>
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="font-mono text-xs text-orange-700 border-orange-300 bg-orange-50"
                        >
                          Buscar OpenAlex
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVisualizarDocente(d)}
                          className="h-8 w-8 text-slate-600 hover:text-primary hover:bg-primary/10"
                          title="Visualizar"
                          aria-label="Visualizar Docente"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpen(d)}
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            title="Editar Docente"
                          >
                            <Edit className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setIdParaExcluir(d.id)}
                            title="Excluir Docente"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                    Nenhum docente encontrado.
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

      <VincularOpenAlexDialog
        open={dialogoVinculoAberto}
        onOpenChange={setDialogoVinculoAberto}
        docente={docenteParaVinculo}
        abaInicial={abaInicialVinculo}
        onVincular={handleVincularOpenAlex}
        onVincularScopus={handleVincularScopus}
      />

      <VisualizarDocenteDialog
        open={dialogoVisualizarAberto}
        onOpenChange={setDialogoVisualizarAberto}
        docente={docenteParaVisualizar}
        onAbrirImpressao={handleAbrirSelecaoImpressao}
      />

      {/* Modal de Seleção de Abas para Impressão - montado no nível da página */}
      <ModalSelecaoAbasImpressao
        open={modalImprimirAberto}
        onOpenChange={setModalImprimirAberto}
        abasDefinicao={definicoesAbasImpressao}
        abasSelecionadas={abasSelecionadasParaImprimir}
        onAlternarTodas={alternarTodasAbasImpressao}
        onAlternarAba={alternarAbaIndividualImpressao}
        onConfirmarImpressao={handleConfirmarImpressao}
      />

      {/* Modal de confirmação antes de excluir docente */}
      <AlertDialog
        open={idParaExcluir !== null}
        onOpenChange={(open) => {
          if (!open) setIdParaExcluir(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de Docente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover este docente? Esta ação não pode ser desfeita.
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
