import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { producaoTecnicaService } from '@/services/producao-tecnica'
import { Badge } from '@/components/ui/badge'
import type { ProducaoTecnica } from '@/types/database'

const columns: ColumnDef<ProducaoTecnica>[] = [
  { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
  {
    key: 'tipo',
    label: 'Tipo',
    render: (p) => (
      <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-0">
        {p.tipo}
      </Badge>
    ),
  },
  { key: 'ano', label: 'Ano' },
  { key: 'autores', label: 'Autores' },
]

const fields: FieldDef[] = [
  {
    key: 'titulo',
    label: 'Título',
    type: 'text',
    required: true,
    helperText: 'Título da produção técnica',
  },
  {
    key: 'tipo',
    label: 'Tipo',
    type: 'select',
    options: [
      { value: 'Software', label: 'Software' },
      { value: 'Patente', label: 'Patente' },
      { value: 'Relatório', label: 'Relatório Técnico' },
    ],
  },
  {
    key: 'ano',
    label: 'Ano',
    type: 'number',
    placeholder: 'AAAA',
    helperText: 'Ano de publicação ou desenvolvimento',
  },
  {
    key: 'autores',
    label: 'Autores',
    type: 'textarea',
    helperText: 'Lista de autores da produção',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'text',
    placeholder: 'https://...',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea' },
]

const emptyForm = {
  titulo: '',
  ano: null,
  autores: '',
  tipo: 'Software',
  link_comprovacao: '',
  observacoes: '',
}

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
