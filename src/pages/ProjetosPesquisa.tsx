import { useState, useEffect, useMemo, useCallback } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { projetosPesquisaService } from '@/services/projetos-pesquisa'
import { docentesService } from '@/services/docentes'
import { Badge } from '@/components/ui/badge'
import type { ProjetoPesquisa, Docente } from '@/types/database'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ShieldCheck, UserCheck, Trash2 } from 'lucide-react'

export type PapelDocenteProjeto = 'coordenador' | 'participante'

export interface ParticipanteDocenteItem {
  docente_id: number
  papel: PapelDocenteProjeto
}

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
  classificacao: '',
  participantes_docentes: [] as ParticipanteDocenteItem[],
}

export default function ProjetosPesquisa() {
  const { profile } = useAuth()
  const [docenteMap, setDocenteMap] = useState<Record<string, string>>({})
  const [docentesLista, setDocentesLista] = useState<Docente[]>([])
  const [projetosParticipantesIds, setProjetosParticipantesIds] = useState<number[]>([])
  const [todosParticipantes, setTodosParticipantes] = useState<
    { projeto_id: number; docente_id: number; papel?: string | null }[]
  >([])

  const carregarParticipantes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projetos_participantes')
        .select('projeto_id, docente_id, papel')
      if (!error && data) {
        setTodosParticipantes(
          data as { projeto_id: number; docente_id: number; papel?: string | null }[],
        )
      }
    } catch (err) {
      console.error('Falha ao carregar participantes de projetos:', err)
    }
  }, [])

  useEffect(() => {
    docentesService.list().then((items) => {
      setDocentesLista(items)
      const m: Record<string, string> = {}
      items.forEach((d) => {
        m[d.id] = d.nome
      })
      setDocenteMap(m)
    })
    carregarParticipantes()
  }, [carregarParticipantes])

  useEffect(() => {
    if (profile?.docente_id) {
      supabase
        .from('projetos_participantes')
        .select('projeto_id')
        .eq('docente_id', profile.docente_id)
        .then(({ data, error }) => {
          if (!error && data) {
            setProjetosParticipantesIds(data.map((r: any) => Number(r.projeto_id)))
          }
        })
    } else {
      setProjetosParticipantesIds([])
    }
  }, [profile?.docente_id])

  const sincronizarParticipantesBanco = async (
    projetoId: number,
    participantes: ParticipanteDocenteItem[],
  ) => {
    // 1. Limpar participantes vinculados deste projeto
    const { error: delError } = await supabase
      .from('projetos_participantes')
      .delete()
      .eq('projeto_id', projetoId)

    if (delError) {
      console.error('Erro ao limpar participantes antigos:', delError)
      throw delError
    }

    // 2. Inserir a nova lista
    if (participantes.length > 0) {
      const rows = participantes.map((p) => ({
        projeto_id: Number(projetoId),
        docente_id: Number(p.docente_id),
        papel: p.papel === 'coordenador' ? 'coordenador' : 'participante',
      }))
      const { error: insError } = await supabase.from('projetos_participantes').insert(rows)
      if (insError) {
        console.error('Erro ao gravar participantes:', insError)
        throw insError
      }
    }

    await carregarParticipantes()
  }

  const customService = useMemo(() => {
    return {
      ...projetosPesquisaService,
      create: async (item: Partial<ProjetoPesquisa>) => {
        const itemAny = item as any
        const participantes: ParticipanteDocenteItem[] = itemAny.participantes_docentes || []

        // Validação estrita: exatamente 1 coordenador obrigatório
        const coords = participantes.filter((p) => p.papel === 'coordenador')
        if (coords.length === 0) {
          throw new Error('É obrigatório definir exatamente 1 docente como Coordenador do projeto.')
        }
        if (coords.length > 1) {
          throw new Error('Apenas 1 docente pode ser o Coordenador do projeto.')
        }

        const coordenadorId = coords[0].docente_id

        const payload: Partial<ProjetoPesquisa> = {
          ...item,
          coordenador_id: coordenadorId,
        }
        delete (payload as any).participantes_docentes

        const novo = (await projetosPesquisaService.create(payload)) as ProjetoPesquisa
        if (novo?.id) {
          await sincronizarParticipantesBanco(Number(novo.id), participantes)
        }
        return novo
      },
      update: async (id: number | string, item: Partial<ProjetoPesquisa>) => {
        const itemAny = item as any
        const participantes: ParticipanteDocenteItem[] = itemAny.participantes_docentes || []

        // Validação estrita: exatamente 1 coordenador obrigatório
        const coords = participantes.filter((p) => p.papel === 'coordenador')
        if (coords.length === 0) {
          throw new Error('É obrigatório definir exatamente 1 docente como Coordenador do projeto.')
        }
        if (coords.length > 1) {
          throw new Error('Apenas 1 docente pode ser o Coordenador do projeto.')
        }

        const coordenadorId = coords[0].docente_id

        const payload: Partial<ProjetoPesquisa> = {
          ...item,
          coordenador_id: coordenadorId,
        }
        delete (payload as any).participantes_docentes

        const atualizado = (await projetosPesquisaService.update(
          id,
          payload,
        )) as unknown as ProjetoPesquisa
        await sincronizarParticipantesBanco(Number(id), participantes)
        return atualizado
      },
    }
  }, [carregarParticipantes])

  const columns: ColumnDef<ProjetoPesquisa>[] = [
    { key: 'titulo', label: 'Título', className: 'font-medium text-slate-900' },
    {
      key: 'coordenador_id',
      label: 'Coordenador',
      render: (p) => docenteMap[p.coordenador_id ?? ''] ?? '-',
    },
    {
      key: 'participantes' as any,
      label: 'Docentes Vinculados',
      render: (p) => {
        const parts = todosParticipantes.filter((part) => part.projeto_id === Number(p.id))
        if (parts.length === 0) {
          if (!p.coordenador_id) return <span className="text-slate-400">—</span>
          const coordNome = docenteMap[p.coordenador_id]
          return (
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 text-[11px]"
            >
              <ShieldCheck className="h-3 w-3 mr-1 text-blue-600" />
              {coordNome ? coordNome.split(' ')[0] : 'Coord.'} (Coord.)
            </Badge>
          )
        }

        return (
          <div className="flex flex-wrap gap-1 max-w-[240px]">
            {parts.map((part) => {
              const nome = docenteMap[part.docente_id]
              const primeiroNome = nome ? nome.split(' ')[0] : `#${part.docente_id}`
              const isCoord =
                part.papel?.toLowerCase() === 'coordenador' ||
                Number(part.docente_id) === Number(p.coordenador_id)
              return (
                <Badge
                  key={`${part.projeto_id}-${part.docente_id}`}
                  variant="outline"
                  className={
                    isCoord
                      ? 'bg-blue-50 text-blue-700 border-blue-200 text-[11px]'
                      : 'bg-slate-100 text-slate-700 border-slate-200 text-[11px]'
                  }
                  title={`${nome || 'Docente'} (${isCoord ? 'Coordenador' : 'Participante'})`}
                >
                  {isCoord ? (
                    <ShieldCheck className="h-3 w-3 mr-1 text-blue-600" />
                  ) : (
                    <UserCheck className="h-3 w-3 mr-1 text-slate-500" />
                  )}
                  {primeiroNome} ({isCoord ? 'Coord.' : 'Part.'})
                </Badge>
              )
            })}
          </div>
        )
      },
    },
    {
      key: 'classificacao',
      label: 'Classificação',
      render: (p) => {
        if (p.classificacao === 'institucional') {
          return (
            <Badge
              variant="secondary"
              className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium"
            >
              Institucional
            </Badge>
          )
        }
        if (p.classificacao === 'individual') {
          return (
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-800 border-amber-300 text-xs font-medium"
            >
              Individual
            </Badge>
          )
        }
        return <span className="text-slate-400">—</span>
      },
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
      key: 'participantes_docentes',
      label: 'Docentes do Projeto (1 Coordenador obrigatório e Participantes)',
      type: 'text',
      required: true,
      customRender: ({ formData, setFormData }) => {
        let participantes: ParticipanteDocenteItem[] = formData.participantes_docentes || []

        // Inicializar com coordenador_id existente caso esteja editando e participantes_docentes ainda não preenchido
        if (participantes.length === 0 && formData.coordenador_id) {
          const coordId = Number(formData.coordenador_id)
          const partsDoProjeto = todosParticipantes.filter(
            (p) => p.projeto_id === Number(formData.id),
          )
          if (partsDoProjeto.length > 0) {
            participantes = partsDoProjeto.map((p) => ({
              docente_id: p.docente_id,
              papel: (p.papel?.toLowerCase() === 'coordenador' || p.docente_id === coordId
                ? 'coordenador'
                : 'participante') as PapelDocenteProjeto,
            }))
          } else {
            participantes = [{ docente_id: coordId, papel: 'coordenador' }]
          }
        }

        const totalCoords = participantes.filter((p) => p.papel === 'coordenador').length

        const adicionarDocente = (docenteIdStr: string) => {
          const docenteId = Number(docenteIdStr)
          if (!docenteId || participantes.some((p) => p.docente_id === docenteId)) return

          const temCoordenador = participantes.some((p) => p.papel === 'coordenador')
          const novoPapel: PapelDocenteProjeto = temCoordenador ? 'participante' : 'coordenador'
          const novos = [...participantes, { docente_id: docenteId, papel: novoPapel }]
          const coord = novos.find((p) => p.papel === 'coordenador')

          setFormData({
            ...formData,
            participantes_docentes: novos,
            coordenador_id: coord ? String(coord.docente_id) : '',
          })
        }

        const alternarPapel = (docenteId: number, novoPapel: PapelDocenteProjeto) => {
          let novos: ParticipanteDocenteItem[] = []
          if (novoPapel === 'coordenador') {
            novos = participantes.map((p) => ({
              ...p,
              papel: p.docente_id === docenteId ? 'coordenador' : 'participante',
            }))
          } else {
            novos = participantes.map((p) =>
              p.docente_id === docenteId ? { ...p, papel: 'participante' } : p,
            )
          }
          const coord = novos.find((p) => p.papel === 'coordenador')
          setFormData({
            ...formData,
            participantes_docentes: novos,
            coordenador_id: coord ? String(coord.docente_id) : '',
          })
        }

        const removerDocente = (docenteId: number) => {
          const novos = participantes.filter((p) => p.docente_id !== docenteId)
          if (novos.length > 0 && !novos.some((p) => p.papel === 'coordenador')) {
            novos[0].papel = 'coordenador'
          }
          const coord = novos.find((p) => p.papel === 'coordenador')
          setFormData({
            ...formData,
            participantes_docentes: novos,
            coordenador_id: coord ? String(coord.docente_id) : '',
          })
        }

        const docentesDisponiveis = docentesLista.filter(
          (d) => !participantes.some((p) => p.docente_id === d.id),
        )

        return (
          <div className="space-y-3 p-3 bg-slate-50/80 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  Docentes Vinculados <span className="text-destructive">*</span>
                </Label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Vários docentes permitidos: obrigatoriamente <strong>exatamente 1</strong>{' '}
                  Coordenador e os demais como Participante.
                </p>
              </div>
              {totalCoords === 1 ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                >
                  1 Coordenador
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                >
                  {totalCoords === 0 ? 'Sem Coordenador' : 'Múltiplos Coordenadores'}
                </Badge>
              )}
            </div>

            {/* Lista dos docentes vinculados */}
            {participantes.length > 0 ? (
              <div className="space-y-2">
                {participantes.map((part) => {
                  const nome = docenteMap[part.docente_id] || `Docente #${part.docente_id}`
                  const isCoord = part.papel === 'coordenador'
                  return (
                    <div
                      key={part.docente_id}
                      className={`flex items-center justify-between p-2 rounded-md border text-sm transition-colors ${
                        isCoord
                          ? 'bg-blue-50/60 border-blue-200 text-blue-950 font-medium'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        {isCoord ? (
                          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate text-xs sm:text-sm">{nome}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={part.papel}
                          onValueChange={(val) =>
                            alternarPapel(part.docente_id, val as PapelDocenteProjeto)
                          }
                        >
                          <SelectTrigger className="h-7 w-[130px] text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="coordenador" className="text-xs font-semibold">
                              Coordenador
                            </SelectItem>
                            <SelectItem value="participante" className="text-xs">
                              Participante
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerDocente(part.docente_id)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                          title="Remover docente do projeto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-3 border border-dashed border-slate-300 rounded-md text-xs text-slate-500 bg-white">
                Nenhum docente vinculado ainda. Selecione abaixo para adicionar.
              </div>
            )}

            {/* Seletor para adicionar novo docente */}
            {docentesDisponiveis.length > 0 && (
              <div className="pt-1 flex gap-2">
                <Select onValueChange={(val) => adicionarDocente(val)} value="">
                  <SelectTrigger className="h-8 text-xs bg-white flex-1">
                    <SelectValue placeholder="+ Vincular docente ao projeto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {docentesDisponiveis.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                        {d.nome}
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
      key: 'classificacao',
      label: 'Classificação do Projeto',
      type: 'select',
      options: [
        { value: 'institucional', label: 'Institucional' },
        { value: 'individual', label: 'Individual' },
      ],
      placeholder: 'Selecione a classificação...',
      helperText: 'Projeto institucional (vinculado a edital/programa) ou individual',
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
      service={customService as any}
      columns={columns}
      fields={fields}
      emptyForm={emptyForm}
      searchKey="titulo"
      entityName="Projeto"
      tableName="projetos_pesquisa"
      printModule="projetos-pesquisa"
      getContextoItem={(item) => ({
        isParticipanteProjeto: projetosParticipantesIds.includes(Number(item.id)),
      })}
    />
  )
}
