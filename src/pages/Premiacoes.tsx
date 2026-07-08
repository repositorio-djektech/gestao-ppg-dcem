import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { premiacoesService } from '@/services/premiacoes'
import { Badge } from '@/components/ui/badge'
import type { Premicao } from '@/types/database'

const emptyForm = {
  titulo: '',
  ano: null,
  nome_premiado: '',
  instituicao: '',
  link_comprovacao: '',
  observacoes: '',
}

const columns: ColumnDef<Premicao>[] = [
  { key: 'titulo', label: 'Prêmio', className: 'font-medium text-slate-900' },
  { key: 'nome_premiado', label: 'Premiado' },
  { key: 'instituicao', label: 'Instituição' },
  {
    key: 'ano',
    label: 'Ano',
    render: (p) => (
      <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-0">
        {p.ano ?? '-'}
      </Badge>
    ),
  },
]

const fields: FieldDef[] = [
  { key: 'titulo', label: 'Título do Prêmio', type: 'text', required: true },
  {
    key: 'ano',
    label: 'Ano',
    type: 'number',
    placeholder: 'Ex: 2025',
  },
  {
    key: 'nome_premiado',
    label: 'Nome do Premiado',
    type: 'text',
    placeholder: 'Nome da pessoa ou grupo premiado',
  },
  {
    key: 'instituicao',
    label: 'Instituição',
    type: 'text',
    placeholder: 'Instituição concedente',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'text',
    placeholder: 'https://...',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea' },
]

export default function Premiacoes() {
  return (
    <CrudPage
      title="Premiações"
      description="Gerencie as premiações recebidas pelo programa."
      service={premiacoesService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Premiação"
    />
  )
}
