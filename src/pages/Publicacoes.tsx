import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrudData } from '@/hooks/use-crud-data'
import { publicacoesService } from '@/services/publicacoes'
import { discentesService } from '@/services/discentes'
import { egressosService } from '@/services/egressos'
import { docentesService } from '@/services/docentes'
import { coautoresProgramaService } from '@/services/coautores-programa'
import { publicacoesDocentesService } from '@/services/publicacoes-docentes'
import { SeletorCoautoria } from '@/components/publicacoes/SeletorCoautoria'
import { SeletorDocentesAutores } from '@/components/publicacoes/SeletorDocentesAutores'
import { VincularAutoresDocentesDialog } from '@/components/publicacoes/VincularAutoresDocentesDialog'
import { SugerirQualisDialog } from '@/components/publicacoes/SugerirQualisDialog'
import { DocenteNome } from '@/components/docentes/DocenteNome'
import type {
  Publicacao,
  Discente,
  Egresso,
  Docente,
  PublicacaoDocente,
  PublicacaoCoautorPrograma,
  EstratoQualis,
  TipoProducao,
  IndicacaoNivel,
  Qualis,
} from '@/types/database'
import { qualisService } from '@/services/qualis'
import { ANO_INICIO, ANO_FIM } from '@/lib/lattes/quadrienio'
import { useAuth } from '@/hooks/use-auth'
import { podeCriarNaTabela, podeEditarRegistro, podeExcluirRegistro } from '@/services/permissoes'
import { normalizarTituloAcademico } from '@/lib/normalizacao'
import { Badge } from '@/components/ui/badge'
import { registrarLog } from '@/services/logs'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Edit, Trash2, Printer, Sparkles, Award } from 'lucide-react'
import { toast } from 'sonner'
import { TablePaginationFooter } from '@/components/crud/TablePaginationFooter'
import { FrameHorizontalScrollbar } from '@/components/crud/FrameHorizontalScrollbar'

const emptyForm: Omit<Publicacao, 'id'> = {
  titulo: '',
  autores: '',
  periodico: '',
  ano: 2025,
  doi: '',
  justificativa: '',
  link_comprovacao: '',
  observacoes: '',
  fator_impacto_jcr: null,
  estrato_qualis: null,
  tipo_producao: null,
  indicacao_nivel: null,
  justificativa_indicacao: '',
}

function getQualisBadge(
  estrato?: EstratoQualis | null,
  origem?: string | null,
  justificativa?: string | null,
) {
  if (!estrato) {
    return (
      <Badge
        variant="outline"
        className="text-slate-400 bg-slate-50 border-slate-200 font-mono text-[11px]"
      >
        Sem estrato
      </Badge>
    )
  }

  const tooltipTitle = justificativa
    ? `${origem === 'sugerido_confirmado' ? 'Sugerido (OpenAlex/Scopus)' : 'Manual'}: ${justificativa}`
    : origem === 'sugerido_confirmado'
      ? 'Sugerido e confirmado via OpenAlex/Scopus'
      : 'Atribuído manualmente'

  let badgeElement: React.ReactNode
  switch (estrato) {
    case 'A1':
    case 'A2':
      badgeElement = (
        <Badge
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] gap-1 cursor-help"
          title={tooltipTitle}
        >
          {estrato}
          {origem === 'sugerido_confirmado' && <span className="text-[9px] opacity-80">★</span>}
        </Badge>
      )
      break
    case 'A3':
    case 'A4':
      badgeElement = (
        <Badge
          className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-[11px] gap-1 cursor-help"
          title={tooltipTitle}
        >
          {estrato}
          {origem === 'sugerido_confirmado' && <span className="text-[9px] opacity-80">★</span>}
        </Badge>
      )
      break
    case 'B1':
      badgeElement = (
        <Badge
          className="bg-amber-500 hover:bg-amber-600 text-white font-mono text-[11px] gap-1 cursor-help"
          title={tooltipTitle}
        >
          {estrato}
          {origem === 'sugerido_confirmado' && <span className="text-[9px] opacity-80">★</span>}
        </Badge>
      )
      break
    default:
      badgeElement = (
        <Badge
          variant="outline"
          className="text-slate-600 font-mono text-[11px] cursor-help"
          title={tooltipTitle}
        >
          {estrato}
        </Badge>
      )
  }

  return badgeElement
}

export default function Publicacoes() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { data: publicacoes, loading, create, update, remove } = useCrudData(publicacoesService)
  const [searchTerm, setSearchTerm] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [qualisFilter, setQualisFilter] = useState('all')
  const [tipoProducaoFilter, setTipoProducaoFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isVincularDocentesOpen, setIsVincularDocentesOpen] = useState(false)
  const [isSugerirQualisOpen, setIsSugerirQualisOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState<Omit<Publicacao, 'id'>>(emptyForm)
  const [idParaExcluir, setIdParaExcluir] = useState<number | string | null>(null)

  // Estratos Qualis vindos da tabela qualis
  const [qualisTabelaLista, setQualisTabelaLista] = useState<Qualis[]>([])

  // Discentes e Egressos para coautoria
  const [discentesLista, setDiscentesLista] = useState<Discente[]>([])
  const [egressosLista, setEgressosLista] = useState<Egresso[]>([])
  const [docentesLista, setDocentesLista] = useState<Docente[]>([])
  const [todosCoautores, setTodosCoautores] = useState<PublicacaoCoautorPrograma[]>([])
  const [todasPubsDocentes, setTodasPubsDocentes] = useState<PublicacaoDocente[]>([])

  // Estado dos docentes vinculados na edição atual da publicação
  const [docentesAutoresSelecionados, setDocentesAutoresSelecionados] = useState<number[]>([])

  const recarregarTudo = async () => {
    try {
      await Promise.all([publicacoesService.list(), carregarRelacionados()])
    } catch (err) {
      console.error('Erro ao recarregar dados de publicações:', err)
    }
  }

  const carregarRelacionados = async () => {
    try {
      const [disc, eg, docs, coaut, pubsDocs, qualisItens] = await Promise.all([
        discentesService.list(),
        egressosService.list(),
        docentesService.list(),
        coautoresProgramaService.listarTodos(),
        publicacoesDocentesService.listarTodos(),
        qualisService.list(),
      ])
      setDiscentesLista(disc)
      setEgressosLista(eg)
      setDocentesLista(docs)
      setTodosCoautores(coaut)
      setTodasPubsDocentes(pubsDocs)
      setQualisTabelaLista(qualisItens)
    } catch (err) {
      console.error('Erro ao carregar dados para coautoria e docentes:', err)
    }
  }
  useEffect(() => {
    carregarRelacionados()
  }, [])

  const { role } = useAuth()
  const isCapes = role === 'capes'
  const docenteIdLogado = profile?.docente_id
  const canCreate = podeCriarNaTabela(role, 'publicacoes', docenteIdLogado)
  const isStaff = role === 'suporte' || role === 'coordenador' || role === 'auxiliar'
  const isDocente = role === 'docente'
  const hasActionsColumn = !isCapes && (isStaff || isDocente)
  const PER_PAGE = 20

  const editingPub = editingId ? publicacoes.find((p) => p.id === editingId) : null
  const editingCtx = {
    publicacoesDocentesIds: editingId
      ? todasPubsDocentes.filter((pd) => pd.publicacao_id === editingId).map((pd) => pd.docente_id)
      : docentesAutoresSelecionados,
  }
  const canEditCurrent = editingId
    ? podeEditarRegistro(role, docenteIdLogado, 'publicacoes', editingPub, editingCtx)
    : canCreate

  const filtered = useMemo(() => {
    const termo = searchTerm
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

    const normalizar = (txt?: string | null) =>
      (txt || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

    return publicacoes.filter((p) => {
      if (yearFilter !== 'all' && p.ano.toString() !== yearFilter) return false
      if (qualisFilter !== 'all') {
        if (qualisFilter === 'nenhum' && p.estrato_qualis) return false
        if (qualisFilter !== 'nenhum' && p.estrato_qualis !== qualisFilter) return false
      }
      if (tipoProducaoFilter !== 'all') {
        if (tipoProducaoFilter === 'nenhum' && p.tipo_producao) return false
        if (tipoProducaoFilter !== 'nenhum' && p.tipo_producao !== tipoProducaoFilter) return false
      }

      if (!termo) return true

      const matchTitulo = normalizar(p.titulo).includes(termo)
      const matchAutores = normalizar(p.autores).includes(termo)
      const matchPeriodico = normalizar(p.periodico).includes(termo)
      const matchDoi = normalizar(p.doi).includes(termo)
      const matchAno = String(p.ano ?? '').includes(termo)
      const matchQualis = normalizar(p.estrato_qualis).includes(termo)

      return matchTitulo || matchAutores || matchPeriodico || matchDoi || matchAno || matchQualis
    })
  }, [publicacoes, searchTerm, yearFilter, qualisFilter, tipoProducaoFilter])
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleOpen = async (pub?: Publicacao) => {
    setEditingId(pub?.id ?? null)
    setFormData(pub ?? emptyForm)
    if (pub?.id) {
      const vinculados = todasPubsDocentes
        .filter((pd) => pd.publicacao_id === pub.id)
        .map((pd) => pd.docente_id)
      setDocentesAutoresSelecionados(vinculados)
    } else {
      setDocentesAutoresSelecionados([])
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    if (formData.link_comprovacao) {
      try {
        new URL(formData.link_comprovacao)
      } catch {
        toast.error('Link de comprovação inválido. Use uma URL válida (ex: https://...).')
        setSubmitting(false)
        return
      }
    }

    // Validação de Justificativa obrigatória para Níveis 2 e 3
    if (
      (formData.indicacao_nivel === 2 || formData.indicacao_nivel === 3) &&
      (!formData.justificativa_indicacao || formData.justificativa_indicacao.trim() === '')
    ) {
      toast.error('A justificativa da indicação é obrigatória para os Níveis 2 e 3.')
      setSubmitting(false)
      return
    }

    // Regra da Ficha CAPES:
    // Máximo de 4 publicações com indicacao_nivel=2 por docente no quadriênio (2025-2028).
    // Considera publicacoes_docentes (docentesAutoresSelecionados na edição atual).
    if (formData.indicacao_nivel === 2 && formData.ano >= ANO_INICIO && formData.ano <= ANO_FIM) {
      // Para cada docente vinculado a esta publicação, checar quantas já indicou nível 2 no quadriênio
      for (const docenteId of docentesAutoresSelecionados) {
        // Encontra todas as publicações deste docente no quadriênio com indicacao_nivel=2
        const pubsDocenteNoQuadrienio = todasPubsDocentes
          .filter((pd) => pd.docente_id === docenteId && pd.publicacao_id !== editingId)
          .map((pd) => publicacoes.find((p) => p.id === pd.publicacao_id))
          .filter(
            (p): p is Publicacao =>
              Boolean(p) && p.ano >= ANO_INICIO && p.ano <= ANO_FIM && p.indicacao_nivel === 2,
          )

        if (pubsDocenteNoQuadrienio.length >= 4) {
          const doc = docentesLista.find((d) => d.id === docenteId)
          const nomeDoc = doc?.nome || `Docente ID ${docenteId}`
          toast.error(
            `Limite excedido: o docente "${nomeDoc}" já possui 4 publicações indicadas no Nível 2 para o quadriênio ${ANO_INICIO}-${ANO_FIM}. O sistema bloqueia a 5ª indicação.`,
          )
          setSubmitting(false)
          return
        }
      }
    }

    // Aviso não-bloqueante para Nível 3: até 5 produções indicadas no quadriênio pelo Programa
    if (formData.indicacao_nivel === 3 && formData.ano >= ANO_INICIO && formData.ano <= ANO_FIM) {
      const pubsNivel3Quadrienio = publicacoes.filter(
        (p) =>
          p.id !== editingId && p.ano >= ANO_INICIO && p.ano <= ANO_FIM && p.indicacao_nivel === 3,
      )
      if (pubsNivel3Quadrienio.length >= 5) {
        toast.warning(
          `Aviso: O programa já possui ${pubsNivel3Quadrienio.length} publicações indicadas no Nível 3 no quadriênio ${ANO_INICIO}-${ANO_FIM} (recomendação CAPES: até 5).`,
        )
      }
    }

    const payload = {
      ...formData,
      titulo: normalizarTituloAcademico(formData.titulo),
      estrato_qualis: formData.estrato_qualis || null,
      tipo_producao: formData.tipo_producao || null,
      indicacao_nivel: formData.indicacao_nivel || null,
      justificativa_indicacao: formData.indicacao_nivel
        ? formData.justificativa_indicacao || ''
        : null,
      // Se definiu estrato manualmente no formulário, registra origem manual
      ...(formData.estrato_qualis ? { qualis_origem: 'manual' as const } : {}),
    }
    try {
      let savedPubId = editingId
      if (editingId) {
        await update(editingId, payload)
        toast.success('Publicação atualizada')
        registrarLog({
          acao: 'editar',
          entidade: 'publicacoes',
          entidade_id: editingId,
          detalhes: {
            titulo: payload.titulo,
            ano: payload.ano,
          },
        })
      } else {
        const criada = (await create(payload)) as any
        savedPubId = criada?.id
        toast.success('Publicação registrada')
        if (criada && criada.id) {
          setEditingId(criada.id)
        }
        registrarLog({
          acao: 'criar',
          entidade: 'publicacoes',
          detalhes: {
            titulo: payload.titulo,
            ano: payload.ano,
          },
        })
      }

      // Sincroniza docentes autores vinculados (idempotente)
      if (savedPubId) {
        await publicacoesDocentesService.sincronizarDocentes(
          savedPubId,
          docentesAutoresSelecionados,
        )
      }

      await carregarRelacionados()
      setIsDialogOpen(false)
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number | string) => {
    try {
      await remove(id)
      toast.success('Publicação removida com sucesso')
      registrarLog({
        acao: 'excluir',
        entidade: 'publicacoes',
        entidade_id: id,
        detalhes: {
          resumo: `Exclusão de publicação ID ${id}`,
        },
      })
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setIdParaExcluir(null)
    }
  }

  return (
    <div className="flex flex-col md:h-[calc(100vh-4rem-3rem)] min-h-0 animate-fade-in gap-3 md:gap-4">
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Publicações</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie artigos do quadriênio.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select
            value={yearFilter}
            onValueChange={(v) => {
              setYearFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[120px] bg-white">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Anos</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2028">2028</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={qualisFilter}
            onValueChange={(v) => {
              setQualisFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[130px] bg-white">
              <SelectValue placeholder="Qualis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Qualis</SelectItem>
              {qualisTabelaLista.length > 0 ? (
                qualisTabelaLista.map((q) => (
                  <SelectItem key={q.id} value={q.estrato}>
                    {q.estrato}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="A1">A1</SelectItem>
                  <SelectItem value="A2">A2</SelectItem>
                  <SelectItem value="A3">A3</SelectItem>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="B1">B1</SelectItem>
                  <SelectItem value="B2">B2</SelectItem>
                  <SelectItem value="B3">B3</SelectItem>
                  <SelectItem value="B4">B4</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </>
              )}
              <SelectItem value="nenhum">Sem estrato</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={tipoProducaoFilter}
            onValueChange={(v) => {
              setTipoProducaoFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Tipo de produção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="Artigo em periódico">Artigo em periódico</SelectItem>
              <SelectItem value="Trabalho em anais">Trabalho em anais</SelectItem>
              <SelectItem value="Capítulo">Capítulo</SelectItem>
              <SelectItem value="nenhum">Sem tipo</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por título ou autores..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/imprimir/publicacoes')}
            className="gap-2 shrink-0 bg-white h-9 text-slate-700"
            title="Versão para Impressão / Exportar PDF"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </Button>
          {isStaff && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsSugerirQualisOpen(true)}
                className="gap-2 shrink-0 bg-white h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                title="Sugerir Qualis automaticamente com base no OpenAlex e Scopus (Etapa D2)"
              >
                <Award className="h-4 w-4 text-emerald-600" />
                <span>Sugerir Qualis (OpenAlex/Scopus)</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsVincularDocentesOpen(true)}
                className="gap-2 shrink-0 bg-white h-9 border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                title="Casamento Automático Autor → Docente (Etapa D1)"
              >
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span>Vincular autores a docentes</span>
              </Button>
            </>
          )}
          {canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpen()} className="gap-2 h-9">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nova Publicação</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[580px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-neutral-800 shrink-0 pr-12">
                  <DialogTitle className="text-primary font-bold text-xl text-left">
                    {editingId ? 'Editar' : 'Registrar'} Publicação
                  </DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col flex-1 min-h-0 overflow-hidden"
                >
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                    <div className="space-y-2">
                      <Label htmlFor="pub-titulo">
                        Título do Artigo <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="pub-titulo"
                        placeholder="Título completo do artigo científico..."
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        required
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pub-autores">
                        Autores <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="pub-autores"
                        placeholder="Ex: Silva, J. A.; Mendes, R. C.; Santos, L. M."
                        value={formData.autores}
                        onChange={(e) => setFormData({ ...formData, autores: e.target.value })}
                        required
                        className="bg-white"
                      />
                      <p className="text-xs text-slate-500">
                        Identifique claramente os docentes e discentes do programa
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pub-periodico">
                          Periódico / Revista <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="pub-periodico"
                          placeholder="Ex: Journal of Materials Chemistry A"
                          value={formData.periodico}
                          onChange={(e) => setFormData({ ...formData, periodico: e.target.value })}
                          required
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pub-ano">
                          Ano de Publicação <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="pub-ano"
                          type="number"
                          min="2015"
                          max="2035"
                          value={formData.ano}
                          onChange={(e) =>
                            setFormData({ ...formData, ano: Number(e.target.value) })
                          }
                          required
                          className="bg-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pub-doi">DOI</Label>
                        <Input
                          id="pub-doi"
                          placeholder="10.1016/j.jmatchem.2025.01.001"
                          value={formData.doi}
                          onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pub-jcr">Fator de Impacto (JCR)</Label>
                        <Input
                          id="pub-jcr"
                          type="number"
                          step="0.001"
                          min="0"
                          max="999.999"
                          placeholder="Ex: 3.850"
                          value={
                            formData.fator_impacto_jcr !== null &&
                            formData.fator_impacto_jcr !== undefined
                              ? formData.fator_impacto_jcr
                              : ''
                          }
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value)
                            setFormData({
                              ...formData,
                              fator_impacto_jcr: val !== null && !isNaN(val) ? val : null,
                            })
                          }}
                          className="bg-white"
                        />
                      </div>
                    </div>

                    {/* Campos Ficha CAPES (Etapa Q1): Qualis, Tipo de Produção, Indicação */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-50/80 rounded-lg border border-slate-200">
                      <div className="space-y-2">
                        <Label htmlFor="pub-estrato-qualis">Estrato Qualis</Label>
                        <Select
                          value={formData.estrato_qualis || 'sem_estrato'}
                          onValueChange={(val) =>
                            setFormData({
                              ...formData,
                              estrato_qualis: val === 'sem_estrato' ? null : (val as EstratoQualis),
                            })
                          }
                        >
                          <SelectTrigger id="pub-estrato-qualis" className="bg-white">
                            <SelectValue placeholder="Selecione o estrato" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem_estrato">Sem estrato</SelectItem>
                            {qualisTabelaLista.length > 0 ? (
                              qualisTabelaLista.map((q) => (
                                <SelectItem key={q.id} value={q.estrato}>
                                  {q.estrato} - {q.nome}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="A1">A1</SelectItem>
                                <SelectItem value="A2">A2</SelectItem>
                                <SelectItem value="A3">A3</SelectItem>
                                <SelectItem value="A4">A4</SelectItem>
                                <SelectItem value="B1">B1</SelectItem>
                                <SelectItem value="B2">B2</SelectItem>
                                <SelectItem value="B3">B3</SelectItem>
                                <SelectItem value="B4">B4</SelectItem>
                                <SelectItem value="C">C</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pub-tipo-producao">Tipo de Produção</Label>
                        <Select
                          value={formData.tipo_producao || 'vazio'}
                          onValueChange={(val) =>
                            setFormData({
                              ...formData,
                              tipo_producao: val === 'vazio' ? null : (val as TipoProducao),
                            })
                          }
                        >
                          <SelectTrigger id="pub-tipo-producao" className="bg-white">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vazio">(vazio)</SelectItem>
                            <SelectItem value="Artigo em periódico">Artigo em periódico</SelectItem>
                            <SelectItem value="Trabalho em anais">Trabalho em anais</SelectItem>
                            <SelectItem value="Capítulo">Capítulo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pub-indicacao-nivel">Indicação (nível)</Label>
                        <Select
                          value={
                            formData.indicacao_nivel !== null &&
                            formData.indicacao_nivel !== undefined
                              ? String(formData.indicacao_nivel)
                              : 'sem_indicacao'
                          }
                          onValueChange={(val) =>
                            setFormData({
                              ...formData,
                              indicacao_nivel:
                                val === 'sem_indicacao' ? null : (Number(val) as IndicacaoNivel),
                            })
                          }
                        >
                          <SelectTrigger id="pub-indicacao-nivel" className="bg-white">
                            <SelectValue placeholder="Selecione a indicação" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem_indicacao">Sem indicação</SelectItem>
                            <SelectItem value="2">Nível 2 (melhores do programa)</SelectItem>
                            <SelectItem value="3">Nível 3 (quadriênio)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Justificativa da indicação (obrigatória quando Nível 2 ou 3) */}
                    {(formData.indicacao_nivel === 2 || formData.indicacao_nivel === 3) && (
                      <div className="space-y-2 p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                        <Label
                          htmlFor="pub-justificativa-indicacao"
                          className="text-blue-900 font-medium"
                        >
                          Justificativa da Indicação (Nível {formData.indicacao_nivel}){' '}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="pub-justificativa-indicacao"
                          rows={3}
                          required
                          placeholder={
                            formData.indicacao_nivel === 2
                              ? 'Descreva a relevância desta produção entre as melhores do programa no quadriênio (máx. 4 por docente)...'
                              : 'Descreva a justificativa para indicação desta produção como destaque do quadriênio (até 5 do programa)...'
                          }
                          value={formData.justificativa_indicacao || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, justificativa_indicacao: e.target.value })
                          }
                          className="bg-white"
                        />
                        <p className="text-xs text-blue-700">
                          {formData.indicacao_nivel === 2
                            ? 'Ficha CAPES 2.4.3: máximo de 4 produções com Nível 2 por docente no quadriênio.'
                            : 'Ficha CAPES 2.4.4: até 5 melhores produções científicas do Programa no quadriênio.'}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="pub-justificativa">
                        Justificativa de Impacto e Relevância
                      </Label>{' '}
                      <Textarea
                        id="pub-justificativa"
                        rows={3}
                        placeholder="Contribuição para o quadriênio CAPES, aderência às linhas de pesquisa, colaboração internacional..."
                        value={formData.justificativa}
                        onChange={(e) =>
                          setFormData({ ...formData, justificativa: e.target.value })
                        }
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pub-link">Link de Comprovação / Acesso Aberto</Label>
                      <Input
                        id="pub-link"
                        type="url"
                        placeholder="https://doi.org/... ou https://sciencedirect.com/..."
                        value={formData.link_comprovacao}
                        onChange={(e) =>
                          setFormData({ ...formData, link_comprovacao: e.target.value })
                        }
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pub-obs">Observações</Label>
                      <Textarea
                        id="pub-obs"
                        rows={2}
                        placeholder="Quartis Qualis, número de citações, projetos associados..."
                        value={formData.observacoes}
                        onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                        className="bg-white"
                      />
                    </div>

                    {/* Seção de Docentes Autores do P²CEM */}
                    <div className="pt-2">
                      <SeletorDocentesAutores
                        autoresTexto={formData.autores}
                        docentes={docentesLista}
                        docentesSelecionadosIds={docentesAutoresSelecionados}
                        onChangeDocentesIds={setDocentesAutoresSelecionados}
                        canEdit={canEditCurrent}
                      />
                    </div>

                    {/* Seção de Coautoria com Orientandos/Egressos do P²CEM */}
                    <div className="pt-2">
                      <SeletorCoautoria
                        publicacaoId={editingId}
                        autoresTexto={formData.autores}
                        fatorImpactoJcr={formData.fator_impacto_jcr}
                        discentes={discentesLista}
                        egressos={egressosLista}
                        usuarioNome={profile?.name || profile?.email || 'Colegiado'}
                        canEdit={canEditCurrent}
                        onCoautoriaAtualizada={carregarRelacionados}
                      />
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
                      {submitting ? 'Salvando...' : 'Salvar Publicação'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Moldura estilo Supabase: contêiner flex-1 min-h-0 com tabela rolável e paginação colada na base */}
      <div className="flex flex-col flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        {/* Contêiner da tabela: overflow-y-auto, overflow-x-scroll forçado no desktop com barra nativa visível colada na paginação */}
        <div
          ref={tableContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-auto md:overflow-x-scroll table-scroll-container"
        >
          <Table>
            <TableHeader className="bg-slate-50/90 dark:bg-neutral-900/90 sticky top-0 z-10 backdrop-blur-xs">
              <TableRow>
                <TableHead className="w-[26%] font-semibold text-slate-700">
                  Título & Autores
                </TableHead>
                <TableHead className="font-semibold text-slate-700">Qualis</TableHead>
                <TableHead className="font-semibold text-slate-700">Docentes Autores</TableHead>
                <TableHead className="font-semibold text-slate-700">Periódico</TableHead>
                <TableHead className="font-semibold text-slate-700">Ano</TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Fator de Impacto (JCR)
                </TableHead>
                <TableHead className="font-semibold text-slate-700">Coautoria P²CEM</TableHead>
                <TableHead className="font-semibold text-slate-700">DOI</TableHead>
                <TableHead className="font-semibold text-slate-700">Justificativa</TableHead>
                {hasActionsColumn && (
                  <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>{' '}
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="h-14">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j} className="text-center py-3">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length > 0 ? (
                paginated.map((p) => {
                  const docentesVinculados = todasPubsDocentes
                    .filter((pd) => pd.publicacao_id === p.id)
                    .map((pd) => docentesLista.find((d) => d.id === pd.docente_id))
                    .filter(Boolean) as Docente[]

                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="font-medium text-slate-900 mb-1 flex items-start gap-1.5 flex-wrap">
                          <span>{normalizarTituloAcademico(p.titulo)}</span>
                          {p.indicacao_nivel && (
                            <Badge
                              variant="outline"
                              className={
                                p.indicacao_nivel === 2
                                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 text-[10px]'
                                  : 'border-purple-300 bg-purple-50 text-purple-700 text-[10px]'
                              }
                              title={
                                p.justificativa_indicacao
                                  ? `Justificativa: ${p.justificativa_indicacao}`
                                  : undefined
                              }
                            >
                              Nível {p.indicacao_nivel}
                            </Badge>
                          )}
                          {p.tipo_producao && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {p.tipo_producao}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{p.autores}</div>
                      </TableCell>
                      <TableCell>
                        {getQualisBadge(
                          p.estrato_qualis,
                          p.qualis_origem,
                          p.qualis_sugestao_justificativa,
                        )}
                      </TableCell>
                      <TableCell>
                        {docentesVinculados.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {docentesVinculados.map((doc) => {
                              const nomes = doc.nome.trim().split(' ')
                              const primeiro = nomes[0]
                              const ultimo = nomes.length > 1 ? nomes[nomes.length - 1] : ''
                              const exibicao = ultimo ? `${primeiro[0]}. ${ultimo}` : primeiro
                              return (
                                <Badge
                                  key={doc.id}
                                  variant={doc.status === false ? 'outline' : 'secondary'}
                                  className={`text-[10px] px-1.5 py-0 font-normal ${
                                    doc.status === false
                                      ? 'border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 font-medium'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                  title={
                                    doc.status === false
                                      ? `${doc.nome} (Inativo no programa)`
                                      : doc.nome
                                  }
                                >
                                  <DocenteNome
                                    nome={exibicao}
                                    status={doc.status}
                                    normalizar={false}
                                  />
                                </Badge>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-700">{p.periodico}</TableCell>
                      <TableCell className="font-medium">{p.ano}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-800">
                        {p.fator_impacto_jcr !== null && p.fator_impacto_jcr !== undefined
                          ? Number(p.fator_impacto_jcr).toFixed(3)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const coauts = todosCoautores.filter((c) => c.publicacao_id === p.id)
                          const semCoaut = coauts.some((c) => c.tipo === 'sem_coautoria')
                          const confirmados = coauts.filter((c) => c.tipo !== 'sem_coautoria')

                          if (confirmados.length > 0) {
                            return (
                              <Badge className="bg-emerald-600 text-white text-[11px] hover:bg-emerald-700">
                                Confirmada ({confirmados.length})
                              </Badge>
                            )
                          }
                          if (semCoaut) {
                            return (
                              <Badge
                                variant="outline"
                                className="text-slate-500 text-[11px] bg-slate-100"
                              >
                                Sem coautoria
                              </Badge>
                            )
                          }
                          const isJcr =
                            p.fator_impacto_jcr !== null &&
                            p.fator_impacto_jcr !== undefined &&
                            Number(p.fator_impacto_jcr) >= 1.0
                          return isJcr ? (
                            <Badge
                              variant="outline"
                              className="text-amber-700 border-amber-300 bg-amber-50 text-[11px]"
                            >
                              Pendente
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-primary hover:underline cursor-pointer">
                        {p.doi}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 line-clamp-2">
                        {p.justificativa}
                      </TableCell>
                      {hasActionsColumn && (
                        <TableCell className="text-right">
                          {(() => {
                            const idsDocentesPub = todasPubsDocentes
                              .filter((pd) => pd.publicacao_id === p.id)
                              .map((pd) => pd.docente_id)
                            const ctx = { publicacoesDocentesIds: idsDocentesPub }
                            const canEditThisPub = podeEditarRegistro(
                              role,
                              docenteIdLogado,
                              'publicacoes',
                              p,
                              ctx,
                            )
                            const canDeleteThisPub = podeExcluirRegistro(
                              role,
                              docenteIdLogado,
                              'publicacoes',
                              p,
                              ctx,
                            )

                            return (
                              <div className="flex items-center justify-end gap-1">
                                {canEditThisPub && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpen(p)}
                                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                    title="Editar"
                                  >
                                    <Edit className="h-4 w-4 text-primary" />
                                  </Button>
                                )}
                                {canDeleteThisPub && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setIdParaExcluir(p.id)}
                                    title="Excluir"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                )}
                              </div>
                            )
                          })()}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={hasActionsColumn ? 9 : 8}
                    className="h-32 text-center text-slate-500"
                  >
                    Nenhuma publicação encontrada.
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

      {/* Modal de confirmação antes de excluir publicação */}
      <AlertDialog
        open={idParaExcluir !== null}
        onOpenChange={(open) => {
          if (!open) setIdParaExcluir(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de Publicação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover esta publicação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (idParaExcluir !== null) {
                  handleDelete(idParaExcluir)
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Sugestão Automática de Estrato Qualis (Etapa D2) */}
      <SugerirQualisDialog
        open={isSugerirQualisOpen}
        onOpenChange={(aberto) => {
          setIsSugerirQualisOpen(aberto)
          if (!aberto) {
            recarregarTudo()
          }
        }}
        onSucesso={() => {
          window.location.reload()
        }}
      />

      {/* Diálogo de Casamento Automático Autor -> Docente (Etapa D1) */}
      <VincularAutoresDocentesDialog
        open={isVincularDocentesOpen}
        onOpenChange={setIsVincularDocentesOpen}
        onSucesso={() => {
          carregarRelacionados()
        }}
        usuarioNome={profile?.name || profile?.email || 'Colegiado'}
      />
    </div>
  )
}
