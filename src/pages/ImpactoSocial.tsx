import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { impactoSocialService } from '@/services/impacto-social'
import type { ImpactoSocial } from '@/types/database'

const emptyForm = {
  titulo: '',
  descricao: '',
  ano: null,
  link_comprovacao: '',
  observacoes: '',
}

const columns: ColumnDef<ImpactoSocial>[] = [
  { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
  {
    key: 'descricao',
    label: 'Descrição',
    render: (i) => (
      <span className="text-sm text-slate-600 line-clamp-2">{i.descricao || '-'}</span>
    ),
  },
  { key: 'ano', label: 'Ano' },
]

const fields: FieldDef[] = [
  { key: 'titulo', label: 'Título', type: 'text', required: true },
  {
    key: 'descricao',
    label: 'Descrição',
    type: 'textarea',
    helperText: 'Descrição do impacto social gerado',
  },
  {
    key: 'ano',
    label: 'Ano',
    type: 'number',
    placeholder: 'Ex: 2025',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'text',
    placeholder: 'https://...',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea' },
]

export default function ImpactoSocial() {
  return (
    <CrudPage
      title="Impacto Social"
      description="Gerencie os registros de impacto social do programa."
      service={impactoSocialService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Impacto Social"
    />
  )
}
