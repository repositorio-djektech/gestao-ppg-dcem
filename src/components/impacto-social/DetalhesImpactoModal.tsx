import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sparkles,
  ExternalLink,
  Code2,
  Award,
  FileKey2,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react'
import type { ImpactoSocial, ProducaoTecnica, Patente, Premicao } from '@/types/database'

export interface DetalhesImpactoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  impacto: ImpactoSocial | null
  producoesTecnicas: ProducaoTecnica[]
  patentes: Patente[]
  premiacoes: Premicao[]
  totalVinculos: number
}

export function DetalhesImpactoModal({
  open,
  onOpenChange,
  impacto,
  producoesTecnicas,
  patentes,
  premiacoes,
  totalVinculos,
}: DetalhesImpactoModalProps) {
  if (!impacto) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            Impacto Social & Registros Vinculados
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 mt-1">
            {impacto.titulo}
          </DialogTitle>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
            {impacto.ano && (
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Ano: {impacto.ano}
              </span>
            )}
            <Badge
              variant="secondary"
              className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs"
            >
              <Layers className="h-3 w-3 mr-1" />
              {totalVinculos} produção(ões) vinculada(s)
            </Badge>
          </div>
          {impacto.link_comprovacao && (
            <div className="pt-2">
              <a
                href={impacto.link_comprovacao}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Link de Comprovação da Ação de Impacto
              </a>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 space-y-6">
          {/* Descrição do Impacto */}
          {impacto.descricao && (
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                Descrição da Ação de Impacto Social
              </span>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {impacto.descricao}
              </p>
            </div>
          )}

          {impacto.observacoes && (
            <div className="space-y-1 bg-amber-50/60 p-3 rounded-lg border border-amber-200/50 text-xs">
              <span className="font-semibold text-amber-900">Observações:</span>
              <p className="text-amber-800">{impacto.observacoes}</p>
            </div>
          )}

          <Separator className="my-4" />

          {/* Listagem Inversa: Produções Vinculadas */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                Registros Vinculados a este Impacto ({totalVinculos})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Produções técnicas, patentes e premiações que contribuíram diretamente para esta
                ação de impacto.
              </p>
            </div>

            {totalVinculos === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-500">
                Nenhuma produção técnica, patente ou premiação vinculada a este impacto social até o
                momento.
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Produções Técnicas */}
                {producoesTecnicas.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <Code2 className="h-4 w-4 text-violet-600" />
                      Produções Técnicas ({producoesTecnicas.length})
                    </div>
                    <div className="space-y-2 pl-6">
                      {producoesTecnicas.map((pt) => (
                        <div
                          key={pt.id}
                          className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                              {pt.titulo}
                            </h4>
                            <Badge
                              variant="secondary"
                              className="text-[10px] shrink-0 bg-violet-50 text-violet-700 border-0"
                            >
                              {pt.tipo}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            {pt.autores && <span>Autores: {pt.autores}</span>}
                            {pt.ano && <span>Ano: {pt.ano}</span>}
                            {pt.link_comprovacao && (
                              <a
                                href={pt.link_comprovacao}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Comprovante
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Patentes */}
                {patentes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <FileKey2 className="h-4 w-4 text-indigo-600" />
                      Patentes & Propriedade Intelectual ({patentes.length})
                    </div>
                    <div className="space-y-2 pl-6">
                      {patentes.map((pat) => (
                        <div
                          key={pat.id}
                          className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                              {pat.titulo}
                            </h4>
                            <div className="flex items-center gap-1">
                              {pat.tipo && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] shrink-0 bg-indigo-50 text-indigo-700 border-0"
                                >
                                  {pat.tipo}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className="text-[10px] shrink-0 border-slate-200 text-slate-700"
                              >
                                {pat.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            {pat.inpi && (
                              <span className="font-mono text-slate-700">INPI: {pat.inpi}</span>
                            )}
                            {pat.autores && <span>Autores: {pat.autores}</span>}
                            {pat.link_comprovacao && (
                              <a
                                href={pat.link_comprovacao}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Comprovante
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Premiações */}
                {premiacoes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <Award className="h-4 w-4 text-amber-600" />
                      Premiações ({premiacoes.length})
                    </div>
                    <div className="space-y-2 pl-6">
                      {premiacoes.map((prem) => (
                        <div
                          key={prem.id}
                          className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                              {prem.titulo}
                            </h4>
                            {prem.ano && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] shrink-0 bg-amber-50 text-amber-700 border-0"
                              >
                                {prem.ano}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            {prem.nome_premiado && <span>Premiado: {prem.nome_premiado}</span>}
                            {prem.instituicao && <span>Instituição: {prem.instituicao}</span>}
                            {prem.link_comprovacao && (
                              <a
                                href={prem.link_comprovacao}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Comprovante
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-sm bg-white"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
