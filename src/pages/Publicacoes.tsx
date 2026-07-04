import { useState } from 'react'
import useDataStore, { Publicacao } from '@/stores/useDataStore'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

export default function Publicacoes() {
  const { publicacoes, addPublicacao, updatePublicacao, deletePublicacao } = useDataStore()
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 8

  const [formData, setFormData] = useState<Omit<Publicacao, 'id'>>({
    titulo: '',
    autores: '',
    periodico: '',
    ano: 2025,
    doi: '',
    justificativa: '',
  })

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  const filtered = publicacoes.filter((p) => {
    const matchesSearch =
      p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.autores.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesYear = yearFilter === 'all' || p.ano.toString() === yearFilter
    return matchesSearch && matchesYear
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleOpenDialog = (pub?: Publicacao) => {
    if (pub) {
      setEditingId(pub.id)
      setFormData(pub)
    } else {
      setEditingId(null)
      setFormData({ titulo: '', autores: '', periodico: '', ano: 2025, doi: '', justificativa: '' })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updatePublicacao(editingId, formData)
      toast.success('Publicação atualizada')
    } else {
      addPublicacao(formData)
      toast.success('Publicação registrada')
    }
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Publicações</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gerencie artigos e publicações do quadriênio.
          </p>
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
              placeholder="Buscar título/autor..."
              className="pl-9 bg-white"
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
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />{' '}
                  <span className="hidden sm:inline">Nova Publicação</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar' : 'Registrar'} Publicação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Autores</Label>
                    <Input
                      placeholder="Ex: Silva, J.; Mendes, A."
                      value={formData.autores}
                      onChange={(e) => setFormData({ ...formData, autores: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Periódico</Label>
                      <Input
                        value={formData.periodico}
                        onChange={(e) => setFormData({ ...formData, periodico: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ano</Label>
                      <Input
                        type="number"
                        min="2020"
                        value={formData.ano}
                        onChange={(e) => setFormData({ ...formData, ano: Number(e.target.value) })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>DOI</Label>
                    <Input
                      value={formData.doi}
                      onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Justificativa de Impacto</Label>
                    <Textarea
                      rows={3}
                      value={formData.justificativa}
                      onChange={(e) => setFormData({ ...formData, justificativa: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Salvar</Button>
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
                <TableHead className="w-[35%] font-semibold text-slate-700">
                  Título & Autores
                </TableHead>
                <TableHead className="font-semibold text-slate-700">Periódico</TableHead>
                <TableHead className="font-semibold text-slate-700">Ano</TableHead>
                <TableHead className="font-semibold text-slate-700">DOI</TableHead>
                <TableHead className="w-[20%] font-semibold text-slate-700">Impacto</TableHead>
                {canEdit && (
                  <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length > 0 ? (
                paginated.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="font-medium text-slate-900 mb-1">{p.titulo}</div>
                      <div className="text-xs text-slate-500">{p.autores}</div>
                    </TableCell>
                    <TableCell className="text-slate-700">{p.periodico}</TableCell>
                    <TableCell className="font-medium">{p.ano}</TableCell>
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
                          onClick={() => handleOpenDialog(p)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4 text-slate-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (confirm('Remover?')) deletePublicacao(p.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-slate-400" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 5} className="h-32 text-center text-slate-500">
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
    </div>
  )
}
