import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Quote,
  Building2,
  Sparkles,
  Database,
} from 'lucide-react'
import type { Docente } from '@/types/database'
import { buscarAutoresOpenAlex, type OpenAlexAutorCandidato } from '@/lib/openalex/buscar'
import { buscarAutoresScopus, type ScopusAutorCandidato } from '@/services/scopus'

export type FonteIdentificador = 'openalex' | 'scopus'

export interface VincularOpenAlexDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  docente: Docente | null
  abaInicial?: FonteIdentificador
  onVincular: (docenteId: number | string, candidato: OpenAlexAutorCandidato) => Promise<void>
  onVincularScopus?: (docenteId: number | string, candidato: ScopusAutorCandidato) => Promise<void>
  onSucesso?: () => void
}

export function VincularOpenAlexDialog({
  open,
  onOpenChange,
  docente,
  abaInicial = 'openalex',
  onVincular,
  onVincularScopus,
  onSucesso,
}: VincularOpenAlexDialogProps) {
  const [fonteAtiva, setFonteAtiva] = useState<FonteIdentificador>(abaInicial)

  // Estado OpenAlex
  const [termoOpenAlex, setTermoOpenAlex] = useState('')
  const [buscandoOpenAlex, setBuscandoOpenAlex] = useState(false)
  const [vinculandoOpenAlexId, setVinculandoOpenAlexId] = useState<string | null>(null)
  const [candidatosOpenAlex, setCandidatosOpenAlex] = useState<OpenAlexAutorCandidato[]>([])
  const [jaBuscouOpenAlex, setJaBuscouOpenAlex] = useState(false)
  const [erroMsgOpenAlex, setErroMsgOpenAlex] = useState<string | null>(null)

  // Estado Scopus
  const [termoScopus, setTermoScopus] = useState('')
  const [filtroAfiliacaoScopus, setFiltroAfiliacaoScopus] = useState('')
  const [buscandoScopus, setBuscandoScopus] = useState(false)
  const [vinculandoScopusId, setVinculandoScopusId] = useState<string | null>(null)
  const [candidatosScopus, setCandidatosScopus] = useState<ScopusAutorCandidato[]>([])
  const [jaBuscouScopus, setJaBuscouScopus] = useState(false)
  const [erroMsgScopus, setErroMsgScopus] = useState<string | null>(null)
  // Informação não-bloqueante obtida para ID numérico (ex: nome do autor se API retornar)
  const [infoIdNumerico, setInfoIdNumerico] = useState<{
    id: string
    nome?: string
    instituicao?: string | null
    carregandoNome?: boolean
  } | null>(null)

  // Sincroniza ao abrir ou trocar o docente selecionado
  useEffect(() => {
    if (open && docente) {
      setFonteAtiva(abaInicial)
      // OpenAlex
      setTermoOpenAlex(docente.nome)
      setCandidatosOpenAlex([])
      setJaBuscouOpenAlex(false)
      setErroMsgOpenAlex(null)
      setVinculandoOpenAlexId(null)

      // Scopus
      setTermoScopus(docente.nome)
      setFiltroAfiliacaoScopus('')
      setCandidatosScopus([])
      setJaBuscouScopus(false)
      setErroMsgScopus(null)
      setVinculandoScopusId(null)
      setInfoIdNumerico(null)

      // Dispara a busca inicial correspondente à aba aberta
      if (abaInicial === 'scopus') {
        // Se já tiver Scopus ID no cadastro do docente, podemos preencher com o nome dele ou deixar o nome
        executarBuscaScopus(docente.nome, '')
      } else {
        executarBuscaOpenAlex(docente.nome)
      }
    } else if (!open) {
      setCandidatosOpenAlex([])
      setCandidatosScopus([])
      setJaBuscouOpenAlex(false)
      setJaBuscouScopus(false)
      setErroMsgOpenAlex(null)
      setErroMsgScopus(null)
      setVinculandoOpenAlexId(null)
      setVinculandoScopusId(null)
      setInfoIdNumerico(null)
    }
  }, [open, docente, abaInicial])

  // Busca OpenAlex
  const executarBuscaOpenAlex = async (textoBusca: string) => {
    const limpo = textoBusca.trim()
    if (!limpo) {
      setErroMsgOpenAlex('Digite um nome para buscar no OpenAlex.')
      setCandidatosOpenAlex([])
      setJaBuscouOpenAlex(true)
      return
    }

    setBuscandoOpenAlex(true)
    setErroMsgOpenAlex(null)

    try {
      const res = await buscarAutoresOpenAlex(limpo, { limite: 10 })
      if (!res.sucesso) {
        setErroMsgOpenAlex(
          res.mensagemErro ||
            'Não foi possível consultar a API OpenAlex no momento. Verifique sua conexão e tente novamente.',
        )
        setCandidatosOpenAlex([])
      } else {
        setCandidatosOpenAlex(res.candidatos)
      }
    } catch (err: any) {
      setErroMsgOpenAlex(
        err?.message ||
          'Ocorreu uma falha inesperada ao buscar autores no OpenAlex. Tente novamente.',
      )
      setCandidatosOpenAlex([])
    } finally {
      setBuscandoOpenAlex(false)
      setJaBuscouOpenAlex(true)
    }
  }

  // Consulta informativa e opcional do nome do ID Scopus (sem bloquear vínculo)
  const consultarInfoOpcionalScopusId = async (scopusId: string) => {
    setInfoIdNumerico({ id: scopusId, carregandoNome: true })
    try {
      const res = await buscarAutoresScopus(scopusId, { limite: 5 })
      if (res.sucesso && res.candidatos.length > 0) {
        const primeiro = res.candidatos[0]
        setInfoIdNumerico({
          id: scopusId,
          nome: primeiro.nome,
          instituicao: primeiro.instituicao,
          carregandoNome: false,
        })
      } else {
        setInfoIdNumerico({
          id: scopusId,
          carregandoNome: false,
        })
      }
    } catch {
      setInfoIdNumerico({
        id: scopusId,
        carregandoNome: false,
      })
    }
  }

  // Busca Scopus via Edge Function (para nomes de autores)
  const executarBuscaScopus = async (textoBusca: string, afiliacaoFiltro?: string) => {
    const limpo = textoBusca.trim()
    if (!limpo) {
      setErroMsgScopus('Digite um nome ou ID Scopus.')
      setCandidatosScopus([])
      setJaBuscouScopus(true)
      return
    }

    // Se for puramente numérico, não executamos o fluxo de busca de candidatos
    if (/^\d+$/.test(limpo)) {
      setCandidatosScopus([])
      setJaBuscouScopus(true)
      setErroMsgScopus(null)
      consultarInfoOpcionalScopusId(limpo)
      return
    }

    setBuscandoScopus(true)
    setErroMsgScopus(null)
    setInfoIdNumerico(null)

    try {
      const res = await buscarAutoresScopus(limpo, {
        limite: 15,
        filtroAfiliacao: afiliacaoFiltro?.trim() || undefined,
      })
      if (!res.sucesso) {
        setErroMsgScopus(
          res.mensagemErro ||
            'Não foi possível consultar a API Scopus. Verifique a conexão com o backend.',
        )
        setCandidatosScopus([])
      } else {
        setCandidatosScopus(res.candidatos)
      }
    } catch (err: any) {
      setErroMsgScopus(
        err?.message || 'Ocorreu uma falha inesperada ao consultar autores no Scopus.',
      )
      setCandidatosScopus([])
    } finally {
      setBuscandoScopus(false)
      setJaBuscouScopus(true)
    }
  }

  const handleBuscarOpenAlex = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    executarBuscaOpenAlex(termoOpenAlex)
  }

  const handleBuscarScopus = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    executarBuscaScopus(termoScopus, filtroAfiliacaoScopus)
  }

  // Vinculação direta de Scopus ID numérico digitado
  const handleVincularScopusDireto = async (scopusId: string) => {
    if (!docente || !onVincularScopus) return
    const idLimpo = scopusId.trim()
    if (!/^\d+$/.test(idLimpo)) return

    setVinculandoScopusId(idLimpo)
    try {
      const candidatoDireto: ScopusAutorCandidato = {
        scopus_id: idLimpo,
        nome: infoIdNumerico?.nome || docente.nome,
        instituicao: infoIdNumerico?.instituicao || null,
        document_count: 0,
        cited_by_count: 0,
      }
      await onVincularScopus(docente.id, candidatoDireto)
      onOpenChange(false)
      onSucesso?.()
    } catch {
      // O erro já é tratado com toast pelo chamador
    } finally {
      setVinculandoScopusId(null)
    }
  }

  const handleConfirmarVinculoOpenAlex = async (candidato: OpenAlexAutorCandidato) => {
    if (!docente) return
    setVinculandoOpenAlexId(candidato.openalex_id)
    try {
      await onVincular(docente.id, candidato)
      onOpenChange(false)
      onSucesso?.()
    } catch {
      // O erro já é tratado com toast pelo chamador
    } finally {
      setVinculandoOpenAlexId(null)
    }
  }

  const handleConfirmarVinculoScopus = async (candidato: ScopusAutorCandidato) => {
    if (!docente || !onVincularScopus) return
    setVinculandoScopusId(candidato.scopus_id)
    try {
      await onVincularScopus(docente.id, candidato)
      onOpenChange(false)
      onSucesso?.()
    } catch {
      // O erro já é tratado com toast pelo chamador
    } finally {
      setVinculandoScopusId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[660px] max-h-[88vh] flex flex-col p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Vincular Perfil Acadêmico (OpenAlex / Scopus)
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            Associe os identificadores públicos aos docentes para sincronização e enriquecimento de
            métricas. As bases são independentes.
          </DialogDescription>
        </DialogHeader>

        {docente && (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm flex items-center justify-between mt-1">
            <div>
              <span className="text-xs text-slate-500 block">Docente selecionado</span>
              <span className="font-semibold text-slate-800">{docente.nome}</span>
            </div>
            <div className="flex items-center gap-2">
              {docente.openalex_id ? (
                <Badge
                  variant="outline"
                  className="text-xs font-mono bg-white text-indigo-700 border-indigo-200"
                >
                  OpenAlex: {docente.openalex_id}
                </Badge>
              ) : null}
              {docente.scopus_id ? (
                <Badge
                  variant="outline"
                  className="text-xs font-mono bg-white text-emerald-700 border-emerald-200"
                >
                  Scopus: {docente.scopus_id}
                </Badge>
              ) : null}
            </div>
          </div>
        )}

        <Tabs
          value={fonteAtiva}
          onValueChange={(val) => {
            const novaFonte = val as FonteIdentificador
            setFonteAtiva(novaFonte)
            if (docente) {
              if (novaFonte === 'scopus' && !jaBuscouScopus && !buscandoScopus) {
                executarBuscaScopus(termoScopus || docente.nome, filtroAfiliacaoScopus)
              } else if (novaFonte === 'openalex' && !jaBuscouOpenAlex && !buscandoOpenAlex) {
                executarBuscaOpenAlex(termoOpenAlex || docente.nome)
              }
            }
          }}
          className="flex-1 flex flex-col mt-2 min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2 bg-slate-100">
            <TabsTrigger value="openalex" className="gap-2 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>OpenAlex</span>
              {docente?.openalex_id && (
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 ml-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="scopus" className="gap-2 text-xs">
              <Database className="h-3.5 w-3.5 text-emerald-600" />
              <span>Elsevier Scopus</span>
              {docente?.scopus_id && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 ml-1" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* ABA OPENALEX */}
          <TabsContent value="openalex" className="flex-1 flex flex-col mt-2 min-h-0 space-y-2">
            <form onSubmit={handleBuscarOpenAlex} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={termoOpenAlex}
                  onChange={(e) => setTermoOpenAlex(e.target.value)}
                  placeholder="Buscar por nome ou grafia alternativa no OpenAlex..."
                  className="pl-9 bg-white"
                  disabled={buscandoOpenAlex}
                />
              </div>
              <Button type="submit" disabled={buscandoOpenAlex} className="gap-2 shrink-0">
                {buscandoOpenAlex ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Buscar OpenAlex</span>
                  </>
                )}
              </Button>
            </form>

            {erroMsgOpenAlex && (
              <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-medium">Aviso OpenAlex</p>
                  <p className="mt-0.5">{erroMsgOpenAlex}</p>
                </div>
              </div>
            )}

            <div className="flex-1 min-h-[220px] max-h-[340px] border rounded-md overflow-hidden bg-white">
              {buscandoOpenAlex ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm font-medium">Consultando API OpenAlex...</p>
                  <p className="text-xs text-slate-400 mt-1">Isso pode levar alguns segundos.</p>
                </div>
              ) : candidatosOpenAlex.length > 0 ? (
                <ScrollArea className="h-[320px]">
                  <div className="divide-y divide-slate-100 p-2 space-y-2">
                    {candidatosOpenAlex.map((candidato) => {
                      const estaVinculando = vinculandoOpenAlexId === candidato.openalex_id
                      const jaVinculadoAoDocente = docente?.openalex_id === candidato.openalex_id

                      return (
                        <div
                          key={candidato.id}
                          className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900 text-sm">
                                {candidato.display_name}
                              </span>
                              <Badge
                                variant="secondary"
                                className="font-mono text-[11px] bg-slate-100 text-slate-600"
                              >
                                {candidato.openalex_id}
                              </Badge>
                              {jaVinculadoAoDocente && (
                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                                  Vinculado atualmente
                                </Badge>
                              )}
                            </div>

                            {candidato.ultima_instituicao && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate" title={candidato.ultima_instituicao}>
                                  {candidato.ultima_instituicao}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-xs text-slate-500 pt-0.5">
                              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                Índice-H:
                                <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-semibold">
                                  {candidato.h_index}
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <BookOpen className="h-3 w-3 text-slate-400" />
                                {candidato.works_count} obras
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Quote className="h-3 w-3 text-slate-400" />
                                {candidato.cited_by_count} citações
                              </span>
                              {candidato.orcid && (
                                <a
                                  href={candidato.orcid}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                                >
                                  ORCID
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 w-full sm:w-auto flex sm:flex-col items-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleConfirmarVinculoOpenAlex(candidato)}
                              disabled={estaVinculando}
                              className="w-full sm:w-auto gap-1.5 text-xs h-8"
                            >
                              {estaVinculando ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Salvando...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Vincular</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              ) : jaBuscouOpenAlex ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <Search className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-medium">Nenhum autor encontrado no OpenAlex</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Tente refinar a busca no campo acima usando outra grafia ou buscando apenas
                    sobrenome e primeiro nome.
                  </p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Search className="h-8 w-8 text-slate-200 mb-2" />
                  <p className="text-sm">
                    Clique em &quot;Buscar OpenAlex&quot; para consultar a base.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ABA SCOPUS */}
          <TabsContent value="scopus" className="flex-1 flex flex-col mt-2 min-h-0 space-y-2">
            {/* Se o termo digitado for puramente numérico (Scopus ID) */}
            {/^\d+$/.test(termoScopus.trim()) ? (
              <div className="space-y-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleVincularScopusDireto(termoScopus.trim())
                  }}
                  className="space-y-2"
                >
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      <Input
                        value={termoScopus}
                        onChange={(e) => {
                          const val = e.target.value
                          setTermoScopus(val)
                          if (/^\d+$/.test(val.trim())) {
                            consultarInfoOpcionalScopusId(val.trim())
                          } else {
                            setInfoIdNumerico(null)
                          }
                        }}
                        placeholder="Cole aqui o Scopus Author ID (ex: 7005598575)..."
                        className="pl-9 bg-white font-mono"
                        disabled={vinculandoScopusId !== null}
                        autoFocus
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={vinculandoScopusId !== null}
                      className="gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >
                      {vinculandoScopusId !== null ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Vinculando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Vincular Scopus ID</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                {/* Card de Vinculação Direta Imediata */}
                <div className="p-4 rounded-lg border-2 border-emerald-500/30 bg-emerald-50/40 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Vinculação Direta de Scopus ID
                      </span>
                      <p className="text-xs text-slate-600 mt-1">
                        ID numérico detectado. O vínculo é imediato e definido por você conforme
                        coletado no <strong>scopus.com</strong>, sem filtros nem bloqueios.
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="font-mono text-sm px-2.5 py-1 bg-white text-emerald-900 border-emerald-300"
                    >
                      ID: {termoScopus.trim()}
                    </Badge>
                  </div>

                  {/* Informação NÃO-BLOQUEANTE de API (se retornar, apenas ilustrativa) */}
                  {infoIdNumerico?.carregandoNome ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/80 p-2 rounded border border-emerald-100">
                      <Loader2 className="h-3 w-3 animate-spin text-emerald-600 shrink-0" />
                      <span>Consultando dados do ID na API Scopus (não-bloqueante)...</span>
                    </div>
                  ) : infoIdNumerico?.nome ? (
                    <div className="text-xs bg-white/90 p-2.5 rounded border border-emerald-200 text-slate-700 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Dono do ID (API Elsevier):</span>
                        <span className="font-semibold text-emerald-950">
                          {infoIdNumerico.nome}
                        </span>
                      </div>
                      {infoIdNumerico.instituicao && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                          <span>Instituição:</span>
                          <span className="truncate max-w-[280px]">
                            {infoIdNumerico.instituicao}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {docente?.scopus_id && docente.scopus_id !== termoScopus.trim() && (
                    <p className="text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded border border-amber-200">
                      Atenção: este docente já possui o ID <code>{docente.scopus_id}</code>. A
                      confirmação irá <strong>substituir</strong> pelo novo ID{' '}
                      <code>{termoScopus.trim()}</code>.
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500">
                      Docente alvo: <strong>{docente?.nome}</strong>
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleVincularScopusDireto(termoScopus.trim())}
                      disabled={vinculandoScopusId !== null}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 px-4"
                    >
                      {vinculandoScopusId !== null ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Gravando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Confirmar Vinculação</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 flex items-center justify-between">
                  <span>Deseja buscar por nome em vez de ID? Digite o nome do docente acima.</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (docente) {
                        setTermoScopus(docente.nome)
                        executarBuscaScopus(docente.nome, filtroAfiliacaoScopus)
                      }
                    }}
                    className="text-emerald-700 hover:underline font-medium ml-2"
                  >
                    Restaurar nome
                  </button>
                </div>
              </div>
            ) : (
              /* Fluxo tradicional de busca por nome de autor */
              <>
                <form onSubmit={handleBuscarScopus} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        value={termoScopus}
                        onChange={(e) => {
                          const val = e.target.value
                          setTermoScopus(val)
                          if (/^\d+$/.test(val.trim())) {
                            consultarInfoOpcionalScopusId(val.trim())
                          }
                        }}
                        placeholder="Nome completo ou Scopus Author ID numérico (ex: 7005598575)..."
                        className="pl-9 bg-white"
                        disabled={buscandoScopus}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={buscandoScopus}
                      className="gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {buscandoScopus ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          <span>Buscar Scopus</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={filtroAfiliacaoScopus}
                      onChange={(e) => setFiltroAfiliacaoScopus(e.target.value)}
                      placeholder="Filtro opcional de instituição/afiliação (ex: Sergipe, Bahia, USP)..."
                      className="bg-white text-xs h-8"
                      disabled={buscandoScopus}
                    />
                  </div>
                </form>

                <div className="text-[11px] text-slate-500 bg-emerald-50/50 border border-emerald-100 rounded px-2.5 py-1 flex items-center justify-between">
                  <span>Busca oficial via Elsevier Scopus Search API (Entitlement Básico)</span>
                  <span className="text-slate-400 font-mono">Chave segura via backend</span>
                </div>

                {erroMsgScopus && (
                  <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <div className="flex-1">
                      <p className="font-medium">Aviso Scopus</p>
                      <p className="mt-0.5">{erroMsgScopus}</p>
                    </div>
                  </div>
                )}

                <div className="flex-1 min-h-[200px] max-h-[320px] border rounded-md overflow-hidden bg-white">
                  {buscandoScopus ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
                      <p className="text-sm font-medium">
                        Consultando API Elsevier Scopus via backend...
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Conectando aos serviços Elsevier.
                      </p>
                    </div>
                  ) : candidatosScopus.length > 0 ? (
                    <ScrollArea className="h-[300px]">
                      <div className="divide-y divide-slate-100 p-2 space-y-2">
                        {candidatosScopus.map((candidato) => {
                          const estaVinculando = vinculandoScopusId === candidato.scopus_id
                          const jaVinculadoAoDocente = docente?.scopus_id === candidato.scopus_id

                          return (
                            <div
                              key={candidato.scopus_id}
                              className="p-3 rounded-lg border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-900 text-sm">
                                    {candidato.nome}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="font-mono text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200"
                                  >
                                    ID: {candidato.scopus_id}
                                  </Badge>
                                  {jaVinculadoAoDocente && (
                                    <Badge className="bg-emerald-600 text-white border-0 text-[10px]">
                                      Vinculado atualmente
                                    </Badge>
                                  )}
                                </div>

                                {candidato.instituicao && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span
                                      className="truncate"
                                      title={
                                        candidato.afiliacoes?.join(' | ') || candidato.instituicao
                                      }
                                    >
                                      {candidato.instituicao}
                                      {candidato.afiliacoes && candidato.afiliacoes.length > 1 && (
                                        <span className="text-[10px] text-slate-400 ml-1">
                                          (+{candidato.afiliacoes.length - 1} afiliações)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-4 text-xs text-slate-500 pt-0.5">
                                  <span className="inline-flex items-center gap-1">
                                    <BookOpen className="h-3 w-3 text-slate-400" />
                                    {candidato.document_count} documentos
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Quote className="h-3 w-3 text-slate-400" />
                                    {candidato.cited_by_count} citações
                                  </span>
                                  {candidato.orcid && (
                                    <span className="inline-flex items-center gap-1 text-slate-500">
                                      ORCID: {candidato.orcid}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 w-full sm:w-auto flex sm:flex-col items-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirmarVinculoScopus(candidato)}
                                  disabled={estaVinculando}
                                  className="w-full sm:w-auto gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  {estaVinculando ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      <span>Salvando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>Vincular Scopus</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  ) : jaBuscouScopus ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                      <Search className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-sm font-medium">Nenhum autor encontrado no Scopus</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Tente buscar por &quot;Sobrenome, PrimeiroNome&quot; ou cole diretamente o
                        Scopus ID numérico coletado no <strong>scopus.com</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                      <Search className="h-8 w-8 text-slate-200 mb-2" />
                      <p className="text-sm">
                        Clique em &quot;Buscar Scopus&quot; para consultar a base ou cole um Scopus
                        ID numérico.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
