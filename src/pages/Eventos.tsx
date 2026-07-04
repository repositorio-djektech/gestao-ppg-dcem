import { useState } from 'react'
import useDataStore, { Evento } from '@/stores/useDataStore'
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
import { Label } from '@/components/ui/label'
import { Search, Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function Eventos() {
  const { eventos, addEvento, updateEvento, deleteEvento } = useDataStore()
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState<Omit<Evento, 'id'>>({
    docente: '',
    evento: '',
    localData: '',
    papel: '',
  })

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  const filtered = eventos.filter(
    (e) =>
      e.evento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.docente.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleOpenDialog = (ev?: Evento) => {
    if (ev) {
      setEditingId(ev.id)
      setFormData(ev)
    } else {
      setEditingId(null)
      setFormData({ docente: '', evento: '', localData: '', papel: '' })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateEvento(editingId, formData)
      toast.success('Evento atualizado')
    } else {
      addEvento(formData)
      toast.success('Evento registrado')
    }
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organização de Eventos</h1>
          <p className="text-slate-500 text-sm mt-1">
            Participação destacada do corpo docente em eventos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar evento/docente..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />{' '}
                  <span className="hidden sm:inline">Registrar Evento</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar' : 'Registrar'} Evento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Docente</Label>
                    <Input
                      value={formData.docente}
                      onChange={(e) => setFormData({ ...formData, docente: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Evento</Label>
                    <Input
                      value={formData.evento}
                      onChange={(e) => setFormData({ ...formData, evento: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Local e Data</Label>
                    <Input
                      placeholder="Ex: Rio de Janeiro - Nov/2025"
                      value={formData.localData}
                      onChange={(e) => setFormData({ ...formData, localData: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Papel na Organização</Label>
                    <Input
                      placeholder="Ex: Presidente da Comissão Científica"
                      value={formData.papel}
                      onChange={(e) => setFormData({ ...formData, papel: e.target.value })}
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
              <TableHead className="w-[20%] font-semibold text-slate-700">Docente</TableHead>
              <TableHead className="w-[30%] font-semibold text-slate-700">Nome do Evento</TableHead>
              <TableHead className="font-semibold text-slate-700">Local e Data</TableHead>
              <TableHead className="font-semibold text-slate-700">Papel na Organização</TableHead>
              {canEdit && (
                <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((e) => (
                <TableRow key={e.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900">{e.docente}</TableCell>
                  <TableCell className="text-slate-700">{e.evento}</TableCell>
                  <TableCell className="text-slate-600">{e.localData}</TableCell>
                  <TableCell className="text-slate-600 font-medium">{e.papel}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(e)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4 text-slate-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (confirm('Remover?')) deleteEvento(e.id)
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
                  Nenhum evento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
