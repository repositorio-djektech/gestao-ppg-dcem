import { useMemo } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { eventosService } from '@/services/eventos'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import type { Evento, EventoTipo, EventoNacionalidade } from '@/types/database'
import { normalizarTituloAcademico } from '@/lib/normalizacao'
import { toTitleCase } from '@/lib/titleCase'
import { comporLocalAno, separarLocalAno, exibirLocalAno } from '@/lib/eventos/local-ano'
import {
  campoComprovantePdf,
  campoProjetoVinculado,
  campoLinhaVinculada,
} from '@/components/crud/campos-extras'
import { OPCOES_CLASSIFICACAO_EVENTO } from '@/lib/vinculos/opcoes'

import { useDiscentesVinculados } from '@/components/crud/discentes-vinculados'
import { eventosDiscentesService } from '@/services/vinculos-discentes-registro'
const emptyForm = {
  docente: '',
  evento: '',
  tipo: '',
  nacionalidade: '',
  // Campos de tela; gravados juntos em local_data ("Local - AAAA", D-28)
  evento_local: '',
  evento_ano: '',
  papel: '',
  financiadores: '',
  valor_total: '',
  comprovante_url: '',
  projeto_id: '',
  linha_pesquisa_id: '',
  link_comprovacao: '',
  observacoes: '',
}

const OPCOES_TIPO = [
  { value: 'Trabalho completo', label: 'Trabalho completo' },
  { value: 'Resumo', label: 'Resumo' },
]

const OPCOES_NACIONALIDADE = OPCOES_CLASSIFICACAO_EVENTO

const columns: ColumnDef<Evento>[] = [
  {
    key: 'evento',
    label: 'Evento',
    className: 'font-medium text-slate-900',
    render: (e) => toTitleCase(e.evento),
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
  {
    key: 'local_data',
    label: 'Local / Ano',
    render: (e) => exibirLocalAno(e.local_data) || <span className="text-slate-400">—</span>,
  },
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
    label: 'Classificação do Evento',
    type: 'select',
    required: false,
    placeholder: 'Selecione a classificação...',
    options: OPCOES_NACIONALIDADE,
    helperText: 'Âmbito do evento: nacional, internacional, regional ou local',
  },
  {
    key: 'evento_local',
    label: 'Local',
    type: 'text',
    required: true,
    placeholder: 'Ex: São Paulo, SP',
    helperText: 'Cidade e Estado/País de realização',
  },
  {
    key: 'evento_ano',
    label: 'Ano',
    type: 'year',
    required: true,
    placeholder: 'Selecione o ano do evento...',
    helperText: 'Ano de realização do evento',
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
    key: 'financiadores',
    label: 'Financiadores do Evento',
    type: 'text',
    placeholder: 'Ex: CNPq, CAPES, FAPITEC/SE',
    helperText: 'Quem custeou a participação (inscrição, diárias, passagens)',
  },
  {
    key: 'valor_total',
    label: 'Valor Envolvido (R$)',
    type: 'number',
    min: 0,
    placeholder: '0,00',
    helperText: 'Valor total envolvido na participação, em reais',
  },
  campoProjetoVinculado(),
  campoLinhaVinculada(),
  campoComprovantePdf('eventos', 'Comprovante do Evento (PDF)'),
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'Certificado de participação ou link dos anais',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
]

/** Valor gravado em local_data -> campos de tela (Local e Ano). */
function separarEvento(localData: unknown) {
  const { local, ano } = separarLocalAno(localData)
  return { evento_local: local, evento_ano: ano }
}

export default function Eventos() {
  const discentesVinc = useDiscentesVinculados(eventosDiscentesService)
  const servicoFinal = useMemo(
    () => discentesVinc.envolverServico(eventosService),
    [discentesVinc.envolverServico],
  )
  const camposComDiscentes = useMemo(
    () => [...fields.slice(0, -1), discentesVinc.campo, fields[fields.length - 1]],
    [discentesVinc.campo],
  )
  return (
    <CrudPage
      title="Eventos"
      icon={<Calendar className="h-6 w-6 text-primary shrink-0" />}
      description="Gerencie a participação em eventos dos docentes."
      service={servicoFinal}
      columns={columns}
      fields={camposComDiscentes}
      emptyForm={emptyForm}
      searchKey="evento"
      entityName="Evento"
      tableName="eventos"
      printModule="eventos"
      prepararFormularioEdicao={(item) => ({ ...item, ...separarEvento(item.local_data) })}
      transformSubmitData={(formData) => {
        const { evento_local, evento_ano, ...payload } = formData
        payload.local_data = comporLocalAno(evento_local, evento_ano)
        if (!payload.tipo) payload.tipo = null
        if (!payload.nacionalidade) payload.nacionalidade = null
        payload.valor_total =
          payload.valor_total === '' || payload.valor_total == null
            ? null
            : Number(payload.valor_total)
        if (!payload.comprovante_url) payload.comprovante_url = null
        return payload
      }}
    />
  )
}
