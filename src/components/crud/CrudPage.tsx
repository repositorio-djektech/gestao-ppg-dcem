import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { TablePaginationFooter } from './TablePaginationFooter'
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
import { Search, Plus, Edit, Trash2, Printer } from 'lucide-react'
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
import { formatarCpf } from '@/lib/utils'
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
  customFilterItem?: (item: T, termo: string, normalizar: (val: any) => string) => boolean
  transformSubmitData?: (
    formData: Record<string, any>,
    editingId: number | string | null,
  ) => Record<string, any>
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
  customFilterItem,
  transformSubmitData,
}: CrudPageProps<T>) {
  const navigate = useNavigate()
  const { role, profile } = useAuth()
  const { data, loading, create, update, remove } = useCrudData(service)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)
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

  const filtered = useMemo(() => {
    const termo = searchTerm
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

    if (!termo) return data

    const normalizar = (val: any): string => {
      if (val === null || val === undefined) return ''
      return String(val)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    }

    const termoDigitos = termo.replace(/\D/g, '')

    return data.filter((item) => {
      // 1. Filtro customizado opcional
      if (customFilterItem && customFilterItem(item, termo, normalizar)) {
        return true
      }

      // 2. Chave principal de busca da página
      if (searchKey && normalizar(item[searchKey]).includes(termo)) {
        return true
      }

      // 2. Busca pelas colunas declaradas na tabela (valores diretos e renderizados)
      for (const col of columns) {
        const val = item[col.key as keyof T]
        if (val !== undefined && val !== null) {
          const valStr = normalizar(val)
          if (valStr.includes(termo)) return true

          // Se for CPF ou número formatado
          if (termoDigitos.length >= 3 && String(col.key).toLowerCase().includes('cpf')) {
            const cpfLimpo = String(val).replace(/\D/g, '')
            if (cpfLimpo.includes(termoDigitos)) return true
          }
        }

        // Se a coluna tiver render customizado que retorna string ou número
        if (col.render) {
          try {
            const rendered = col.render(item)
            if (typeof rendered === 'string' || typeof rendered === 'number') {
              if (normalizar(rendered).includes(termo)) return true
            }
          } catch {
            // ignora erro em render
          }
        }
      }

      // 3. Busca por campos comuns de entidade (nome, titulo, autores, orientador, coordenador, email, cpf)
      const itemAny = item as any
      const camposComuns = [
        itemAny.nome,
        itemAny.titulo,
        itemAny.titulo_trabalho,
        itemAny.evento,
        itemAny.autores,
        itemAny.orientador,
        itemAny.discente_nome,
        itemAny.nome_premiado,
        itemAny.instituicao,
        itemAny.email,
        itemAny.cpf,
        itemAny.tipo,
        itemAny.tipo_curso,
        itemAny.area,
        itemAny.codigo,
        itemAny.status,
        itemAny.classificacao,
        itemAny.orgao_fomento,
        itemAny.ano,
        itemAny.ano_semestre,
        itemAny.ano_ingresso,
        itemAny.ano_titulacao,
        itemAny.ano_conclusao,
        itemAny.data_ingresso,
        itemAny.inpi,
        itemAny.atuacao_profissional,
      ]

      for (const campo of camposComuns) {
        if (campo !== undefined && campo !== null) {
          if (normalizar(campo).includes(termo)) return true
          if (
            termoDigitos.length >= 3 &&
            typeof campo === 'string' &&
            campo.replace(/\D/g, '').includes(termoDigitos)
          ) {
            return true
          }
        }
      }

      return false
    })
  }, [data, searchTerm, searchKey, columns, customFilterItem])
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
    let submitData = { ...formData }
    delete (submitData as any).id
    if (transformSubmitData) {
      submitData = transformSubmitData(submitData, editingId)
    }
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
    <div className="space-y-4 md:space-y-6 animate-fade-in flex flex-col md:h-[calc(100vh-6.5rem)] md:max-h-[calc(100vh-6.5rem)] min-h-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar..."
              className="pl-9 bg-white border-slate-200 h-9 text-sm"
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
              className="gap-2 shrink-0 bg-white h-9 px-3.5"
              title="Versão para Impressão / Exportar PDF"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => handleOpen()} className="gap-2 shrink-0 h-9 px-4">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo {entityName}</span>
            </Button>
          )}
        </div>
      </div>
      {/* Contêiner de Dados: Tabela única com overflow-auto no miolo e rodapé fixo sempre visível */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex-1 flex flex-col overflow-hidden relative min-h-0">
        <div ref={tableContainerRef} className="flex-1 overflow-auto table-scroll-container min-h-0">
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
        <TablePaginationFooter
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          targetRef={tableContainerRef}
          totalItems={filtered.length}
        />
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
