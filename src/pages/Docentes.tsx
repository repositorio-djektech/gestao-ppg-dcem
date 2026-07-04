import { useState } from 'react'
import useDataStore, { Docente } from '@/stores/useDataStore'
import useAuthStore from '@/stores/useAuthStore'
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
import { Search, Plus, Edit, Trash2 } from 'lucide-react'
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

export default function Docentes() {
  const { docentes, addDocente, updateDocente, deleteDocente } = useDataStore()
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const [formData, setFormData] = useState<Omit<Docente, 'id'>>({
    nome: '',
    scopusId: '',
    indiceH: 0,
    bolsaCnpq: '',
    jdp: false,
    licenca: '',
  })

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  const filtered = docentes.filter((d) => d.nome.toLowerCase().includes(searchTerm.toLowerCase()))
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleOpenDialog = (docente?: Docente) => {
    if (docente) {
      setEditingId(docente.id)
      setFormData(docente)
    } else {
      setEditingId(null)
      setFormData({ nome: '', scopusId: '', indiceH: 0, bolsaCnpq: '', jdp: false, licenca: '' })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateDocente(editingId, formData)
      toast.success('Docente atualizado com sucesso')
    } else {
      addDocente(formData)
      toast.success('Docente adicionado com sucesso')
    }
    setIsDialogOpen(false)
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
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" />{' '}
                  <span className="hidden sm:inline">Novo Docente</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar Docente' : 'Adicionar Docente'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scopusId">Scopus ID</Label>
                      <Input
                        id="scopusId"
                        value={formData.scopusId}
                        onChange={(e) => setFormData({ ...formData, scopusId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="indiceH">Índice-H</Label>
                      <Input
                        id="indiceH"
                        type="number"
                        min="0"
                        value={formData.indiceH}
                        onChange={(e) =>
                          setFormData({ ...formData, indiceH: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bolsaCnpq">Bolsa CNPq</Label>
                    <Input
                      id="bolsaCnpq"
                      placeholder="Ex: PQ 1A, DT 2..."
                      value={formData.bolsaCnpq}
                      onChange={(e) => setFormData({ ...formData, bolsaCnpq: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                    <div className="space-y-0.5">
                      <Label>Indicado como JDP?</Label>
                      <p className="text-xs text-slate-500">Jovem Doutor Pesquisador</p>
                    </div>
                    <Switch
                      checked={formData.jdp}
                      onCheckedChange={(c) => setFormData({ ...formData, jdp: c })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenca">Licença Saúde/Parental</Label>
                    <Input
                      id="licenca"
                      placeholder="Ex: Parental (6 meses)"
                      value={formData.licenca}
                      onChange={(e) => setFormData({ ...formData, licenca: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Salvar Docente</Button>
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
            <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Nome do Docente</TableHead>
                <TableHead className="font-semibold text-slate-700">Scopus ID</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Índice-H</TableHead>
                <TableHead className="font-semibold text-slate-700">Bolsa CNPq</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">JDP</TableHead>
                <TableHead className="font-semibold text-slate-700">Licença</TableHead>
                {canEdit && (
                  <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length > 0 ? (
                paginated.map((d) => (
                  <TableRow key={d.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">{d.nome}</TableCell>
                    <TableCell className="text-slate-500 font-mono text-sm">
                      {d.scopusId || '-'}
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-700">
                      {d.indiceH}
                    </TableCell>
                    <TableCell>
                      {d.bolsaCnpq ? (
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          {d.bolsaCnpq}
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
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(d)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4 text-slate-400 hover:text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (confirm('Remover este docente?')) {
                              deleteDocente(d.id)
                              toast.success('Docente removido')
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-slate-400 hover:text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="h-32 text-center text-slate-500">
                    Nenhum docente encontrado para os filtros atuais.
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
    </div>
  )
}
