import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { discentesService } from '@/services/discentes'
import { Badge } from '@/components/ui/badge'
import type { Discente } from '@/types/database'
import { formatarCpf } from '@/lib/utils'

const emptyForm = {
  nome: '',
  cpf: '',
  data_ingresso: '',
  status: 'ativo',
  link_lattes: '',
  link_comprovacao: '',
  observacoes: '',
}

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700',
  titulado: 'bg-blue-50 text-blue-700',
  desligado: 'bg-red-50 text-red-700',
}

const columns: ColumnDef<Discente>[] = [
  { key: 'nome', label: 'Nome', className: 'font-medium text-slate-900' },
  {
    key: 'cpf',
    label: 'CPF',
    render: (d) => (d.cpf ? formatarCpf(d.cpf) : '—'),
  },
  { key: 'data_ingresso', label: 'Ingresso' },
  {
    key: 'status',
    label: 'Status',
    render: (d) => (
      <Badge variant="secondary" className={`border-0 capitalize ${statusColors[d.status] ?? ''}`}>
        {d.status}
      </Badge>
    ),
  },
]

const fields: FieldDef[] = [
  {
    key: 'nome',
    label: 'Nome Completo',
    type: 'text',
    required: true,
    placeholder: 'Nome completo do aluno',
  },
  {
    key: 'cpf',
    label: 'CPF',
    type: 'text',
    placeholder: '000.000.000-00',
    helperText: 'Apenas números ou formatado',
  },
  {
    key: 'data_ingresso',
    label: 'Data de Ingresso',
    type: 'date',
    required: true,
    helperText: 'Data de matrícula inicial no programa',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'ativo', label: 'Ativo' },
      { value: 'titulado', label: 'Titulado' },
      { value: 'desligado', label: 'Desligado' },
    ],
  },
  {
    key: 'link_lattes',
    label: 'Currículo Lattes',
    type: 'url',
    placeholder: 'http://lattes.cnpq.br/...',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'Ficha de matrícula ou documento comprobatório',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
]

export default function Discentes() {
  return (
    <CrudPage
      title="Discentes"
      description="Gerencie os discentes do programa de pós-graduação."
      service={discentesService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="nome"
      entityName="Discente"
      printModule="discentes"
    />
  )
}
