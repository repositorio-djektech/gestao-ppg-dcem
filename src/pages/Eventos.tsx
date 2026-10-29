import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { eventosService } from '@/services/eventos'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import type { Evento, EventoTipo, EventoNacionalidade } from '@/types/database'
import { normalizarTituloAcademico } from '@/lib/normalizacao'

const emptyForm = {
  docente: '',
  evento: '',
  tipo: '',
  nacionalidade: '',
  local_data: '',
  papel: '',
  link_comprovacao: '',
  observacoes: '',
}

const OPCOES_TIPO = [
  { value: 'Trabalho completo', label: 'Trabalho completo' },
  { value: 'Resumo', label: 'Resumo' },
]

const OPCOES_NACIONALIDADE = [
  { value: 'Nacional', label: 'Nacional' },
  { value: 'Internacional', label: 'Internacional' },
]

const columns: ColumnDef<Evento>[] = [
  {
    key: 'evento',
    label: 'Evento',
    className: 'font-medium text-slate-900',
    render: (e) => normalizarTituloAcademico(e.evento),
  },
  {
    key: 'tipo' as any,
    label: 'Classificação',
    render: (e) => {
      const hasTipo = Boolean(e.tipo)
      const hasNac = Boolean(e.nacionalidade)

      if (!hasTipo && !hasNac) {
        return <span className="text-slate-400 text-xs">—</span>
      }

      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasTipo && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium"
            >
              {e.tipo}
            </Badge>
          )}
          {hasNac && (
            <Badge
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-medium"
            >
              {e.nacionalidade}
            </Badge>
          )}
        </div>
      )
    },
  },
  { key: 'docente', label: 'Docente' },
  { key: 'local_data', label: 'Local/Data' },
  {
    key: 'papel',
    label: 'Papel',
    render: (e) => (
      <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0 text-xs">
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
    key: 'tipo',
    label: 'Tipo de Apresentação',
    type: 'select',
    required: false,
    placeholder: 'Selecione o tipo (Trabalho completo ou Resumo)...',
    options: OPCOES_TIPO,
    helperText: 'Classificação do produto apresentado no evento',
  },
  {
    key: 'nacionalidade',
    label: 'Nacionalidade do Evento',
    type: 'select',
    required: false,
    placeholder: 'Selecione a nacionalidade (Nacional ou Internacional)...',
    options: OPCOES_NACIONALIDADE,
    helperText: 'Âmbito do evento (Nacional ou Internacional)',
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
      icon={<Calendar className="h-6 w-6 text-primary shrink-0" />}
      description="Gerencie a participação em eventos dos docentes."
      service={eventosService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="evento"
      entityName="Evento"
      tableName="eventos"
      printModule="eventos"
      transformSubmitData={(formData) => {
        const payload = { ...formData }
        if (!payload.tipo) payload.tipo = null
        if (!payload.nacionalidade) payload.nacionalidade = null
        return payload
      }}
    />
  )
}
