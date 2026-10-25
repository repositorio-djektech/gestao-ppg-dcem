import { useState, useEffect, useMemo } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { bancasService } from '@/services/bancas'
import { discentesService } from '@/services/discentes'
import { docentesService } from '@/services/docentes'
import { projetosPesquisaService } from '@/services/projetos-pesquisa'
import { Badge } from '@/components/ui/badge'
import type { Banca, Docente, Discente, ProjetoPesquisa } from '@/types/database'
import { DocenteNome } from '@/components/docentes/DocenteNome'

const emptyForm = {
  titulo_trabalho: '',
  data: '',
  discente_id: '',
  docente_orientador_id: '',
  projeto_id: '',
  membros: '',
  tipo: 'Mestrado',
  link_comprovacao: '',
  observacoes: '',
}

// Cores distintas por tipo de banca
const getTipoBadgeClass = (tipo: string) => {
  const t = tipo?.toLowerCase() || ''
  if (t.includes('doutorado')) {
    return 'bg-purple-50 text-purple-700 border-purple-200'
  }
  if (t.includes('qualifica')) {
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }
  if (t.includes('mestrado')) {
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

export default function Bancas() {
  const [discentes, setDiscentes] = useState<Discente[]>([])
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [projetos, setProjetos] = useState<ProjetoPesquisa[]>([])

  useEffect(() => {
    Promise.all([discentesService.list(), docentesService.list(), projetosPesquisaService.list()])
      .then(([discList, docList, projList]) => {
        setDiscentes(discList)
        setDocentes(docList)
        setProjetos(projList)
      })
      .catch(console.error)
  }, [])

  const discenteMap = useMemo(() => {
    const m = new Map<number, Discente>()
    discentes.forEach((d) => m.set(d.id, d))
    return m
  }, [discentes])

  const docenteMap = useMemo(() => {
    const m = new Map<number, Docente>()
    docentes.forEach((d) => m.set(d.id, d))
    return m
  }, [docentes])

  const discenteOptionsLoader = async () => {
    const items = await discentesService.list()
    return items.map((d) => ({ value: String(d.id), label: d.nome }))
  }

  const docenteOptionsLoader = async () => {
    const items = await docentesService.list()
    return items.map((d) => ({ value: String(d.id), label: d.nome }))
  }

  const projetoOptionsLoader = async () => {
    const items = await projetosPesquisaService.list()
    return items.map((p) => ({
      value: String(p.id),
      label: p.titulo.length > 70 ? `${p.titulo.slice(0, 70)}…` : p.titulo,
    }))
  }

  const columns: ColumnDef<Banca>[] = [
    { key: 'titulo_trabalho', label: 'Título', className: 'font-medium text-slate-900' },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (b) => (
        <Badge variant="outline" className={`font-medium ${getTipoBadgeClass(b.tipo)}`}>
          {b.tipo}
        </Badge>
      ),
    },
    { key: 'data', label: 'Data' },
    {
      key: 'discente_id',
      label: 'Discente',
      render: (b) => {
        if (!b.discente_id) return <span className="text-slate-400">—</span>
        const disc = discenteMap.get(Number(b.discente_id))
        return disc ? disc.nome : `#${b.discente_id}`
      },
    },
    {
      key: 'docente_orientador_id' as any,
      label: 'Orientador(a)',
      render: (b) => {
        if (!b.docente_orientador_id) {
          // Fallback: se discente tiver docente_orientador_id
          const disc = b.discente_id ? discenteMap.get(Number(b.discente_id)) : null
          if (disc?.docente_orientador_id) {
            const doc = docenteMap.get(Number(disc.docente_orientador_id))
            if (doc) {
              return (
                <div className="flex items-center gap-1.5">
                  <DocenteNome
                    nome={doc.nome}
                    status={doc.status}
                    className="text-xs font-medium"
                  />
                  <span className="text-[10px] text-slate-400 font-normal">(discente)</span>
                </div>
              )
            }
          }
          return <span className="text-slate-400">—</span>
        }
        const doc = docenteMap.get(Number(b.docente_orientador_id))
        if (!doc) return <span className="text-slate-500">#{b.docente_orientador_id}</span>
        return <DocenteNome nome={doc.nome} status={doc.status} className="text-xs font-medium" />
      },
    },
  ]

  const fields: FieldDef[] = [
    {
      key: 'titulo_trabalho',
      label: 'Título do Trabalho',
      type: 'text',
      required: true,
      placeholder: 'Ex: Estudo da síntese e caracterização de compósitos...',
      helperText: 'Título do trabalho de qualificação ou defesa',
    },
    {
      key: 'tipo',
      label: 'Tipo de Banca',
      type: 'select',
      required: true,
      options: [
        { value: 'Mestrado', label: 'Mestrado' },
        { value: 'Doutorado', label: 'Doutorado' },
        { value: 'Qualificação', label: 'Qualificação' },
      ],
    },
    {
      key: 'data',
      label: 'Data da Banca',
      type: 'date',
      required: true,
      helperText: 'Data em que a banca foi ou será realizada',
    },
    {
      key: 'discente_id',
      label: 'Discente',
      type: 'select',
      optionsLoader: discenteOptionsLoader,
      helperText: 'Selecione o discente vinculado',
      onValueChangeWithFormData: (val, currentData) => {
        const discId = val ? Number(val) : null
        const disc = discId ? discenteMap.get(discId) : null
        // Pré-preenche o orientador e projeto se a banca ainda não tiver
        const atualizado = { ...currentData, discente_id: val }
        if (disc?.docente_orientador_id && !currentData.docente_orientador_id) {
          atualizado.docente_orientador_id = String(disc.docente_orientador_id)
        }
        return atualizado
      },
    },
    {
      key: 'docente_orientador_id',
      label: 'Orientador(a) da Banca',
      type: 'select',
      optionsLoader: docenteOptionsLoader,
      placeholder: 'Selecione o docente orientador...',
      helperText: 'Docente vinculado que presidiu/orientou a banca',
    },
    {
      key: 'projeto_id',
      label: 'Projeto de Pesquisa Vinculado',
      type: 'select',
      optionsLoader: projetoOptionsLoader,
      placeholder: 'Selecione o projeto vinculado (opcional)...',
      helperText: 'Projeto de pesquisa do qual esta banca faz parte',
    },
    {
      key: 'membros',
      label: 'Membros da Banca',
      type: 'textarea',
      rows: 3,
      placeholder: 'Ex: Prof. Dr. Silva (Presidente), Profa. Dra. Santos (Externa/USP)...',
      helperText: 'Lista de membros externos e internos',
    },
    {
      key: 'link_comprovacao',
      label: 'Link de Comprovação',
      type: 'url',
      placeholder: 'https://...',
      helperText: 'URL com ata ou portaria de designação da banca',
    },
    { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
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
      customFilterItem={(b, termo, normalizar) => {
        const disc = b.discente_id ? discenteMap.get(Number(b.discente_id)) : null
        const discNome = disc ? disc.nome : ''
        const doc = b.docente_orientador_id ? docenteMap.get(Number(b.docente_orientador_id)) : null
        const docNome = doc ? doc.nome : ''
        return (
          normalizar(discNome).includes(termo) ||
          normalizar(docNome).includes(termo) ||
          normalizar(b.titulo_trabalho).includes(termo) ||
          normalizar(b.tipo).includes(termo)
        )
      }}
      entityName="Banca"
      tableName="bancas"
      printModule="bancas"
    />
  )
}
