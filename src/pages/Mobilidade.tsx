import { useState } from 'react'
import { useCrudData } from '@/hooks/use-crud-data'
import { mobilidadeService } from '@/services/mobilidade'
import type { Mobilidade } from '@/types/database'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, Edit, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

const emptyForm: Omit<Mobilidade, 'id'> = {
  tipo: 'docente',
  nome: '',
  instituicao: '',
  periodo: '',
  link: '',
  modalidade: 'nacional',
}

export default function Mobilidade() {
  const { profile } = useAuth()
  const { data: mobilidades, loading, create, update, remove } = useCrudData(mobilidadeService)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('docente')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<Omit<Mobilidade, 'id'>>(emptyForm)

  const canEdit = profile?.role === 'admin' || profile?.role === 'editor'
  const canDelete = profile?.role === 'admin'

  const filtered = mobilidades.filter(
    (m) => m.tipo === activeTab && m.nome.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleOpen = (mob?: Mobilidade) => {
    setEditingId(mob?.id ?? null)
    setFormData(mob ?? { ...emptyForm, tipo: activeTab as Mobilidade['tipo'] })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
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
      toast.error('Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover?')) return
    try {
      await remove(id)
      toast.success('Removido')
    } catch {
      toast.error('Erro ao remover')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mobilidade</h1>
          <p className="text-slate-500 text-sm mt-1">Acompanhamento de intercâmbios e visitas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar nome..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpen()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Adicionar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar' : 'Registrar'} Mobilidade</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Vínculo</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(v) =>
                          setFormData({ ...formData, tipo: v as Mobilidade['tipo'] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="docente">Docente</SelectItem>
                          <SelectItem value="discente">Discente</SelectItem>
                          <SelectItem value="visitante">Visitante</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Modalidade</Label>
                      <Select
                        value={formData.modalidade}
                        onValueChange={(v) =>
                          setFormData({ ...formData, modalidade: v as Mobilidade['modalidade'] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nacional">Nacional</SelectItem>
                          <SelectItem value="internacional">Internacional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instituição de Origem/Destino</Label>
                    <Input
                      value={formData.instituicao}
                      onChange={(e) => setFormData({ ...formData, instituicao: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Input
                      placeholder="Ex: 03/2025 a 12/2025"
                      value={formData.periodo}
                      onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Link de Comprovação</Label>
                    <Input
                      type="url"
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      Salvar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b border-slate-200 rounded-none bg-transparent h-auto p-0 mb-4">
          {['docente', 'discente', 'visitante'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3 pt-2 text-slate-500 data-[state=active]:text-primary font-medium capitalize"
            >
              {tab === 'docente' ? 'Docentes' : tab === 'discente' ? 'Discentes' : 'Visitantes'}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeTab} className="flex-1 mt-0">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex-1 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Nome</TableHead>
                  <TableHead className="font-semibold text-slate-700">Modalidade</TableHead>
                  <TableHead className="font-semibold text-slate-700">Instituição</TableHead>
                  <TableHead className="font-semibold text-slate-700">Período</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">
                    Comprovação
                  </TableHead>
                  {canEdit && (
                    <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: canEdit ? 6 : 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map((m) => (
                    <TableRow key={m.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-900">{m.nome}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            m.modalidade === 'internacional'
                              ? 'border-purple-200 text-purple-700 bg-purple-50'
                              : 'border-emerald-200 text-emerald-700 bg-emerald-50'
                          }
                        >
                          {m.modalidade === 'internacional' ? 'Internacional' : 'Nacional'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{m.instituicao}</TableCell>
                      <TableCell className="text-slate-600">{m.periodo}</TableCell>
                      <TableCell className="text-center">
                        {m.link ? (
                          <a
                            href={m.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpen(m)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4 text-slate-400" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDelete(m.id)}
                            >
                              <Trash2 className="h-4 w-4 text-slate-400" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={canEdit ? 6 : 5}
                      className="h-32 text-center text-slate-500"
                    >
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
