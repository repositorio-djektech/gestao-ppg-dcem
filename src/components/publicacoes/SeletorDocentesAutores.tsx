import { useMemo, useState } from 'react'
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
import { CheckCircle2, UserPlus, Trash2, Sparkles, GraduationCap } from 'lucide-react'
import type { Docente } from '@/types/database'
import { dividirAutoresTexto, calcularSimilaridadeNome } from '@/lib/reconducao/matching-coautoria'

export interface SugestaoDocenteAutor {
  docenteId: number
  nome: string
  grauConfianca: number
  motivoMatch: string
}

interface SeletorDocentesAutoresProps {
  autoresTexto: string
  docentes: Docente[]
  docentesSelecionadosIds: number[]
  onChangeDocentesIds: (ids: number[]) => void
  canEdit?: boolean
}

export function SeletorDocentesAutores({
  autoresTexto,
  docentes,
  docentesSelecionadosIds,
  onChangeDocentesIds,
  canEdit = true,
}: SeletorDocentesAutoresProps) {
  const [selecionadoManual, setSelecionadoManual] = useState<string>('')

  // Calcula sugestões automáticas comparando o texto livre de autores contra a lista de docentes
  const sugestoes = useMemo<SugestaoDocenteAutor[]>(() => {
    if (!autoresTexto || docentes.length === 0) return []
    const segmentos = dividirAutoresTexto(autoresTexto)
    const encontradas: SugestaoDocenteAutor[] = []
    const chaves = new Set<number>()

    for (const autor of segmentos) {
      for (const d of docentes) {
        const sim = calcularSimilaridadeNome(autor, d.nome)
        if (sim.match) {
          if (!chaves.has(d.id)) {
            chaves.add(d.id)
            encontradas.push({
              docenteId: d.id,
              nome: d.nome,
              grauConfianca: sim.score,
              motivoMatch: `${sim.motivo} (Autor no texto: "${autor.trim()}")`,
            })
          }
        }
      }
    }
    return encontradas.sort((a, b) => b.grauConfianca - a.grauConfianca)
  }, [autoresTexto, docentes])

  // Docentes atualmente vinculados
  const docentesVinculados = useMemo(() => {
    return docentes.filter((d) => docentesSelecionadosIds.includes(d.id))
  }, [docentes, docentesSelecionadosIds])

  const handleVincular = (docenteId: number) => {
    if (docentesSelecionadosIds.includes(docenteId)) return
    onChangeDocentesIds([...docentesSelecionadosIds, docenteId])
  }

  const handleDesvincular = (docenteId: number) => {
    onChangeDocentesIds(docentesSelecionadosIds.filter((id) => id !== docenteId))
  }

  const handleAdicionarManual = () => {
    if (!selecionadoManual) return
    const id = Number(selecionadoManual)
    if (!isNaN(id)) {
      handleVincular(id)
      setSelecionadoManual('')
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold text-slate-800">
            Docentes Autores (Corpo Docente)
          </Label>
        </div>
        <div>
          {docentesVinculados.length > 0 ? (
            <Badge className="bg-emerald-600 text-white gap-1 hover:bg-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              {docentesVinculados.length} docente(s) vinculado(s)
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-500 bg-slate-100">
              Nenhum docente vinculado
            </Badge>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-600">
        Vincule os docentes do PPG-DCEM que assinam esta publicação. As sugestões abaixo são
        detectadas automaticamente comparando o texto de autores com os nomes dos docentes
        cadastrados.
      </p>

      {/* Lista de docentes vinculados */}
      {docentesVinculados.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <Label className="text-xs font-medium text-slate-700">Docentes vinculados:</Label>
          <div className="space-y-1">
            {docentesVinculados.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between bg-white border border-slate-200 rounded px-2.5 py-1 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{d.nome}</span>
                  {d.categoria && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 capitalize">
                      {d.categoria}
                    </Badge>
                  )}
                </div>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDesvincular(d.id)}
                    title="Remover docente"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sugestões inteligentes */}
      {sugestoes.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <Label className="text-xs font-semibold text-blue-900">
              Sugestões encontradas no texto de autores:
            </Label>
          </div>
          <div className="space-y-1">
            {sugestoes.map((sug) => {
              const jaVinculado = docentesSelecionadosIds.includes(sug.docenteId)
              return (
                <div
                  key={sug.docenteId}
                  className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 rounded px-2.5 py-1.5 text-xs gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{sug.nome}</span>
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
                      variant={jaVinculado ? 'outline' : 'default'}
                      disabled={jaVinculado}
                      onClick={() => handleVincular(sug.docenteId)}
                      className="h-7 text-xs gap-1 shrink-0"
                    >
                      {jaVinculado ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Vinculado
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Vincular
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

      {/* Seleção manual */}
      {canEdit && (
        <div className="pt-2 border-t border-slate-200/80 space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            Adicionar docente manualmente:
          </Label>
          <div className="flex items-center gap-2">
            <Select value={selecionadoManual} onValueChange={setSelecionadoManual}>
              <SelectTrigger className="text-xs bg-white h-8 flex-1">
                <SelectValue placeholder="Selecione um docente..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {docentes.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                    {d.nome} {d.categoria ? `(${d.categoria})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAdicionarManual}
              disabled={!selecionadoManual}
              className="h-8 text-xs gap-1 bg-white"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
