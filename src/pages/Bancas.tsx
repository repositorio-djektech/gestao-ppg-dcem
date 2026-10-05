import { useState, useEffect } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { bancasService } from '@/services/bancas'
import { discentesService } from '@/services/discentes'
import { Badge } from '@/components/ui/badge'
import type { Banca } from '@/types/database'

const emptyForm = {
  titulo_trabalho: '',
  data: '',
  discente_id: '',
  membros: '',
  tipo: 'Mestrado',
  link_comprovacao: '',
  observacoes: '',
}

export default function Bancas() {
  const [discenteMap, setDiscenteMap] = useState<Record<string, string>>({})

  useEffect(() => {
    discentesService.list().then((items) => {
      const m: Record<string, string> = {}
      items.forEach((d) => {
        m[d.id] = d.nome
      })
      setDiscenteMap(m)
    })
  }, [])

  const discenteOptionsLoader = async () => {
    const items = await discentesService.list()
    return items.map((d) => ({ value: String(d.id), label: d.nome }))
  }

  const columns: ColumnDef<Banca>[] = [
    { key: 'titulo_trabalho', label: 'Título', className: 'font-medium text-slate-900' },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (b) => (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0">
          {b.tipo}
        </Badge>
      ),
    },
    { key: 'data', label: 'Data' },
    {
      key: 'discente_id',
      label: 'Discente',
      render: (b) => discenteMap[b.discente_id ?? ''] ?? '-',
    },
  ]

  const fields: FieldDef[] = [
    {
      key: 'titulo_trabalho',
      label: 'Título do Trabalho',
      type: 'text',
      required: true,
      helperText: 'Título do trabalho de qualificação ou defesa',
    },
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { value: 'Mestrado', label: 'Mestrado' },
        { value: 'Doutorado', label: 'Doutorado' },
        { value: 'Qualificação', label: 'Qualificação' },
      ],
    },
    {
      key: 'data',
      label: 'Data',
      type: 'text',
      placeholder: 'DD/MM/AAAA',
      helperText: 'Data da banca',
    },
    {
      key: 'discente_id',
      label: 'Discente',
      type: 'select',
      optionsLoader: discenteOptionsLoader,
      helperText: 'Selecione o discente vinculado',
    },
    {
      key: 'membros',
      label: 'Membros da Banca',
      type: 'textarea',
      helperText: 'Lista de membros externos e internos',
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
      title="Bancas"
      description="Gerencie as bancas de qualificação e defesa."
      service={bancasService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo_trabalho"
      entityName="Banca"
    />
  )
}
