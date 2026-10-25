import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { CrudPage } from '@/components/crud/CrudPage'
import type { ColumnDef, FieldDef } from '@/components/crud/types'
import { projetosPesquisaService } from '@/services/projetos-pesquisa'
import { docentesService } from '@/services/docentes'
import { discentesService } from '@/services/discentes'
import { bancasService } from '@/services/bancas'
import { iniciacaoCientificaService } from '@/services/iniciacao-cientifica'
import { Badge } from '@/components/ui/badge'
import type {
  ProjetoPesquisa,
  Docente,
  Discente,
  Banca,
  IniciacaoCientifica,
} from '@/types/database'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ShieldCheck,
  UserCheck,
  Trash2,
  FileText,
  Upload,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  BookOpen,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  uploadComprovanteProjeto,
  obterUrlVisualizacaoComprovante,
} from '@/lib/storage/comprovantes-projetos'

export type PapelDocenteProjeto = 'coordenador' | 'participante'

export interface ParticipanteDocenteItem {
  docente_id: number
  papel: PapelDocenteProjeto
}

export interface DiscenteProjetoItem {
  discente_id: number
  papel?: string
}

interface CampoUploadComprovanteProjetoProps {
  formData: Record<string, any>
  setFormData: React.Dispatch<React.SetStateAction<any>>
}

function CampoUploadComprovanteProjeto({
  formData,
  setFormData,
}: CampoUploadComprovanteProjetoProps) {
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState<number | null>(null)
  const [infoUpload, setInfoUpload] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!formData.financiamento) return null

  const handleSelecionarPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('O arquivo deve ser obrigatoriamente um documento PDF (.pdf).')
      return
    }

    setEnviando(true)
    setProgresso(10)
    setInfoUpload(null)

    try {
      const res = await uploadComprovanteProjeto(formData.id || 'temp', file, (p) =>
        setProgresso(p),
      )

      setFormData((prev: any) => ({
        ...prev,
        comprovante_url: res.url,
      }))

      const reducaoKb = Math.round((res.tamanhoOriginal - res.tamanhoFinal) / 1024)
      const infoTxt =
        res.comprimido && reducaoKb > 0
          ? `PDF otimizado com sucesso (${reducaoKb} KB economizados).`
          : 'PDF original preservado e gravado com sucesso no storage.'

      setInfoUpload(infoTxt)
      toast.success('Comprovante em PDF anexado com sucesso!')
    } catch (err: any) {
      console.error('Falha no upload do comprovante:', err)
      toast.error(`Erro ao anexar comprovante: ${err?.message || 'Falha no envio'}`)
    } finally {
      setEnviando(false)
      setProgresso(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2 p-3 bg-slate-50/80 rounded-lg border border-slate-200">
      <Label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-primary" />
          Comprovante de Financiamento (PDF Compactado)
        </span>
        {formData.comprovante_url && (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]"
          >
            Anexado
          </Badge>
        )}
      </Label>
      <p className="text-[11px] text-slate-500">
        Anexe o termo de outorga, contrato ou publicação oficial em PDF. O arquivo passa por
        compressão inteligente sem degradação para economizar storage no Supabase.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleSelecionarPdf}
      />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={enviando}
          onClick={() => fileInputRef.current?.click()}
          className="gap-1.5 h-8 text-xs bg-white border-slate-300 hover:bg-slate-50"
        >
          <Upload className="h-3.5 w-3.5 text-primary" />
          <span>
            {formData.comprovante_url ? 'Substituir PDF' : 'Selecionar Comprovante (PDF)'}
          </span>
        </Button>

        {formData.comprovante_url && (
          <>
            <a
              href={formData.comprovante_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline px-2 py-1 bg-white rounded border border-slate-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Visualizar Comprovante Atual</span>
            </a>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setFormData((prev: any) => ({
                  ...prev,
                  comprovante_url: '',
                }))
              }
              className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              Remover anexo
            </Button>
          </>
        )}
      </div>

      {enviando && progresso !== null && (
        <div className="text-xs text-slate-600 pt-1">
          Processando e otimizando PDF ({progresso}%)...
        </div>
      )}

      {infoUpload && (
        <p className="text-[11px] text-emerald-700 flex items-center gap-1 pt-0.5">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          {infoUpload}
        </p>
      )}
    </div>
  )
}

const emptyForm = {
  titulo: '',
  descricao: '',
  inicio: '',
  fim: '',
  coordenador_id: '',
  financiamento: false,
  orgao_fomento: '',
  financiador_nome: '',
  valor_financiamento: '',
  comprovante_url: '',
  link_comprovacao: '',
  observacoes: '',
  classificacao: '',
  participantes_docentes: [] as ParticipanteDocenteItem[],
  discentes_vinculados: [] as DiscenteProjetoItem[],
  bancas_vinculadas_ids: [] as number[],
  iniciacoes_vinculadas_ids: [] as number[],
}

export default function ProjetosPesquisa() {
  const { profile } = useAuth()
  const [docenteMap, setDocenteMap] = useState<Record<string, string>>({})
  const [docentesLista, setDocentesLista] = useState<Docente[]>([])
  const [discentesLista, setDiscentesLista] = useState<Discente[]>([])
  const [todasBancas, setTodasBancas] = useState<Banca[]>([])
  const [todasIniciacoes, setTodasIniciacoes] = useState<IniciacaoCientifica[]>([])
  const [projetosParticipantesIds, setProjetosParticipantesIds] = useState<number[]>([])
  const [todosParticipantes, setTodosParticipantes] = useState<
    { projeto_id: number; docente_id: number; papel?: string | null }[]
  >([])
  const [todosDiscentesProjetos, setTodosDiscentesProjetos] = useState<
    { projeto_id: number; discente_id: number; papel?: string | null }[]
  >([])

  const carregarParticipantes = useCallback(async () => {
    try {
      const [partsRes, discPartsRes, bancasRes, icRes] = await Promise.all([
        supabase.from('projetos_participantes').select('projeto_id, docente_id, papel'),
        supabase.from('projetos_discentes').select('projeto_id, discente_id, papel'),
        bancasService.list(),
        iniciacaoCientificaService.list(),
      ])

      if (!partsRes.error && partsRes.data) {
        setTodosParticipantes(
          partsRes.data as { projeto_id: number; docente_id: number; papel?: string | null }[],
        )
      }
      if (!discPartsRes.error && discPartsRes.data) {
        setTodosDiscentesProjetos(
          discPartsRes.data as { projeto_id: number; discente_id: number; papel?: string | null }[],
        )
      }
      setTodasBancas(bancasRes || [])
      setTodasIniciacoes(icRes || [])
    } catch (err) {
      console.error('Falha ao carregar vínculos de projetos:', err)
    }
  }, [])

  useEffect(() => {
    Promise.all([docentesService.list(), discentesService.list()]).then(([docList, discList]) => {
      setDocentesLista(docList)
      setDiscentesLista(discList)
      const m: Record<string, string> = {}
      docList.forEach((d) => {
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

  const sincronizarTodosVinculosBanco = async (
    projetoId: number,
    participantes: ParticipanteDocenteItem[],
    discentes: DiscenteProjetoItem[],
    bancasIds: number[],
    iniciacoesIds: number[],
  ) => {
    // 1. Docentes participantes
    await supabase.from('projetos_participantes').delete().eq('projeto_id', projetoId)
    if (participantes.length > 0) {
      const rows = participantes.map((p) => ({
        projeto_id: Number(projetoId),
        docente_id: Number(p.docente_id),
        papel: p.papel === 'coordenador' ? 'coordenador' : 'participante',
      }))
      await supabase.from('projetos_participantes').insert(rows)
    }

    // 2. Discentes participantes (tabela-ponte projetos_discentes)
    await supabase.from('projetos_discentes').delete().eq('projeto_id', projetoId)
    if (discentes.length > 0) {
      const rowsDisc = discentes.map((d) => ({
        projeto_id: Number(projetoId),
        discente_id: Number(d.discente_id),
        papel: d.papel || 'participante',
      }))
      await supabase.from('projetos_discentes').insert(rowsDisc)
    }

    // 3. Bancas vinculadas (campo bancas.projeto_id)
    // Desvincula as bancas que estavam vinculadas a este projeto mas não estão mais
    const bancasAntigas = todasBancas.filter((b) => Number(b.projeto_id) === Number(projetoId))
    const bancasParaDesvincular = bancasAntigas
      .filter((b) => !bancasIds.includes(b.id))
      .map((b) => b.id)

    if (bancasParaDesvincular.length > 0) {
      for (const bId of bancasParaDesvincular) {
        await supabase.from('bancas').update({ projeto_id: null }).eq('id', bId)
      }
    }
    // Vincula as selecionadas
    for (const bId of bancasIds) {
      await supabase
        .from('bancas')
        .update({ projeto_id: Number(projetoId) })
        .eq('id', bId)
    }

    // 4. Iniciações científicas vinculadas (campo iniciacao_cientifica.projeto_id)
    const icAntigas = todasIniciacoes.filter((ic) => Number(ic.projeto_id) === Number(projetoId))
    const icParaDesvincular = icAntigas
      .filter((ic) => !iniciacoesIds.includes(ic.id))
      .map((ic) => ic.id)

    if (icParaDesvincular.length > 0) {
      for (const icId of icParaDesvincular) {
        await supabase.from('iniciacao_cientifica').update({ projeto_id: null }).eq('id', icId)
      }
    }
    for (const icId of iniciacoesIds) {
      await supabase
        .from('iniciacao_cientifica')
        .update({ projeto_id: Number(projetoId) })
        .eq('id', icId)
    }

    await carregarParticipantes()
  }

  const customService = useMemo(() => {
    return {
      ...projetosPesquisaService,
      create: async (item: Partial<ProjetoPesquisa>) => {
        const itemAny = item as any
        const participantes: ParticipanteDocenteItem[] = itemAny.participantes_docentes || []
        const discentes: DiscenteProjetoItem[] = itemAny.discentes_vinculados || []
        const bancasIds: number[] = itemAny.bancas_vinculadas_ids || []
        const iniciacoesIds: number[] = itemAny.iniciacoes_vinculadas_ids || []

        // Validação estrita: exatamente 1 coordenador obrigatório
        const coords = participantes.filter((p) => p.papel === 'coordenador')
        if (coords.length === 0) {
          throw new Error('É obrigatório definir exatamente 1 docente como Coordenador do projeto.')
        }
        if (coords.length > 1) {
          throw new Error('Apenas 1 docente pode ser o Coordenador do projeto.')
        }

        const coordenadorId = coords[0].docente_id

        const payload: any = {
          ...item,
          coordenador_id: coordenadorId,
          financiador_nome: itemAny.financiamento
            ? itemAny.financiador_nome || itemAny.orgao_fomento
            : null,
          valor_financiamento:
            itemAny.financiamento && itemAny.valor_financiamento
              ? Number(itemAny.valor_financiamento)
              : null,
          comprovante_url: itemAny.financiamento ? itemAny.comprovante_url || null : null,
        }
        delete payload.participantes_docentes
        delete payload.discentes_vinculados
        delete payload.bancas_vinculadas_ids
        delete payload.iniciacoes_vinculadas_ids

        const novo = (await projetosPesquisaService.create(payload)) as ProjetoPesquisa
        if (novo?.id) {
          await sincronizarTodosVinculosBanco(
            Number(novo.id),
            participantes,
            discentes,
            bancasIds,
            iniciacoesIds,
          )
        }
        return novo
      },
      update: async (id: number | string, item: Partial<ProjetoPesquisa>) => {
        const itemAny = item as any
        const participantes: ParticipanteDocenteItem[] = itemAny.participantes_docentes || []
        const discentes: DiscenteProjetoItem[] = itemAny.discentes_vinculados || []
        const bancasIds: number[] = itemAny.bancas_vinculadas_ids || []
        const iniciacoesIds: number[] = itemAny.iniciacoes_vinculadas_ids || []

        // Validação estrita: exatamente 1 coordenador obrigatório
        const coords = participantes.filter((p) => p.papel === 'coordenador')
        if (coords.length === 0) {
          throw new Error('É obrigatório definir exatamente 1 docente como Coordenador do projeto.')
        }
        if (coords.length > 1) {
          throw new Error('Apenas 1 docente pode ser o Coordenador do projeto.')
        }

        const coordenadorId = coords[0].docente_id

        const payload: any = {
          ...item,
          coordenador_id: coordenadorId,
          financiador_nome: itemAny.financiamento
            ? itemAny.financiador_nome || itemAny.orgao_fomento
            : null,
          valor_financiamento:
            itemAny.financiamento && itemAny.valor_financiamento
              ? Number(itemAny.valor_financiamento)
              : null,
          comprovante_url: itemAny.financiamento ? itemAny.comprovante_url || null : null,
        }
        delete payload.participantes_docentes
        delete payload.discentes_vinculados
        delete payload.bancas_vinculadas_ids
        delete payload.iniciacoes_vinculadas_ids

        const atualizado = (await projetosPesquisaService.update(
          id,
          payload,
        )) as unknown as ProjetoPesquisa
        await sincronizarTodosVinculosBanco(
          Number(id),
          participantes,
          discentes,
          bancasIds,
          iniciacoesIds,
        )
        return atualizado
      },
    }
  }, [carregarParticipantes, todasBancas, todasIniciacoes])

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
      key: 'fim',
      label: 'Término',
      render: (p) => p.fim || <span className="text-slate-400">—</span>,
    },
    {
      key: 'financiamento',
      label: 'Financiamento',
      render: (p) => {
        if (!p.financiamento) {
          return <span className="text-slate-400">Não</span>
        }
        const financiadoPor = p.financiador_nome || p.orgao_fomento
        const valorFormatado = p.valor_financiamento
          ? Number(p.valor_financiamento).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })
          : null

        return (
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Sim</Badge>
              {financiadoPor && (
                <span
                  className="text-xs font-medium text-slate-800 line-clamp-1"
                  title={financiadoPor}
                >
                  {financiadoPor}
                </span>
              )}
            </div>
            {(valorFormatado || p.comprovante_url) && (
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                {valorFormatado && (
                  <span className="font-semibold text-emerald-700">{valorFormatado}</span>
                )}
                {p.comprovante_url && (
                  <a
                    href={p.comprovante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary hover:underline font-medium"
                    title="Ver comprovante em PDF"
                  >
                    <FileText className="h-3 w-3" />
                    <span>PDF</span>
                  </a>
                )}
              </div>
            )}
          </div>
        )
      },
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
      key: 'financiador_nome',
      label: 'Financiador / Agência de Fomento',
      type: 'text',
      placeholder: 'Ex: FAPESP, CNPq, CAPES, FINEP, Petrobras...',
      helperText: 'Nome da agência de fomento ou empresa financiadora',
      customRender: ({ formData, setFormData }) => {
        if (!formData.financiamento) return null
        return (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">
              Nome do Financiador / Órgão de Fomento <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Ex: CNPq, CAPES, FAPITEC, FINEP, Petrobras..."
              value={formData.financiador_nome || formData.orgao_fomento || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  financiador_nome: e.target.value,
                  orgao_fomento: e.target.value,
                })
              }
              className="h-9 text-xs"
            />
            <p className="text-[11px] text-slate-500">
              Instituição ou empresa que aportou os recursos do projeto.
            </p>
          </div>
        )
      },
    },
    {
      key: 'valor_financiamento',
      label: 'Valor do Financiamento (R$)',
      type: 'text',
      customRender: ({ formData, setFormData }) => {
        if (!formData.financiamento) return null
        return (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">
              Valor do Financiamento Aprovado (R$)
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.valor_financiamento ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  valor_financiamento: e.target.value,
                })
              }
              className="h-9 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-500">
              Montante total em Reais do recurso aprovado/contratado.
            </p>
          </div>
        )
      },
    },
    {
      key: 'comprovante_url',
      label: 'Comprovante em PDF do Financiamento',
      type: 'text',
      customRender: ({ formData, setFormData }) => (
        <CampoUploadComprovanteProjeto formData={formData} setFormData={setFormData} />
      ),
    },
    {
      key: 'discentes_vinculados',
      label: 'Discentes Vinculados ao Projeto',
      type: 'text',
      customRender: ({ formData, setFormData }) => {
        let vinculados: DiscenteProjetoItem[] = formData.discentes_vinculados || []

        // Inicializa ao abrir modo edição se ainda não carregado
        if (vinculados.length === 0 && formData.id) {
          const discDoProjeto = todosDiscentesProjetos.filter(
            (dp) => dp.projeto_id === Number(formData.id),
          )
          if (discDoProjeto.length > 0) {
            vinculados = discDoProjeto.map((dp) => ({
              discente_id: dp.discente_id,
              papel: dp.papel || 'participante',
            }))
          }
        }

        const adicionarDiscente = (discenteIdStr: string) => {
          const dId = Number(discenteIdStr)
          if (!dId || vinculados.some((d) => d.discente_id === dId)) return
          const novos = [...vinculados, { discente_id: dId, papel: 'participante' }]
          setFormData({
            ...formData,
            discentes_vinculados: novos,
          })
        }

        const removerDiscente = (discenteId: number) => {
          const novos = vinculados.filter((d) => d.discente_id !== discenteId)
          setFormData({
            ...formData,
            discentes_vinculados: novos,
          })
        }

        const discentesDisponiveis = discentesLista.filter(
          (d) => !vinculados.some((v) => v.discente_id === d.id),
        )

        return (
          <div className="space-y-3 p-3 bg-slate-50/80 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Discentes Vinculados ao Projeto
                </Label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Vincule discentes de Mestrado ou Doutorado que atuam neste projeto de pesquisa. Um
                  discente pode atuar em mais de um projeto.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] bg-white text-slate-700">
                {vinculados.length} discente{vinculados.length === 1 ? '' : 's'}
              </Badge>
            </div>

            {vinculados.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {vinculados.map((item) => {
                  const disc = discentesLista.find((d) => d.id === item.discente_id)
                  const nome = disc ? disc.nome : `Discente #${item.discente_id}`
                  return (
                    <div
                      key={item.discente_id}
                      className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{nome}</span>
                        {disc?.tipo_curso && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1">
                            {disc.tipo_curso}
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removerDiscente(item.discente_id)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                        title="Remover discente do projeto"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-2.5 border border-dashed border-slate-300 rounded text-xs text-slate-500 bg-white">
                Nenhum discente vinculado ainda.
              </div>
            )}

            {discentesDisponiveis.length > 0 && (
              <div className="pt-1">
                <Select onValueChange={adicionarDiscente} value="">
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="+ Vincular discente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {discentesDisponiveis.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                        {d.nome} {d.tipo_curso ? `(${d.tipo_curso})` : ''}
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
      key: 'trabalhos_conclusao_vinculados',
      label: 'Trabalhos de Conclusão e Iniciação Vinculados',
      type: 'text',
      customRender: ({ formData, setFormData }) => {
        let bancasIds: number[] = formData.bancas_vinculadas_ids || []
        let iniciacoesIds: number[] = formData.iniciacoes_vinculadas_ids || []

        // Inicializa no modo editar
        if (bancasIds.length === 0 && formData.id) {
          const doProjeto = todasBancas
            .filter((b) => Number(b.projeto_id) === Number(formData.id))
            .map((b) => b.id)
          bancasIds = doProjeto
        }
        if (iniciacoesIds.length === 0 && formData.id) {
          const icDoProjeto = todasIniciacoes
            .filter((ic) => Number(ic.projeto_id) === Number(formData.id))
            .map((ic) => ic.id)
          iniciacoesIds = icDoProjeto
        }

        const adicionarBanca = (idStr: string) => {
          const bId = Number(idStr)
          if (!bId || bancasIds.includes(bId)) return
          const novos = [...bancasIds, bId]
          setFormData({ ...formData, bancas_vinculadas_ids: novos })
        }

        const removerBanca = (bId: number) => {
          const novos = bancasIds.filter((id) => id !== bId)
          setFormData({ ...formData, bancas_vinculadas_ids: novos })
        }

        const adicionarIniciacao = (idStr: string) => {
          const icId = Number(idStr)
          if (!icId || iniciacoesIds.includes(icId)) return
          const novos = [...iniciacoesIds, icId]
          setFormData({ ...formData, iniciacoes_vinculadas_ids: novos })
        }

        const removerIniciacao = (icId: number) => {
          const novos = iniciacoesIds.filter((id) => id !== icId)
          setFormData({ ...formData, iniciacoes_vinculadas_ids: novos })
        }

        const bancasDisponiveis = todasBancas.filter((b) => !bancasIds.includes(b.id))
        const icDisponiveis = todasIniciacoes.filter((ic) => !iniciacoesIds.includes(ic.id))

        return (
          <div className="space-y-4 p-3 bg-slate-50/80 rounded-lg border border-slate-200">
            <div>
              <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" />
                Vínculo de Trabalhos de Conclusão e Iniciação ao Projeto
              </Label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Associe bancas de qualificação/defesa e projetos de IC/IT/IE que foram desenvolvidos
                no âmbito deste projeto.
              </p>
            </div>

            {/* Grupo A: Bancas de Mestrado / Doutorado / Qualificação */}
            <div className="space-y-2 border-t pt-2 border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <strong>(a) Bancas do Programa</strong> (Qualificação, Dissertação, Tese)
                </span>
                <Badge variant="outline" className="text-[10px] bg-white">
                  {bancasIds.length} vinculada{bancasIds.length === 1 ? '' : 's'}
                </Badge>
              </div>

              {bancasIds.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {bancasIds.map((bId) => {
                    const banca = todasBancas.find((b) => b.id === bId)
                    const titulo = banca ? banca.titulo_trabalho : `Banca #${bId}`
                    return (
                      <div
                        key={bId}
                        className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          {banca?.tipo && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 shrink-0">
                              {banca.tipo}
                            </Badge>
                          )}
                          <span className="truncate text-slate-800" title={titulo}>
                            {titulo}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerBanca(bId)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">Nenhuma banca associada.</p>
              )}

              {bancasDisponiveis.length > 0 && (
                <Select onValueChange={adicionarBanca} value="">
                  <SelectTrigger className="h-7 text-xs bg-white">
                    <SelectValue placeholder="+ Vincular banca existente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {bancasDisponiveis.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                        [{b.tipo}]{' '}
                        {b.titulo_trabalho.length > 60
                          ? `${b.titulo_trabalho.slice(0, 60)}…`
                          : b.titulo_trabalho}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Grupo B: Iniciação Científica, Tecnológica e em Extensão (IC/IT/IE) */}
            <div className="space-y-2 border-t pt-2 border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <strong>(b) Iniciações e TCC</strong> (IC, IT, IE)
                </span>
                <Badge variant="outline" className="text-[10px] bg-white">
                  {iniciacoesIds.length} vinculada{iniciacoesIds.length === 1 ? '' : 's'}
                </Badge>
              </div>

              {iniciacoesIds.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {iniciacoesIds.map((icId) => {
                    const ic = todasIniciacoes.find((item) => item.id === icId)
                    const titulo = ic
                      ? ic.titulo || ic.discente_nome || `Iniciação #${icId}`
                      : `Iniciação #${icId}`
                    return (
                      <div
                        key={icId}
                        className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1 shrink-0 uppercase"
                          >
                            {ic?.tipo ? ic.tipo.replace('iniciacao_', '') : 'IC'}
                          </Badge>
                          <span className="truncate text-slate-800" title={titulo}>
                            {titulo}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerIniciacao(icId)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">Nenhuma iniciação associada.</p>
              )}

              {icDisponiveis.length > 0 && (
                <Select onValueChange={adicionarIniciacao} value="">
                  <SelectTrigger className="h-7 text-xs bg-white">
                    <SelectValue placeholder="+ Vincular iniciação existente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {icDisponiveis.map((ic) => (
                      <SelectItem key={ic.id} value={String(ic.id)} className="text-xs">
                        [{ic.tipo.replace('iniciacao_', '')}]{' '}
                        {ic.titulo
                          ? ic.titulo.length > 60
                            ? `${ic.titulo.slice(0, 60)}…`
                            : ic.titulo
                          : ic.discente_nome || `#${ic.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'link_comprovacao',
      label: 'Link Externo de Comprovação',
      type: 'url',
      placeholder: 'https://...',
      helperText: 'Termo de outorga, aprovação no comitê ou portaria externa',
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
      customFilterItem={(p, termo, normalizar) => {
        const coordNome = p.coordenador_id ? docenteMap[String(p.coordenador_id)] : ''
        if (coordNome && normalizar(coordNome).includes(termo)) return true

        const parts = todosParticipantes.filter((part) => part.projeto_id === Number(p.id))
        for (const part of parts) {
          const nomeDoc = docenteMap[String(part.docente_id)]
          if (nomeDoc && normalizar(nomeDoc).includes(termo)) return true
        }
        return false
      }}
      entityName="Projeto"
      tableName="projetos_pesquisa"
      printModule="projetos-pesquisa"
      getContextoItem={(item) => ({
        isParticipanteProjeto: projetosParticipantesIds.includes(Number(item.id)),
      })}
    />
  )
}
