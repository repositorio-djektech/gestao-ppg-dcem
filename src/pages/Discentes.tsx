import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { discentesService } from '@/services/discentes'
import { Badge } from '@/components/ui/badge'
import type { Discente } from '@/types/database'
import { formatarCpf } from '@/lib/utils'
import { normalizarNomePessoa } from '@/lib/normalizacao'

const emptyForm = {
  nome: '',
  cpf: '',
  data_ingresso: '',
  status: 'ativo',
  link_lattes: '',
  link_comprovacao: '',
  observacoes: '',
  orientador: '',
  ano_conclusao: '',
  tipo_curso: 'Mestrado',
}

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700',
  titulado: 'bg-blue-50 text-blue-700',
  desligado: 'bg-red-50 text-red-700',
}

const columns: ColumnDef<Discente>[] = [
  {
    key: 'nome',
    label: 'Nome & Informações',
    className: 'font-medium text-slate-900',
    render: (d) => (
      <div className="flex flex-col items-start gap-0.5">
        <span>{normalizarNomePessoa(d.nome)}</span>
        {(d.tipo_curso || d.orientador || d.ano_conclusao) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-normal">
            {d.tipo_curso && (
              <span className="font-medium text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                {d.tipo_curso}
              </span>
            )}
            {d.orientador && <span>• Orientador: {d.orientador}</span>}
            {d.ano_conclusao && <span>• Conclusão: {d.ano_conclusao}</span>}
          </div>
        )}
      </div>
    ),
  },
  {
    key: 'cpf',
    label: 'CPF',
    render: (d) => (d.cpf ? formatarCpf(d.cpf) : '—'),
  },
  { key: 'data_ingresso', label: 'Ingresso' },
  {
    key: 'status',
    label: 'Status',
    render: (d) => (
      <div className="flex flex-col gap-1 items-start">
        <Badge
          variant="secondary"
          className={`border-0 capitalize ${statusColors[d.status] ?? ''}`}
        >
          {d.status}
        </Badge>
        {d.ano_conclusao && d.status === 'titulado' && (
          <span className="text-[10px] text-slate-400">Ano: {d.ano_conclusao}</span>
        )}
      </div>
    ),
  },
]

const fields: FieldDef[] = [
  {
    key: 'nome',
    label: 'Nome Completo',
    type: 'text',
    required: true,
    placeholder: 'Nome completo do aluno',
  },
  {
    key: 'cpf',
    label: 'CPF',
    type: 'text',
    placeholder: '000.000.000-00',
    helperText: 'Apenas números ou formatado',
  },
  {
    key: 'data_ingresso',
    label: 'Data de Ingresso',
    type: 'date',
    required: true,
    helperText: 'Data de matrícula inicial no programa',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'ativo', label: 'Ativo' },
      { value: 'titulado', label: 'Titulado' },
      { value: 'desligado', label: 'Desligado' },
    ],
  },
  {
    key: 'tipo_curso',
    label: 'Tipo do Curso',
    type: 'select',
    options: [
      { value: 'Mestrado', label: 'Mestrado' },
      { value: 'Doutorado', label: 'Doutorado' },
      { value: 'Pós-Doutorado', label: 'Pós-Doutorado' },
    ],
    placeholder: 'Selecione o nível...',
  },
  {
    key: 'orientador',
    label: 'Orientador',
    type: 'text',
    placeholder: 'Nome do orientador do discente',
  },
  {
    key: 'ano_conclusao',
    label: 'Ano de Conclusão',
    type: 'text',
    placeholder: 'Ex: 2026',
    helperText: 'Ano de defesa ou previsão de conclusão',
  },
  {
    key: 'link_lattes',
    label: 'Currículo Lattes',
    type: 'url',
    placeholder: 'http://lattes.cnpq.br/...',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'Ficha de matrícula ou documento comprobatório',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
]

export default function Discentes() {
  return (
    <CrudPage
      title="Discentes"
      description="Gerencie os discentes do programa de pós-graduação."
      service={discentesService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="nome"
      entityName="Discente"
      printModule="discentes"
    />
  )
}
