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
    label: 'Tipo de Participante',
    type: 'select',
    required: true,
    options: [
      { value: 'docente', label: 'Docente' },
      { value: 'discente', label: 'Discente' },
      { value: 'visitante', label: 'Visitante / Professor Convidado' },
    ],
  },
  {
    key: 'nome',
    label: 'Nome Completo',
    type: 'text',
    required: true,
    placeholder: 'Nome da pessoa em mobilidade',
  },
  {
    key: 'instituicao',
    label: 'Instituição de Destino / Origem',
    type: 'text',
    required: true,
    placeholder: 'Ex: Universidade do Porto, UFMG, MIT...',
    helperText: 'Nome da universidade ou centro de pesquisa parceiro',
  },
  {
    key: 'modalidade',
    label: 'Modalidade',
    type: 'select',
    required: true,
    options: [
      { value: 'nacional', label: 'Nacional' },
      { value: 'internacional', label: 'Internacional' },
    ],
  },
  {
    key: 'periodo',
    label: 'Período de Realização',
    type: 'text',
    required: true,
    placeholder: 'Ex: Março/2025 a Agosto/2025',
    helperText: 'Duração da missão ou período de intercâmbio',
  },
  { key: 'link', label: 'Link do Projeto / Parceria', type: 'url', placeholder: 'https://...' },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'Carta convite, bilhete aéreo ou certificado de estágio',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
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
      printModule="mobilidade"
    />
  )
}
