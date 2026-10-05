import { useState, useEffect } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { projetosPesquisaService } from '@/services/projetos-pesquisa'
import { docentesService } from '@/services/docentes'
import { Badge } from '@/components/ui/badge'
import type { ProjetoPesquisa } from '@/types/database'

const emptyForm = {
  titulo: '',
  descricao: '',
  inicio: '',
  fim: '',
  coordenador_id: '',
  financiamento: false,
  orgao_fomento: '',
  link_comprovacao: '',
  observacoes: '',
}

export default function ProjetosPesquisa() {
  const [docenteMap, setDocenteMap] = useState<Record<string, string>>({})

  useEffect(() => {
    docentesService.list().then((items) => {
      const m: Record<string, string> = {}
      items.forEach((d) => {
        m[d.id] = d.nome
      })
      setDocenteMap(m)
    })
  }, [])

  const docenteOptionsLoader = async () => {
    const items = await docentesService.list()
    return items.map((d) => ({ value: String(d.id), label: d.nome }))
  }

  const columns: ColumnDef<ProjetoPesquisa>[] = [
    { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
    {
      key: 'coordenador_id',
      label: 'Coordenador',
      render: (p) => docenteMap[p.coordenador_id ?? ''] ?? '-',
    },
    { key: 'inicio', label: 'Início' },
    {
      key: 'financiamento',
      label: 'Financiado',
      render: (p) =>
        p.financiamento ? (
          <Badge className="bg-emerald-50 text-emerald-700 border-0">Sim</Badge>
        ) : (
          <span className="text-slate-400">Não</span>
        ),
    },
  ]

  const fields: FieldDef[] = [
    {
      key: 'titulo',
      label: 'Título do Projeto',
      type: 'text',
      required: true,
      helperText: 'Título do projeto de pesquisa',
    },
    {
      key: 'descricao',
      label: 'Descrição',
      type: 'textarea',
      helperText: 'Breve descrição dos objetivos e metodologia',
    },
    {
      key: 'coordenador_id',
      label: 'Coordenador',
      type: 'select',
      optionsLoader: docenteOptionsLoader,
      helperText: 'Docente coordenador do projeto',
    },
    { key: 'inicio', label: 'Data de Início', type: 'text', placeholder: 'MM/AAAA' },
    { key: 'fim', label: 'Data de Fim', type: 'text', placeholder: 'MM/AAAA' },
    {
      key: 'financiamento',
      label: 'Possui Financiamento?',
      type: 'switch',
      placeholder: 'Indique se o projeto possui financiamento',
    },
    {
      key: 'orgao_fomento',
      label: 'Órgão de Fomento',
      type: 'text',
      placeholder: 'Ex: CAPES, CNPq, FAPESP...',
      helperText: 'Agência de fomento financiadora',
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
      title="Projetos de Pesquisa"
      description="Gerencie os projetos de pesquisa do programa."
      service={projetosPesquisaService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Projeto"
    />
  )
}
