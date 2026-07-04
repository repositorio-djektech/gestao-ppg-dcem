import { useState } from 'react'
import { useCrudData } from '@/hooks/use-crud-data'
import { useAuth } from '@/hooks/use-auth'
import { patentesService } from '@/services/patentes'
import type { Patente } from '@/types/database'
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
import { Search, Plus, Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function Patentes() {
  const { data: patentes, loading, create, update, remove } = useCrudData<Patente>(patentesService)
  const { role } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState<Omit<Patente, 'id'>>({
    titulo: '',
    status: 'Pendente',
    autores: '',
    inpi: '',
  })

  const canEdit = role === 'admin' || role === 'editor'

  const filtered = patentes.filter((p) => p.titulo.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleOpenDialog = (item?: Patente) => {
    if (item) {
      setEditingId(item.id)
      setFormData(item)
    } else {
      setEditingId(null)
      setFormData({ titulo: '', status: 'Pendente', autores: '', inpi: '' })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await update(editingId, formData)
        toast.success('Registro atualizado')
      } else {
        await create(formData)
        toast.success('Registro adicionado')
      }
      setIsDialogOpen(false)
    } catch {
      toast.error('Erro ao salvar registro')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      toast.success('Registro removido')
    } catch {
      toast.error('Erro ao remover registro')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Concessão':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0">
            Concessão
          </Badge>
        )
      case 'Licenciamento':
        return (
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0">
            Licenciamento
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-0">Pendente</Badge>
        )
    }
  }

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patentes e Softwares</h1>
          <p className="text-slate-500 text-sm mt-1">Propriedade intelectual e softwares.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar título..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                  <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Adicionar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Editar' : 'Registrar'} Propriedade Intelectual
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Título da Produção</Label>
                    <Input
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v: any) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Concessão">Concessão</SelectItem>
                        <SelectItem value="Licenciamento">Licenciamento</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Autores (Docentes e Discentes/Egressos)</Label>
                    <Input
                      value={formData.autores}
                      onChange={(e) => setFormData({ ...formData, autores: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número INPI</Label>
                    <Input
                      value={formData.inpi}
                      onChange={(e) => setFormData({ ...formData, inpi: e.target.value })}
                      required
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

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex-1 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-[35%] font-semibold text-slate-700">Título</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
              <TableHead className="w-[30%] font-semibold text-slate-700">Autores</TableHead>
              <TableHead className="font-semibold text-slate-700">Nº INPI</TableHead>
              {canEdit && (
                <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={canEdit ? 5 : 4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length > 0 ? (
              filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900">{p.titulo}</TableCell>
                  <TableCell>{getStatusBadge(p.status)}</TableCell>
                  <TableCell className="text-slate-600 text-sm">{p.autores}</TableCell>
                  <TableCell className="font-mono text-sm text-slate-500">{p.inpi}</TableCell>
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
                          if (confirm('Remover?')) handleDelete(p.id)
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
                <TableCell colSpan={canEdit ? 5 : 4} className="h-32 text-center text-slate-500">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
