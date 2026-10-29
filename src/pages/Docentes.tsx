import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCrudData } from '@/hooks/use-crud-data'
import { docentesService } from '@/services/docentes'
import { linhasPesquisaService } from '@/services/linhas-pesquisa'
import type { Docente, LinhaPesquisa } from '@/types/database'
import { useAuth } from '@/hooks/use-auth'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ModalExcluirDocente } from '@/components/docentes/ModalExcluirDocente'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Edit, Trash2, Printer, Eye, GraduationCap } from 'lucide-react'
import {
  VincularOpenAlexDialog,
  type FonteIdentificador,
} from '@/components/docentes/VincularOpenAlexDialog'
import { VisualizarDocenteDialog } from '@/components/docentes/VisualizarDocenteDialog'
import {
  ModalSelecaoAbasImpressao,
  type DefinicaoAbaImpressao,
} from '@/components/docentes/ModalSelecaoAbasImpressao'
import { type TabKey, type DadosDocenteCompleto } from '@/components/docentes/DocentePrintDocument'
import { imprimirDocenteViaIframe } from '@/lib/docentes/imprimirDocenteIframe'
import {
  User as UserIcon,
  FileText as FileTextIcon,
  Users2 as Users2Icon,
  ClipboardList as ClipboardListIcon,
  FlaskConical as FlaskConicalIcon,
  Award as AwardIcon,
  Wrench as WrenchIcon,
  Lightbulb as LightbulbIcon,
  Calendar as CalendarIcon,
  Plane as PlaneIcon,
  HeartHandshake as HeartHandshakeIcon,
} from 'lucide-react'
import type { OpenAlexAutorCandidato } from '@/lib/openalex/buscar'
import type { ScopusAutorCandidato } from '@/services/scopus'
import { Database, AlertTriangle, Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { normalizarNomePessoa } from '@/lib/normalizacao'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { DocenteNome } from '@/components/docentes/DocenteNome'
import { podeCriarNaTabela, podeEditarRegistro, podeExcluirRegistro } from '@/services/permissoes'
import { registrarLog } from '@/services/logs'
import {
  avaliarStatusJdpDocente,
  calcularResumoJdpPrograma,
  parseAnoNumerico,
} from '@/lib/capes/jdp'
import { TablePaginationFooter } from '@/components/crud/TablePaginationFooter'
import { FrameHorizontalScrollbar } from '@/components/crud/FrameHorizontalScrollbar'

const emptyForm: Omit<Docente, 'id'> = {
  nome: '',
  scopus_id: '',
  indice_h: 0,
  bolsa_cnpq: '',
  jdp: false,
  licenca: '',
  categoria: null,
  cpf: '',
  siape: '',
  email: '',
  orc_id: '',
  status: true,
  jdp_desde: null,
  ano_doutorado: null,
}

export default function Docentes() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { role, profile } = useAuth()
  const { data: docentes, loading, create, update, remove } = useCrudData(docentesService)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [dialogoVinculoAberto, setDialogoVinculoAberto] = useState(false)
  const [docenteParaVinculo, setDocenteParaVinculo] = useState<Docente | null>(null)
  const [abaInicialVinculo, setAbaInicialVinculo] = useState<FonteIdentificador>('openalex')
  const [docenteParaVisualizar, setDocenteParaVisualizar] = useState<Docente | null>(null)
  const [dialogoVisualizarAberto, setDialogoVisualizarAberto] = useState(false)

  // Estados para Impressão de Docente
  const [modalImprimirAberto, setModalImprimirAberto] = useState(false)
  const [docenteParaImprimir, setDocenteParaImprimir] = useState<Docente | null>(null)
  const [dadosParaImprimir, setDadosParaImprimir] = useState<DadosDocenteCompleto | null>(null)
  const [abasSelecionadasParaImprimir, setAbasSelecionadasParaImprimir] = useState<
    Record<TabKey, boolean>
  >({
    geral: true,
    publicacoes: true,
    orientacoes: true,
    projetos: true,
    premiacoes: true,
    producao_tecnica: true,
    patentes: true,
    eventos: true,
    mobilidade: true,
    impacto_social: true,
  })

  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState<Omit<Docente, 'id'>>(emptyForm)
  const [docenteParaExcluir, setDocenteParaExcluir] = useState<Docente | null>(null)
  const [excluindoDocente, setExcluindoDocente] = useState(false)
  const idParaExcluir = docenteParaExcluir ? docenteParaExcluir.id : null

  // Linhas de Pesquisa
  const [todasLinhas, setTodasLinhas] = useState<LinhaPesquisa[]>([])
  const [linhasDocenteSelecionadas, setLinhasDocenteSelecionadas] = useState<number[]>([])
  const [carregandoLinhas, setCarregandoLinhas] = useState(false)

  useEffect(() => {
    linhasPesquisaService.list().then(setTodasLinhas).catch(console.error)
  }, [])
  const isCapes = role === 'capes'
  const docenteIdLogado = profile?.docente_id
  const canCreate = podeCriarNaTabela(role, 'docentes', docenteIdLogado)
  const podeEditarProprio = useMemo(() => {
    return docentes.some((d) => podeEditarRegistro(role, docenteIdLogado, 'docentes', d))
  }, [docentes, role, docenteIdLogado])
  const canDeleteGlobal = !isCapes && (role === 'suporte' || role === 'coordenador')
  const PER_PAGE = 20

  const filtered = useMemo(() => {
    const termo = searchTerm
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

    if (!termo) return docentes

    const normalizar = (txt?: string | null) =>
      (txt || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

    return docentes.filter((d) => {
      const matchNome = normalizar(d.nome).includes(termo)
      const matchEmail = normalizar(d.email).includes(termo)
      const matchCpf = (d.cpf || '').replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
      const matchSiape = (d.siape || '').replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
      const matchCategoria = normalizar(d.categoria).includes(termo)
      const matchLattes = (d.id_lattes || '').includes(termo)
      const matchOrcid = (d.orc_id || '').includes(termo)
      return (
        matchNome ||
        matchEmail ||
        (matchCpf && termo.replace(/\D/g, '').length >= 3) ||
        (matchSiape && termo.replace(/\D/g, '').length >= 3) ||
        matchCategoria ||
        matchLattes ||
        matchOrcid
      )
    })
  }, [docentes, searchTerm])
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleOpen = async (docente?: Docente, campoFoco?: keyof Docente) => {
    setEditingId(docente?.id ?? null)
    setFormData(
      docente
        ? {
            ...docente,
            status: docente.status !== false,
          }
        : emptyForm,
    )
    setIsDialogOpen(true)

    if (docente?.id) {
      setCarregandoLinhas(true)
      try {
        const vinculadas = await linhasPesquisaService.listarLinhasDoDocente(docente.id)
        setLinhasDocenteSelecionadas(vinculadas.map((l) => l.id))
      } catch (err) {
        console.error('Erro ao buscar linhas do docente:', err)
        setLinhasDocenteSelecionadas([])
      } finally {
        setCarregandoLinhas(false)
      }
    } else {
      setLinhasDocenteSelecionadas([])
    }

    if (campoFoco) {
      setTimeout(() => {
        const el = document.getElementById(String(campoFoco))
        if (el) {
          el.focus()
        }
      }, 100)
    }
  }

  // Consome o parâmetro de edição do próprio docente vindo da sidebar ou URL
  useEffect(() => {
    const solicitarEdicaoPropria = searchParams.get('solicitar-edicao-propria')
    if (!solicitarEdicaoPropria) return

    // Se a lista de docentes ainda está carregando, aguarda
    if (loading) return

    if (podeEditarProprio && docenteIdLogado) {
      const docenteProprio = docentes.find((d) => Number(d.id) === Number(docenteIdLogado))
      if (docenteProprio) {
        handleOpen(docenteProprio)
      }
    }

    // Remove o parâmetro da URL mantendo eventuais outros parâmetros
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('solicitar-edicao-propria')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams, loading, podeEditarProprio, docenteIdLogado, docentes])

  const resumoJdp = useMemo(() => {
    return calcularResumoJdpPrograma(docentes)
  }, [docentes])
  void resumoJdp

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações de JDP
    if (formData.jdp) {
      if (formData.categoria !== 'permanente') {
        toast.error('Apenas docentes da categoria Permanente podem ser marcados como JDP.')
        return
      }

      const jdpDesdeNum = parseAnoNumerico(formData.jdp_desde)
      const anoDoutoradoNum = parseAnoNumerico(formData.ano_doutorado)

      if (!jdpDesdeNum || !anoDoutoradoNum) {
        toast.error('Para docente JDP, informe obrigatoriamente o Ano do Doutorado e JDP Desde.')
        return
      }
    }

    setSubmitting(true)

    const jdpDesdeLimpo = formData.jdp ? parseAnoNumerico(formData.jdp_desde) : null
    const anoDoutoradoLimpo = formData.jdp ? parseAnoNumerico(formData.ano_doutorado) : null

    const payload = {
      ...formData,
      nome: normalizarNomePessoa(formData.nome),
      cpf: formData.cpf ? formData.cpf.replace(/\D/g, '') : '',
      siape: formData.siape ? formData.siape.replace(/\D/g, '') : '',
      email: formData.email ? formData.email.trim() : '',
      status: formData.status !== false,
      jdp: Boolean(formData.jdp),
      jdp_desde: jdpDesdeLimpo,
      ano_doutorado: anoDoutoradoLimpo,
    }
    try {
      let savedDocenteId = editingId
      if (editingId) {
        await update(editingId, payload)
        toast.success('Docente atualizado')
        registrarLog({
          acao: 'editar',
          entidade: 'docentes',
          entidade_id: editingId,
          detalhes: {
            nome: payload.nome,
            cpf: payload.cpf,
            siape: payload.siape,
            email: payload.email,
          },
        })
      } else {
        const criado = (await create(payload)) as any
        savedDocenteId = criado?.id
        toast.success('Docente adicionado')
        registrarLog({
          acao: 'criar',
          entidade: 'docentes',
          detalhes: {
            nome: payload.nome,
            cpf: payload.cpf,
            siape: payload.siape,
            email: payload.email,
          },
        })
      }

      if (savedDocenteId) {
        await linhasPesquisaService.sincronizarLinhasDocente(
          savedDocenteId,
          linhasDocenteSelecionadas,
        )
      }

      // Validação não-bloqueante dos 20% do DP
      if (payload.jdp && payload.categoria === 'permanente') {
        const anoAtual = new Date().getFullYear()
        const statusDocSalvo = avaliarStatusJdpDocente(payload, anoAtual)
        if (statusDocSalvo.isValido) {
          const docentesAtualizados = docentes.map((d) =>
            d.id === savedDocenteId ? ({ ...d, ...payload } as Docente) : d,
          )
          if (!editingId) {
            docentesAtualizados.push({ id: savedDocenteId as number, ...payload } as Docente)
          }
          const novoResumo = calcularResumoJdpPrograma(docentesAtualizados, anoAtual)
          if (novoResumo.excedeLimite20Porcento) {
            toast.warning(
              `Atenção: O programa possui ${novoResumo.totalJdpValidos} JDPs válidos para ${novoResumo.totalPermanentes} docentes permanentes (${novoResumo.percentualJdpValido.toFixed(1)}%). O limite recomendado pela CAPES é de 20% (máx. ${novoResumo.limiteMaximoJdp}).`,
              { duration: 8000 },
            )
          }
        }
      }

      setIsDialogOpen(false)
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmarExclusaoDocente = async (docenteAlvo: Docente) => {
    setExcluindoDocente(true)
    try {
      // Exclusão em cascata via Edge Function admin-usuarios (remove docente + profile + auth user)
      const res = await docentesService.excluirDocenteEmCascata(docenteAlvo.id)
      if (res.teve_usuario_vinculado) {
        toast.success(
          `Docente "${docenteAlvo.nome}" e sua conta de usuário vinculada foram excluídos com sucesso.`,
        )
      } else {
        toast.success(`Docente "${docenteAlvo.nome}" excluído com sucesso.`)
      }

      // Atualiza o estado da listagem removendo do cache local
      await remove(docenteAlvo.id)
      setDocenteParaExcluir(null)
    } catch (err: any) {
      console.error('Falha ao excluir docente em cascata:', err)
      toast.error(err?.message || 'Erro ao excluir docente.')
    } finally {
      setExcluindoDocente(false)
    }
  }

  const handleAbrirVinculo = (docente: Docente, fonte: FonteIdentificador = 'openalex') => {
    setDocenteParaVinculo(docente)
    setAbaInicialVinculo(fonte)
    setDialogoVinculoAberto(true)
  }

  const handleVisualizarDocente = (docente: Docente) => {
    setDocenteParaVisualizar(docente)
    setDialogoVisualizarAberto(true)
  }

  const handleAbrirSelecaoImpressao = (docente: Docente, dadosDocente: DadosDocenteCompleto) => {
    // Requisito anti-empilhamento Radix:
    // NUNCA empilhar dois dialogs Radix simultâneos (causa bloqueio de pointer-events no body).
    // Primeiro fecha o dialog de Visualizar Docente.
    setDialogoVisualizarAberto(false)

    setDocenteParaImprimir(docente)
    setDadosParaImprimir(dadosDocente)
    setAbasSelecionadasParaImprimir({
      geral: true,
      publicacoes: true,
      orientacoes: true,
      projetos: true,
      premiacoes: true,
      producao_tecnica: true,
      patentes: true,
      eventos: true,
      mobilidade: true,
      impacto_social: true,
    })

    // Abre o modal de seleção apenas após a desmontagem do diálogo de Visualizar
    // usando requestAnimationFrame / pequeno defer para garantir que a pilha de dialogs Radix liberou o body
    setTimeout(() => {
      setModalImprimirAberto(true)
    }, 100)
  }

  const alternarTodasAbasImpressao = (marcar: boolean) => {
    setAbasSelecionadasParaImprimir({
      geral: marcar,
      publicacoes: marcar,
      orientacoes: marcar,
      projetos: marcar,
      premiacoes: marcar,
      producao_tecnica: marcar,
      patentes: marcar,
      eventos: marcar,
      mobilidade: marcar,
      impacto_social: marcar,
    })
  }

  const alternarAbaIndividualImpressao = (tab: TabKey, checked: boolean) => {
    setAbasSelecionadasParaImprimir((prev) => ({
      ...prev,
      [tab]: checked,
    }))
  }

  // Garante que qualquer resíduo de pointer-events no body deixado por transições
  // de modais ou diálogos de impressão seja limpo quando o modal de impressão fecha.
  useEffect(() => {
    if (!modalImprimirAberto && typeof document !== 'undefined') {
      const timer = setTimeout(() => {
        if (
          !dialogoVisualizarAberto &&
          !dialogoVinculoAberto &&
          !isDialogOpen &&
          idParaExcluir === null
        ) {
          if (document.body.style.pointerEvents === 'none') {
            document.body.style.pointerEvents = ''
          }
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [
    modalImprimirAberto,
    dialogoVisualizarAberto,
    dialogoVinculoAberto,
    isDialogOpen,
    idParaExcluir,
  ])

  const handleConfirmarImpressao = () => {
    // 1. Fecha o modal de seleção imediatamente, de forma incondicional
    setModalImprimirAberto(false)

    // 2. Garante que se o usuário cancelar ou se faltarem dados, nada bloqueia
    if (!docenteParaImprimir || !dadosParaImprimir) return

    const docenteAlvo = docenteParaImprimir
    const dadosAlvo = dadosParaImprimir
    const abasAlvo = { ...abasSelecionadasParaImprimir }

    // 3. Defer da impressão para o próximo tick:
    // Permite que o React processe a desmontagem/fechamento do Dialog Radix,
    // execute suas animações e libere os pointer-events antes de qualquer
    // chamada síncrona/bloqueante de print() do navegador.
    setTimeout(() => {
      try {
        imprimirDocenteViaIframe(docenteAlvo, dadosAlvo, abasAlvo).catch((err) => {
          console.error('Falha ao imprimir via iframe:', err)
        })
      } catch (err) {
        console.error('Exceção síncrona ao disparar impressão:', err)
      }
    }, 150)
  }

  const definicoesAbasImpressao: DefinicaoAbaImpressao[] = [
    { id: 'geral', rotulo: 'Dados Cadastrais', icone: UserIcon, total: 1 },
    {
      id: 'publicacoes',
      rotulo: 'Publicações',
      icone: FileTextIcon,
      total: dadosParaImprimir?.publicacoes.length ?? 0,
    },
    {
      id: 'orientacoes',
      rotulo: 'Orientações',
      icone: Users2Icon,
      total: dadosParaImprimir?.orientacoes.length ?? 0,
    },
    {
      id: 'projetos',
      rotulo: 'Projetos',
      icone: FlaskConicalIcon,
      total: dadosParaImprimir?.projetos.length ?? 0,
    },
    {
      id: 'premiacoes',
      rotulo: 'Premiações',
      icone: AwardIcon,
      total: dadosParaImprimir?.premiacoes.length ?? 0,
    },
    {
      id: 'producao_tecnica',
      rotulo: 'Produção Técnica',
      icone: WrenchIcon,
      total: dadosParaImprimir?.producaoTecnica.length ?? 0,
    },
    {
      id: 'patentes',
      rotulo: 'Patentes',
      icone: LightbulbIcon,
      total: dadosParaImprimir?.patentes.length ?? 0,
    },
    {
      id: 'eventos',
      rotulo: 'Eventos',
      icone: CalendarIcon,
      total: dadosParaImprimir?.eventos.length ?? 0,
    },
    {
      id: 'mobilidade',
      rotulo: 'Mobilidade',
      icone: PlaneIcon,
      total: dadosParaImprimir?.mobilidade.length ?? 0,
    },
    {
      id: 'impacto_social',
      rotulo: 'Impacto Social',
      icone: HeartHandshakeIcon,
      total: dadosParaImprimir?.impactoSocial.length ?? 0,
    },
  ]

  const handleVincularOpenAlex = async (
    docenteId: number | string,
    candidato: OpenAlexAutorCandidato,
  ) => {
    try {
      // Atualiza o docente no Supabase gravando openalex_id e indice_h (h_index do OpenAlex)
      await update(docenteId, {
        openalex_id: candidato.openalex_id,
        indice_h: candidato.h_index,
      })
      toast.success(
        `Docente vinculado com sucesso ao OpenAlex (${candidato.openalex_id}, h-index ${candidato.h_index})`,
      )
    } catch (err: any) {
      toast.error(`Erro ao vincular perfil OpenAlex: ${err?.message || 'Falha na gravação'}`)
      throw err
    }
  }

  const handleVincularScopus = async (
    docenteId: number | string,
    candidato: ScopusAutorCandidato,
  ) => {
    try {
      // Grava APENAS o campo scopus_id. NÃO atualiza indice_h (entitlement básico não traz h-index)
      await update(docenteId, {
        scopus_id: candidato.scopus_id,
      })
      toast.success(`Docente vinculado com sucesso ao Scopus (Scopus ID: ${candidato.scopus_id})`)
    } catch (err: any) {
      toast.error(`Erro ao vincular perfil Scopus: ${err?.message || 'Falha na gravação'}`)
      throw err
    }
  }

  return (
    <div className="flex flex-col md:h-[calc(100vh-4rem-3rem)] min-h-0 animate-fade-in gap-3 md:gap-4">
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary shrink-0" />
            <span>Docentes</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar docente..."
              className="pl-9 bg-white border-slate-200"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/imprimir/docentes')}
            className="inline-flex items-center justify-center gap-2 border-blue-300 bg-white hover:bg-blue-50 text-blue-700 h-9 px-3.5 text-sm font-medium shrink-0 cursor-pointer"
            title="Versão para Impressão"
          >
            <Printer className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          {canCreate && (
            <Button onClick={() => handleOpen()} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Docente</span>
            </Button>
          )}
        </div>
      </div>

      {/* Moldura estilo Supabase: contêiner flex-1 min-h-0 com tabela rolável e paginação colada na base */}
      <div className="flex flex-col flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        {/* Contêiner da tabela: overflow-y-auto, overflow-x-auto com barra horizontal nativa oculta (substituída pela FrameHorizontalScrollbar) */}
        <div
          ref={tableContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-auto table-scroll-container"
        >
          <Table>
            <TableHeader className="bg-[#e9effc] dark:bg-neutral-900/90 sticky top-0 z-10 backdrop-blur-xs">
              <TableRow className="bg-[#e9effc] hover:bg-[#e9effc]">
                <TableHead className="text-center font-semibold text-slate-700 bg-[#e9effc]">
                  Nome
                </TableHead>
                <TableHead className="text-center font-semibold text-slate-700 bg-[#e9effc]">
                  Scopus ID
                </TableHead>
                <TableHead className="text-center font-semibold text-slate-700 bg-[#e9effc]">
                  Índice-H
                </TableHead>
                <TableHead className="text-center font-semibold text-slate-700 bg-[#e9effc]">
                  Bolsa CNPq
                </TableHead>
                <TableHead className="text-center font-semibold text-slate-700 bg-[#e9effc]">
                  OpenAlex
                </TableHead>
                <TableHead className="text-center font-semibold text-slate-700 bg-[#e9effc]">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="h-14">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j} className="text-center py-3">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length > 0 ? (
                paginated.map((d) => {
                  const licencaTrim = (d.licenca ?? '').trim()
                  const temLicenca = licencaTrim !== '' && licencaTrim !== '-'
                  const dAny = d as any
                  const statusVal = String(dAny.status ?? '')
                    .trim()
                    .toLowerCase()
                  const isInativoLegado =
                    statusVal === 'inativo' || statusVal === 'desligado' || statusVal === 'inativa'
                  const isStatusFalse = d.status === false
                  const isInativo = isInativoLegado || isStatusFalse
                  const destacarOlhoLaranja = temLicenca || isInativo

                  const podeEditarEste = podeEditarRegistro(role, docenteIdLogado, 'docentes', d)
                  const podeExcluirEste = podeExcluirRegistro(role, docenteIdLogado, 'docentes', d)

                  return (
                    <TableRow key={d.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-left font-medium text-slate-900">
                        <div className="flex flex-col items-start gap-1">
                          <DocenteNome nome={d.nome} status={d.status} className="text-slate-900" />
                          {(d.email || d.cpf || d.siape) && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-normal">
                              {d.email && <span className="text-slate-600">{d.email}</span>}
                              {d.cpf && <span>• CPF: {d.cpf}</span>}
                              {d.siape && <span>• SIAPE: {d.siape}</span>}
                            </div>
                          )}
                          {d.categoria === 'permanente' && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-semibold w-fit"
                            >
                              Permanente
                            </Badge>
                          )}
                          {d.categoria === 'colaborador' && (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-semibold w-fit"
                            >
                              Colaborador
                            </Badge>
                          )}
                          {d.categoria === 'visitante' && (
                            <Badge
                              variant="outline"
                              className="bg-purple-50 text-purple-800 border-purple-300 text-[10px] font-semibold w-fit"
                            >
                              Visitante
                            </Badge>
                          )}
                          {d.categoria === 'jdp' && (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold w-fit"
                            >
                              JDP
                            </Badge>
                          )}
                          {/* Flag JDP com verificação de prazo e validade */}
                          {d.jdp &&
                            (() => {
                              const statusJdp = avaliarStatusJdpDocente(d)
                              if (statusJdp.isExpirado) {
                                return (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-medium gap-1 w-fit"
                                    title={`JDP Expirado: ${statusJdp.motivoExpiracao || 'Condição de prazo expirada'}`}
                                  >
                                    <AlertTriangle className="h-3 w-3 text-amber-700" />
                                    <span>JDP Expirado</span>
                                  </Badge>
                                )
                              }
                              if (!statusJdp.isPermanente) {
                                return (
                                  <Badge
                                    variant="outline"
                                    className="bg-rose-50 text-rose-800 border-rose-300 text-[10px] font-medium gap-1 w-fit"
                                    title="Docente marcado como JDP porém sem categoria Permanente"
                                  >
                                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                                    <span>JDP Inválido (não permanente)</span>
                                  </Badge>
                                )
                              }
                              return (
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold w-fit"
                                  title={`Jovem Doutor Pesquisador (Doutorado: ${d.ano_doutorado || '—'}, JDP desde: ${d.jdp_desde || '—'})`}
                                >
                                  JDP (Válido)
                                </Badge>
                              )
                            })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center">
                          {d.scopus_id ? (
                            podeEditarEste ? (
                              <button
                                type="button"
                                onClick={() => handleAbrirVinculo(d, 'scopus')}
                                className="inline-flex items-center gap-1.5 group cursor-pointer focus:outline-none"
                                title="Clique para gerenciar a vinculação Scopus"
                              >
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                >
                                  <Database className="h-3 w-3 text-emerald-600 mr-1" />
                                  {d.scopus_id}
                                </Badge>
                              </button>
                            ) : (
                              <Badge
                                variant="outline"
                                className="font-mono text-xs text-emerald-800 border-emerald-300 bg-emerald-50"
                              >
                                <Database className="h-3 w-3 text-emerald-600 mr-1" />
                                {d.scopus_id}
                              </Badge>
                            )
                          ) : podeEditarEste ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAbrirVinculo(d, 'scopus')}
                              className="h-7 px-2 text-xs gap-1 text-orange-700 hover:text-orange-800 border-orange-300 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 transition-colors"
                              title="Buscar autor no Scopus"
                            >
                              <Database className="h-3 w-3 text-orange-600" />
                              <span className="font-medium">Buscar Scopus</span>
                            </Button>
                          ) : (
                            <Badge
                              variant="outline"
                              className="font-mono text-xs text-orange-700 border-orange-300 bg-orange-50"
                            >
                              Buscar Scopus
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-700">
                        {d.indice_h}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center">
                          {d.bolsa_cnpq ? (
                            <Badge
                              variant="secondary"
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              {d.bolsa_cnpq}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center">
                          {d.openalex_id ? (
                            podeEditarEste ? (
                              <button
                                type="button"
                                onClick={() => handleAbrirVinculo(d, 'openalex')}
                                className="inline-flex items-center gap-1.5 group cursor-pointer focus:outline-none"
                                title="Clique para alterar a vinculação OpenAlex"
                              >
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 transition-colors"
                                >
                                  {d.openalex_id}
                                </Badge>
                              </button>
                            ) : (
                              <Badge
                                variant="outline"
                                className="font-mono text-xs text-indigo-700 border-indigo-200 bg-indigo-50/70"
                              >
                                {d.openalex_id}
                              </Badge>
                            )
                          ) : podeEditarEste ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAbrirVinculo(d, 'openalex')}
                              className="h-7 px-2.5 text-xs gap-1.5 text-orange-700 hover:text-orange-800 border-orange-300 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 transition-colors"
                              title="Buscar autor no OpenAlex"
                            >
                              <span className="font-medium">Buscar OpenAlex</span>
                            </Button>
                          ) : (
                            <Badge
                              variant="outline"
                              className="font-mono text-xs text-orange-700 border-orange-300 bg-orange-50"
                            >
                              Buscar OpenAlex
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVisualizarDocente(d)}
                            className={
                              destacarOlhoLaranja
                                ? 'h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50'
                                : 'h-8 w-8 text-slate-600 hover:text-primary hover:bg-primary/10'
                            }
                            title={
                              destacarOlhoLaranja
                                ? `Visualizar (Docente ${isInativo ? 'inativo' : ''}${temLicenca ? (isInativo ? ' e' : '') + ' em gozo de licença: ' + d.licenca : ''})`
                                : 'Visualizar Docente'
                            }
                            aria-label="Visualizar Docente"
                          >
                            <Eye
                              className={
                                destacarOlhoLaranja
                                  ? 'h-4 w-4 text-orange-500 stroke-[2.2]'
                                  : 'h-4 w-4'
                              }
                            />
                          </Button>
                          {podeEditarEste && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpen(d)}
                              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                              title="Editar Docente"
                            >
                              <Edit className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          {podeExcluirEste && (
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`btn-excluir-docente-${d.id}`}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDocenteParaExcluir(d)}
                              title="Excluir Docente"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    Nenhum docente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <FrameHorizontalScrollbar targetRef={tableContainerRef} />
        <TablePaginationFooter
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          targetRef={tableContainerRef}
          totalItems={filtered.length}
        />
      </div>

      <VincularOpenAlexDialog
        open={dialogoVinculoAberto}
        onOpenChange={setDialogoVinculoAberto}
        docente={docenteParaVinculo}
        abaInicial={abaInicialVinculo}
        onVincular={handleVincularOpenAlex}
        onVincularScopus={handleVincularScopus}
      />

      <VisualizarDocenteDialog
        open={dialogoVisualizarAberto}
        onOpenChange={setDialogoVisualizarAberto}
        docente={docenteParaVisualizar}
        onAbrirImpressao={handleAbrirSelecaoImpressao}
      />

      {/* Modal de Seleção de Abas para Impressão - montado no nível da página */}
      <ModalSelecaoAbasImpressao
        open={modalImprimirAberto}
        onOpenChange={setModalImprimirAberto}
        abasDefinicao={definicoesAbasImpressao}
        abasSelecionadas={abasSelecionadasParaImprimir}
        onAlternarTodas={alternarTodasAbasImpressao}
        onAlternarAba={alternarAbaIndividualImpressao}
        onConfirmarImpressao={handleConfirmarImpressao}
      />

      {/* Diálogo de Criar / Editar Docente */}
      {(canCreate || podeEditarProprio) && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-neutral-800 shrink-0 pr-12">
              <DialogTitle className="text-primary font-bold text-xl text-left">
                {editingId ? 'Editar Docente' : 'Adicionar Docente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <div className="space-y-2">
                  <Label htmlFor="nome">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Prof. Dr. Carlos Alberto..."
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scopusId">Scopus Author ID</Label>
                    <Input
                      id="scopusId"
                      placeholder="Ex: 57201234567"
                      value={formData.scopus_id}
                      onChange={(e) => setFormData({ ...formData, scopus_id: e.target.value })}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="indiceH">Índice-H</Label>
                    <Input
                      id="indiceH"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.indice_h}
                      onChange={(e) =>
                        setFormData({ ...formData, indice_h: Number(e.target.value) })
                      }
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bolsaCnpq">Bolsa de Produtividade CNPq</Label>
                  <Select
                    value={formData.bolsa_cnpq || '__none__'}
                    onValueChange={(v) =>
                      setFormData({ ...formData, bolsa_cnpq: v === '__none__' ? '' : v })
                    }
                  >
                    <SelectTrigger id="bolsaCnpq" className="bg-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nenhuma Bolsa —</SelectItem>
                      <SelectItem value="PQ-SR">PQ-SR</SelectItem>
                      <SelectItem value="PQ-1A">PQ 1A</SelectItem>
                      <SelectItem value="PQ-1B">PQ 1B</SelectItem>
                      <SelectItem value="PQ-1C">PQ 1C</SelectItem>
                      <SelectItem value="PQ-1D">PQ 1D</SelectItem>
                      <SelectItem value="PQ-2">PQ 2</SelectItem>
                      <SelectItem value="DT-1A">DT 1A</SelectItem>
                      <SelectItem value="DT-1B">DT 1B</SelectItem>
                      <SelectItem value="DT-2">DT 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria no PPG-DCEM</Label>
                  <Select
                    value={formData.categoria || '__none__'}
                    onValueChange={(v) => {
                      const novaCat =
                        v === '__none__'
                          ? null
                          : (v as 'permanente' | 'colaborador' | 'visitante' | 'jdp')
                      const desmarcarJdp = novaCat !== 'permanente' && formData.jdp
                      setFormData({
                        ...formData,
                        categoria: novaCat,
                        jdp: desmarcarJdp ? false : formData.jdp,
                        jdp_desde: desmarcarJdp ? null : formData.jdp_desde,
                        ano_doutorado: desmarcarJdp ? null : formData.ano_doutorado,
                      })
                    }}
                  >
                    <SelectTrigger id="categoria" className="bg-white">
                      <SelectValue placeholder="Selecione a categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem categoria (Não informado)</SelectItem>
                      <SelectItem value="permanente">Permanente</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                      <SelectItem value="visitante">Visitante</SelectItem>
                      <SelectItem value="jdp">JDP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Controle de Jovem Doutor Pesquisador (JDP) */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="jdp-docente" className="text-sm font-semibold cursor-pointer">
                        Jovem Doutor Pesquisador (JDP)
                      </Label>
                      <p className="text-xs text-slate-500">
                        Exclusivo para categoria Permanente (máx. 20% do DP, prazo máx. 4 anos).
                      </p>
                    </div>
                    <Switch
                      id="jdp-docente"
                      checked={Boolean(formData.jdp)}
                      onCheckedChange={(checked) => {
                        if (checked && formData.categoria !== 'permanente') {
                          toast.error(
                            'A marcação de JDP só é permitida para docentes da categoria Permanente.',
                          )
                          return
                        }
                        setFormData({
                          ...formData,
                          jdp: checked,
                        })
                      }}
                    />
                  </div>

                  {formData.jdp && formData.categoria !== 'permanente' && (
                    <div className="flex items-start gap-2 p-2 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        Regra CAPES: Apenas docentes <strong>Permanentes</strong> podem ser
                        enquadrados como JDP. Altere a categoria acima para "Permanente".
                      </div>
                    </div>
                  )}

                  {formData.jdp && (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="ano_doutorado" className="text-xs font-medium">
                            Ano do Doutorado <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="ano_doutorado"
                            type="number"
                            min="1950"
                            max="2100"
                            placeholder="Ex: 2021"
                            value={formData.ano_doutorado ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                ano_doutorado:
                                  e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            className="bg-white h-8 text-xs"
                          />
                          <p className="text-[10px] text-slate-500">
                            Doutorado obtido há menos de 10 anos
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="jdp_desde" className="text-xs font-medium">
                            JDP desde (Ano) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="jdp_desde"
                            type="number"
                            min="1950"
                            max="2100"
                            placeholder="Ex: 2024"
                            value={formData.jdp_desde ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                jdp_desde: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            className="bg-white h-8 text-xs"
                          />
                          <p className="text-[10px] text-slate-500">
                            Prazo máximo de 4 anos como JDP
                          </p>
                        </div>
                      </div>

                      {/* Avaliação em tempo real de expiração */}
                      {(() => {
                        const statusTemp = avaliarStatusJdpDocente({
                          jdp: true,
                          categoria: formData.categoria,
                          jdp_desde: formData.jdp_desde,
                          ano_doutorado: formData.ano_doutorado,
                        })
                        if (statusTemp.isExpirado) {
                          return (
                            <div className="flex items-start gap-2 p-2 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                              <div>
                                <strong>Condição Expirada:</strong> {statusTemp.motivoExpiracao}.
                                Este docente será indicado como "JDP expirado" e não contará no
                                conjunto de JDPs válidos para cálculos CAPES.
                              </div>
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={formData.cpf || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cpf: e.target.value.replace(/\D/g, '').slice(0, 11),
                        })
                      }
                      className="bg-white"
                    />
                    <p className="text-[11px] text-slate-500">Apenas números (salvo limpo)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siape">SIAPE</Label>
                    <Input
                      id="siape"
                      placeholder="Ex: 1234567"
                      value={formData.siape || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          siape: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      className="bg-white"
                    />
                    <p className="text-[11px] text-slate-500">Apenas números (salvo limpo)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail Institucional / Contato</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="docente@ufs.br"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orcId">ORCID</Label>
                  <Input
                    id="orcId"
                    placeholder="0000-0002-1825-0097"
                    value={formData.orc_id || ''}
                    onChange={(e) => setFormData({ ...formData, orc_id: e.target.value })}
                    className="bg-white font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenca">Licença Saúde / Parental</Label>
                  <Input
                    id="licenca"
                    placeholder="Ex: Licença Maternidade (6 meses em 2024)"
                    value={formData.licenca}
                    onChange={(e) => setFormData({ ...formData, licenca: e.target.value })}
                    className="bg-white"
                  />
                  <p className="text-xs text-slate-500">
                    Impacta na flexibilização dos critérios de produtividade CAPES
                  </p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="status-docente" className="text-sm font-medium cursor-pointer">
                      Ativo no programa
                    </Label>
                    <p className="text-xs text-slate-500">
                      Quando inativo (status desmarcado), o nome do docente é destacado em cor
                      laranja no sistema.
                    </p>
                  </div>
                  <Switch
                    id="status-docente"
                    checked={formData.status !== false}
                    onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                  />
                </div>
                {/* Multiseleção de Linhas de Pesquisa */}{' '}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <Label className="text-sm font-semibold text-slate-800">Linhas de Pesquisa</Label>
                  <p className="text-xs text-slate-500">
                    Selecione uma ou mais linhas de pesquisa em que o docente atua:
                  </p>
                  {carregandoLinhas ? (
                    <div className="text-xs text-slate-400 py-2">Carregando linhas...</div>
                  ) : todasLinhas.length === 0 ? (
                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                      Nenhuma linha de pesquisa cadastrada no sistema. Cadastre primeiro em "Linhas
                      de Pesquisa".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-md bg-slate-50/50">
                      {todasLinhas.map((lp) => {
                        const isChecked = linhasDocenteSelecionadas.includes(lp.id)
                        return (
                          <label
                            key={lp.id}
                            className="flex items-start gap-2.5 p-1.5 rounded hover:bg-white cursor-pointer transition-colors text-xs"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setLinhasDocenteSelecionadas((prev) => [...prev, lp.id])
                                } else {
                                  setLinhasDocenteSelecionadas((prev) =>
                                    prev.filter((id) => id !== lp.id),
                                  )
                                }
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-slate-900 block leading-tight">
                                {lp.nome}
                              </span>
                              {lp.area && (
                                <span className="text-[11px] text-slate-500 block">
                                  Área: {lp.area}
                                </span>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                  {linhasDocenteSelecionadas.length > 0 && (
                    <div className="text-[11px] text-emerald-700 font-medium">
                      {linhasDocenteSelecionadas.length} linha(s) selecionada(s)
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-slate-200 dark:border-neutral-800 bg-slate-50/90 dark:bg-neutral-900/90 p-4 flex items-center justify-end gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="bg-white hover:bg-slate-50 h-9 px-4 text-sm"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="h-9 px-5 text-sm">
                  {submitting ? 'Salvando...' : 'Salvar Docente'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de confirmação de exclusão em cascata com validação estrita do nome */}
      <ModalExcluirDocente
        open={docenteParaExcluir !== null}
        onOpenChange={(open) => {
          if (!open) setDocenteParaExcluir(null)
        }}
        docente={docenteParaExcluir}
        onConfirmar={handleConfirmarExclusaoDocente}
        loading={excluindoDocente}
      />
    </div>
  )
}
