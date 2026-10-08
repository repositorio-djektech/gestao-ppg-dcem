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
} from 'lucide-react'
import type { Docente } from '@/types/database'
import { buscarAutoresOpenAlex, type OpenAlexAutorCandidato } from '@/lib/openalex/buscar'

export interface VincularOpenAlexDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  docente: Docente | null
  onVincular: (docenteId: number | string, candidato: OpenAlexAutorCandidato) => Promise<void>
}

export function VincularOpenAlexDialog({
  open,
  onOpenChange,
  docente,
  onVincular,
}: VincularOpenAlexDialogProps) {
  const [termo, setTermo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [vinculandoId, setVinculandoId] = useState<string | null>(null)
  const [candidatos, setCandidatos] = useState<OpenAlexAutorCandidato[]>([])
  const [jaBuscou, setJaBuscou] = useState(false)
  const [erroMsg, setErroMsg] = useState<string | null>(null)

  // Ao abrir o diálogo com um docente, inicializa o termo com o nome do docente
  useEffect(() => {
    if (open && docente) {
      setTermo(docente.nome)
      setCandidatos([])
      setJaBuscou(false)
      setErroMsg(null)
      setVinculandoId(null)
      // Dispara a busca inicial automaticamente para conveniência
      executarBusca(docente.nome)
    } else if (!open) {
      setCandidatos([])
      setJaBuscou(false)
      setErroMsg(null)
      setVinculandoId(null)
    }
  }, [open, docente])

  const executarBusca = async (textoBusca: string) => {
    const limpo = textoBusca.trim()
    if (!limpo) {
      setErroMsg('Digite um nome para buscar no OpenAlex.')
      setCandidatos([])
      setJaBuscou(true)
      return
    }

    setBuscando(true)
    setErroMsg(null)

    try {
      const res = await buscarAutoresOpenAlex(limpo, { limite: 10 })
      if (!res.sucesso) {
        setErroMsg(
          res.mensagemErro ||
            'Não foi possível consultar a API OpenAlex no momento. Verifique sua conexão e tente novamente.',
        )
        setCandidatos([])
      } else {
        setCandidatos(res.candidatos)
      }
    } catch (err: any) {
      setErroMsg(
        err?.message ||
          'Ocorreu uma falha inesperada ao buscar autores no OpenAlex. Tente novamente.',
      )
      setCandidatos([])
    } finally {
      setBuscando(false)
      setJaBuscou(true)
    }
  }

  const handleBuscar = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    executarBusca(termo)
  }

  const handleConfirmarVinculo = async (candidato: OpenAlexAutorCandidato) => {
    if (!docente) return
    setVinculandoId(candidato.openalex_id)
    try {
      await onVincular(docente.id, candidato)
      onOpenChange(false)
    } catch {
      // O erro já é tratado com toast pelo chamador
    } finally {
      setVinculandoId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Vincular Perfil OpenAlex
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            Associe o perfil de pesquisa pública ao docente para atualização de métricas e
            publicações.
          </DialogDescription>
        </DialogHeader>

        {docente && (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm flex items-center justify-between mt-2">
            <div>
              <span className="text-xs text-slate-500 block">Docente selecionado</span>
              <span className="font-semibold text-slate-800">{docente.nome}</span>
            </div>
            {docente.openalex_id && (
              <Badge variant="outline" className="text-xs font-mono bg-white">
                Atual: {docente.openalex_id}
              </Badge>
            )}
          </div>
        )}

        <form onSubmit={handleBuscar} className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar por nome ou grafia alternativa..."
              className="pl-9 bg-white"
              disabled={buscando}
            />
          </div>
          <Button type="submit" disabled={buscando} className="gap-2 shrink-0">
            {buscando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Buscar</span>
              </>
            )}
          </Button>
        </form>

        {erroMsg && (
          <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium">Aviso de consulta</p>
              <p className="mt-0.5">{erroMsg}</p>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-[220px] max-h-[360px] mt-3 border rounded-md overflow-hidden bg-white">
          {buscando ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm font-medium">Consultando API OpenAlex...</p>
              <p className="text-xs text-slate-400 mt-1">Isso pode levar alguns segundos.</p>
            </div>
          ) : candidatos.length > 0 ? (
            <ScrollArea className="h-[340px]">
              <div className="divide-y divide-slate-100 p-2 space-y-2">
                {candidatos.map((candidato) => {
                  const estaVinculando = vinculandoId === candidato.openalex_id
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
                          onClick={() => handleConfirmarVinculo(candidato)}
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
          ) : jaBuscou ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Search className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium">Nenhum autor encontrado no OpenAlex</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Tente refinar a busca no campo acima usando outra grafia, retirando títulos (como
                &quot;Dr.&quot; ou &quot;Prof.&quot;) ou buscando apenas sobrenome e iniciais.
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Search className="h-8 w-8 text-slate-200 mb-2" />
              <p className="text-sm">
                Clique em &quot;Buscar&quot; para consultar a base OpenAlex.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
