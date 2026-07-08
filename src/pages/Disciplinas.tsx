import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { disciplinasService } from '@/services/disciplinas'
import { Badge } from '@/components/ui/badge'
import type { Disciplina } from '@/types/database'

const emptyForm = {
  nome: '',
  codigo: '',
  creditos: 0,
  ano_semestre: '',
  link_comprovacao: '',
  observacoes: '',
}

const columns: ColumnDef<Disciplina>[] = [
  { key: 'nome', label: 'Nome', className: 'font-medium text-slate-900' },
  {
    key: 'codigo',
    label: 'Código',
    render: (d) => <span className="font-mono text-sm text-slate-600">{d.codigo || '-'}</span>,
  },
  {
    key: 'creditos',
    label: 'Créditos',
    render: (d) => (
      <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0">
        {d.creditos}
      </Badge>
    ),
  },
  { key: 'ano_semestre', label: 'Ano/Semestre' },
]

const fields: FieldDef[] = [
  { key: 'nome', label: 'Nome da Disciplina', type: 'text', required: true },
  { key: 'codigo', label: 'Código', type: 'text', placeholder: 'Ex: PCM001' },
  {
    key: 'creditos',
    label: 'Créditos',
    type: 'number',
    placeholder: 'Ex: 4',
  },
  {
    key: 'ano_semestre',
    label: 'Ano/Semestre',
    type: 'text',
    placeholder: 'Ex: 2025/1',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'text',
    placeholder: 'https://...',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea' },
]

export default function Disciplinas() {
  return (
    <CrudPage
      title="Disciplinas"
      description="Gerencie as disciplinas oferecidas pelo programa."
      service={disciplinasService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="nome"
      entityName="Disciplina"
    />
  )
}
