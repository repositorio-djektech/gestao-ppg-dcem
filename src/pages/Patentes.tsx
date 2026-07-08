import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { patentesService } from '@/services/patentes'
import { Badge } from '@/components/ui/badge'
import type { Patente } from '@/types/database'

const emptyForm = {
  titulo: '',
  status: 'Pendente',
  autores: '',
  inpi: '',
  link_comprovacao: '',
  observacoes: '',
}

const statusColors: Record<string, string> = {
  Concessão: 'bg-emerald-50 text-emerald-700',
  Licenciamento: 'bg-blue-50 text-blue-700',
  Pendente: 'bg-amber-50 text-amber-700',
}

const columns: ColumnDef<Patente>[] = [
  { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
  {
    key: 'status',
    label: 'Status',
    render: (p) => (
      <Badge variant="secondary" className={`border-0 ${statusColors[p.status] ?? ''}`}>
        {p.status}
      </Badge>
    ),
  },
  {
    key: 'autores',
    label: 'Autores',
    render: (p) => <span className="text-sm text-slate-600 line-clamp-1">{p.autores}</span>,
  },
  {
    key: 'inpi',
    label: 'INPI',
    render: (p) => <span className="font-mono text-sm text-slate-600">{p.inpi || '-'}</span>,
  },
]

const fields: FieldDef[] = [
  { key: 'titulo', label: 'Título da Patente', type: 'text', required: true },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'Pendente', label: 'Pendente' },
      { value: 'Concessão', label: 'Concessão' },
      { value: 'Licenciamento', label: 'Licenciamento' },
    ],
  },
  {
    key: 'autores',
    label: 'Autores',
    type: 'text',
    required: true,
    placeholder: 'Ex: Silva, J.; Mendes, A.',
  },
  {
    key: 'inpi',
    label: 'Registro INPI',
    type: 'text',
    required: true,
    placeholder: 'Número do registro no INPI',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'text',
    placeholder: 'https://...',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea' },
]

export default function Patentes() {
  return (
    <CrudPage
      title="Patentes"
      description="Gerencie as patentes do programa."
      service={patentesService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Patente"
    />
  )
}
