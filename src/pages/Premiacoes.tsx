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
  {
    key: 'titulo',
    label: 'Título do Prêmio / Distinção',
    type: 'text',
    required: true,
    placeholder: 'Ex: Prêmio CAPES de Tese, Melhor Artigo CBECiMat',
  },
  {
    key: 'nome_premiado',
    label: 'Nome do Premiado (Docente / Discente)',
    type: 'text',
    required: true,
    placeholder: 'Nome da pessoa ou equipe premiada',
  },
  {
    key: 'instituicao',
    label: 'Instituição Concedente',
    type: 'text',
    required: true,
    placeholder: 'Ex: CAPES, CNPq, ABM, FAPESP...',
  },
  {
    key: 'ano',
    label: 'Ano da Premiação',
    type: 'number',
    required: true,
    min: 2000,
    max: 2035,
    placeholder: 'Ex: 2025',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'Diploma de premiação ou notícia oficial',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
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
      printModule="premiacoes"
    />
  )
}
