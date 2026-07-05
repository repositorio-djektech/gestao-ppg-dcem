import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { egressosService } from '@/services/egressos'
import type { Egresso } from '@/types/database'

const columns: ColumnDef<Egresso>[] = [
  { key: 'nome', label: 'Nome', className: 'font-medium text-slate-900' },
  { key: 'ano_titulacao', label: 'Ano Titulação' },
  { key: 'atuacao_profissional', label: 'Atuação Profissional' },
]

const fields: FieldDef[] = [
  {
    key: 'nome',
    label: 'Nome Completo',
    type: 'text',
    required: true,
    helperText: 'Nome do egresso conforme Lattes',
  },
  {
    key: 'ano_titulacao',
    label: 'Ano de Titulação',
    type: 'number',
    placeholder: 'AAAA',
    helperText: 'Ano de conclusão do programa',
  },
  {
    key: 'atuacao_profissional',
    label: 'Atuação Profissional',
    type: 'textarea',
    helperText: 'Descrição da atuação profissional atual',
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
  ano_titulacao: null,
  atuacao_profissional: '',
  link_lattes: '',
  link_comprovacao: '',
  observacoes: '',
}

export default function Egressos() {
  return (
    <CrudPage
      title="Egressos"
      description="Gerencie os egressos e sua atuação profissional."
      service={egressosService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="nome"
      entityName="Egresso"
    />
  )
}
