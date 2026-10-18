import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { disciplinasService } from '@/services/disciplinas'
import { Badge } from '@/components/ui/badge'
import type { Disciplina } from '@/types/database'

const emptyForm = {
  nome: '',
  codigo: '',
  nivel: 'pos_graduacao',
  creditos: 0,
  ano_semestre: '',
  link_comprovacao: '',
  observacoes: '',
}

const columns: ColumnDef<Disciplina>[] = [
  { key: 'nome', label: 'Nome', className: 'font-medium text-slate-900' },
  {
    key: 'codigo',
    label: 'Código',
    render: (d) => <span className="font-mono text-sm text-slate-600">{d.codigo || '-'}</span>,
  },
  {
    key: 'nivel',
    label: 'Nível',
    render: (d) => {
      if (!d.nivel) return <span className="text-slate-400">—</span>
      const isPos = d.nivel === 'pos_graduacao'
      return (
        <Badge
          variant="outline"
          className={
            isPos
              ? 'bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-medium'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium'
          }
        >
          {isPos ? 'Pós-graduação' : 'Graduação'}
        </Badge>
      )
    },
  },
  {
    key: 'creditos',
    label: 'Créditos',
    render: (d) => (
      <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0">
        {d.creditos}
      </Badge>
    ),
  },
  { key: 'ano_semestre', label: 'Ano/Semestre' },
]

const fields: FieldDef[] = [
  {
    key: 'nome',
    label: 'Nome da Disciplina',
    type: 'text',
    required: true,
    placeholder: 'Ex: Ciência dos Materiais Avançada',
  },
  {
    key: 'codigo',
    label: 'Código da Disciplina',
    type: 'text',
    required: true,
    placeholder: 'Ex: PCM001',
  },
  {
    key: 'nivel',
    label: 'Nível da Disciplina',
    type: 'select',
    options: [
      { label: 'Pós-graduação', value: 'pos_graduacao' },
      { label: 'Graduação', value: 'graduacao' },
    ],
    placeholder: 'Selecione o nível...',
  },
  {
    key: 'creditos',
    label: 'Créditos',
    type: 'number',
    required: true,
    placeholder: '4',
  },
  {
    key: 'ano_semestre',
    label: 'Ano / Semestre',
    type: 'text',
    placeholder: 'Ex: 2024.1',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'url',
    placeholder: 'https://...',
  },
  {
    key: 'observacoes',
    label: 'Observações',
    type: 'textarea',
    placeholder: 'Ementa resumida ou informações adicionais...',
  },
]
export default function Disciplinas() {
  return (
    <CrudPage
      title="Disciplinas"
      description="Gerencie as disciplinas oferecidas pelo programa."
      service={disciplinasService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="nome"
      entityName="Disciplina"
      tableName="disciplinas"
      printModule="disciplinas"
    />
  )
}
