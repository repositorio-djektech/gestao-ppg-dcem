import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { premiacoesService } from '@/services/premiacoes'
import type { Premicao } from '@/types/database'

const columns: ColumnDef<Premicao>[] = [
  { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
  { key: 'nome_premiado', label: 'Premiado' },
  { key: 'instituicao', label: 'Instituição' },
  { key: 'ano', label: 'Ano' },
]

const fields: FieldDef[] = [
  {
    key: 'titulo',
    label: 'Título da Premiação',
    type: 'text',
    required: true,
    helperText: 'Nome do prêmio ou reconhecimento',
  },
  {
    key: 'nome_premiado',
    label: 'Nome do Premiado',
    type: 'text',
    helperText: 'Nome da pessoa ou grupo premiado',
  },
  {
    key: 'instituicao',
    label: 'Instituição',
    type: 'text',
    placeholder: 'Instituição concedente',
    helperText: 'Instituição que concedeu o prêmio',
  },
  { key: 'ano', label: 'Ano', type: 'number', placeholder: 'AAAA', helperText: 'Ano da premiação' },
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
  ano: null,
  nome_premiado: '',
  instituicao: '',
  link_comprovacao: '',
  observacoes: '',
}

export default function Premiacoes() {
  return (
    <CrudPage
      title="Premiações"
      description="Gerencie as premiações e reconhecimentos."
      service={premiacoesService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Premiação"
    />
  )
}
