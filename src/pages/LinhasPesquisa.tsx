import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { linhasPesquisaService } from '@/services/linhas-pesquisa'
import type { LinhaPesquisa } from '@/types/database'

const emptyForm = {
  nome: '',
  area: '',
}

const columns: ColumnDef<LinhaPesquisa>[] = [
  {
    key: 'nome',
    label: 'Linha de Pesquisa',
    className: 'font-medium text-slate-900',
  },
  {
    key: 'area',
    label: 'Área de Concentração',
    render: (item) =>
      item.area ? (
        <span className="text-slate-700">{item.area}</span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
]

const fields: FieldDef[] = [
  {
    key: 'nome',
    label: 'Nome da Linha de Pesquisa',
    type: 'text',
    required: true,
    placeholder: 'Ex: Materiais Nanoestruturados e Superfícies',
    helperText: 'Denominação oficial da linha cadastrada no programa',
  },
  {
    key: 'area',
    label: 'Área de Concentração',
    type: 'text',
    placeholder: 'Ex: Ciência dos Materiais / Engenharia de Materiais',
    helperText: 'Área de concentração ou temática principal vinculada',
  },
]

export default function LinhasPesquisa() {
  return (
    <CrudPage
      title="Linhas de Pesquisa"
      description="Gerencie as linhas de pesquisa e áreas de concentração do programa."
      service={linhasPesquisaService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="nome"
      entityName="Linha de Pesquisa"
      tableName="linhas_pesquisa"
      printModule="linhas-pesquisa"
    />
  )
}
