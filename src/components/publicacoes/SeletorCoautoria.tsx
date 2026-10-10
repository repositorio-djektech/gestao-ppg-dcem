import { useState, useEffect, useMemo } from 'react'
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
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  UserPlus,
  Trash2,
  Sparkles,
  Ban,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PublicacaoCoautorPrograma, Discente, Egresso } from '@/types/database'
import { coautoresProgramaService } from '@/services/coautores-programa'
import {
  sugerirCoautoresPublicacao,
  type AutorCandidatoPrograma,
} from '@/lib/reconducao/matching-coautoria'

interface SeletorCoautoriaProps {
  publicacaoId?: number | string | null
  autoresTexto: string
  fatorImpactoJcr?: number | null
  discentes: Discente[]
  egressos: Egresso[]
  usuarioNome?: string
  canEdit?: boolean
  onCoautoriaAtualizada?: () => void
}

export function SeletorCoautoria({
  publicacaoId,
  autoresTexto,
  fatorImpactoJcr,
  discentes,
  egressos,
  usuarioNome = 'Colegiado',
  canEdit = true,
  onCoautoriaAtualizada,
}: SeletorCoautoriaProps) {
  const [coautoresConfirmados, setCoautoresConfirmados] = useState<PublicacaoCoautorPrograma[]>([])
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [selecionadoManual, setSelecionadoManual] = useState<string>('')

  const numericId = typeof publicacaoId === 'number' ? publicacaoId : Number(publicacaoId)
  const isJcrElegivel =
    fatorImpactoJcr !== null &&
    fatorImpactoJcr !== undefined &&
    !isNaN(Number(fatorImpactoJcr)) &&
    Number(fatorImpactoJcr) >= 1.0

  // Carrega coautores salvos no banco para a publicação
  const carregarConfirmados = async () => {
    if (!numericId || isNaN(numericId)) return
    setLoading(true)
    try {
      const lista = await coautoresProgramaService.listarPorPublicacao(numericId)
      setCoautoresConfirmados(lista)
    } catch (err) {
      console.error('Erro ao carregar coautores confirmados:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarConfirmados()
  }, [numericId])

  // Calcula sugestões automáticas por matching tolerante
  const sugestoes = useMemo<AutorCandidatoPrograma[]>(() => {
    if (!autoresTexto) return []
    return sugerirCoautoresPublicacao({
      autoresTexto,
      discentes,
      egressos,
    })
  }, [autoresTexto, discentes, egressos])

  // Determina estado atual
  const temSemCoautoria = coautoresConfirmados.some((c) => c.tipo === 'sem_coautoria')
  const confirmadosValidos = coautoresConfirmados.filter((c) => c.tipo !== 'sem_coautoria')
  const statusAtual = temSemCoautoria
    ? 'sem_coautoria'
    : confirmadosValidos.length > 0
      ? 'confirmado'
      : 'pendente'

  // Ações de confirmação
  const handleConfirmarCandidato = async (cand: AutorCandidatoPrograma) => {
    if (!numericId || isNaN(numericId)) {
      toast.info('Salve a publicação primeiro para vincular a coautoria.')
      return
    }
    setSalvando(true)
    try {
      await coautoresProgramaService.confirmarCoautor({
        publicacaoId: numericId,
        discenteId: cand.discenteId,
        egressoId: cand.egressoId,
        tipo: cand.tipo,
        nomeCitado: cand.nome,
        grauConfianca: cand.grauConfianca,
        confirmadoPor: usuarioNome,
      })
      toast.success(`Coautoria com ${cand.nome} confirmada com sucesso!`)
      await carregarConfirmados()
      onCoautoriaAtualizada?.()
    } catch {
      toast.error('Erro ao confirmar coautoria.')
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarManual = async () => {
    if (!numericId || isNaN(numericId) || !selecionadoManual) return
    const [tipo, idStr] = selecionadoManual.split(':')
    const id = Number(idStr)
    const pessoa =
      tipo === 'discente' ? discentes.find((d) => d.id === id) : egressos.find((e) => e.id === id)

    if (!pessoa) return

    setSalvando(true)
    try {
      await coautoresProgramaService.confirmarCoautor({
        publicacaoId: numericId,
        discenteId: tipo === 'discente' ? id : null,
        egressoId: tipo === 'egresso' ? id : null,
        tipo: tipo === 'discente' ? 'orientando' : 'egresso',
        nomeCitado: pessoa.nome,
        grauConfianca: 1.0,
        confirmadoPor: usuarioNome,
      })
      toast.success(`Coautoria manual com ${pessoa.nome} confirmada!`)
      setSelecionadoManual('')
      await carregarConfirmados()
      onCoautoriaAtualizada?.()
    } catch {
      toast.error('Erro ao vincular coautoria manual.')
    } finally {
      setSalvando(false)
    }
  }

  const handleMarcarSemCoautoria = async () => {
    if (!numericId || isNaN(numericId)) {
      toast.info('Salve a publicação primeiro para marcar sem coautoria.')
      return
    }
    setSalvando(true)
    try {
      await coautoresProgramaService.marcarSemCoautoria(numericId, usuarioNome)
      toast.success('Publicação marcada como "Sem coautoria do programa".')
      await carregarConfirmados()
      onCoautoriaAtualizada?.()
    } catch {
      toast.error('Erro ao atualizar.')
    } finally {
      setSalvando(false)
    }
  }

  const handleRemoverConfirmacao = async (id: number) => {
    setSalvando(true)
    try {
      await coautoresProgramaService.removerConfirmacao(id)
      toast.success('Vínculo de coautoria removido.')
      await carregarConfirmados()
      onCoautoriaAtualizada?.()
    } catch {
      toast.error('Erro ao remover vínculo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold text-slate-800">
            Coautoria com orientandos/egressos do P²CEM (Norma § 4º)
          </Label>
        </div>
        <div>
          {statusAtual === 'confirmado' && (
            <Badge className="bg-emerald-600 text-white gap-1 hover:bg-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Confirmado ({confirmadosValidos.length})
            </Badge>
          )}
          {statusAtual === 'sem_coautoria' && (
            <Badge variant="outline" className="text-slate-600 bg-slate-200/80 gap-1">
              <Ban className="h-3 w-3 text-slate-500" />
              Sem coautoria do programa
            </Badge>
          )}
          {statusAtual === 'pendente' && (
            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 gap-1">
              <AlertCircle className="h-3 w-3 text-amber-600" />
              Pendente de confirmação
            </Badge>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-600">
        Para compor o <strong>NP (produção de qualidade)</strong> na Recondução, a norma exige JCR ≥
        1,0 e coautoria com discente ou egresso do P²CEM.
        {!isJcrElegivel && (
          <span className="block text-slate-500 mt-0.5">
            (Nota: esta publicação possui JCR &lt; 1,0 ou vazio; confirme caso o JCR seja
            atualizado).
          </span>
        )}
      </p>

      {/* Lista de vínculos confirmados atualmente */}
      {confirmadosValidos.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <Label className="text-xs font-medium text-slate-700">Coautores confirmados:</Label>
          <div className="space-y-1">
            {confirmadosValidos.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between bg-white border border-slate-200 rounded px-2.5 py-1 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{c.nome_citado}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                    {c.tipo === 'egresso' ? 'Egresso' : 'Orientando'}
                  </Badge>
                </div>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoverConfirmacao(c.id)}
                    disabled={salvando}
                    title="Remover coautoria confirmada"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sugestões automáticas por matching */}
      {sugestoes.length > 0 && !temSemCoautoria && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <Label className="text-xs font-semibold text-blue-900">
              Sugestões encontradas no texto de autores:
            </Label>
          </div>
          <div className="space-y-1">
            {sugestoes.map((sug) => {
              const jaConfirmado = confirmadosValidos.some(
                (c) =>
                  (sug.discenteId && c.discente_id === sug.discenteId) ||
                  (sug.egressoId && c.egresso_id === sug.egressoId) ||
                  c.nome_citado.toLowerCase() === sug.nome.toLowerCase(),
              )

              return (
                <div
                  key={`${sug.tipo}-${sug.id}`}
                  className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 rounded px-2.5 py-1.5 text-xs gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{sug.nome}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-blue-300 text-blue-800"
                      >
                        {sug.tipo === 'egresso' ? 'Egresso P²CEM' : 'Orientando'}
                      </Badge>
                      <span className="text-[11px] text-slate-500">
                        ({Math.round(sug.grauConfianca * 100)}% conf.)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate" title={sug.motivoMatch}>
                      {sug.motivoMatch}
                    </p>
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      variant={jaConfirmado ? 'outline' : 'default'}
                      disabled={salvando || jaConfirmado}
                      onClick={() => handleConfirmarCandidato(sug)}
                      className="h-7 text-xs gap-1 shrink-0"
                    >
                      {jaConfirmado ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Confirmado
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Confirmar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Confirmação manual quando não houver sugestão ou para adicionar outros */}
      {canEdit && (
        <div className="pt-2 border-t border-slate-200/80 space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            Adicionar confirmação manual:
          </Label>
          <div className="flex items-center gap-2">
            <Select value={selecionadoManual} onValueChange={setSelecionadoManual}>
              <SelectTrigger className="text-xs bg-white h-8 flex-1">
                <SelectValue placeholder="Selecione um discente ou egresso..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase">
                  Discentes do Programa
                </div>
                {discentes.map((d) => (
                  <SelectItem key={`d-${d.id}`} value={`discente:${d.id}`} className="text-xs">
                    {d.nome} (Discente - {d.status})
                  </SelectItem>
                ))}
                {egressos.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase border-t mt-1 pt-1">
                      Egressos do Programa
                    </div>
                    {egressos.map((e) => (
                      <SelectItem key={`e-${e.id}`} value={`egresso:${e.id}`} className="text-xs">
                        {e.nome} (Egresso)
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleConfirmarManual}
              disabled={salvando || !selecionadoManual}
              className="h-8 text-xs gap-1 bg-white"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {statusAtual !== 'sem_coautoria' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMarcarSemCoautoria}
                disabled={salvando}
                className="text-xs text-slate-600 hover:text-slate-900 h-7 gap-1"
              >
                <Ban className="h-3 w-3 text-slate-500" />
                Marcar como sem coautoria do programa
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (numericId) {
                    await coautoresProgramaService.marcarSemCoautoria(numericId, usuarioNome)
                    // Remove para voltar a pendente
                    const semC = coautoresConfirmados.find((c) => c.tipo === 'sem_coautoria')
                    if (semC) await coautoresProgramaService.removerConfirmacao(semC.id)
                    await carregarConfirmados()
                    onCoautoriaAtualizada?.()
                  }
                }}
                disabled={salvando}
                className="text-xs text-blue-600 hover:text-blue-800 h-7"
              >
                Desmarcar "sem coautoria" (voltar a pendente)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
