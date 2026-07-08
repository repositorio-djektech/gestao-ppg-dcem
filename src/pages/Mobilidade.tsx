import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { mobilidadeService } from '@/services/mobilidade'
import { Badge } from '@/components/ui/badge'
import type { Mobilidade } from '@/types/database'

const emptyForm = {
  tipo: 'docente',
  nome: '',
  instituicao: '',
  periodo: '',
  modalidade: 'nacional',
  link: '',
  link_comprovacao: '',
  observacoes: '',
}

const columns: ColumnDef<Mobilidade>[] = [
  { key: 'nome', label: 'Nome', className: 'font-medium text-slate-900' },
  { key: 'instituicao', label: 'Instituição' },
  { key: 'periodo', label: 'Período' },
  {
    key: 'tipo',
    label: 'Tipo',
    render: (m) => (
      <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0 capitalize">
        {m.tipo}
      </Badge>
    ),
  },
  {
    key: 'modalidade',
    label: 'Modalidade',
    render: (m) => (
      <Badge
        variant="secondary"
        className={`border-0 capitalize ${
          m.modalidade === 'internacional'
            ? 'bg-purple-50 text-purple-700'
            : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        {m.modalidade}
      </Badge>
    ),
  },
]

const fields: FieldDef[] = [
  {
    key: 'tipo',
    label: 'Tipo',
    type: 'select',
    options: [
      { value: 'docente', label: 'Docente' },
      { value: 'discente', label: 'Discente' },
      { value: 'visitante', label: 'Visitante' },
    ],
  },
  { key: 'nome', label: 'Nome', type: 'text', required: true },
  {
    key: 'instituicao',
    label: 'Instituição',
    type: 'text',
    required: true,
    placeholder: 'Instituição de destino/origem',
  },
  {
    key: 'periodo',
    label: 'Período',
    type: 'text',
    required: true,
    placeholder: 'Ex: 01/2025 a 06/2025',
  },
  {
    key: 'modalidade',
    label: 'Modalidade',
    type: 'select',
    options: [
      { value: 'nacional', label: 'Nacional' },
      { value: 'internacional', label: 'Internacional' },
    ],
  },
  { key: 'link', label: 'Link', type: 'text', placeholder: 'https://...' },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'text',
    placeholder: 'https://...',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea' },
]

export default function Mobilidade() {
  return (
    <CrudPage
      title="Mobilidade"
      description="Gerencie a mobilidade de docentes, discentes e visitantes."
      service={mobilidadeService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="nome"
      entityName="Mobilidade"
    />
  )
}
