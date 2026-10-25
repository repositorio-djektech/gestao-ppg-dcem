import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, ChevronsUpDown, Globe2, Plus, Search, Sparkles, X } from 'lucide-react'
import type { ImpactoSocial } from '@/types/database'

interface SeletorImpactosProps {
  impactosDisponiveis: ImpactoSocial[]
  impactosSelecionadosIds: number[]
  onChange: (novosIds: number[]) => void
  disabled?: boolean
  label?: string
  helperText?: string
}

export function SeletorImpactos({
  impactosDisponiveis,
  impactosSelecionadosIds,
  onChange,
  disabled = false,
  label = 'Impactos Sociais Vinculados',
  helperText = 'Vincule esta produção aos impactos sociais cadastrados no programa',
}: SeletorImpactosProps) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')

  const selecionadosSet = useMemo(
    () => new Set(impactosSelecionadosIds.map((id) => Number(id))),
    [impactosSelecionadosIds],
  )

  const impactosFiltrados = useMemo(() => {
    const termo = busca
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

    if (!termo) return impactosDisponiveis

    return impactosDisponiveis.filter((imp) => {
      const tit = (imp.titulo || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
      const desc = (imp.descricao || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
      const anoStr = String(imp.ano || '')
      return tit.includes(termo) || desc.includes(termo) || anoStr.includes(termo)
    })
  }, [busca, impactosDisponiveis])

  const itensSelecionados = useMemo(() => {
    return impactosSelecionadosIds
      .map((id) => impactosDisponiveis.find((imp) => Number(imp.id) === Number(id)))
      .filter((imp): imp is ImpactoSocial => Boolean(imp))
  }, [impactosDisponiveis, impactosSelecionadosIds])

  const alternarSelecao = (id: number) => {
    const idNum = Number(id)
    if (selecionadosSet.has(idNum)) {
      onChange(impactosSelecionadosIds.filter((item) => Number(item) !== idNum))
    } else {
      onChange([...impactosSelecionadosIds, idNum])
    }
  }

  const removerSelecao = (id: number) => {
    onChange(impactosSelecionadosIds.filter((item) => Number(item) !== Number(id)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          {label}
        </Label>
        {itensSelecionados.length > 0 && (
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            {itensSelecionados.length} selecionado{itensSelecionados.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between bg-white text-left font-normal h-9 border-slate-200 hover:bg-slate-50 text-sm"
          >
            <span className="flex items-center gap-2 truncate text-slate-700">
              <Globe2 className="h-4 w-4 text-emerald-600 shrink-0" />
              {itensSelecionados.length === 0
                ? 'Selecionar impactos sociais vinculados...'
                : `${itensSelecionados.length} impacto(s) selecionado(s)`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[480px] p-0 bg-white" align="start">
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar por título, descrição ou ano..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>
            {busca && (
              <p className="text-[11px] text-slate-500">
                {impactosFiltrados.length} impacto(s) encontrado(s)
              </p>
            )}
          </div>

          <ScrollArea className="h-64">
            {impactosFiltrados.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                {impactosDisponiveis.length === 0
                  ? 'Nenhum impacto social cadastrado no sistema.'
                  : 'Nenhum impacto encontrado para a busca.'}
              </div>
            ) : (
              <div className="p-1 space-y-1">
                {impactosFiltrados.map((imp) => {
                  const isSelected = selecionadosSet.has(Number(imp.id))
                  return (
                    <div
                      key={imp.id}
                      onClick={() => alternarSelecao(imp.id)}
                      className={`flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors text-xs ${
                        isSelected
                          ? 'bg-emerald-50/70 hover:bg-emerald-100/60 text-emerald-950 border border-emerald-200/60'
                          : 'hover:bg-slate-100/80 text-slate-800'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold truncate">{imp.titulo}</span>
                          {imp.ano && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4 px-1.5 bg-slate-100 text-slate-600 border-0"
                            >
                              {imp.ano}
                            </Badge>
                          )}
                        </div>
                        {imp.descricao && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {imp.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500">
              Total disponível: {impactosDisponiveis.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-7 text-xs text-primary hover:text-primary"
            >
              Concluir
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Badges dos selecionados */}
      {itensSelecionados.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {itensSelecionados.map((imp) => (
            <Badge
              key={imp.id}
              variant="secondary"
              className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs py-1 px-2.5 flex items-center gap-1.5 max-w-full"
            >
              <Sparkles className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[280px]" title={imp.titulo}>
                {imp.titulo} {imp.ano ? `(${imp.ano})` : ''}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removerSelecao(imp.id)}
                  className="text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/50 rounded-full p-0.5 ml-0.5"
                  title="Desvincular impacto"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  )
}

/**
 * Renderizador helper para a listagem (tabela) de badges de impactos
 */
export function BadgesImpactosListagem({
  impactosIds,
  impactosMap,
}: {
  impactosIds?: number[]
  impactosMap: Record<number, ImpactoSocial>
}) {
  if (!impactosIds || impactosIds.length === 0) {
    return <span className="text-slate-400 text-xs">—</span>
  }

  const itens = impactosIds
    .map((id) => impactosMap[id])
    .filter((imp): imp is ImpactoSocial => Boolean(imp))

  if (itens.length === 0) {
    return <span className="text-slate-400 text-xs">—</span>
  }

  return (
    <div className="flex flex-wrap gap-1 max-w-[260px]">
      {itens.map((imp) => (
        <Badge
          key={imp.id}
          variant="outline"
          className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] line-clamp-1 max-w-[220px]"
          title={`${imp.titulo}${imp.ano ? ` (${imp.ano})` : ''}\n${imp.descricao || ''}`}
        >
          <Sparkles className="h-2.5 w-2.5 mr-1 text-emerald-600 shrink-0" />
          <span className="truncate">{imp.titulo}</span>
        </Badge>
      ))}
    </div>
  )
}
