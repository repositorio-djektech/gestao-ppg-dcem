import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  User,
  FileText,
  Users2,
  ClipboardList,
  FlaskConical,
  Award,
  Wrench,
  Lightbulb,
  Calendar,
  Plane,
  HeartHandshake,
  Loader2,
  Database,
  ExternalLink,
  ChevronDown,
  Printer,
  Pencil,
  Check,
  X,
  Eye,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DocenteNome } from './DocenteNome'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import type {
  Docente,
  Publicacao,
  Orientacao,
  ProjetoPesquisa,
  Premicao as Premiacao,
  ProducaoTecnica,
  Patente,
  Evento,
  Mobilidade,
  ImpactoSocial,
} from '@/types/database'

import type { TabKey, DadosDocenteCompleto } from './DocentePrintDocument'

export type { TabKey, DadosDocenteCompleto }

export interface VisualizarDocenteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  docente: Docente | null
  abaInicial?: TabKey
  onAbrirImpressao?: (docente: Docente, dados: DadosDocenteCompleto) => void
}

const ITENS_POR_PAGINA = 10

function textoSeguro(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (Array.isArray(val)) {
    const limpo = val.filter((x) => x !== null && x !== undefined && String(x).trim() !== '')
    return limpo.length > 0 ? limpo.join(', ') : '—'
  }
  const str = String(val).trim()
  return str.length > 0 ? str : '—'
}

// Extrai tokens relevantes do nome do docente (ex: ["ledjane", "silva", "barreto"])
function extrairTermosNome(nome: string): string[] {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (p) =>
        p.length > 2 && !['dr', 'dra', 'prof', 'profa', 'dos', 'das', 'da', 'de', 'do'].includes(p),
    )
}

function docenteCorresponde(texto: string | null | undefined, termos: string[]): boolean {
  if (!texto) return false
  const norm = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (termos.length === 0) return false
  // Se contiver o primeiro ou o último sobrenome
  return termos.some((termo) => norm.includes(termo))
}

export function VisualizarDocenteDialog({
  open,
  onOpenChange,
  docente,
  abaInicial = 'geral',
  onAbrirImpressao,
}: VisualizarDocenteDialogProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<TabKey>(abaInicial)
  const [editandoIdentificacao, setEditandoIdentificacao] = useState(false)
  const [salvandoIdentificacao, setSalvandoIdentificacao] = useState(false)
  const [formIdentificacao, setFormIdentificacao] = useState({
    nome: '',
    id_lattes: '',
    scopus_id: '',
    openalex_id: '',
    orc_id: '',
    indice_h: 0,
    bolsa_cnpq: '',
    categoria: '' as string,
    email: '',
    cpf: '',
    siape: '',
    licenca: '',
    status: true,
    jdp: false,
    jdp_desde: null as number | null,
    ano_doutorado: null as number | null,
  })
  const [dados, setDados] = useState<DadosDocenteCompleto>({
    docente: null,
    publicacoes: [],
    orientacoes: [],
    projetos: [],
    premiacoes: [],
    producaoTecnica: [],
    patentes: [],
    eventos: [],
    mobilidade: [],
    impactoSocial: [],
  })

  const handleDispararImpressao = () => {
    const doc = dados.docente || docente
    if (!doc) return
    if (onAbrirImpressao) {
      onAbrirImpressao(doc, dados)
    }
  }

  const [limitesPaginacao, setLimitesPaginacao] = useState<Record<TabKey, number>>({
    geral: ITENS_POR_PAGINA,
    publicacoes: ITENS_POR_PAGINA,
    orientacoes: ITENS_POR_PAGINA,
    projetos: ITENS_POR_PAGINA,
    premiacoes: ITENS_POR_PAGINA,
    producao_tecnica: ITENS_POR_PAGINA,
    patentes: ITENS_POR_PAGINA,
    eventos: ITENS_POR_PAGINA,
    mobilidade: ITENS_POR_PAGINA,
    impacto_social: ITENS_POR_PAGINA,
  })

  useEffect(() => {
    if (!open || !docente) return

    setAbaAtiva(abaInicial || 'geral')
    setEditandoIdentificacao(false)
    setSalvandoIdentificacao(false)
    setLimitesPaginacao({
      geral: ITENS_POR_PAGINA,
      publicacoes: ITENS_POR_PAGINA,
      orientacoes: ITENS_POR_PAGINA,
      projetos: ITENS_POR_PAGINA,
      premiacoes: ITENS_POR_PAGINA,
      producao_tecnica: ITENS_POR_PAGINA,
      patentes: ITENS_POR_PAGINA,
      eventos: ITENS_POR_PAGINA,
      mobilidade: ITENS_POR_PAGINA,
      impacto_social: ITENS_POR_PAGINA,
    })

    let ativo = true
    setLoading(true)

    async function carregarTodosDados() {
      if (!docente) return
      try {
        const termosNome = extrairTermosNome(docente.nome)

        // 1. Docente atualizado do banco
        const docentePromise = supabase
          .from('docentes')
          .select('*')
          .eq('id', docente.id)
          .maybeSingle()

        // 2. Orientações vinculadas diretamente ao docente_id com discente
        const orientacoesPromise = supabase
          .from('orientacoes')
          .select('*, discentes(id, nome)')
          .eq('docente_id', docente.id)
          .order('inicio', { ascending: false })

        // 3. Projetos de pesquisa coordenados pelo docente
        const projetosPromise = supabase
          .from('projetos_pesquisa')
          .select('*')
          .eq('coordenador_id', docente.id)
          .order('inicio', { ascending: false })

        // 4. Tabelas com texto (publicacoes, eventos, premiacoes, producao_tecnica, patentes, mobilidade, impacto_social)
        const publicacoesPromise = supabase
          .from('publicacoes')
          .select('*')
          .order('ano', { ascending: false })

        const premiacoesPromise = supabase
          .from('premiacoes')
          .select('*')
          .order('ano', { ascending: false })

        const producaoTecnicaPromise = supabase
          .from('producao_tecnica')
          .select('*')
          .order('ano', { ascending: false })

        const patentesPromise = supabase
          .from('patentes')
          .select('*')
          .order('created_at', { ascending: false })

        const eventosPromise = supabase
          .from('eventos')
          .select('*')
          .order('created_at', { ascending: false })

        const mobilidadePromise = supabase
          .from('mobilidade_docente')
          .select('*')
          .order('created_at', { ascending: false })

        const impactoSocialPromise = supabase
          .from('impacto_social')
          .select('*')
          .order('ano', { ascending: false })

        const [
          resDocente,
          resOrientacoes,
          resProjetos,
          resPublicacoes,
          resPremiacoes,
          resProducaoTecnica,
          resPatentes,
          resEventos,
          resMobilidade,
          resImpactoSocial,
        ] = await Promise.all([
          docentePromise,
          orientacoesPromise,
          projetosPromise,
          publicacoesPromise,
          premiacoesPromise,
          producaoTecnicaPromise,
          patentesPromise,
          eventosPromise,
          mobilidadePromise,
          impactoSocialPromise,
        ])

        if (!ativo) return

        // Mapeia orientações com nome do discente
        const orientacoesFormatadas = ((resOrientacoes.data as any[]) || []).map((ori) => ({
          ...ori,
          discente_nome: ori.discentes?.nome || '—',
        }))

        // Filtra publicações pelo autor
        const publicacoesFiltradas = ((resPublicacoes.data as Publicacao[]) || []).filter((pub) =>
          docenteCorresponde(pub.autores, termosNome),
        )

        // Filtra premiações pelo nome do premiado
        const premiacoesFiltradas = ((resPremiacoes.data as Premiacao[]) || []).filter((prem) =>
          docenteCorresponde(prem.nome_premiado, termosNome),
        )

        // Filtra produção técnica pelos autores
        const producaoTecnicaFiltrada = (
          (resProducaoTecnica.data as ProducaoTecnica[]) || []
        ).filter((pt) => docenteCorresponde(pt.autores, termosNome))

        // Filtra patentes pelos autores
        const patentesFiltradas = ((resPatentes.data as Patente[]) || []).filter((pat) =>
          docenteCorresponde(pat.autores, termosNome),
        )

        // Filtra eventos pelo docente
        const eventosFiltrados = ((resEventos.data as Evento[]) || []).filter((eve) =>
          docenteCorresponde(eve.docente, termosNome),
        )

        // Filtra mobilidade pelo nome
        const mobilidadeFiltrada = ((resMobilidade.data as Mobilidade[]) || []).filter((mob) =>
          docenteCorresponde(mob.nome, termosNome),
        )

        // Impacto social: projetos com impacto ou menção ao docente
        const impactoSocialFiltrado = ((resImpactoSocial.data as ImpactoSocial[]) || []).filter(
          (imp) =>
            docenteCorresponde(imp.descricao, termosNome) ||
            docenteCorresponde(imp.titulo, termosNome),
        )

        const docFinal = (resDocente.data as Docente) || docente
        setDados({
          docente: docFinal,
          publicacoes: publicacoesFiltradas,
          orientacoes: orientacoesFormatadas,
          projetos: (resProjetos.data as ProjetoPesquisa[]) || [],
          premiacoes: premiacoesFiltradas,
          producaoTecnica: producaoTecnicaFiltrada,
          patentes: patentesFiltradas,
          eventos: eventosFiltrados,
          mobilidade: mobilidadeFiltrada,
          impactoSocial: impactoSocialFiltrado,
        })
        setFormIdentificacao({
          nome: docFinal.nome || '',
          id_lattes: docFinal.id_lattes || '',
          scopus_id: docFinal.scopus_id || '',
          openalex_id: docFinal.openalex_id || '',
          orc_id: docFinal.orc_id || '',
          indice_h: docFinal.indice_h ?? 0,
          bolsa_cnpq: docFinal.bolsa_cnpq || '',
          categoria: docFinal.categoria || '',
          email: docFinal.email || '',
          cpf: docFinal.cpf || '',
          siape: docFinal.siape || '',
          licenca: docFinal.licenca || '',
          status: docFinal.status !== false,
          jdp: Boolean(docFinal.jdp),
          jdp_desde: docFinal.jdp_desde ?? null,
          ano_doutorado: docFinal.ano_doutorado ?? null,
        })
      } catch (err) {
        console.error('Erro ao carregar dados completos do docente:', err)
      } finally {
        if (ativo) setLoading(false)
      }
    }

    carregarTodosDados()

    return () => {
      ativo = false
    }
  }, [open, docente])

  const abasDefinicao: Array<{
    id: TabKey
    rotulo: string
    icone: React.ComponentType<{ className?: string }>
    total: number
  }> = useMemo(
    () => [
      { id: 'geral', rotulo: 'Dados Cadastrais', icone: User, total: 1 },
      {
        id: 'publicacoes',
        rotulo: 'Publicações',
        icone: FileText,
        total: dados.publicacoes.length,
      },
      { id: 'orientacoes', rotulo: 'Orientações', icone: Users2, total: dados.orientacoes.length },
      { id: 'projetos', rotulo: 'Projetos', icone: FlaskConical, total: dados.projetos.length },
      { id: 'premiacoes', rotulo: 'Premiações', icone: Award, total: dados.premiacoes.length },
      {
        id: 'producao_tecnica',
        rotulo: 'Produção Técnica',
        icone: Wrench,
        total: dados.producaoTecnica.length,
      },
      { id: 'patentes', rotulo: 'Patentes', icone: Lightbulb, total: dados.patentes.length },
      { id: 'eventos', rotulo: 'Eventos', icone: Calendar, total: dados.eventos.length },
      { id: 'mobilidade', rotulo: 'Mobilidade', icone: Plane, total: dados.mobilidade.length },
      {
        id: 'impacto_social',
        rotulo: 'Impacto Social',
        icone: HeartHandshake,
        total: dados.impactoSocial.length,
      },
    ],
    [dados],
  )

  const totalGeralRegistros = useMemo(
    () =>
      dados.publicacoes.length +
      dados.orientacoes.length +
      dados.projetos.length +
      dados.premiacoes.length +
      dados.producaoTecnica.length +
      dados.patentes.length +
      dados.eventos.length +
      dados.mobilidade.length +
      dados.impactoSocial.length,
    [dados],
  )

  const carregarMais = (tab: TabKey) => {
    setLimitesPaginacao((prev) => ({
      ...prev,
      [tab]: prev[tab] + ITENS_POR_PAGINA,
    }))
  }

  const iniciarEdicaoIdentificacao = () => {
    const doc = dados.docente || docente
    if (!doc) return
    setFormIdentificacao({
      nome: doc.nome || '',
      id_lattes: doc.id_lattes || '',
      scopus_id: doc.scopus_id || '',
      openalex_id: doc.openalex_id || '',
      orc_id: doc.orc_id || '',
      indice_h: doc.indice_h ?? 0,
      bolsa_cnpq: doc.bolsa_cnpq || '',
      categoria: doc.categoria || '',
      email: doc.email || '',
      cpf: doc.cpf || '',
      siape: doc.siape || '',
      licenca: doc.licenca || '',
      status: doc.status !== false,
      jdp: Boolean(doc.jdp),
      jdp_desde: doc.jdp_desde ?? null,
      ano_doutorado: doc.ano_doutorado ?? null,
    })
    setEditandoIdentificacao(true)
  }

  const cancelarEdicaoIdentificacao = () => {
    const doc = dados.docente || docente
    if (doc) {
      setFormIdentificacao({
        nome: doc.nome || '',
        id_lattes: doc.id_lattes || '',
        scopus_id: doc.scopus_id || '',
        openalex_id: doc.openalex_id || '',
        orc_id: doc.orc_id || '',
        indice_h: doc.indice_h ?? 0,
        bolsa_cnpq: doc.bolsa_cnpq || '',
        categoria: doc.categoria || '',
        email: doc.email || '',
        cpf: doc.cpf || '',
        siape: doc.siape || '',
        licenca: doc.licenca || '',
        status: doc.status !== false,
        jdp: Boolean(doc.jdp),
        jdp_desde: doc.jdp_desde ?? null,
        ano_doutorado: doc.ano_doutorado ?? null,
      })
    }
    setEditandoIdentificacao(false)
  }

  const salvarEdicaoIdentificacao = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const doc = dados.docente || docente
    if (!doc) return

    if (formIdentificacao.jdp) {
      if (formIdentificacao.categoria !== 'permanente') {
        alert('Apenas docentes da categoria Permanente podem ser marcados como JDP.')
        return
      }
      if (!formIdentificacao.ano_doutorado || !formIdentificacao.jdp_desde) {
        alert('Para docente JDP, informe obrigatoriamente o Ano do Doutorado e JDP Desde.')
        return
      }
    }

    setSalvandoIdentificacao(true)
    try {
      const categoriaValida = (
        ['permanente', 'colaborador', 'visitante', 'jdp'].includes(formIdentificacao.categoria)
          ? formIdentificacao.categoria
          : null
      ) as Docente['categoria']

      const payload: Partial<Docente> = {
        nome: formIdentificacao.nome.trim(),
        id_lattes: formIdentificacao.id_lattes.trim() || null,
        scopus_id: formIdentificacao.scopus_id.trim() || '',
        openalex_id: formIdentificacao.openalex_id.trim() || null,
        orc_id: formIdentificacao.orc_id.trim() || null,
        indice_h: Number(formIdentificacao.indice_h) || 0,
        bolsa_cnpq: formIdentificacao.bolsa_cnpq.trim() || '',
        categoria: categoriaValida,
        email: formIdentificacao.email.trim() || '',
        cpf: formIdentificacao.cpf.replace(/\D/g, '').slice(0, 11) || '',
        siape: formIdentificacao.siape.replace(/\D/g, '') || '',
        licenca: formIdentificacao.licenca.trim() || '',
        status: formIdentificacao.status !== false,
        jdp: Boolean(formIdentificacao.jdp),
        jdp_desde: formIdentificacao.jdp ? Number(formIdentificacao.jdp_desde) || null : null,
        ano_doutorado: formIdentificacao.jdp
          ? Number(formIdentificacao.ano_doutorado) || null
          : null,
      }

      const { data, error } = await (supabase.from('docentes') as any)
        .update(payload)
        .eq('id', doc.id)
        .select()
        .single()

      if (error) throw error

      const docAtualizado: Docente = (data as Docente) || { ...doc, ...payload }
      setDados((prev) => ({
        ...prev,
        docente: docAtualizado,
      }))
      setEditandoIdentificacao(false)
    } catch (err) {
      console.error('Erro ao salvar identificação do docente:', err)
      alert('Erro ao salvar dados no banco de dados. Tente novamente.')
    } finally {
      setSalvandoIdentificacao(false)
    }
  }

  const formatarRotuloCategoria = (cat: string | null | undefined): string => {
    if (!cat) return 'Sem categoria'
    const mapa: Record<string, string> = {
      permanente: 'Permanente',
      colaborador: 'Colaborador',
      visitante: 'Visitante',
      jdp: 'JDP',
    }
    return mapa[cat.toLowerCase()] || cat
  }

  const renderAbaGeral = () => {
    const doc = dados.docente || docente
    if (!doc) return null

    return (
      <div className="space-y-4 p-4 overflow-y-auto max-h-full">
        <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-lg p-4 border border-slate-200 dark:border-neutral-700">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Identificação e Índices Bibliométricos
            </h3>
            {!editandoIdentificacao ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={iniciarEdicaoIdentificacao}
                className="h-7 px-2.5 text-xs gap-1.5 bg-white hover:bg-slate-50 text-primary border-primary/30 hover:border-primary"
              >
                <Pencil className="h-3.5 w-3.5 text-primary" />
                <span>Editar Identificação</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelarEdicaoIdentificacao}
                  disabled={salvandoIdentificacao}
                  className="h-7 px-2 text-xs gap-1 bg-white hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancelar</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => salvarEdicaoIdentificacao()}
                  disabled={salvandoIdentificacao}
                  className="h-7 px-2.5 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {salvandoIdentificacao ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>{salvandoIdentificacao ? 'Salvando...' : 'Salvar'}</span>
                </Button>
              </div>
            )}
          </div>

          {editandoIdentificacao ? (
            <form onSubmit={salvarEdicaoIdentificacao} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="inline-nome" className="text-xs font-medium">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="inline-nome"
                    value={formIdentificacao.nome}
                    onChange={(e) =>
                      setFormIdentificacao({ ...formIdentificacao, nome: e.target.value })
                    }
                    required
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inline-lattes" className="text-xs font-medium">
                    ID Lattes (CNPq)
                  </Label>
                  <Input
                    id="inline-lattes"
                    placeholder="16 dígitos"
                    maxLength={16}
                    value={formIdentificacao.id_lattes}
                    onChange={(e) =>
                      setFormIdentificacao({ ...formIdentificacao, id_lattes: e.target.value })
                    }
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inline-scopus" className="text-xs font-medium">
                    Scopus Author ID
                  </Label>
                  <Input
                    id="inline-scopus"
                    placeholder="Ex: 57201234567"
                    value={formIdentificacao.scopus_id}
                    onChange={(e) =>
                      setFormIdentificacao({ ...formIdentificacao, scopus_id: e.target.value })
                    }
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inline-openalex" className="text-xs font-medium">
                    OpenAlex ID
                  </Label>
                  <Input
                    id="inline-openalex"
                    placeholder="Ex: A5023849123"
                    value={formIdentificacao.openalex_id}
                    onChange={(e) =>
                      setFormIdentificacao({ ...formIdentificacao, openalex_id: e.target.value })
                    }
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inline-orcid" className="text-xs font-medium">
                    ORCID (orc_id)
                  </Label>
                  <Input
                    id="inline-orcid"
                    placeholder="0000-0002-1825-0097"
                    value={formIdentificacao.orc_id}
                    onChange={(e) =>
                      setFormIdentificacao({ ...formIdentificacao, orc_id: e.target.value })
                    }
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inline-indiceh" className="text-xs font-medium">
                    Índice-H
                  </Label>
                  <Input
                    id="inline-indiceh"
                    type="number"
                    min="0"
                    value={formIdentificacao.indice_h}
                    onChange={(e) =>
                      setFormIdentificacao({
                        ...formIdentificacao,
                        indice_h: Number(e.target.value),
                      })
                    }
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inline-bolsa" className="text-xs font-medium">
                    Bolsa Produtividade CNPq
                  </Label>
                  <Select
                    value={formIdentificacao.bolsa_cnpq || '__none__'}
                    onValueChange={(v) =>
                      setFormIdentificacao({
                        ...formIdentificacao,
                        bolsa_cnpq: v === '__none__' ? '' : v,
                      })
                    }
                  >
                    <SelectTrigger id="inline-bolsa" className="h-8 text-xs bg-white">
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

                <div className="space-y-1">
                  <Label htmlFor="inline-categoria" className="text-xs font-medium">
                    Categoria no PPG-DCEM
                  </Label>
                  <Select
                    value={formIdentificacao.categoria || '__none__'}
                    onValueChange={(v) =>
                      setFormIdentificacao({
                        ...formIdentificacao,
                        categoria: v === '__none__' ? '' : v,
                      })
                    }
                  >
                    <SelectTrigger id="inline-categoria" className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem categoria</SelectItem>
                      <SelectItem value="permanente">Permanente</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                      <SelectItem value="visitante">Visitante</SelectItem>
                      <SelectItem value="jdp">JDP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inline-email" className="text-xs font-medium">
                    E-mail
                  </Label>
                  <Input
                    id="inline-email"
                    type="email"
                    placeholder="docente@ufs.br"
                    value={formIdentificacao.email}
                    onChange={(e) =>
                      setFormIdentificacao({ ...formIdentificacao, email: e.target.value })
                    }
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inline-cpf" className="text-xs font-medium">
                    CPF
                  </Label>
                  <Input
                    id="inline-cpf"
                    placeholder="000.000.000-00"
                    value={formIdentificacao.cpf}
                    onChange={(e) =>
                      setFormIdentificacao({
                        ...formIdentificacao,
                        cpf: e.target.value.replace(/\D/g, '').slice(0, 11),
                      })
                    }
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inline-siape" className="text-xs font-medium">
                    SIAPE
                  </Label>
                  <Input
                    id="inline-siape"
                    placeholder="Ex: 1234567"
                    value={formIdentificacao.siape}
                    onChange={(e) =>
                      setFormIdentificacao({
                        ...formIdentificacao,
                        siape: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>

                <div className="space-y-1 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="inline-licenca" className="text-xs font-medium">
                    Licença Saúde / Parental
                  </Label>
                  <Input
                    id="inline-licenca"
                    placeholder="Ex: Licença Maternidade (6 meses em 2024)"
                    value={formIdentificacao.licenca}
                    onChange={(e) =>
                      setFormIdentificacao({ ...formIdentificacao, licenca: e.target.value })
                    }
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="p-3 rounded-md border border-slate-200 bg-slate-50 md:col-span-2 lg:col-span-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="inline-jdp" className="text-xs font-semibold cursor-pointer">
                        Jovem Doutor Pesquisador (JDP)
                      </Label>
                      <p className="text-[11px] text-slate-500">
                        Exclusivo Permanente (máx 20% do DP, prazo máx 4 anos, doutorado há menos de
                        10 anos).
                      </p>
                    </div>
                    <Switch
                      id="inline-jdp"
                      checked={Boolean(formIdentificacao.jdp)}
                      onCheckedChange={(checked) => {
                        if (checked && formIdentificacao.categoria !== 'permanente') {
                          alert(
                            'Apenas docentes da categoria Permanente podem ser marcados como JDP.',
                          )
                          return
                        }
                        setFormIdentificacao({ ...formIdentificacao, jdp: checked })
                      }}
                    />
                  </div>

                  {formIdentificacao.jdp && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <Label
                          htmlFor="inline-ano-doutorado"
                          className="text-[11px] font-medium text-slate-700"
                        >
                          Ano do Doutorado *
                        </Label>
                        <Input
                          id="inline-ano-doutorado"
                          type="number"
                          placeholder="Ex: 2021"
                          value={formIdentificacao.ano_doutorado ?? ''}
                          onChange={(e) =>
                            setFormIdentificacao({
                              ...formIdentificacao,
                              ano_doutorado: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="inline-jdp-desde"
                          className="text-[11px] font-medium text-slate-700"
                        >
                          JDP Desde (Ano) *
                        </Label>
                        <Input
                          id="inline-jdp-desde"
                          type="number"
                          placeholder="Ex: 2024"
                          value={formIdentificacao.jdp_desde ?? ''}
                          onChange={(e) =>
                            setFormIdentificacao({
                              ...formIdentificacao,
                              jdp_desde: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-md border border-slate-200 bg-slate-50 md:col-span-2 lg:col-span-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="inline-status" className="text-xs font-medium cursor-pointer">
                      Ativo no programa
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Docentes inativos são destacados com o nome em cor laranja.
                    </p>
                  </div>
                  <Switch
                    id="inline-status"
                    checked={formIdentificacao.status !== false}
                    onCheckedChange={(checked) =>
                      setFormIdentificacao({ ...formIdentificacao, status: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelarEdicaoIdentificacao}
                  disabled={salvandoIdentificacao}
                  className="bg-white hover:bg-slate-50"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={salvandoIdentificacao}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {salvandoIdentificacao ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  Nome Completo:
                </span>
                <span className="text-slate-900 dark:text-neutral-100 font-semibold text-sm">
                  <DocenteNome nome={doc.nome || '—'} status={doc.status} />
                </span>
              </div>
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  Status no Programa:
                </span>
                {doc.status === false ? (
                  <Badge
                    variant="outline"
                    className="bg-orange-50 text-orange-700 border-orange-300 font-medium mt-0.5 w-fit"
                  >
                    Inativo no programa
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium mt-0.5 w-fit"
                  >
                    Ativo no programa
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  ID Lattes (CNPq):
                </span>
                {doc.id_lattes ? (
                  <a
                    href={`http://lattes.cnpq.br/${doc.id_lattes}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    {doc.id_lattes}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  Scopus Author ID:
                </span>
                {doc.scopus_id ? (
                  <a
                    href={`https://www.scopus.com/authid/detail.uri?authorId=${doc.scopus_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    {doc.scopus_id}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  OpenAlex ID:
                </span>
                {doc.openalex_id ? (
                  <a
                    href={`https://openalex.org/${doc.openalex_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-indigo-700 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    {doc.openalex_id}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  ORCID:
                </span>
                {doc.orc_id ? (
                  <a
                    href={
                      doc.orc_id.startsWith('http') ? doc.orc_id : `https://orcid.org/${doc.orc_id}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    {doc.orc_id}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  Índice-H:
                </span>
                <Badge
                  variant="outline"
                  className="font-mono font-bold text-slate-800 dark:text-neutral-200 mt-0.5 w-fit"
                >
                  {doc.indice_h ?? 0}
                </Badge>
              </div>
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  Bolsa Produtividade CNPq:
                </span>
                {doc.bolsa_cnpq ? (
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-medium mt-0.5 w-fit"
                  >
                    {doc.bolsa_cnpq}
                  </Badge>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  Categoria no PPG-DCEM:
                </span>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <Badge
                    variant={doc.categoria ? 'secondary' : 'outline'}
                    className={
                      doc.categoria === 'permanente'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : doc.categoria === 'colaborador'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : doc.categoria === 'visitante'
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : doc.categoria === 'jdp'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'text-slate-500'
                    }
                  >
                    {formatarRotuloCategoria(doc.categoria)}
                  </Badge>
                  {doc.jdp && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold"
                    >
                      JDP ({doc.jdp_desde ? `desde ${doc.jdp_desde}` : 'marcado'})
                    </Badge>
                  )}
                </div>
              </div>{' '}
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  E-mail:
                </span>
                {doc.email ? (
                  <a
                    href={`mailto:${doc.email}`}
                    className="text-primary hover:underline font-medium break-all"
                  >
                    {doc.email}
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">CPF:</span>
                <span className="text-slate-800 dark:text-neutral-200 font-mono">
                  {textoSeguro(doc.cpf)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  SIAPE:
                </span>
                <span className="text-slate-800 dark:text-neutral-200 font-mono">
                  {textoSeguro(doc.siape)}
                </span>
              </div>
              <div className="md:col-span-2 flex flex-col gap-0.5 break-words">
                <span className="text-slate-500 dark:text-neutral-400 font-medium block">
                  Licença Saúde / Parental:
                </span>
                {doc.licenca ? (
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    {doc.licenca}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-lg p-4 border border-slate-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Resumo dos Registros Associados no Banco
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {abasDefinicao
              .filter((a) => a.id !== 'geral')
              .map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setAbaAtiva(item.id)}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-left hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-1">
                    <span className="truncate">{item.rotulo}</span>
                    <item.icone className="h-3.5 w-3.5 text-primary shrink-0" />
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-neutral-100 font-mono">
                    {item.total}
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    )
  }

  const navegarParaItem = (rota: string, id: number | string) => {
    onOpenChange(false)
    navigate(`${rota}?destaque=${encodeURIComponent(String(id))}`)
  }

  const renderBotaoAcaoNavegacao = (rota: string, id: number | string) => (
    <TableCell className="text-right py-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => navegarParaItem(rota, id)}
        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 inline-flex items-center justify-center"
        title="Visualizar registro na página de listagem"
        aria-label="Visualizar registro na listagem"
      >
        <Eye className="h-4 w-4 text-primary" />
      </Button>
    </TableCell>
  )

  const renderAbaPublicacoes = () => {
    const itens = dados.publicacoes
    const limite = limitesPaginacao.publicacoes
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhuma publicação encontrada para este docente.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-[#e9effc] dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow className="bg-[#e9effc] dark:bg-neutral-800 hover:bg-[#e9effc]">
                <TableHead className="w-[10%]">Ano</TableHead>
                <TableHead className="w-[40%]">Título</TableHead>
                <TableHead className="w-[20%]">Periódico</TableHead>
                <TableHead className="w-[20%]">Autores</TableHead>
                <TableHead className="w-[10%] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((pub) => (
                <TableRow key={pub.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {pub.ano || '—'}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    <div>{pub.titulo}</div>
                    {pub.doi && (
                      <a
                        href={pub.doi.startsWith('http') ? pub.doi : `https://doi.org/${pub.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        DOI: {pub.doi}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-neutral-400">
                    {pub.periodico || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {pub.autores || '—'}
                  </TableCell>
                  {renderBotaoAcaoNavegacao('/publicacoes', pub.id)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('publicacoes'))}
      </div>
    )
  }

  const renderAbaOrientacoes = () => {
    const itens = dados.orientacoes
    const limite = limitesPaginacao.orientacoes
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhuma orientação encontrada para este docente.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-[#e9effc] dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow className="bg-[#e9effc] dark:bg-neutral-800 hover:bg-[#e9effc]">
                <TableHead className="w-[15%]">Nível / Tipo</TableHead>
                <TableHead className="w-[28%]">Orientando (Discente)</TableHead>
                <TableHead className="w-[14%]">Período</TableHead>
                <TableHead className="w-[13%]">Status</TableHead>
                <TableHead className="w-[20%]">Detalhes / Observações</TableHead>
                <TableHead className="w-[10%] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((ori) => (
                <TableRow key={ori.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold bg-slate-50 dark:bg-neutral-800"
                    >
                      {ori.tipo || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {ori.discente_nome || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600 dark:text-neutral-400">
                    {ori.inicio || '—'} {ori.fim ? `– ${ori.fim}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] capitalize ${
                        ori.status === 'concluido'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : ori.status === 'ativo'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                      }`}
                    >
                      {ori.status || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {ori.observacoes || '—'}
                  </TableCell>
                  {renderBotaoAcaoNavegacao('/orientacoes', ori.id)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('orientacoes'))}
      </div>
    )
  }

  const renderAbaProjetos = () => {
    const itens = dados.projetos
    const limite = limitesPaginacao.projetos
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhum projeto de pesquisa coordenado encontrado.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-[#e9effc] dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow className="bg-[#e9effc] dark:bg-neutral-800 hover:bg-[#e9effc]">
                <TableHead className="w-[35%]">Título do Projeto</TableHead>
                <TableHead className="w-[15%]">Período</TableHead>
                <TableHead className="w-[15%]">Financiamento</TableHead>
                <TableHead className="w-[15%]">Órgão de Fomento</TableHead>
                <TableHead className="w-[10%]">Descrição</TableHead>
                <TableHead className="w-[10%] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((proj) => (
                <TableRow key={proj.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {proj.titulo}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600 dark:text-neutral-400">
                    {proj.inicio || '—'} {proj.fim ? `– ${proj.fim}` : ''}
                  </TableCell>
                  <TableCell>
                    {proj.financiamento ? (
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-0 text-xs">
                        Sim
                      </Badge>
                    ) : (
                      <span className="text-slate-400 text-xs">Não</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-neutral-400">
                    {proj.orgao_fomento || '—'}
                  </TableCell>
                  <TableCell
                    className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs truncate"
                    title={proj.descricao || ''}
                  >
                    {proj.descricao || '—'}
                  </TableCell>
                  {renderBotaoAcaoNavegacao('/projetos-pesquisa', proj.id)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('projetos'))}
      </div>
    )
  }

  const renderAbaPremiacoes = () => {
    const itens = dados.premiacoes
    const limite = limitesPaginacao.premiacoes
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhuma premiação ou título honorífico registrado.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-[#e9effc] dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow className="bg-[#e9effc] dark:bg-neutral-800 hover:bg-[#e9effc]">
                <TableHead className="w-[12%]">Ano</TableHead>
                <TableHead className="w-[43%]">Título / Premiação</TableHead>
                <TableHead className="w-[35%]">Entidade Promotora</TableHead>
                <TableHead className="w-[10%] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((prem) => (
                <TableRow key={prem.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {prem.ano ?? '—'}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {prem.titulo}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-neutral-400">
                    {prem.instituicao || '—'}
                  </TableCell>
                  {renderBotaoAcaoNavegacao('/premiacoes', prem.id)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('premiacoes'))}
      </div>
    )
  }

  const renderAbaProducaoTecnica = () => {
    const itens = dados.producaoTecnica
    const limite = limitesPaginacao.producao_tecnica
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhuma produção técnica registrada.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-[#e9effc] dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow className="bg-[#e9effc] dark:bg-neutral-800 hover:bg-[#e9effc]">
                <TableHead className="w-[15%]">Tipo</TableHead>
                <TableHead className="w-[10%]">Ano</TableHead>
                <TableHead className="w-[40%]">Título da Produção Técnica</TableHead>
                <TableHead className="w-[25%]">Autores / Equipe</TableHead>
                <TableHead className="w-[10%] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((pt) => (
                <TableRow key={pt.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {pt.tipo || 'Software'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-700 dark:text-neutral-300">
                    {pt.ano ?? '—'}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {pt.titulo}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {pt.autores || '—'}
                  </TableCell>
                  {renderBotaoAcaoNavegacao('/producao-tecnica', pt.id)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('producao_tecnica'))}
      </div>
    )
  }

  const renderAbaPatentes = () => {
    const itens = dados.patentes
    const limite = limitesPaginacao.patentes
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhuma patente registrada.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-[#e9effc] dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow className="bg-[#e9effc] dark:bg-neutral-800 hover:bg-[#e9effc]">
                <TableHead className="w-[35%]">Título da Patente</TableHead>
                <TableHead className="w-[18%]">Registro INPI</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[22%]">Autores / Inventores</TableHead>
                <TableHead className="w-[10%] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((pat) => (
                <TableRow key={pat.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {pat.titulo}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-700 dark:text-neutral-300">
                    {pat.inpi || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        pat.status === 'Concessão'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : pat.status === 'Licenciamento'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {pat.status || 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {pat.autores || '—'}
                  </TableCell>
                  {renderBotaoAcaoNavegacao('/patentes', pat.id)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('patentes'))}
      </div>
    )
  }

  const renderAbaEventos = () => {
    const itens = dados.eventos
    const limite = limitesPaginacao.eventos
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhum evento registrado.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-[#e9effc] dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow className="bg-[#e9effc] dark:bg-neutral-800 hover:bg-[#e9effc]">
                <TableHead className="w-[30%]">Nome do Evento</TableHead>
                <TableHead className="w-[18%]">Papel / Participação</TableHead>
                <TableHead className="w-[18%]">Local e Data</TableHead>
                <TableHead className="w-[24%]">Observações / Detalhes</TableHead>
                <TableHead className="w-[10%] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((eve) => (
                <TableRow key={eve.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {eve.evento}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {eve.papel || 'Participante'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-neutral-400">
                    {eve.local_data || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {eve.observacoes || '—'}
                  </TableCell>
                  {renderBotaoAcaoNavegacao('/eventos', eve.id)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('eventos'))}
      </div>
    )
  }

  const renderAbaMobilidade = () => {
    const itens = dados.mobilidade
    const limite = limitesPaginacao.mobilidade
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhum registro de mobilidade acadêmica encontrado.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-[#e9effc] dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow className="bg-[#e9effc] dark:bg-neutral-800 hover:bg-[#e9effc]">
                <TableHead className="w-[15%]">Modalidade</TableHead>
                <TableHead className="w-[30%]">Instituição de Destino</TableHead>
                <TableHead className="w-[20%]">Período</TableHead>
                <TableHead className="w-[25%]">Observações</TableHead>
                <TableHead className="w-[10%] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((mob) => (
                <TableRow key={mob.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {mob.modalidade || 'Nacional'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {mob.instituicao}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600 dark:text-neutral-400">
                    {mob.periodo || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {mob.observacoes || '—'}
                  </TableCell>
                  {renderBotaoAcaoNavegacao('/mobilidade', mob.id)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('mobilidade'))}
      </div>
    )
  }

  const renderAbaImpactoSocial = () => {
    const itens = dados.impactoSocial
    const limite = limitesPaginacao.impacto_social
    const visiveis = itens.slice(0, limite)

    if (itens.length === 0) {
      return renderEstadoVazio('Nenhum registro de impacto social relacionado.')
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto border rounded-md bg-white dark:bg-neutral-900">
          <Table>
            <TableHeader className="bg-[#e9effc] dark:bg-neutral-800 sticky top-0 z-10 shadow-sm">
              <TableRow className="bg-[#e9effc] dark:bg-neutral-800 hover:bg-[#e9effc]">
                <TableHead className="w-[10%]">Ano</TableHead>
                <TableHead className="w-[40%]">Título da Ação / Projeto</TableHead>
                <TableHead className="w-[40%]">Descrição e Impacto</TableHead>
                <TableHead className="w-[10%] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((imp) => (
                <TableRow key={imp.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {imp.ano ?? '—'}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-neutral-100">
                    {imp.titulo}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                    {imp.descricao || '—'}
                  </TableCell>
                  {renderBotaoAcaoNavegacao('/impacto-social', imp.id)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {renderPaginacao(itens.length, limite, () => carregarMais('impacto_social'))}
      </div>
    )
  }

  const renderEstadoVazio = (mensagem: string) => (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-neutral-400">
      <Database className="h-8 w-8 text-slate-300 dark:text-neutral-600 mb-2" />
      <p className="text-sm font-medium">{mensagem}</p>
      <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 max-w-sm">
        Não constam registros associados para este docente nesta categoria no banco de dados.
      </p>
    </div>
  )

  const renderPaginacao = (total: number, limite: number, onMais: () => void) => {
    if (total <= ITENS_POR_PAGINA) return null
    return (
      <div className="pt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 shrink-0">
        <span>
          Exibindo {Math.min(limite, total)} de {total} registros
        </span>
        {total > limite && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMais}
            className="h-7 text-xs gap-1.5"
          >
            <ChevronDown className="h-3 w-3" />
            Carregar mais 10
          </Button>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl md:w-[95vw] md:h-[92vh] md:max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-neutral-900">
        {/* Cabeçalho */}
        <DialogHeader className="p-4 md:p-5 pb-3 border-b bg-slate-50/80 dark:bg-neutral-900/80 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-xl text-primary font-bold truncate">
                <User className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">
                  {docente ? (
                    <DocenteNome
                      nome={dados.docente?.nome || docente.nome}
                      status={dados.docente?.status ?? docente.status}
                    />
                  ) : (
                    'Visualização do Docente'
                  )}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
                Visualização somente-leitura dos dados curriculares e registros acadêmicos
                integrados no sistema.
              </DialogDescription>
            </div>

            {/* Badges de Resumo */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/25 text-xs px-2.5 py-1 font-mono font-medium"
              >
                <strong>{totalGeralRegistros}</strong> registros totais
              </Badge>
              {docente?.id_lattes && (
                <Badge
                  variant="outline"
                  className="bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-xs px-2 py-0.5 font-mono"
                  title="Currículo Lattes Vinculado"
                >
                  Lattes: {docente.id_lattes}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Corpo principal com Abas — Fundo claro destacado entre cabeçalho e rodapé */}
        <div className="flex-1 overflow-hidden p-5 flex flex-col min-h-0 bg-white dark:bg-neutral-900">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Carregando dados curriculares do docente...</p>
            </div>
          ) : (
            <Tabs
              value={abaAtiva}
              onValueChange={(val) => setAbaAtiva(val as TabKey)}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Barra de Abas em Múltiplas Linhas */}
              <div className="pb-2 shrink-0 border-b">
                <TabsList className="bg-slate-100 dark:bg-neutral-800 p-1.5 h-auto flex flex-wrap w-full justify-start gap-1.5 rounded-lg">
                  {abasDefinicao.map(({ id, rotulo, icone: Icone, total }) => {
                    const ativo = abaAtiva === id
                    return (
                      <TabsTrigger
                        key={id}
                        value={id}
                        className={`text-xs px-2.5 py-1.5 gap-1.5 flex items-center rounded-md transition-colors ${
                          ativo
                            ? 'bg-white dark:bg-neutral-900 text-primary font-semibold shadow-xs ring-1 ring-slate-200 dark:ring-neutral-700'
                            : 'hover:bg-slate-200/60 dark:hover:bg-neutral-700/60 text-slate-700 dark:text-neutral-300'
                        }`}
                      >
                        <Icone className="h-3.5 w-3.5" />
                        <span>{rotulo}</span>
                        {id !== 'geral' && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              total > 0
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'bg-slate-200 dark:bg-neutral-700 text-slate-600 dark:text-neutral-400'
                            }`}
                          >
                            {total}
                          </span>
                        )}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </div>

              {/* Conteúdo das Abas */}
              <TabsContent
                value="geral"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaGeral()}
              </TabsContent>

              <TabsContent
                value="publicacoes"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaPublicacoes()}
              </TabsContent>

              <TabsContent
                value="orientacoes"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaOrientacoes()}
              </TabsContent>

              <TabsContent
                value="projetos"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaProjetos()}
              </TabsContent>

              <TabsContent
                value="premiacoes"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaPremiacoes()}
              </TabsContent>

              <TabsContent
                value="producao_tecnica"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaProducaoTecnica()}
              </TabsContent>

              <TabsContent
                value="patentes"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaPatentes()}
              </TabsContent>

              <TabsContent
                value="eventos"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaEventos()}
              </TabsContent>

              <TabsContent
                value="mobilidade"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaMobilidade()}
              </TabsContent>

              <TabsContent
                value="impacto_social"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaImpactoSocial()}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Rodapé Somente-Leitura */}
        <DialogFooter className="p-3 md:p-4 border-t bg-slate-50/80 dark:bg-neutral-900/80 shrink-0 flex flex-row items-center justify-between gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
            <span>Visualização de registros vinculados no banco de dados.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="bg-white hover:bg-slate-50 h-8 px-3"
            >
              Fechar
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleDispararImpressao}
              className="gap-1.5 h-8 px-3"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
