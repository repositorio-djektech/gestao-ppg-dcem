import { useState, useEffect } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { orientacoesService } from '@/services/orientacoes'
import { docentesService } from '@/services/docentes'
import { discentesService } from '@/services/discentes'
import { Badge } from '@/components/ui/badge'
import type { Orientacao } from '@/types/database'

const emptyForm = {
  docente_id: '',
  discente_id: '',
  tipo: '',
  inicio: '',
  fim: '',
  status: 'ativo',
  link_comprovacao: '',
  observacoes: '',
}

export default function Orientacoes() {
  const [docenteMap, setDocenteMap] = useState<Record<string, string>>({})
  const [discenteMap, setDiscenteMap] = useState<Record<string, string>>({})

  useEffect(() => {
    docentesService.list().then((items) => {
      const m: Record<string, string> = {}
      items.forEach((d) => {
        m[d.id] = d.nome
      })
      setDocenteMap(m)
    })
    discentesService.list().then((items) => {
      const m: Record<string, string> = {}
      items.forEach((d) => {
        m[d.id] = d.nome
      })
      setDiscenteMap(m)
    })
  }, [])

  const docenteOptionsLoader = async () => {
    const items = await docentesService.list()
    return items.map((d) => ({ value: d.id, label: d.nome }))
  }
  const discenteOptionsLoader = async () => {
    const items = await discentesService.list()
    return items.map((d) => ({ value: d.id, label: d.nome }))
  }

  const columns: ColumnDef<Orientacao>[] = [
    {
      key: 'docente_id',
      label: 'Docente',
      render: (o) => docenteMap[o.docente_id ?? ''] ?? '-',
      className: 'font-medium text-slate-900',
    },
    {
      key: 'discente_id',
      label: 'Discente',
      render: (o) => discenteMap[o.discente_id ?? ''] ?? '-',
    },
    { key: 'tipo', label: 'Tipo' },
    { key: 'inicio', label: 'Início' },
    {
      key: 'status',
      label: 'Status',
      render: (o) => (
        <Badge
          className={
            o.status === 'ativo'
              ? 'bg-emerald-50 text-emerald-700 border-0'
              : 'bg-slate-100 text-slate-600 border-0'
          }
        >
          {o.status}
        </Badge>
      ),
    },
  ]

  const fields: FieldDef[] = [
    {
      key: 'docente_id',
      label: 'Docente Orientador',
      type: 'select',
      optionsLoader: docenteOptionsLoader,
      helperText: 'Selecione o docente orientador',
    },
    {
      key: 'discente_id',
      label: 'Discente Orientado',
      type: 'select',
      optionsLoader: discenteOptionsLoader,
      helperText: 'Selecione o discente orientado',
    },
    {
      key: 'tipo',
      label: 'Tipo de Orientação',
      type: 'select',
      options: [
        { value: 'Mestrado', label: 'Mestrado' },
        { value: 'Doutorado', label: 'Doutorado' },
        { value: 'Iniciação Científica', label: 'Iniciação Científica' },
        { value: 'Pós-Doutorado', label: 'Pós-Doutorado' },
      ],
    },
    { key: 'inicio', label: 'Data de Início', type: 'text', placeholder: 'MM/AAAA' },
    { key: 'fim', label: 'Data de Fim', type: 'text', placeholder: 'MM/AAAA' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'concluido', label: 'Concluído' },
        { value: 'cancelado', label: 'Cancelado' },
      ],
    },
    {
      key: 'link_comprovacao',
      label: 'Link de Comprovação',
      type: 'text',
      placeholder: 'https://...',
    },
    { key: 'observacoes', label: 'Observações', type: 'textarea' },
  ]

  return (
    <CrudPage
      title="Orientações"
      description="Gerencie as orientações de docentes a discentes."
      service={orientacoesService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="tipo"
      entityName="Orientação"
    />
  )
}
