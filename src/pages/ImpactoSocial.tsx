import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { impactoSocialService } from '@/services/impacto-social'
import type { ImpactoSocial } from '@/types/database'

const emptyForm = {
  titulo: '',
  descricao: '',
  ano: null,
  link_comprovacao: '',
  observacoes: '',
}

const columns: ColumnDef<ImpactoSocial>[] = [
  { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
  {
    key: 'descricao',
    label: 'Descrição',
    render: (i) => (
      <span className="text-sm text-slate-600 line-clamp-2">{i.descricao || '-'}</span>
    ),
  },
  { key: 'ano', label: 'Ano' },
]

const fields: FieldDef[] = [
  {
    key: 'titulo',
    label: 'Título da Ação de Impacto Social',
    type: 'text',
    required: true,
    placeholder: 'Ex: Programa de divulgação científica em escolas públicas...',
  },
  {
    key: 'descricao',
    label: 'Descrição Detalhada',
    type: 'textarea',
    required: true,
    rows: 4,
    placeholder:
      'Descreva os objetivos, público beneficiado, resultados e relevância social para a avaliação da CAPES...',
    helperText: 'Descrição do impacto social gerado na comunidade ou setor produtivo',
  },
  {
    key: 'ano',
    label: 'Ano de Realização',
    type: 'number',
    required: true,
    min: 2020,
    max: 2035,
    placeholder: 'Ex: 2025',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'Notícia institucional, relatório ou certificado comprobatório',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
]

export default function ImpactoSocial() {
  return (
    <CrudPage
      title="Impacto Social"
      description="Gerencie os registros de impacto social do programa."
      service={impactoSocialService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Impacto Social"
      printModule="impacto-social"
    />
  )
}
