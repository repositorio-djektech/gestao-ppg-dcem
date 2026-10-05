import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { egressosService } from '@/services/egressos'
import type { Egresso } from '@/types/database'

const emptyForm = {
  nome: '',
  ano_titulacao: null,
  atuacao_profissional: '',
  link_lattes: '',
  link_comprovacao: '',
  observacoes: '',
}

const columns: ColumnDef<Egresso>[] = [
  { key: 'nome', label: 'Nome', className: 'font-medium text-slate-900' },
  { key: 'ano_titulacao', label: 'Ano Titulação' },
  {
    key: 'atuacao_profissional',
    label: 'Atuação Profissional',
    render: (e) => (
      <span className="text-sm text-slate-600 line-clamp-1">{e.atuacao_profissional || '-'}</span>
    ),
  },
]

const fields: FieldDef[] = [
  {
    key: 'nome',
    label: 'Nome Completo',
    type: 'text',
    required: true,
    placeholder: 'Nome do egresso',
  },
  {
    key: 'ano_titulacao',
    label: 'Ano de Titulação',
    type: 'number',
    required: true,
    min: 1990,
    max: 2035,
    placeholder: 'Ex: 2024',
    helperText: 'Ano em que concluiu o mestrado ou doutorado',
  },
  {
    key: 'atuacao_profissional',
    label: 'Atuação Profissional Atual',
    type: 'textarea',
    rows: 3,
    placeholder: 'Ex: Pesquisador na EMBRAPA, Professor na UFSCar, Engenheiro na Embraer...',
    helperText: 'Cargo, empresa ou instituição atual de atuação',
  },
  {
    key: 'link_lattes',
    label: 'Currículo Lattes / LinkedIn',
    type: 'url',
    placeholder: 'http://lattes.cnpq.br/...',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'Ata de defesa, diploma ou comprovante',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
]

export default function Egressos() {
  return (
    <CrudPage
      title="Egressos"
      description="Gerencie os egressos do programa."
      service={egressosService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="nome"
      entityName="Egresso"
      printModule="egressos"
    />
  )
}
