import { useState, useEffect } from 'react'
import { useCrudData } from '@/hooks/use-crud-data'
import { useAuth } from '@/hooks/use-auth'
import type { CrudService } from '@/services/crud'
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
import { Search, Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { CrudFormDialog } from './CrudFormDialog'
import type { ColumnDef, FieldDef } from './types'

interface CrudPageProps<T extends { id: string }> {
  title: string
  description: string
  service: CrudService<T>
  columns: ColumnDef<T>[]
  fields: FieldDef[]
  emptyForm: Record<string, any>
  searchKey: keyof T
  entityName: string
}

export function CrudPage<T extends { id: string }>({
  title,
  description,
  service,
  columns,
  fields,
  emptyForm,
  searchKey,
  entityName,
}: CrudPageProps<T>) {
  const { profile } = useAuth()
  const { data, loading, create, update, remove } = useCrudData(service)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>(emptyForm)
  const [fieldOptions, setFieldOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({})

  const canEdit = profile?.role === 'admin' || profile?.role === 'editor'
  const canDelete = profile?.role === 'admin'
  const PER_PAGE = 10

  useEffect(() => {
    fields.forEach((field) => {
      if (field.optionsLoader) {
        field.optionsLoader().then((opts) => {
          setFieldOptions((prev) => ({ ...prev, [field.key]: opts }))
        })
      }
    })
  }, [fields])

  const filtered = data.filter((item) =>
    String(item[searchKey] ?? '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  )
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const colCount = columns.length + (canEdit ? 1 : 0)

  const handleOpen = (item?: T) => {
    setEditingId(item?.id ?? null)
    setFormData(item ? { ...item } : emptyForm)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    if (formData.link_comprovacao) {
      try {
        new URL(formData.link_comprovacao)
      } catch {
        toast.error('Link de comprovação inválido. Use uma URL válida.')
        setSubmitting(false)
        return
      }
    }
    const submitData = { ...formData }
    delete (submitData as any).id
    try {
      if (editingId) {
        await update(editingId, submitData as any)
        toast.success(`${entityName} atualizado`)
      } else {
        await create(submitData as any)
        toast.success(`${entityName} adicionado`)
      }
      setIsDialogOpen(false)
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este registro?')) return
    try {
      await remove(id)
      toast.success(`${entityName} removido`)
    } catch {
      toast.error('Erro ao remover')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              className="pl-9 bg-white border-slate-200"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>
          {canEdit && (
            <Button onClick={() => handleOpen()} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo {entityName}</span>
            </Button>
          )}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={String(col.key)}
                    className={col.className ?? 'font-semibold text-slate-700'}
                  >
                    {col.label}
                  </TableHead>
                ))}
                {canEdit && (
                  <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: colCount }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length > 0 ? (
                paginated.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    {columns.map((col) => (
                      <TableCell key={String(col.key)} className={col.className}>
                        {col.render ? col.render(item) : String(item[col.key] ?? '-')}
                      </TableCell>
                    ))}
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpen(item)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4 text-slate-400 hover:text-primary" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-slate-400 hover:text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={colCount} className="h-32 text-center text-slate-500">
                    Nenhum registro encontrado.
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
      {canEdit && (
        <CrudFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editingId={editingId}
          fields={fields}
          formData={formData}
          setFormData={setFormData}
          fieldOptions={fieldOptions}
          onSubmit={handleSubmit}
          submitting={submitting}
          entityName={entityName}
        />
      )}
    </div>
  )
}
