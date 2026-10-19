import { useState, useEffect } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { iniciacaoCientificaService } from '@/services/iniciacao-cientifica'
import { docentesService } from '@/services/docentes'
import { discentesService } from '@/services/discentes'
import { projetosPesquisaService } from '@/services/projetos-pesquisa'
import { Badge } from '@/components/ui/badge'
import type { IniciacaoCientifica, Docente, Discente, ProjetoPesquisa } from '@/types/database'
import { DocenteNome } from '@/components/docentes/DocenteNome'

const emptyForm = {
  discente_id: '',
  discente_nome: '',
  tipo: 'iniciacao_cientifica' as const,
  bolsa_cnpq: '',
  ano: new Date().getFullYear(),
  docente_orientador_id: '',
  projeto_id: '',
  titulo: '',
  observacoes: '',
}

export default function IniciacaoCientificaPage() {
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [discentes, setDiscentes] = useState<Discente[]>([])
  const [projetos, setProjetos] = useState<ProjetoPesquisa[]>([])

  useEffect(() => {
    docentesService.list().then(setDocentes).catch(console.error)
    discentesService.list().then(setDiscentes).catch(console.error)
    projetosPesquisaService.list().then(setProjetos).catch(console.error)
  }, [])

  const columns: ColumnDef<IniciacaoCientifica>[] = [
    {
      key: 'discente_id',
      label: 'Discente',
      className: 'font-medium text-slate-900 text-left',
      render: (item) => {
        if (item.discente_id) {
          const d = discentes.find((disc) => String(disc.id) === String(item.discente_id))
          if (d) return <span>{d.nome}</span>
        }
        return <span>{item.discente_nome || '—'}</span>
      },
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (item) => {
        if (item.tipo === 'iniciacao_extensao') {
          return (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold"
            >
              IE (Extensão)
            </Badge>
          )
        }
        if (item.tipo === 'iniciacao_tecnologica') {
          return (
            <Badge
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-semibold"
            >
              IT (Tecnológica)
            </Badge>
          )
        }
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold"
          >
            IC (Científica)
          </Badge>
        )
      },
    },
    {
      key: 'bolsa_cnpq' as any,
      label: 'Bolsa CNPq',
      render: (item) => {
        if (!item.bolsa_cnpq) return <span className="text-slate-400">—</span>
        return (
          <Badge
            variant="secondary"
            className="bg-slate-100 text-slate-800 text-[11px] font-semibold"
          >
            {item.bolsa_cnpq}
          </Badge>
        )
      },
    },
    {
      key: 'ano',
      label: 'Ano',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-slate-700">{item.ano || '—'}</span>
      ),
    },
    {
      key: 'docente_orientador_id',
      label: 'Orientador',
      render: (item) => {
        if (!item.docente_orientador_id) return <span className="text-slate-400">—</span>
        const doc = docentes.find((d) => String(d.id) === String(item.docente_orientador_id))
        if (!doc) return <span className="text-slate-400">—</span>
        return <DocenteNome nome={doc.nome} status={doc.status} />
      },
    },
    {
      key: 'titulo',
      label: 'Título / Projeto',
      className: 'max-w-md truncate',
      render: (item) => {
        let projetoTitulo = ''
        if (item.projeto_id) {
          const proj = projetos.find((p) => String(p.id) === String(item.projeto_id))
          if (proj) projetoTitulo = proj.titulo
        }
        return (
          <div className="space-y-0.5">
            <div className="font-medium text-slate-900 truncate" title={item.titulo}>
              {item.titulo || '—'}
            </div>
            {projetoTitulo && (
              <div
                className="text-[11px] text-slate-500 truncate"
                title={`Projeto: ${projetoTitulo}`}
              >
                Proj: {projetoTitulo}
              </div>
            )}
          </div>
        )
      },
    },
  ]

  const fields: FieldDef[] = [
    {
      key: 'tipo',
      label: 'Tipo de Iniciação',
      type: 'select',
      required: true,
      options: [
        { label: 'Iniciação Científica (IC)', value: 'iniciacao_cientifica' },
        { label: 'Iniciação Tecnológica (IT)', value: 'iniciacao_tecnologica' },
        { label: 'Iniciação em Extensão (IE)', value: 'iniciacao_extensao' },
      ],
      placeholder: 'Selecione o tipo...',
    },
    {
      key: 'bolsa_cnpq',
      label: 'Tipo de Bolsa CNPq',
      type: 'select',
      options: [
        { label: '— Nenhuma Bolsa —', value: '' },
        { label: 'PQ-SR', value: 'PQ-SR' },
        { label: 'PQ 1A', value: 'PQ-1A' },
        { label: 'PQ 1B', value: 'PQ-1B' },
        { label: 'PQ 1C', value: 'PQ-1C' },
        { label: 'PQ 1D', value: 'PQ-1D' },
        { label: 'PQ 2', value: 'PQ-2' },
        { label: 'DT 1A', value: 'DT-1A' },
        { label: 'DT 1B', value: 'DT-1B' },
        { label: 'DT 2', value: 'DT-2' },
      ],
      placeholder: 'Selecione o tipo de bolsa CNPq...',
      helperText: 'Tipo de bolsa CNPq associada (ex: PQ-SR, PQ, DT)',
    },
    {
      key: 'ano',
      label: 'Ano de Realização',
      type: 'year',
      required: true,
      placeholder: 'Selecione o ano...',
      helperText: 'Ano de vigência ou realização do plano de trabalho',
    },
    {
      key: 'discente_id',
      label: 'Discente Cadastrado (Opcional)',
      type: 'select',
      options: [
        { label: '— Não vinculado / Outro discente —', value: '' },
        ...discentes.map((d) => ({
          label: d.nome,
          value: String(d.id),
        })),
      ],
      placeholder: 'Selecione um discente se já cadastrado...',
      helperText: 'Vincule a um discente existente ou informe o nome abaixo se não cadastrado',
    },
    {
      key: 'discente_nome',
      label: 'Nome do Aluno (se não cadastrado acima)',
      type: 'text',
      placeholder: 'Nome completo do aluno de graduação/ensino médio...',
      helperText: 'Usado caso o aluno de IC/IT ainda não tenha ficha no programa',
    },
    {
      key: 'docente_orientador_id',
      label: 'Docente Orientador',
      type: 'select',
      required: true,
      options: docentes.map((d) => ({
        label: d.status === false ? `${d.nome} (inativo)` : d.nome,
        value: String(d.id),
      })),
      placeholder: 'Selecione o docente orientador...',
    },
    {
      key: 'projeto_id',
      label: 'Projeto de Pesquisa Vinculado (Opcional)',
      type: 'select',
      options: [
        { label: '— Sem vínculo com projeto específico —', value: '' },
        ...projetos.map((p) => {
          const anoRef = p.inicio ? p.inicio.slice(0, 4) : ''
          return {
            label: `${anoRef ? `[${anoRef}] ` : ''}${p.titulo.slice(0, 80)}${p.titulo.length > 80 ? '...' : ''}`,
            value: String(p.id),
          }
        }),
      ],
      placeholder: 'Selecione o projeto...',
    },
    {
      key: 'titulo',
      label: 'Título do Plano de Trabalho / Pesquisa',
      type: 'text',
      required: true,
      placeholder: 'Ex: Estudo da síntese e caracterização de nanocompósitos...',
    },
    {
      key: 'observacoes',
      label: 'Observações / Agência de Fomento',
      type: 'textarea',
      placeholder: 'Bolsa PIBIC/PIBITI/FAPITEC/CNPq ou voluntário...',
    },
  ]

  return (
    <CrudPage
      title="Iniciação Científica e Tecnológica"
      description="Cadastro e acompanhamento de planos de Iniciação Científica (IC) e Tecnológica (IT) orientados por docentes do programa."
      service={iniciacaoCientificaService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      customFilterItem={(item, termo, normalizar) => {
        let discNome = item.discente_nome || ''
        if (item.discente_id) {
          const disc = discentes.find((d) => String(d.id) === String(item.discente_id))
          if (disc) discNome = disc.nome
        }
        let docNome = ''
        if (item.docente_orientador_id) {
          const doc = docentes.find((d) => String(d.id) === String(item.docente_orientador_id))
          if (doc) docNome = doc.nome
        }
        let projTitulo = ''
        if (item.projeto_id) {
          const proj = projetos.find((p) => String(p.id) === String(item.projeto_id))
          if (proj) projTitulo = proj.titulo
        }

        return (
          normalizar(discNome).includes(termo) ||
          normalizar(docNome).includes(termo) ||
          normalizar(projTitulo).includes(termo) ||
          normalizar(item.bolsa_cnpq).includes(termo) ||
          normalizar(item.tipo).includes(termo)
        )
      }}
      entityName="Iniciação Científica"
      tableName="iniciacao_cientifica"
      tableHeaderClassName="bg-[#e9effc] sticky top-0 z-10"
    />
  )
}
