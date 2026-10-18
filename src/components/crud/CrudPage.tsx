import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrudData } from '@/hooks/use-crud-data'
import { useAuth } from '@/hooks/use-auth'
import { useIsMobile } from '@/hooks/use-mobile'
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
import { Search, Plus, Edit, Trash2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
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
import { formatarCpf } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { CrudFormDialog } from './CrudFormDialog'
import type { ColumnDef, FieldDef } from './types'
export type { ColumnDef, FieldDef } from './types'
export { CrudPageTypes } from './types'
import { registrarLog } from '@/services/logs'
import {
  podeCriarNaTabela,
  podeEditarRegistro,
  podeExcluirRegistro,
  type TabelaMapeada,
  type ContextoPermissaoRegistro,
} from '@/services/permissoes'

interface CrudPageProps<T extends { id: number | string }> {
  title: string
  description: string
  service: CrudService<T>
  columns: ColumnDef<T>[]
  fields: FieldDef[]
  emptyForm: Record<string, any>
  searchKey: keyof T
  entityName: string
  tableName?: TabelaMapeada
  printModule?: string
  tableHeaderClassName?: string
  tableHeaderRowClassName?: string
  actionsHeaderClassName?: string
  renderCustomActions?: (
    item: T,
    defaultActions: {
      openEdit: () => void
      openDelete: () => void
      canEditItem?: boolean
      canDeleteItem?: boolean
    },
  ) => ReactNode
  formHeaderActions?:
    | ReactNode
    | ((context: {
        isEditing: boolean
        formData: any
        setFormData: React.Dispatch<React.SetStateAction<any>>
      }) => ReactNode)
  getContextoItem?: (item: T) => ContextoPermissaoRegistro | undefined
}

export function CrudPage<T extends { id: number | string }>({
  title,
  description,
  service,
  columns,
  fields,
  emptyForm,
  searchKey,
  entityName,
  tableName,
  printModule,
  tableHeaderClassName,
  tableHeaderRowClassName,
  actionsHeaderClassName,
  renderCustomActions,
  formHeaderActions,
  getContextoItem,
}: CrudPageProps<T>) {
  const navigate = useNavigate()
  const { role, profile } = useAuth()
  const isMobile = useIsMobile()
  const { data, loading, create, update, remove } = useCrudData(service)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>(emptyForm)
  const [idParaExcluir, setIdParaExcluir] = useState<number | string | null>(null)
  const [fieldOptions, setFieldOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({})

  // Inferência ou tabela explícita
  const tabelaEfetiva = tableName || entityName.toLowerCase().replace(/\s+/g, '_')
  const docenteIdLogado = profile?.docente_id

  // Permissão de criação na tabela
  const canCreate = podeCriarNaTabela(role, tabelaEfetiva, docenteIdLogado)

  // O usuário em geral tem direito a ver coluna de ações caso possa editar algo, excluir algo ou haja customActions
  const isCapes = role === 'capes'
  const isStaff = role === 'suporte' || role === 'coordenador' || role === 'auxiliar'
  const isDocente = role === 'docente'
  // Flag geral para saber se a tabela/página deve exibir coluna de ações
  const hasActionsColumn = !isCapes && (isStaff || isDocente || Boolean(renderCustomActions))
  const canDelete = !isCapes && (role === 'suporte' || role === 'coordenador')
  const PER_PAGE = 20

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
  const colCount = columns.length + (hasActionsColumn ? 1 : 0)

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
    // Converter campos com ID vazio em null para respeitar foreign keys no Supabase
    for (const key of Object.keys(submitData)) {
      if (
        (key.endsWith('_id') || key === 'ano_titulacao') &&
        (submitData[key] === '' || submitData[key] === undefined)
      ) {
        submitData[key] = null
      } else if (key.endsWith('_id') && submitData[key] !== null) {
        const parsed = Number(submitData[key])
        if (!isNaN(parsed)) submitData[key] = parsed
      }
    }
    if (typeof submitData.cpf === 'string') {
      submitData.cpf = submitData.cpf.replace(/\D/g, '')
    }
    if (typeof submitData.siape === 'string') {
      submitData.siape = submitData.siape.replace(/\D/g, '')
    }
    try {
      if (editingId) {
        await update(editingId, submitData as any)
        toast.success(`${entityName} atualizado`)
        registrarLog({
          acao: 'editar',
          entidade: entityName.toLowerCase(),
          entidade_id: editingId,
          detalhes: {
            nome: submitData.nome || submitData.titulo || '',
            resumo: `Edição em ${entityName}`,
          },
        })
      } else {
        await create(submitData as any)
        toast.success(`${entityName} adicionado`)
        registrarLog({
          acao: 'criar',
          entidade: entityName.toLowerCase(),
          detalhes: {
            nome: submitData.nome || submitData.titulo || '',
            resumo: `Criação em ${entityName}`,
          },
        })
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
      toast.success(`${entityName} removido com sucesso`)
      registrarLog({
        acao: 'excluir',
        entidade: entityName.toLowerCase(),
        entidade_id: id,
        detalhes: {
          resumo: `Exclusão de ${entityName} ID ${id}`,
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
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar..."
              className="pl-9 bg-white border-slate-200 min-h-[44px] md:min-h-9 text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>
          {printModule && (
            <Button
              variant="outline"
              onClick={() => navigate(`/imprimir/${printModule}`)}
              className="gap-2 shrink-0 bg-white min-h-[44px] md:min-h-9 px-3.5"
              title="Versão para Impressão / Exportar PDF"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </Button>
          )}
          {canCreate && (
            <Button
              onClick={() => handleOpen()}
              className="gap-2 shrink-0 min-h-[44px] md:min-h-9 px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo {entityName}</span>
            </Button>
          )}
        </div>
      </div>
      {/* Contêiner de Dados: Desktop (>= 768px) Tabela clássica intacta; Mobile (< 768px) Cards elegantes sem scroll horizontal */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* VISUALIZAÇÃO DESKTOP: >= 768px (hidden md:block) */}
        <div className="hidden md:block flex-1 overflow-auto">
          <Table>
            <TableHeader className={tableHeaderClassName ?? 'bg-slate-50/80 sticky top-0 z-10'}>
              <TableRow className={tableHeaderRowClassName}>
                {columns.map((col) => (
                  <TableHead
                    key={String(col.key)}
                    className={
                      col.headerClassName ?? col.className ?? 'font-semibold text-slate-700'
                    }
                  >
                    {col.label}
                  </TableHead>
                ))}
                {hasActionsColumn && (
                  <TableHead
                    className={actionsHeaderClassName ?? 'text-right font-semibold text-slate-700'}
                  >
                    Ações
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="h-14">
                    {Array.from({ length: colCount }).map((_, j) => (
                      <TableCell key={j} className="py-3">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length > 0 ? (
                paginated.map((item) => {
                  const ctx = getContextoItem ? getContextoItem(item) : undefined
                  const canEditThisItem = podeEditarRegistro(
                    role,
                    docenteIdLogado,
                    tabelaEfetiva,
                    item,
                    ctx,
                  )
                  const canDeleteThisItem = podeExcluirRegistro(
                    role,
                    docenteIdLogado,
                    tabelaEfetiva,
                    item,
                    ctx,
                  )

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      {columns.map((col) => (
                        <TableCell key={String(col.key)} className={col.className}>
                          {col.render
                            ? col.render(item)
                            : String(col.key).toLowerCase().includes('cpf') && item[col.key]
                              ? formatarCpf(String(item[col.key]))
                              : String(item[col.key] ?? '-')}
                        </TableCell>
                      ))}
                      {hasActionsColumn && (
                        <TableCell className={actionsHeaderClassName ?? 'text-right'}>
                          {renderCustomActions ? (
                            renderCustomActions(item, {
                              openEdit: () => handleOpen(item),
                              openDelete: () => setIdParaExcluir(item.id),
                              canEditItem: canEditThisItem,
                              canDeleteItem: canDeleteThisItem,
                            })
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              {canEditThisItem && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpen(item)}
                                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                              {canDeleteThisItem && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setIdParaExcluir(item.id)}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
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

        {/* VISUALIZAÇÃO MOBILE: < 768px (md:hidden) — Lista de Cards sem scroll horizontal */}
        <div className="block md:hidden flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/40">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border border-slate-200 shadow-xs bg-white min-h-[148px]">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <Skeleton className="h-10 w-24 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : paginated.length > 0 ? (
            paginated.map((item) => {
              // Resolução das colunas mobile:
              // 1. Título principal: primeira coluna com mobileTitle===true, ou primeira coluna visível não desktopOnly
              const mobileEligibleColumns = columns.filter((c) => !c.desktopOnly)
              const titleCol =
                mobileEligibleColumns.find((c) => c.mobileTitle) || mobileEligibleColumns[0]

              // 2. Subtítulo (opcional)
              const subtitleCol = mobileEligibleColumns.find(
                (c) => c.mobileSubtitle && c !== titleCol,
              )

              // 3. Campos de apoio (3 a 4 colunas)
              const explicitlyConfiguredSupport = mobileEligibleColumns.filter(
                (c) => c.mobileSupport && c !== titleCol && c !== subtitleCol,
              )
              const supportCols =
                explicitlyConfiguredSupport.length > 0
                  ? explicitlyConfiguredSupport
                  : mobileEligibleColumns
                      .filter((c) => c !== titleCol && c !== subtitleCol)
                      .slice(0, 4)

              const renderCellValue = (col: ColumnDef<T>) => {
                if (col.render) {
                  return col.render(item)
                }
                const keyStr = String(col.key)
                if (keyStr.toLowerCase().includes('cpf') && item[col.key]) {
                  return (
                    <span className="font-mono text-xs">{formatarCpf(String(item[col.key]))}</span>
                  )
                }
                const rawVal = item[col.key]
                if (rawVal === null || rawVal === undefined || rawVal === '') {
                  return <span className="text-slate-400">—</span>
                }
                return String(rawVal)
              }

              return (
                <Card
                  key={item.id}
                  className="border border-slate-200/90 shadow-xs bg-white hover:border-slate-300 transition-colors"
                  data-testid={`mobile-card-${item.id}`}
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    {/* Topo do Card: Título em destaque + Subtítulo */}
                    {titleCol && (
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900 text-sm leading-snug break-words">
                          {renderCellValue(titleCol)}
                        </div>
                        {subtitleCol && (
                          <div className="text-xs text-slate-500 break-words">
                            {renderCellValue(subtitleCol)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Campos de apoio em grid com alinhamento limpo */}
                    {supportCols.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-slate-100 text-xs">
                        {supportCols.map((sc) => (
                          <div key={String(sc.key)} className="flex flex-col min-w-0">
                            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider truncate">
                              {sc.label}
                            </span>
                            <div className="text-slate-700 mt-0.5 break-words">
                              {renderCellValue(sc)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Barra de Ações Mobile: botões com área de toque de pelo menos 44px de altura */}
                    {(() => {
                      const ctx = getContextoItem ? getContextoItem(item) : undefined
                      const canEditThisItem = podeEditarRegistro(
                        role,
                        docenteIdLogado,
                        tabelaEfetiva,
                        item,
                        ctx,
                      )
                      const canDeleteThisItem = podeExcluirRegistro(
                        role,
                        docenteIdLogado,
                        tabelaEfetiva,
                        item,
                        ctx,
                      )
                      if (!canEditThisItem && !canDeleteThisItem && !renderCustomActions) {
                        return null
                      }
                      return (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 flex-wrap">
                          {renderCustomActions ? (
                            <div className="w-full flex items-center justify-end gap-2 flex-wrap [&_button]:min-h-[44px] [&_button]:min-w-[44px]">
                              {renderCustomActions(item, {
                                openEdit: () => handleOpen(item),
                                openDelete: () => setIdParaExcluir(item.id),
                                canEditItem: canEditThisItem,
                                canDeleteItem: canDeleteThisItem,
                              })}
                            </div>
                          ) : (
                            <div className="w-full flex items-center justify-end gap-2">
                              {canEditThisItem && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpen(item)}
                                  className="min-h-[44px] px-3.5 text-xs text-primary border-primary/30 hover:bg-primary/5 gap-1.5 flex-1 sm:flex-initial"
                                  title="Editar registro"
                                  aria-label={`Editar ${entityName}`}
                                >
                                  <Edit className="h-4 w-4" />
                                  <span>Editar</span>
                                </Button>
                              )}
                              {canDeleteThisItem && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIdParaExcluir(item.id)}
                                  className="min-h-[44px] px-3.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
                                  title="Excluir registro"
                                  aria-label={`Excluir ${entityName}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="hidden xs:inline">Excluir</span>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm bg-white rounded-lg border border-dashed border-slate-200">
              Nenhum registro encontrado.
            </div>
          )}
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
      {isDialogOpen && (
        <CrudFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editingId={editingId !== null ? String(editingId) : null}
          fields={fields}
          formData={formData}
          setFormData={setFormData}
          fieldOptions={fieldOptions}
          onSubmit={handleSubmit}
          submitting={submitting}
          entityName={entityName}
          headerActions={formHeaderActions}
        />
      )}

      {/* Modal de confirmação antes de excluir */}
      <AlertDialog
        open={idParaExcluir !== null}
        onOpenChange={(open) => {
          if (!open) setIdParaExcluir(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de {entityName}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover este registro de {entityName.toLowerCase()}? Esta
              ação não pode ser desfeita.
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
