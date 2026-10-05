import { useState, useEffect } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { orientacoesService } from '@/services/orientacoes'
import { docentesService } from '@/services/docentes'
import { discentesService } from '@/services/discentes'
import { Badge } from '@/components/ui/badge'
import type { Orientacao } from '@/types/database'

const emptyForm = {
  tipo: '',
  docente_id: '',
  discente_id: '',
  inicio: '',
  fim: '',
  status: 'ativo',
  link_comprovacao: '',
  observacoes: '',
}

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700',
  concluido: 'bg-blue-50 text-blue-700',
  cancelado: 'bg-red-50 text-red-700',
}

export default function Orientacoes() {
  const [docenteMap, setDocenteMap] = useState<Record<string, string>>({})
  const [discenteMap, setDiscenteMap] = useState<Record<string, string>>({})

  useEffect(() => {
    docentesService.list().then((items: any[]) => {
      const m: Record<string, string> = {}
      items.forEach((d) => {
        m[d.id] = d.nome
      })
      setDocenteMap(m)
    })
    discentesService.list().then((items: any[]) => {
      const m: Record<string, string> = {}
      items.forEach((d) => {
        m[d.id] = d.nome
      })
      setDiscenteMap(m)
    })
  }, [])

  const docenteOptionsLoader = async () => {
    const items = await docentesService.list()
    return items.map((d: any) => ({ value: String(d.id), label: d.nome }))
  }

  const discenteOptionsLoader = async () => {
    const items = await discentesService.list()
    return items.map((d: any) => ({ value: String(d.id), label: d.nome }))
  }

  const columns: ColumnDef<Orientacao>[] = [
    { key: 'tipo', label: 'Tipo', className: 'font-medium text-slate-900' },
    {
      key: 'docente_id',
      label: 'Docente',
      render: (o) => docenteMap[String(o.docente_id ?? '')] ?? '-',
    },
    {
      key: 'discente_id',
      label: 'Discente',
      render: (o) => discenteMap[String(o.discente_id ?? '')] ?? '-',
    },
    { key: 'inicio', label: 'Início' },
    {
      key: 'status',
      label: 'Status',
      render: (o) => (
        <Badge
          variant="secondary"
          className={`border-0 capitalize ${statusColors[o.status] ?? ''}`}
        >
          {o.status}
        </Badge>
      ),
    },
  ]

  const fields: FieldDef[] = [
    {
      key: 'tipo',
      label: 'Tipo de Orientação / Nível',
      type: 'select',
      required: true,
      options: [
        { value: 'Mestrado', label: 'Mestrado' },
        { value: 'Doutorado', label: 'Doutorado' },
        { value: 'Pós-Doutorado', label: 'Pós-Doutorado' },
        { value: 'Iniciação Científica', label: 'Iniciação Científica' },
        { value: 'TCC / Graduação', label: 'TCC / Graduação' },
      ],
    },
    {
      key: 'docente_id',
      label: 'Docente Orientador',
      type: 'select',
      required: true,
      optionsLoader: docenteOptionsLoader,
      helperText: 'Selecione o docente orientador',
    },
    {
      key: 'discente_id',
      label: 'Discente Orientando',
      type: 'select',
      required: true,
      optionsLoader: discenteOptionsLoader,
      helperText: 'Selecione o discente orientando',
    },
    {
      key: 'inicio',
      label: 'Data de Início',
      type: 'date',
      required: true,
      helperText: 'Início do período de orientação',
    },
    {
      key: 'fim',
      label: 'Data de Término Prevista / Efetiva',
      type: 'date',
      helperText: 'Deixe em branco se em andamento',
    },
    {
      key: 'status',
      label: 'Status da Orientação',
      type: 'select',
      required: true,
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'concluido', label: 'Concluído' },
        { value: 'cancelado', label: 'Cancelado' },
      ],
    },
    {
      key: 'link_comprovacao',
      label: 'Link de Comprovação',
      type: 'url',
      placeholder: 'https://...',
      helperText: 'Termo de compromisso ou portaria de orientação',
    },
    { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
  ]

  return (
    <CrudPage
      title="Orientações"
      description="Gerencie as orientações de discentes pelos docentes."
      service={orientacoesService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="tipo"
      entityName="Orientação"
      printModule="orientacoes"
    />
  )
}
