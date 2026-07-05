import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { impactoSocialService } from '@/services/impacto-social'
import type { ImpactoSocial } from '@/types/database'

const columns: ColumnDef<ImpactoSocial>[] = [
  { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
  { key: 'ano', label: 'Ano' },
  {
    key: 'descricao',
    label: 'Descrição',
    render: (i) =>
      i.descricao.length > 80 ? i.descricao.substring(0, 80) + '...' : i.descricao || '-',
  },
]

const fields: FieldDef[] = [
  {
    key: 'titulo',
    label: 'Título',
    type: 'text',
    required: true,
    helperText: 'Título do caso de impacto social',
  },
  {
    key: 'descricao',
    label: 'Descrição',
    type: 'textarea',
    helperText: 'Descrição detalhada do impacto social gerado',
  },
  {
    key: 'ano',
    label: 'Ano',
    type: 'number',
    placeholder: 'AAAA',
    helperText: 'Ano de ocorrência ou início do impacto',
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
  descricao: '',
  ano: null,
  link_comprovacao: '',
  observacoes: '',
}

export default function ImpactoSocial() {
  return (
    <CrudPage
      title="Impacto Social"
      description="Gerencie os casos de impacto social do programa."
      service={impactoSocialService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Impacto Social"
    />
  )
}
