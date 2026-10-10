import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  GraduationCap,
  FileText,
  Share2,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Filter,
  Search,
  Wrench,
  Loader2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { obterRelatorioLacunas } from '@/services/lacunas'
import { supabase } from '@/lib/supabase/client'
import { docentesService } from '@/services/docentes'
import { discentesService } from '@/services/discentes'
import { CrudFormDialog } from '@/components/crud/CrudFormDialog'
import type { FieldDef } from '@/components/crud/types'
import {
  VincularOpenAlexDialog,
  type FonteIdentificador,
} from '@/components/docentes/VincularOpenAlexDialog'
import type { OpenAlexAutorCandidato } from '@/lib/openalex/buscar'
import type { ScopusAutorCandidato } from '@/services/scopus'
import type { Docente, Discente } from '@/types/database'
import type {
  RelatorioLacunasResposta,
  ResumoRegraLacuna,
  SeveridadeLacuna,
  ItemLacunaRegistro,
} from '@/lib/lacunas/types'

export type GrupoVisualId = 'pessoas' | 'academico' | 'producao' | 'difusao'

export interface GrupoVisualTheme {
  border: string
  hoverBorder: string
  badge: string
  accentBar: string
  iconColor: string
  bgSoft: string
}

export interface GrupoVisualConfig {
  id: GrupoVisualId
  label: string
  subtitulo: string
  icon: LucideIcon
  theme: GrupoVisualTheme
}

export const GRUPOS_VISUAIS: GrupoVisualConfig[] = [
  {
    id: 'pessoas',
    label: 'Pessoas',
    subtitulo: 'Docentes, Discentes e Egressos',
    icon: Users,
    theme: {
      border: 'border-blue-200',
      hoverBorder: 'hover:border-blue-400',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      accentBar: 'bg-blue-500',
      iconColor: 'text-blue-500',
      bgSoft: 'bg-blue-50/40',
    },
  },
  {
    id: 'academico',
    label: 'Acadêmico',
    subtitulo: 'Bancas, Orientações, Disciplinas e Projetos',
    icon: GraduationCap,
    theme: {
      border: 'border-emerald-200',
      hoverBorder: 'hover:border-emerald-400',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      accentBar: 'bg-emerald-500',
      iconColor: 'text-emerald-500',
      bgSoft: 'bg-emerald-50/40',
    },
  },
  {
    id: 'producao',
    label: 'Produção',
    subtitulo: 'Publicações, Produção Técnica e Patentes',
    icon: FileText,
    theme: {
      border: 'border-amber-200',
      hoverBorder: 'hover:border-amber-400',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      accentBar: 'bg-amber-500',
      iconColor: 'text-amber-500',
      bgSoft: 'bg-amber-50/40',
    },
  },
  {
    id: 'difusao',
    label: 'Difusão/Outros',
    subtitulo: 'Eventos, Mobilidade, Impacto Social e Prêmios',
    icon: Share2,
    theme: {
      border: 'border-purple-200',
      hoverBorder: 'hover:border-purple-400',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      accentBar: 'bg-purple-500',
      iconColor: 'text-purple-500',
      bgSoft: 'bg-purple-50/40',
    },
  },
]

/**
 * Mapeia o nome do grupo da regra (ou tabela) para um dos 4 grupos visuais do Dashboard.
 */
export function mapearGrupoParaVisual(grupoOuTabela: string): GrupoVisualId {
  const norm = grupoOuTabela.toLowerCase()

  // Pessoas (Docentes e Discentes)
  if (
    norm.includes('pessoa') ||
    norm.includes('docente') ||
    norm.includes('discente') ||
    norm.includes('egresso') ||
    norm.includes('identificadores e métricas') ||
    norm.includes('fomento e bolsas') ||
    norm.includes('identificação cadastral') ||
    norm.includes('situação acadêmica')
  ) {
    return 'pessoas'
  }

  // Acadêmico
  if (
    norm.includes('acadêm') ||
    norm.includes('academ') ||
    norm.includes('banca') ||
    norm.includes('orienta') ||
    norm.includes('disciplina') ||
    norm.includes('projeto')
  ) {
    return 'academico'
  }

  // Produção
  if (
    norm.includes('produç') ||
    norm.includes('produc') ||
    norm.includes('publica') ||
    norm.includes('patente')
  ) {
    return 'producao'
  }

  // Difusão / Outros
  if (
    norm.includes('difus') ||
    norm.includes('evento') ||
    norm.includes('mobili') ||
    norm.includes('impacto') ||
    norm.includes('prem')
  ) {
    return 'difusao'
  }

  return 'pessoas'
}

export interface GrupoEstatisticas {
  grupoConfig: GrupoVisualConfig
  regras: ResumoRegraLacuna[]
  totalCriticas: number
  totalAtencao: number
  totalLacunas: number
}

export interface ItemLacunaIndividual {
  idRegistro: number
  nome: string
  motivo: string
  regraId: string
  regraDescricao: string
  grupoVisualId: GrupoVisualId
  grupoVisualLabel: string
  severidade: SeveridadeLacuna
  tabela: string
}

export type FiltroGrupo = 'todos' | GrupoVisualId
export type FiltroSeveridade = 'todas' | SeveridadeLacuna

interface LacunasProps {
  /** Injeção de loader para testes unitários */
  carregarDadosFn?: () => ReturnType<typeof obterRelatorioLacunas>
  filtroGrupoInicial?: FiltroGrupo
  filtroSeveridadeInicial?: FiltroSeveridade
  filtroRegraInicial?: string
}

const camposDiscente: FieldDef[] = [
  {
    key: 'nome',
    label: 'Nome Completo',
    type: 'text',
    required: true,
    placeholder: 'Nome completo do aluno',
  },
  {
    key: 'cpf',
    label: 'CPF',
    type: 'text',
    placeholder: '000.000.000-00',
    helperText: 'Apenas números ou formatado',
  },
  {
    key: 'data_ingresso',
    label: 'Data de Ingresso',
    type: 'date',
    required: true,
    helperText: 'Data de matrícula inicial no programa',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'ativo', label: 'Ativo' },
      { value: 'titulado', label: 'Titulado' },
      { value: 'desligado', label: 'Desligado' },
    ],
  },
  {
    key: 'link_lattes',
    label: 'Currículo Lattes',
    type: 'url',
    placeholder: 'http://lattes.cnpq.br/...',
  },
  {
    key: 'link_comprovacao',
    label: 'Link de Comprovação',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'Ficha de matrícula ou documento comprobatório',
  },
  { key: 'observacoes', label: 'Observações', type: 'textarea', rows: 2 },
]

export default function Lacunas({
  carregarDadosFn,
  filtroGrupoInicial = 'todos',
  filtroSeveridadeInicial = 'todas',
  filtroRegraInicial = 'todas',
}: LacunasProps = {}) {
  const [relatorio, setRelatorio] = useState<RelatorioLacunasResposta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [origem, setOrigem] = useState<'edge_function' | 'local_fallback' | null>(null)

  // Filtros da lista detalhada (Etapa 3)
  const [filtroGrupo, setFiltroGrupo] = useState<FiltroGrupo>(filtroGrupoInicial)
  const [filtroSeveridade, setFiltroSeveridade] =
    useState<FiltroSeveridade>(filtroSeveridadeInicial)
  const [filtroRegra, setFiltroRegra] = useState<string>(filtroRegraInicial)
  const [termoBusca, setTermoBusca] = useState<string>('')

  // Estados de Correção (Tarefa B)
  const [carregandoCorrecaoId, setCarregandoCorrecaoId] = useState<number | null>(null)

  // Diálogo de Vinculação (Scopus / OpenAlex) para Docentes
  const [dialogoVinculoAberto, setDialogoVinculoAberto] = useState(false)
  const [docenteParaVinculo, setDocenteParaVinculo] = useState<Docente | null>(null)
  const [abaInicialVinculo, setAbaInicialVinculo] = useState<FonteIdentificador>('openalex')

  // Diálogo de Edição Cadastral de Docente (ID Lattes, Bolsa CNPq, etc.)
  const [dialogoDocenteAberto, setDialogoDocenteAberto] = useState(false)
  const [docenteEditando, setDocenteEditando] = useState<Docente | null>(null)
  const [formDocente, setFormDocente] = useState<Omit<Docente, 'id'>>({
    nome: '',
    scopus_id: '',
    id_lattes: '',
    indice_h: 0,
    bolsa_cnpq: '',
    jdp: false,
    licenca: '',
  })
  const [salvandoDocente, setSalvandoDocente] = useState(false)
  const [campoFocoDocente, setCampoFocoDocente] = useState<string | null>(null)

  // Diálogo CrudFormDialog para Discentes
  const [dialogoDiscenteAberto, setDialogoDiscenteAberto] = useState(false)
  const [discenteEditandoId, setDiscenteEditandoId] = useState<number | null>(null)
  const [formDiscente, setFormDiscente] = useState<Record<string, any>>({})
  const [salvandoDiscente, setSalvandoDiscente] = useState(false)
  const [campoFocoDiscente, setCampoFocoDiscente] = useState<string | undefined>(undefined)

  const carregarRelatorio = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const loader = carregarDadosFn ?? obterRelatorioLacunas
      const res = await loader()
      if (res.sucesso && res.dados) {
        setRelatorio(res.dados)
        setOrigem(res.origem ?? null)
      } else {
        setErro(res.mensagemErro || 'Não foi possível carregar o relatório de lacunas.')
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado ao consultar lacunas.')
    } finally {
      setCarregando(false)
    }
  }, [carregarDadosFn])

  useEffect(() => {
    carregarRelatorio()
  }, [carregarRelatorio])

  // Ação de correção rápida da linha
  const handleCorrigirLacuna = async (item: ItemLacunaIndividual) => {
    setCarregandoCorrecaoId(item.idRegistro)
    try {
      if (item.tabela === 'docentes') {
        const { data: doc, error } = await supabase
          .from('docentes')
          .select('*')
          .eq('id', item.idRegistro)
          .single()

        if (error || !doc) {
          toast.error('Não foi possível carregar os dados do docente para correção.')
          return
        }

        const docenteData = doc as Docente

        // Se a lacuna for de Scopus ID ou OpenAlex / índice-h:
        if (item.regraId === 'docente_sem_scopus_id') {
          setDocenteParaVinculo(docenteData)
          setAbaInicialVinculo('scopus')
          setDialogoVinculoAberto(true)
        } else if (
          item.regraId === 'docente_sem_openalex_id' ||
          item.regraId === 'docente_indice_h_ausente_ou_zero'
        ) {
          setDocenteParaVinculo(docenteData)
          setAbaInicialVinculo('openalex')
          setDialogoVinculoAberto(true)
        } else {
          // Demais regras cadastrais de docente: ID Lattes, Bolsa CNPq, etc.
          setDocenteEditando(docenteData)
          setFormDocente({
            nome: docenteData.nome || '',
            scopus_id: docenteData.scopus_id || '',
            id_lattes: docenteData.id_lattes || '',
            indice_h: docenteData.indice_h ?? 0,
            bolsa_cnpq: docenteData.bolsa_cnpq || '',
            jdp: !!docenteData.jdp,
            licenca: docenteData.licenca || '',
          })
          const campoFoco =
            item.regraId === 'docente_sem_id_lattes'
              ? 'idLattes'
              : item.regraId === 'docente_sem_bolsa_cnpq'
                ? 'bolsaCnpq'
                : 'nome'
          setCampoFocoDocente(campoFoco)
          setDialogoDocenteAberto(true)
          setTimeout(() => {
            const el = document.getElementById(campoFoco)
            if (el) el.focus()
          }, 150)
        }
      } else {
        // Discentes: carregar dados do discente e abrir CrudFormDialog
        const { data: disc, error } = await supabase
          .from('discentes')
          .select('*')
          .eq('id', item.idRegistro)
          .single()

        if (error || !disc) {
          toast.error('Não foi possível carregar os dados do discente para correção.')
          return
        }

        const discenteData = disc as Discente
        setDiscenteEditandoId(discenteData.id)
        setFormDiscente({
          nome: discenteData.nome || '',
          cpf: discenteData.cpf || '',
          data_ingresso: discenteData.data_ingresso || '',
          status: discenteData.status || 'ativo',
          link_lattes: discenteData.link_lattes || '',
          link_comprovacao: discenteData.link_comprovacao || '',
          observacoes: discenteData.observacoes || '',
        })

        let focoCampo = 'nome'
        if (item.regraId === 'discente_sem_cpf') focoCampo = 'cpf'
        else if (item.regraId === 'discente_sem_data_ingresso') focoCampo = 'data_ingresso'
        else if (item.regraId === 'discente_sem_status') focoCampo = 'status'
        else if (item.regraId === 'discente_sem_link_lattes') focoCampo = 'link_lattes'

        setCampoFocoDiscente(focoCampo)
        setDialogoDiscenteAberto(true)
      }
    } catch (err: any) {
      toast.error(`Falha ao preparar correção: ${err?.message || 'Erro inesperado'}`)
    } finally {
      setCarregandoCorrecaoId(null)
    }
  }

  // Handlers de vinculação Scopus e OpenAlex em Lacunas
  const handleVincularOpenAlex = async (
    docenteId: number | string,
    candidato: OpenAlexAutorCandidato,
  ) => {
    try {
      await docentesService.update(docenteId, {
        openalex_id: candidato.openalex_id,
        indice_h: candidato.h_index,
      })
      toast.success(
        `Docente vinculado com sucesso ao OpenAlex (${candidato.openalex_id}, h-index ${candidato.h_index})`,
      )
      await carregarRelatorio()
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
      await docentesService.update(docenteId, {
        scopus_id: candidato.scopus_id,
      })
      toast.success(`Docente vinculado com sucesso ao Scopus (Scopus ID: ${candidato.scopus_id})`)
      await carregarRelatorio()
    } catch (err: any) {
      toast.error(`Erro ao vincular perfil Scopus: ${err?.message || 'Falha na gravação'}`)
      throw err
    }
  }

  // Handler de salvamento do formulário de Docente
  const handleSalvarDocente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docenteEditando) return
    setSalvandoDocente(true)
    try {
      await docentesService.update(docenteEditando.id, formDocente)
      toast.success('Docente atualizado com sucesso!')
      setDialogoDocenteAberto(false)
      await carregarRelatorio()
    } catch (err: any) {
      toast.error(`Erro ao salvar docente: ${err?.message || 'Falha na gravação'}`)
    } finally {
      setSalvandoDocente(false)
    }
  }

  // Handler de salvamento do formulário de Discente
  const handleSalvarDiscente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!discenteEditandoId) return
    setSalvandoDiscente(true)
    try {
      await discentesService.update(discenteEditandoId, formDiscente)
      toast.success('Discente atualizado com sucesso!')
      setDialogoDiscenteAberto(false)
      await carregarRelatorio()
    } catch (err: any) {
      toast.error(`Erro ao salvar discente: ${err?.message || 'Falha na gravação'}`)
    } finally {
      setSalvandoDiscente(false)
    }
  }

  const { dadosPorGrupo, totalGeralCriticas, totalGeralAtencao, totalGeralLacunas } =
    useMemo(() => {
      const mapa = new Map<GrupoVisualId, ResumoRegraLacuna[]>()
      for (const g of GRUPOS_VISUAIS) {
        mapa.set(g.id, [])
      }

      if (relatorio?.resumo) {
        for (const item of relatorio.resumo) {
          const visualId = mapearGrupoParaVisual(item.grupo || item.tabela)
          const lista = mapa.get(visualId) || []
          lista.push(item)
          mapa.set(visualId, lista)
        }
      }

      let criticasTotal = 0
      let atencaoTotal = 0
      let lacunasTotal = 0

      const grupos: GrupoEstatisticas[] = GRUPOS_VISUAIS.map((grupoConfig) => {
        const regras = mapa.get(grupoConfig.id) || []
        let criticas = 0
        let atencao = 0
        let total = 0

        for (const r of regras) {
          const qtd = r.total_lacunas ?? 0
          total += qtd
          if (r.severidade === 'critica') {
            criticas += qtd
          } else {
            atencao += qtd
          }
        }

        criticasTotal += criticas
        atencaoTotal += atencao
        lacunasTotal += total

        return {
          grupoConfig,
          regras,
          totalCriticas: criticas,
          totalAtencao: atencao,
          totalLacunas: total,
        }
      })

      return {
        dadosPorGrupo: grupos,
        totalGeralCriticas: criticasTotal,
        totalGeralAtencao: atencaoTotal,
        totalGeralLacunas: lacunasTotal,
      }
    }, [relatorio])

  const dataFormatada = useMemo(() => {
    if (!relatorio?.gerado_em) return null
    try {
      const d = new Date(relatorio.gerado_em)
      if (isNaN(d.getTime())) return relatorio.gerado_em
      return d.toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
      })
    } catch {
      return relatorio.gerado_em
    }
  }, [relatorio?.gerado_em])

  // Desdobra todas as lacunas individuais com metadados para a lista detalhada
  const todasLacunasIndividuais = useMemo<ItemLacunaIndividual[]>(() => {
    if (!relatorio?.lacunas || !Array.isArray(relatorio.lacunas)) {
      return []
    }

    // Mapa de metadados das regras pelo resumo
    const mapaResumo = new Map<string, ResumoRegraLacuna>()
    if (relatorio.resumo) {
      for (const r of relatorio.resumo) {
        mapaResumo.set(r.regra_id, r)
      }
    }

    const lista: ItemLacunaIndividual[] = []
    for (const det of relatorio.lacunas) {
      const resumoRegra = mapaResumo.get(det.regra_id)
      const regraDescricao = resumoRegra?.descricao || det.regra_id
      const grupoOrig = det.grupo || resumoRegra?.grupo || ''
      const grupoVisualId = mapearGrupoParaVisual(grupoOrig)
      const configVisual = GRUPOS_VISUAIS.find((g) => g.id === grupoVisualId)
      const grupoVisualLabel = configVisual?.label || 'Pessoas'
      const tabela =
        resumoRegra?.tabela || (det.regra_id.startsWith('docente') ? 'docentes' : 'discentes')

      if (Array.isArray(det.registros)) {
        for (const reg of det.registros) {
          lista.push({
            idRegistro: reg.id,
            nome: reg.nome || `ID ${reg.id}`,
            motivo: reg.motivo || regraDescricao,
            regraId: det.regra_id,
            regraDescricao,
            grupoVisualId,
            grupoVisualLabel,
            severidade: det.severidade,
            tabela,
          })
        }
      }
    }

    return lista
  }, [relatorio])

  // Lista de regras disponíveis para filtro dinâmico
  const regrasDisponiveis = useMemo(() => {
    const mapa = new Map<string, { id: string; descricao: string; grupoVisualId: GrupoVisualId }>()
    for (const item of todasLacunasIndividuais) {
      if (!mapa.has(item.regraId)) {
        mapa.set(item.regraId, {
          id: item.regraId,
          descricao: item.regraDescricao,
          grupoVisualId: item.grupoVisualId,
        })
      }
    }
    return Array.from(mapa.values())
  }, [todasLacunasIndividuais])

  // Aplicação dos filtros sobre as lacunas individuais
  const lacunasFiltradas = useMemo(() => {
    return todasLacunasIndividuais.filter((item) => {
      // Filtro de Grupo
      if (filtroGrupo !== 'todos' && item.grupoVisualId !== filtroGrupo) {
        return false
      }

      // Filtro de Severidade
      if (filtroSeveridade !== 'todas' && item.severidade !== filtroSeveridade) {
        return false
      }

      // Filtro por Regra específica (se selecionada)
      if (filtroRegra !== 'todas' && item.regraId !== filtroRegra) {
        return false
      }

      // Busca textual livre por nome ou motivo
      if (termoBusca.trim()) {
        const buscaNorm = termoBusca.toLowerCase().trim()
        const nomeNorm = item.nome.toLowerCase()
        const motivoNorm = item.motivo.toLowerCase()
        const regraNorm = item.regraDescricao.toLowerCase()
        if (
          !nomeNorm.includes(buscaNorm) &&
          !motivoNorm.includes(buscaNorm) &&
          !regraNorm.includes(buscaNorm)
        ) {
          return false
        }
      }

      return true
    })
  }, [todasLacunasIndividuais, filtroGrupo, filtroSeveridade, filtroRegra, termoBusca])

  return (
    <div className="space-y-6 animate-fade-in" data-testid="pagina-lacunas">
      {/* Topo da página: título, descrição e ações */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Relatório de Lacunas
            </h1>
          </div>
          <p className="text-slate-500 mt-1 max-w-3xl text-sm leading-relaxed">
            Diagnóstico de campos e identificadores faltantes no cadastro do PPG-DCEM (Quadriênio
            2025-2028). Acompanhe pendências críticas e pontos de atenção para manter a base de
            dados completa e pronta para avaliação da CAPES.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dataFormatada && (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-md"
              title="Momento da última consolidação dos dados"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Atualizado em: {dataFormatada}
              {origem === 'local_fallback' && (
                <span className="text-[10px] text-amber-700 font-medium ml-1">(banco direto)</span>
              )}
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={carregarRelatorio}
            disabled={carregando}
            className="inline-flex items-center gap-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800"
          >
            <RefreshCw className={`h-4 w-4 text-primary ${carregando ? 'animate-spin' : ''}`} />
            {carregando ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* Alerta de erro com botão Tentar novamente */}
      {erro && (
        <Alert variant="destructive" className="border-red-300 bg-red-50 text-red-900">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div>
              <AlertTitle className="font-semibold text-red-800">
                Falha ao carregar o relatório de lacunas
              </AlertTitle>
              <AlertDescription className="text-xs text-red-700 mt-0.5">{erro}</AlertDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={carregarRelatorio}
              className="border-red-300 bg-white hover:bg-red-100 text-red-800 shrink-0 self-start sm:self-auto"
            >
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {/* Cards de métricas gerais no topo */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Geral de Lacunas */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Total de Lacunas</CardTitle>
            <Layers className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">{totalGeralLacunas}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Campos com preenchimento ausente ou pendente
            </p>
          </CardContent>
        </Card>

        {/* Lacunas Críticas */}
        <Card className="border border-red-200 shadow-sm bg-red-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Lacunas Críticas</CardTitle>
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-9 w-20 bg-red-100" />
            ) : (
              <div className="text-3xl font-bold text-red-600">{totalGeralCriticas}</div>
            )}
            <p className="text-xs text-red-700 mt-1">
              Exigem preenchimento prioritário (ex.: Scopus ID, Lattes, CPF)
            </p>
          </CardContent>
        </Card>

        {/* Lacunas de Atenção */}
        <Card className="border border-amber-200 shadow-sm bg-amber-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">Pontos de Atenção</CardTitle>
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
          </CardHeader>
          <CardContent>
            {carregando ? (
              <Skeleton className="h-9 w-20 bg-amber-100" />
            ) : (
              <div className="text-3xl font-bold text-amber-600">{totalGeralAtencao}</div>
            )}
            <p className="text-xs text-amber-700 mt-1">
              Dados recomendados para enriquecimento e métricas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards-resumo por grupo de informação (os 4 grupos do Dashboard) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Resumo por Grupo de Informação</h2>
          <span className="text-xs text-slate-500">
            {GRUPOS_VISUAIS.length} grupos mapeados · 4 áreas temáticas
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {dadosPorGrupo.map((grupo) => {
            const { grupoConfig, regras, totalCriticas, totalAtencao, totalLacunas } = grupo
            const { theme } = grupoConfig
            const Icon = grupoConfig.icon
            const semLacunas = totalLacunas === 0

            return (
              <Card
                key={grupoConfig.id}
                data-testid={`card-grupo-${grupoConfig.id}`}
                className={`border ${theme.border} ${theme.hoverBorder} shadow-sm hover:shadow-md transition-all duration-200 bg-white flex flex-col justify-between`}
              >
                <div>
                  {/* Cabeçalho do Card */}
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-lg ${theme.bgSoft} border ${theme.border} shrink-0`}
                        >
                          <Icon className={`h-5 w-5 ${theme.iconColor}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold text-slate-900">
                              {grupoConfig.label}
                            </CardTitle>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{grupoConfig.subtitulo}</p>
                        </div>
                      </div>

                      {/* Badges de severidade no topo do card */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {carregando ? (
                          <Skeleton className="h-5 w-16" />
                        ) : semLacunas ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />0 pendências
                          </Badge>
                        ) : (
                          <>
                            {totalCriticas > 0 && (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 border-red-200 text-xs font-semibold flex items-center gap-1"
                                title={`${totalCriticas} lacunas críticas`}
                              >
                                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                                {totalCriticas} crítica{totalCriticas > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {totalAtencao > 0 && (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold flex items-center gap-1"
                                title={`${totalAtencao} lacunas de atenção`}
                              >
                                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                                {totalAtencao} atenção
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Conteúdo com a lista de regras do grupo */}
                  <CardContent className="pt-4 space-y-3">
                    {carregando ? (
                      <div className="space-y-2.5">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : regras.length === 0 ? (
                      /* Estado para grupos que ainda não possuem regras cadastradas no backend */
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
                        <p className="text-sm font-medium text-slate-700">Nenhuma lacuna</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Sem pendências cadastradas para este módulo no quadriênio atual.
                        </p>
                      </div>
                    ) : semLacunas ? (
                      /* Estado positivo quando o grupo tem regras, mas nenhuma lacuna pendente */
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-center">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
                        <p className="text-sm font-semibold text-emerald-800">
                          Nenhuma lacuna identificada
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Todos os registros avaliados cumprem os requisitos ({regras.length}{' '}
                          {regras.length === 1 ? 'regra' : 'regras'} validadas).
                        </p>
                      </div>
                    ) : (
                      /* Lista de regras do grupo com suas contagens individuais */
                      <div className="space-y-2">
                        {regras.map((regra) => {
                          const temPendencia = (regra.total_lacunas ?? 0) > 0
                          const isCritica = regra.severidade === 'critica'

                          return (
                            <div
                              key={regra.regra_id}
                              data-testid={`item-regra-${regra.regra_id}`}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                                temPendencia
                                  ? isCritica
                                    ? 'border-red-100 bg-red-50/40 text-slate-800'
                                    : 'border-amber-100 bg-amber-50/40 text-slate-800'
                                  : 'border-slate-100 bg-slate-50/30 text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span
                                  className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                    temPendencia
                                      ? isCritica
                                        ? 'bg-red-500'
                                        : 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  title={
                                    temPendencia ? (isCritica ? 'Crítica' : 'Atenção') : 'Concluído'
                                  }
                                />
                                <span className="font-medium truncate text-slate-800">
                                  {regra.descricao}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {regra.total_registros > 0 && (
                                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                                    de {regra.total_registros}
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded font-semibold text-xs ${
                                    temPendencia
                                      ? isCritica
                                        ? 'bg-red-100 text-red-800 border border-red-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {regra.total_lacunas}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Rodapé com barra de acentuação visual com a cor do Dashboard */}
                <div
                  className={`h-1.5 w-full rounded-b-[calc(var(--radius)-1px)] ${theme.accentBar}`}
                />
              </Card>
            )
          })}
        </div>
      </div>

      {/* TAREFA A — Etapa 3: Lista detalhada individual com filtros */}
      <div className="space-y-4 pt-4 border-t border-slate-200" data-testid="secao-lista-detalhada">
        {/* Cabeçalho da seção */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-slate-700" />
              <h2 className="text-lg font-semibold text-slate-900">Lista Detalhada de Lacunas</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Identificação nominal de cada docente ou discente com campos pendentes de
              preenchimento.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md self-start sm:self-auto font-medium">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span data-testid="contagem-lacunas-encontradas">
              {carregando
                ? 'Carregando lacunas...'
                : `${lacunasFiltradas.length} ${
                    lacunasFiltradas.length === 1 ? 'lacuna encontrada' : 'lacunas encontradas'
                  }`}
            </span>
          </div>
        </div>

        {/* Barra de Filtros */}
        <Card className="border border-slate-200 shadow-xs bg-slate-50/70 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Filtro por Grupo */}
            <div className="space-y-1.5">
              <label
                htmlFor="filtro-grupo"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <span>Grupo</span>
              </label>
              <select
                id="filtro-grupo"
                data-testid="filtro-grupo"
                value={filtroGrupo}
                onChange={(e) => setFiltroGrupo(e.target.value as FiltroGrupo)}
                className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-800 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="todos">Todos os Grupos</option>
                {GRUPOS_VISUAIS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Severidade */}
            <div className="space-y-1.5">
              <label
                htmlFor="filtro-severidade"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <span>Severidade</span>
              </label>
              <select
                id="filtro-severidade"
                data-testid="filtro-severidade"
                value={filtroSeveridade}
                onChange={(e) => setFiltroSeveridade(e.target.value as FiltroSeveridade)}
                className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-800 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="todas">Todas as Severidades</option>
                <option value="critica">🔴 Críticas</option>
                <option value="atencao">🟡 Atenção</option>
              </select>
            </div>

            {/* Filtro por Regra Específica */}
            <div className="space-y-1.5">
              <label
                htmlFor="filtro-regra"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <span>Regra / Pendência</span>
              </label>
              <select
                id="filtro-regra"
                data-testid="filtro-regra"
                value={filtroRegra}
                onChange={(e) => setFiltroRegra(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-800 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-primary truncate"
              >
                <option value="todas">Todas as Regras</option>
                {regrasDisponiveis.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.descricao}
                  </option>
                ))}
              </select>
            </div>

            {/* Busca textual por Nome / Motivo */}
            <div className="space-y-1.5">
              <label
                htmlFor="filtro-busca"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <span>Buscar por Nome</span>
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  id="filtro-busca"
                  data-testid="filtro-busca"
                  type="text"
                  placeholder="Nome do docente/discente..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="w-full text-xs h-9 pl-8 pr-2.5 rounded-md border border-slate-300 bg-white text-slate-800 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Botão limpar filtros se houver filtro ativo */}
          {(filtroGrupo !== 'todos' ||
            filtroSeveridade !== 'todas' ||
            filtroRegra !== 'todas' ||
            termoBusca.trim() !== '') && (
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Filtros personalizados aplicados</span>
              <button
                type="button"
                onClick={() => {
                  setFiltroGrupo('todos')
                  setFiltroSeveridade('todas')
                  setFiltroRegra('todas')
                  setTermoBusca('')
                }}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}
        </Card>

        {/* Tabela / Lista Detalhada */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
          {carregando ? (
            <div className="p-4 space-y-3" data-testid="skeletons-lista-lacunas">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : lacunasFiltradas.length === 0 ? (
            /* Estado quando nenhum resultado corresponde aos filtros */
            <div className="py-12 px-4 text-center" data-testid="mensagem-sem-resultados">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">
                Nenhuma lacuna corresponde aos filtros selecionados
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Tente alterar ou limpar os filtros de Grupo, Severidade ou Regra para visualizar
                outras pendências do programa.
              </p>
              {(filtroGrupo !== 'todos' ||
                filtroSeveridade !== 'todas' ||
                filtroRegra !== 'todas' ||
                termoBusca.trim() !== '') && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroGrupo('todos')
                    setFiltroSeveridade('todas')
                    setFiltroRegra('todas')
                    setTermoBusca('')
                  }}
                  className="mt-3 text-xs border-slate-300"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th scope="col" className="py-3 px-4 min-w-[200px]">
                      Quem
                    </th>
                    <th scope="col" className="py-3 px-4 min-w-[240px]">
                      O que falta
                    </th>
                    <th scope="col" className="py-3 px-4 w-[140px]">
                      Grupo
                    </th>
                    <th scope="col" className="py-3 px-4 w-[130px] text-left">
                      Severidade
                    </th>
                    <th scope="col" className="py-3 px-4 w-[120px] text-right">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lacunasFiltradas.map((item, idx) => {
                    const configGrupo = GRUPOS_VISUAIS.find((g) => g.id === item.grupoVisualId)
                    const badgeClass =
                      configGrupo?.theme.badge || 'bg-slate-100 text-slate-800 border-slate-200'
                    const isCritica = item.severidade === 'critica'

                    return (
                      <tr
                        key={`${item.regraId}-${item.idRegistro}-${idx}`}
                        className="hover:bg-slate-50/70 transition-colors"
                        data-testid={`linha-lacuna-${item.regraId}-${item.idRegistro}`}
                      >
                        {/* Coluna Quem */}
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isCritica ? 'bg-red-500' : 'bg-amber-500'
                              }`}
                            />
                            <span
                              className="truncate max-w-[260px] sm:max-w-none"
                              title={item.nome}
                            >
                              {item.nome}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({item.tabela === 'docentes' ? 'Docente' : 'Discente'} #
                              {item.idRegistro})
                            </span>
                          </div>
                        </td>

                        {/* Coluna O que falta */}
                        <td className="py-3 px-4 text-slate-700">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">
                              {item.regraDescricao}
                            </span>
                            {item.motivo && item.motivo !== item.regraDescricao && (
                              <span className="text-[11px] text-slate-500 mt-0.5">
                                {item.motivo}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Coluna Grupo */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${badgeClass}`}
                          >
                            {item.grupoVisualLabel}
                          </span>
                        </td>

                        {/* Coluna Severidade */}
                        <td className="py-3 px-4 text-left">
                          {isCritica ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Crítica
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Atenção
                            </span>
                          )}
                        </td>

                        {/* Coluna Ação: Corrigir */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={carregandoCorrecaoId === item.idRegistro}
                            onClick={() => handleCorrigirLacuna(item)}
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            title={`Corrigir pendência de ${item.nome}`}
                            aria-label={`Corrigir pendência de ${item.nome}`}
                            data-testid={`btn-corrigir-${item.regraId}-${item.idRegistro}`}
                          >
                            {carregandoCorrecaoId === item.idRegistro ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                              <Wrench className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de Vinculação Scopus / OpenAlex (Docentes) */}
      <VincularOpenAlexDialog
        open={dialogoVinculoAberto}
        onOpenChange={setDialogoVinculoAberto}
        docente={docenteParaVinculo}
        abaInicial={abaInicialVinculo}
        onVincular={handleVincularOpenAlex}
        onVincularScopus={handleVincularScopus}
        onSucesso={carregarRelatorio}
      />

      {/* Diálogo de Edição de Docente (ID Lattes, Bolsa CNPq, etc.) */}
      <Dialog open={dialogoDocenteAberto} onOpenChange={setDialogoDocenteAberto}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Corrigir Cadastro do Docente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarDocente} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="nomeDocente">
                Nome Completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nomeDocente"
                placeholder="Ex: Prof. Dr. Carlos Alberto..."
                value={formDocente.nome}
                onChange={(e) => setFormDocente({ ...formDocente, nome: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idLattes">ID Lattes (CNPq - 16 dígitos)</Label>
              <Input
                id="idLattes"
                placeholder="Ex: 3104369029830651"
                value={formDocente.id_lattes ?? ''}
                maxLength={16}
                onChange={(e) => setFormDocente({ ...formDocente, id_lattes: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scopusId">Scopus Author ID</Label>
                <Input
                  id="scopusId"
                  placeholder="Ex: 57201234567"
                  value={formDocente.scopus_id ?? ''}
                  onChange={(e) => setFormDocente({ ...formDocente, scopus_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="indiceH">Índice-H</Label>
                <Input
                  id="indiceH"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formDocente.indice_h ?? 0}
                  onChange={(e) =>
                    setFormDocente({ ...formDocente, indice_h: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bolsaCnpq">Bolsa de Produtividade CNPq</Label>
              <Select
                value={formDocente.bolsa_cnpq || '__none__'}
                onValueChange={(v) =>
                  setFormDocente({ ...formDocente, bolsa_cnpq: v === '__none__' ? '' : v })
                }
              >
                <SelectTrigger id="bolsaCnpq">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhuma Bolsa —</SelectItem>
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
            <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              <div className="space-y-0.5">
                <Label htmlFor="jdp" className="cursor-pointer">
                  Indicado como JDP?
                </Label>
                <p className="text-xs text-slate-500">
                  Jovem Doutor Pesquisador (até 5 anos pós-doc)
                </p>
              </div>
              <Switch
                id="jdp"
                checked={formDocente.jdp}
                onCheckedChange={(c) => setFormDocente({ ...formDocente, jdp: c })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenca">Licença Saúde / Parental</Label>
              <Input
                id="licenca"
                placeholder="Ex: Licença Maternidade (6 meses em 2024)"
                value={formDocente.licenca ?? ''}
                onChange={(e) => setFormDocente({ ...formDocente, licenca: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogoDocenteAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoDocente}>
                {salvandoDocente ? 'Salvando...' : 'Salvar Correção'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Edição de Discente (CPF, Ingresso, Status, Lattes, etc.) */}
      <CrudFormDialog
        open={dialogoDiscenteAberto}
        onOpenChange={setDialogoDiscenteAberto}
        editingId={discenteEditandoId !== null ? String(discenteEditandoId) : null}
        fields={camposDiscente}
        formData={formDiscente}
        setFormData={setFormDiscente}
        fieldOptions={{}}
        onSubmit={handleSalvarDiscente}
        submitting={salvandoDiscente}
        entityName="Discente"
        campoFocoInicial={campoFocoDiscente}
      />
    </div>
  )
}
