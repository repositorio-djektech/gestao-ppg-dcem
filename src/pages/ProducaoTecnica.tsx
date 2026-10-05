import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { producaoTecnicaService } from '@/services/producao-tecnica'
import { Badge } from '@/components/ui/badge'
import type { ProducaoTecnica } from '@/types/database'

const emptyForm = {
  titulo: '',
  ano: null,
  autores: '',
  tipo: 'Software',
  link_comprovacao: '',
  observacoes: '',
}

const tipoColors: Record<string, string> = {
  Software: 'bg-violet-50 text-violet-700',
  Patente: 'bg-amber-50 text-amber-700',
  Relatório: 'bg-cyan-50 text-cyan-700',
}

const columns: ColumnDef<ProducaoTecnica>[] = [
  { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
  {
    key: 'tipo',
    label: 'Tipo',
    render: (p) => (
      <Badge variant="secondary" className={`border-0 ${tipoColors[p.tipo] ?? ''}`}>
        {p.tipo}
      </Badge>
    ),
  },
  { key: 'ano', label: 'Ano' },
  {
    key: 'autores',
    label: 'Autores',
    render: (p) => <span className="text-sm text-slate-600 line-clamp-1">{p.autores || '-'}</span>,
  },
]

const fields: FieldDef[] = [
  {
    key: 'titulo',
    label: 'Título do Produto / Produção Técnica',
    type: 'text',
    required: true,
    placeholder: 'Ex: Sistema de monitoramento térmico...',
  },
  {
    key: 'tipo',
    label: 'Tipo de Produção',
    type: 'select',
    required: true,
    options: [
      { value: 'Software', label: 'Software' },
      { value: 'Patente', label: 'Patente / Propriedade Intelectual' },
      { value: 'Relatório', label: 'Relatório Técnico Conclusivo' },
      { value: 'Manual/Protocolo', label: 'Manual ou Protocolo Tecnológico' },
      { value: 'Curso/Treinamento', label: 'Curso ou Treinamento Técnico' },
    ],
  },
  {
    key: 'autores',
    label: 'Autores / Desenvolvedores',
    type: 'text',
    required: true,
    placeholder: 'Ex: Silva, J.; Mendes, A.',
  },
  {
    key: 'ano',
    label: 'Ano de Conclusão / Registro',
    type: 'number',
    required: true,
    min: 2000,
    max: 2035,
    placeholder: 'Ex: 2025',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação (Repositório / Documento)',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'Link para repositório público, registro ou comprovante',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
]

export default function ProducaoTecnica() {
  return (
    <CrudPage
      title="Produção Técnica"
      description="Gerencie a produção técnica do programa."
      service={producaoTecnicaService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Produção Técnica"
      printModule="producao-tecnica"
    />
  )
}
