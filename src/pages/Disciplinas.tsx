import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { disciplinasService } from '@/services/disciplinas'
import type { Disciplina } from '@/types/database'

const columns: ColumnDef<Disciplina>[] = [
  { key: 'nome', label: 'Nome', className: 'font-medium text-slate-900' },
  { key: 'codigo', label: 'Código' },
  { key: 'creditos', label: 'Créditos', className: 'text-center' },
  { key: 'ano_semestre', label: 'Ano/Semestre' },
]

const fields: FieldDef[] = [
  {
    key: 'nome',
    label: 'Nome da Disciplina',
    type: 'text',
    required: true,
    helperText: 'Nome da disciplina conforme ementa',
  },
  {
    key: 'codigo',
    label: 'Código',
    type: 'text',
    placeholder: 'Ex: DCEM-001',
    helperText: 'Código único da disciplina',
  },
  {
    key: 'creditos',
    label: 'Créditos',
    type: 'number',
    placeholder: '0',
    helperText: 'Número de créditos da disciplina',
  },
  {
    key: 'ano_semestre',
    label: 'Ano/Semestre',
    type: 'text',
    placeholder: 'Ex: 2025/1',
    helperText: 'Ano e semestre de oferta',
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
  nome: '',
  codigo: '',
  creditos: 0,
  ano_semestre: '',
  link_comprovacao: '',
  observacoes: '',
}

export default function Disciplinas() {
  return (
    <CrudPage
      title="Disciplinas"
      description="Gerencie as disciplinas ofertadas pelo programa."
      service={disciplinasService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="nome"
      entityName="Disciplina"
    />
  )
}
