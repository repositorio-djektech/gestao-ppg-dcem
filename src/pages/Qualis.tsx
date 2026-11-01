import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { qualisService } from '@/services/qualis'
import { Badge } from '@/components/ui/badge'
import { Award } from 'lucide-react'
import type { Qualis } from '@/types/database'

const emptyForm = {
  estrato: 'A1',
  nome: '',
  descricao: '',
}

const estratoColors: Record<string, string> = {
  A1: 'bg-emerald-600 text-white',
  A2: 'bg-emerald-500 text-white',
  A3: 'bg-blue-600 text-white',
  A4: 'bg-blue-500 text-white',
  B1: 'bg-amber-500 text-white',
  B2: 'bg-amber-600 text-white',
  B3: 'bg-orange-500 text-white',
  B4: 'bg-orange-600 text-white',
  C: 'bg-slate-500 text-white',
}

const OPCOES_ESTRATO = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'A3', label: 'A3' },
  { value: 'A4', label: 'A4' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'B3', label: 'B3' },
  { value: 'B4', label: 'B4' },
  { value: 'C', label: 'C' },
]

export default function QualisPage() {
  const columns: ColumnDef<Qualis>[] = [
    {
      key: 'estrato',
      label: 'Estrato',
      className: 'font-mono font-bold text-slate-900 w-24',
      render: (q) => (
        <Badge
          variant="secondary"
          className={`border-0 font-mono font-bold text-xs px-2 py-0.5 ${
            estratoColors[q.estrato] ?? 'bg-slate-100 text-slate-800'
          }`}
        >
          {q.estrato}
        </Badge>
      ),
    },
    {
      key: 'nome',
      label: 'Nome / Rótulo',
      className: 'font-medium text-slate-900',
    },
    {
      key: 'descricao',
      label: 'Descrição',
      className: 'text-sm text-slate-600',
      render: (q) => (
        <span className="text-sm text-slate-600 line-clamp-2">{q.descricao || '—'}</span>
      ),
    },
  ]

  const fields: FieldDef[] = [
    {
      key: 'estrato',
      label: 'Estrato Qualis',
      type: 'select',
      required: true,
      options: OPCOES_ESTRATO,
      helperText: 'Estrato de classificação CAPES (A1 a C)',
    },
    {
      key: 'nome',
      label: 'Nome / Rótulo',
      type: 'text',
      required: true,
      placeholder: 'Ex: Qualis A1',
      helperText: 'Identificador descritivo do estrato',
    },
    {
      key: 'descricao',
      label: 'Descrição',
      type: 'textarea',
      required: false,
      rows: 3,
      placeholder: 'Ex: Estrato superior de excelência internacional',
      helperText: 'Critérios e notas conceituais do estrato',
    },
  ]

  return (
    <CrudPage
      title="Qualis"
      icon={<Award className="h-6 w-6 text-primary shrink-0" />}
      description="Gerencie os estratos Qualis/CAPES de referência do programa."
      service={qualisService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="estrato"
      entityName="Qualis"
      tableName="qualis"
    />
  )
}
