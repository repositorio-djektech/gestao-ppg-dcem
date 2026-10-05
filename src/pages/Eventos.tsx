import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { eventosService } from '@/services/eventos'
import { Badge } from '@/components/ui/badge'
import type { Evento } from '@/types/database'

const emptyForm = {
  docente: '',
  evento: '',
  local_data: '',
  papel: '',
  link_comprovacao: '',
  observacoes: '',
}

const columns: ColumnDef<Evento>[] = [
  { key: 'evento', label: 'Evento', className: 'font-medium text-slate-900' },
  { key: 'docente', label: 'Docente' },
  { key: 'local_data', label: 'Local/Data' },
  {
    key: 'papel',
    label: 'Papel',
    render: (e) => (
      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0">
        {e.papel}
      </Badge>
    ),
  },
]

const fields: FieldDef[] = [
  {
    key: 'docente',
    label: 'Docente Participante',
    type: 'text',
    required: true,
    placeholder: 'Nome do docente participante',
  },
  {
    key: 'evento',
    label: 'Nome do Evento',
    type: 'text',
    required: true,
    placeholder: 'Ex: Congresso Brasileiro de Engenharia e Ciência dos Materiais (CBECiMat)',
  },
  {
    key: 'local_data',
    label: 'Local e Data',
    type: 'text',
    required: true,
    placeholder: 'Ex: São Paulo, SP — 10 a 14/11/2025',
    helperText: 'Cidade, Estado/País e período de realização',
  },
  {
    key: 'papel',
    label: 'Papel no Evento',
    type: 'select',
    required: true,
    options: [
      { value: 'Palestrante Convidado', label: 'Palestrante Convidado' },
      { value: 'Organizador / Comitê', label: 'Organizador / Comitê' },
      { value: 'Apresentador de Trabalho', label: 'Apresentador de Trabalho' },
      { value: 'Avaliador / Revisor', label: 'Avaliador / Revisor' },
      { value: 'Participante', label: 'Participante' },
    ],
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'Certificado de participação ou link dos anais',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
]

export default function Eventos() {
  return (
    <CrudPage
      title="Eventos"
      description="Gerencie a participação em eventos dos docentes."
      service={eventosService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="evento"
      entityName="Evento"
      printModule="eventos"
    />
  )
}
