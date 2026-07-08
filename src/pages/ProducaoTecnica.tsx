import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { producaoTecnicaService } from '@/services/producao-tecnica'
import { Badge } from '@/components/ui/badge'
import type { ProducaoTecnica } from '@/types/database'

const emptyForm = {
  titulo: '',
  ano: null,
  autores: '',
  tipo: 'Software',
  link_comprovacao: '',
  observacoes: '',
}

const tipoColors: Record<string, string> = {
  Software: 'bg-violet-50 text-violet-700',
  Patente: 'bg-amber-50 text-amber-700',
  Relatório: 'bg-cyan-50 text-cyan-700',
}

const columns: ColumnDef<ProducaoTecnica>[] = [
  { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
  {
    key: 'tipo',
    label: 'Tipo',
    render: (p) => (
      <Badge variant="secondary" className={`border-0 ${tipoColors[p.tipo] ?? ''}`}>
        {p.tipo}
      </Badge>
    ),
  },
  { key: 'ano', label: 'Ano' },
  {
    key: 'autores',
    label: 'Autores',
    render: (p) => <span className="text-sm text-slate-600 line-clamp-1">{p.autores || '-'}</span>,
  },
]

const fields: FieldDef[] = [
  { key: 'titulo', label: 'Título', type: 'text', required: true },
  {
    key: 'ano',
    label: 'Ano',
    type: 'number',
    placeholder: 'Ex: 2025',
  },
  {
    key: 'autores',
    label: 'Autores',
    type: 'text',
    placeholder: 'Ex: Silva, J.; Mendes, A.',
  },
  {
    key: 'tipo',
    label: 'Tipo',
    type: 'select',
    options: [
      { value: 'Software', label: 'Software' },
      { value: 'Patente', label: 'Patente' },
      { value: 'Relatório', label: 'Relatório' },
    ],
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'text',
    placeholder: 'https://...',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea' },
]

export default function ProducaoTecnica() {
  return (
    <CrudPage
      title="Produção Técnica"
      description="Gerencie a produção técnica do programa."
      service={producaoTecnicaService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Produção Técnica"
    />
  )
}
