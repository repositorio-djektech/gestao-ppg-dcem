import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { discentesService } from '@/services/discentes'
import { Badge } from '@/components/ui/badge'
import type { Discente } from '@/types/database'

const columns: ColumnDef<Discente>[] = [
  { key: 'nome', label: 'Nome', className: 'font-medium text-slate-900' },
  { key: 'cpf', label: 'CPF' },
  { key: 'data_ingresso', label: 'Ingresso' },
  {
    key: 'status',
    label: 'Status',
    render: (d) => (
      <Badge
        className={
          d.status === 'ativo'
            ? 'bg-emerald-50 text-emerald-700 border-0'
            : 'bg-slate-100 text-slate-600 border-0'
        }
      >
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
    helperText: 'Nome conforme currículo Lattes',
  },
  { key: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00' },
  {
    key: 'data_ingresso',
    label: 'Data de Ingresso',
    type: 'text',
    placeholder: 'MM/AAAA',
    helperText: 'Mês e ano de ingresso no programa',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'ativo', label: 'Ativo' },
      { value: 'titulado', label: 'Titulado' },
      { value: 'desligado', label: 'Desligado' },
    ],
  },
  {
    key: 'link_lattes',
    label: 'Link Lattes',
    type: 'text',
    placeholder: 'http://lattes.cnpq.br/...',
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
  cpf: '',
  data_ingresso: '',
  status: 'ativo',
  link_lattes: '',
  link_comprovacao: '',
  observacoes: '',
}

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
    />
  )
}
