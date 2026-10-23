import { useState, useEffect } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { orientacoesService } from '@/services/orientacoes'
import { docentesService } from '@/services/docentes'
import { discentesService } from '@/services/discentes'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { Orientacao } from '@/types/database'
import { calcularStatusEfetivoOrientacao } from '@/lib/orientacoes/status'

const emptyForm = {
  docente_id: '',
  discente_id: '',
  tipo: '',
  inicio: '',
  fim: '',
  cancelado: false,
  link_comprovacao: '',
  observacoes: '',
}

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700',
  em_andamento: 'bg-emerald-50 text-emerald-700',
  concluido: 'bg-blue-50 text-blue-700',
  cancelado: 'bg-red-50 text-red-700',
}

const statusLabels: Record<string, string> = {
  ativo: 'Em andamento',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
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
      render: (o) => {
        const statusEfetivo =
          o.status_efetivo ||
          calcularStatusEfetivoOrientacao({
            status: o.status,
            fim: o.fim,
            cancelado: o.cancelado,
          })
        return (
          <Badge
            variant="secondary"
            className={`border-0 font-medium ${statusColors[statusEfetivo] ?? statusColors.em_andamento}`}
          >
            {statusLabels[statusEfetivo] ?? statusEfetivo}
          </Badge>
        )
      },
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
      key: 'cancelado',
      label: 'Cancelado',
      type: 'switch',
      customRender: ({ formData, setFormData }) => {
        // Deriva o status efetivo do formulário
        const statusEfetivo = calcularStatusEfetivoOrientacao({
          status: formData.status,
          fim: formData.fim,
          cancelado: formData.cancelado === true,
        })

        // Quando o status efetivo do registro for concluido, o switcher NÃO é exibido
        // (não faz sentido cancelar o que já concluiu)
        if (statusEfetivo === 'concluido') {
          return null
        }

        const isCancelado = Boolean(formData.cancelado)

        return (
          <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-white">
            <div className="space-y-0.5">
              <Label
                htmlFor="cancelado"
                className="cursor-pointer text-sm font-medium text-slate-800"
              >
                Cancelado
              </Label>
              <p className="text-xs text-slate-500">
                Marque se a orientação foi interrompida ou cancelada
              </p>
            </div>
            <Switch
              id="cancelado"
              checked={isCancelado}
              onCheckedChange={(checked) => {
                setFormData((prev) => ({
                  ...prev,
                  cancelado: checked,
                }))
              }}
            />
          </div>
        )
      },
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
      transformSubmitData={(data) => {
        // Envia cancelado (boolean) + datas, nunca um status escolhido pelo usuário.
        // O trigger no backend (ou aplicação do backend) deriva o status definitivo.
        const canceladoBool = Boolean(data.cancelado)
        const { status: _ignorado, ...rest } = data
        return {
          ...rest,
          cancelado: canceladoBool,
        }
      }}
      customFilterItem={(o, termo, normalizar) => {
        const docNome = o.docente_id ? docenteMap[String(o.docente_id)] : ''
        const discNome = o.discente_id ? discenteMap[String(o.discente_id)] : ''
        const stEfetivo =
          o.status_efetivo ||
          calcularStatusEfetivoOrientacao({
            status: o.status,
            fim: o.fim,
            cancelado: o.cancelado,
          })
        const labelSt = statusLabels[stEfetivo] ?? ''
        return (
          normalizar(docNome).includes(termo) ||
          normalizar(discNome).includes(termo) ||
          normalizar(o.tipo).includes(termo) ||
          normalizar(o.status).includes(termo) ||
          normalizar(stEfetivo).includes(termo) ||
          normalizar(labelSt).includes(termo)
        )
      }}
      entityName="Orientação"
      tableName="orientacoes"
      printModule="orientacoes"
    />
  )
}
