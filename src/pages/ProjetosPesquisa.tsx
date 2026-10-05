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
      label: 'Título do Projeto de Pesquisa',
      type: 'text',
      required: true,
      placeholder: 'Ex: Desenvolvimento de novos biomateriais poliméricos...',
      helperText: 'Título aprovado ou submetido',
    },
    {
      key: 'coordenador_id',
      label: 'Docente Coordenador',
      type: 'select',
      required: true,
      optionsLoader: docenteOptionsLoader,
      helperText: 'Docente permanente responsável pela coordenação',
    },
    {
      key: 'descricao',
      label: 'Descrição do Projeto',
      type: 'textarea',
      rows: 3,
      placeholder: 'Objetivos gerais, metodologia e impactos esperados...',
      helperText: 'Breve descrição dos objetivos e metodologia',
    },
    {
      key: 'inicio',
      label: 'Data de Início',
      type: 'date',
      required: true,
      helperText: 'Início da vigência do projeto',
    },
    {
      key: 'fim',
      label: 'Data de Término',
      type: 'date',
      helperText: 'Término previsto ou efetivo da vigência',
    },
    {
      key: 'financiamento',
      label: 'Possui Financiamento Externo?',
      type: 'switch',
      placeholder: 'Marque se o projeto recebe recursos de agência ou empresa',
    },
    {
      key: 'orgao_fomento',
      label: 'Órgão de Fomento / Financiador',
      type: 'text',
      placeholder: 'Ex: FAPESP, CNPq, CAPES, FINEP, Petrobras...',
      helperText: 'Agência de fomento ou empresa parceira financiadora',
    },
    {
      key: 'link_comprovacao',
      label: 'Link de Comprovação',
      type: 'url',
      placeholder: 'https://...',
      helperText: 'Termo de outorga, aprovação no comitê ou portaria',
    },
    { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
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
      printModule="projetos-pesquisa"
    />
  )
}
