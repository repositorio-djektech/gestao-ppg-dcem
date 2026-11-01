import { useState, useEffect, useMemo } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { disciplinasService } from '@/services/disciplinas'
import { docentesService } from '@/services/docentes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Library, UserCheck, X } from 'lucide-react'
import type { Disciplina, Docente } from '@/types/database'
import { DocenteNome } from '@/components/docentes/DocenteNome'

const emptyForm = {
  nome: '',
  codigo: '',
  nivel: 'pos_graduacao',
  creditos: 0,
  ano_semestre: '',
  link_comprovacao: '',
  observacoes: '',
  docentes_ids: [] as number[],
}

export default function Disciplinas() {
  const [docentes, setDocentes] = useState<Docente[]>([])

  useEffect(() => {
    docentesService
      .list()
      .then((lista) => {
        const ordenados = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        setDocentes(ordenados)
      })
      .catch((err) => {
        console.error('Erro ao carregar lista de docentes para disciplinas:', err)
      })
  }, [])

  const docenteMap = useMemo(() => {
    const mapa = new Map<number, Docente>()
    for (const d of docentes) {
      mapa.set(Number(d.id), d)
    }
    return mapa
  }, [docentes])

  const columns: ColumnDef<Disciplina>[] = [
    { key: 'nome', label: 'Nome', className: 'font-medium text-slate-900' },
    {
      key: 'codigo',
      label: 'Código',
      render: (d) => <span className="font-mono text-sm text-slate-600">{d.codigo || '-'}</span>,
    },
    {
      key: 'nivel',
      label: 'Nível',
      render: (d) => {
        if (!d.nivel) return <span className="text-slate-400">—</span>
        const isPos = d.nivel === 'pos_graduacao'
        return (
          <Badge
            variant="outline"
            className={
              isPos
                ? 'bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-medium'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium'
            }
          >
            {isPos ? 'Pós-graduação' : 'Graduação'}
          </Badge>
        )
      },
    },
    {
      key: 'docentes_ids' as any,
      label: 'Docentes',
      className: 'max-w-xs',
      render: (d) => {
        // Obter lista de docentes vinculados
        const ids =
          Array.isArray(d.docentes_ids) && d.docentes_ids.length > 0
            ? d.docentes_ids
            : d.docente_id
              ? [Number(d.docente_id)]
              : []

        if (ids.length === 0) {
          return <span className="text-slate-400">—</span>
        }

        const docentesVinculados = ids
          .map((id) => docenteMap.get(Number(id)))
          .filter(Boolean) as Docente[]

        if (docentesVinculados.length === 0) {
          return <span className="text-slate-400">—</span>
        }

        return (
          <div className="flex flex-wrap gap-1 items-center">
            {docentesVinculados.map((doc) => (
              <Badge
                key={doc.id}
                variant="outline"
                className="bg-slate-50 text-slate-800 border-slate-200 text-[11px] font-normal py-0.5 px-2"
              >
                <DocenteNome nome={doc.nome} status={doc.status} />
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      key: 'creditos',
      label: 'Créditos',
      render: (d) => (
        <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0">
          {d.creditos}
        </Badge>
      ),
    },
    { key: 'ano_semestre', label: 'Ano/Semestre' },
  ]

  const fields: FieldDef[] = [
    {
      key: 'nome',
      label: 'Nome da Disciplina',
      type: 'text',
      required: true,
      placeholder: 'Ex: Ciência dos Materiais Avançada',
    },
    {
      key: 'codigo',
      label: 'Código da Disciplina',
      type: 'text',
      required: true,
      placeholder: 'Ex: PCM001',
    },
    {
      key: 'docentes_ids',
      label: 'Docentes Vinculados',
      type: 'text',
      customRender: ({ formData, setFormData }) => {
        const rawIds = formData.docentes_ids
        let idsAtuais: number[] = []
        if (Array.isArray(rawIds)) {
          idsAtuais = rawIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0)
        } else if (formData.docente_id) {
          idsAtuais = [Number(formData.docente_id)]
        }

        const adicionarDocente = (docenteIdStr: string) => {
          const docId = Number(docenteIdStr)
          if (!docId || idsAtuais.includes(docId)) return
          const novos = [...idsAtuais, docId]
          setFormData({
            ...formData,
            docentes_ids: novos,
            docente_id: novos[0] || null,
          })
        }

        const removerDocente = (docId: number) => {
          const novos = idsAtuais.filter((id) => id !== docId)
          setFormData({
            ...formData,
            docentes_ids: novos,
            docente_id: novos[0] || null,
          })
        }

        const docentesDisponiveis = docentes.filter((d) => !idsAtuais.includes(Number(d.id)))

        return (
          <div className="space-y-2 p-3 bg-slate-50/80 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                Docentes Vinculados à Disciplina
              </Label>
              <span className="text-[11px] text-slate-500 font-medium">
                {idsAtuais.length === 0
                  ? 'Nenhum vinculado'
                  : `${idsAtuais.length} docente${idsAtuais.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {/* Chips dos docentes selecionados */}
            {idsAtuais.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {idsAtuais.map((id) => {
                  const doc = docenteMap.get(id)
                  const nome = doc ? doc.nome : `Docente #${id}`
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="bg-white border border-slate-200 text-slate-800 text-xs py-1 pl-2.5 pr-1.5 flex items-center gap-1 shadow-2xs"
                    >
                      <span>{nome}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerDocente(id)}
                        className="h-4 w-4 p-0 text-slate-400 hover:text-destructive hover:bg-transparent cursor-pointer"
                        title={`Remover ${nome}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Nenhum docente vinculado a esta disciplina. Selecione abaixo para vincular.
              </p>
            )}

            {/* Seletor para adicionar novo docente */}
            {docentesDisponiveis.length > 0 && (
              <div className="pt-1">
                <Select onValueChange={(val) => adicionarDocente(val)} value="">
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="+ Vincular docente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {docentesDisponiveis.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                        {d.status === false ? `${d.nome} (inativo)` : d.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'nivel',
      label: 'Nível da Disciplina',
      type: 'select',
      options: [
        { label: 'Pós-graduação', value: 'pos_graduacao' },
        { label: 'Graduação', value: 'graduacao' },
      ],
      placeholder: 'Selecione o nível...',
    },
    {
      key: 'creditos',
      label: 'Créditos',
      type: 'number',
      required: true,
      placeholder: '4',
    },
    {
      key: 'ano_semestre',
      label: 'Ano / Semestre',
      type: 'text',
      placeholder: 'Ex: 2024.1',
    },
    {
      key: 'link_comprovacao',
      label: 'Link de Comprovação',
      type: 'url',
      placeholder: 'https://...',
    },
    {
      key: 'observacoes',
      label: 'Observações',
      type: 'textarea',
      placeholder: 'Ementa resumida ou informações adicionais...',
    },
  ]

  return (
    <CrudPage
      title="Disciplinas"
      icon={<Library className="h-6 w-6 text-primary shrink-0" />}
      description="Gerencie as disciplinas oferecidas pelo programa."
      service={disciplinasService}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="nome"
      entityName="Disciplina"
      tableName="disciplinas"
      printModule="disciplinas"
      customFilterItem={(item, termo, normalizar) => {
        // Filtrar também pelos nomes dos docentes vinculados
        const ids = Array.isArray(item.docentes_ids)
          ? item.docentes_ids
          : item.docente_id
            ? [item.docente_id]
            : []
        for (const id of ids) {
          const doc = docenteMap.get(Number(id))
          if (doc && normalizar(doc.nome).includes(termo)) {
            return true
          }
        }
        return false
      }}
    />
  )
}
