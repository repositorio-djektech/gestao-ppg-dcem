import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GraduationCap, Users2, FileText, ExternalLink, Loader2, Edit } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type {
  Egresso,
  Docente,
  Orientacao,
  PublicacaoCoautorPrograma,
  Publicacao,
} from '@/types/database'
import { normalizarNomePessoa } from '@/lib/normalizacao'
import { DocenteNome } from '@/components/docentes/DocenteNome'

export type EgressoTabKey = 'geral' | 'orientacoes' | 'publicacoes'

export interface VisualizarEgressoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  egresso: Egresso | null
  docentes?: Docente[]
  onEditar?: (egresso: Egresso) => void
}

interface PublicacaoComCoautoria {
  id: number
  titulo: string
  periodico?: string
  ano?: number
  doi?: string
  tipo: string
  nome_citado: string
}

export function VisualizarEgressoDialog({
  open,
  onOpenChange,
  egresso,
  docentes = [],
  onEditar,
}: VisualizarEgressoDialogProps) {
  const [abaAtiva, setAbaAtiva] = useState<EgressoTabKey>('geral')
  const [loading, setLoading] = useState(false)
  const [orientacoes, setOrientacoes] = useState<(Orientacao & { docente_nome?: string })[]>([])
  const [publicacoes, setPublicacoes] = useState<PublicacaoComCoautoria[]>([])

  // Docente orientador vinculado
  const docenteOrientador = useMemo(() => {
    if (!egresso?.docente_orientador_id) return null
    return docentes.find((d) => d.id === egresso.docente_orientador_id) || null
  }, [egresso?.docente_orientador_id, docentes])

  useEffect(() => {
    if (!open || !egresso) {
      setAbaAtiva('geral')
      return
    }

    let ativo = true
    setLoading(true)

    async function carregarRegistros() {
      try {
        const nomeNormEgresso = normalizarNomePessoa(egresso!.nome).toLowerCase()

        // 1. Carregar possíveis orientações onde o egresso foi orientando
        // Pode estar vinculado via discente com mesmo nome ou observações com o nome
        const discentesRes = await supabase
          .from('discentes')
          .select('id, nome')
          .ilike('nome', `%${egresso!.nome}%`)

        const discenteIds = (discentesRes.data || [])
          .filter((d: any) => normalizarNomePessoa(d.nome).toLowerCase() === nomeNormEgresso)
          .map((d: any) => d.id)

        let oriList: (Orientacao & { docente_nome?: string })[] = []

        if (discenteIds.length > 0) {
          const resOri = await supabase
            .from('orientacoes')
            .select('*, docentes(nome)')
            .in('discente_id', discenteIds)
            .order('inicio', { ascending: false })

          oriList = ((resOri.data as any[]) || []).map((ori) => ({
            ...ori,
            docente_nome: ori.docentes?.nome || undefined,
          }))
        }

        // Se não achou por discente_id, buscar por observações com o nome
        if (oriList.length === 0) {
          const resOriObs = await supabase
            .from('orientacoes')
            .select('*, docentes(nome)')
            .ilike('observacoes', `%${egresso!.nome}%`)
            .order('inicio', { ascending: false })

          oriList = ((resOriObs.data as any[]) || []).map((ori) => ({
            ...ori,
            docente_nome: ori.docentes?.nome || undefined,
          }))
        }

        // 2. Carregar publicações coautorias confirmadas em publicacoes_coautores_programa
        // Buscar por egresso_id OU por discentes vinculados com mesmo nome
        let queryCoautores = supabase
          .from('publicacoes_coautores_programa')
          .select('*, publicacoes(*)')
          .eq('egresso_id', egresso!.id)

        const resCoautoresEgresso = await queryCoautores

        let coautoresRows = (resCoautoresEgresso.data as any[]) || []

        // Se também tiver discenteIds correspondentes, agrega coautorias registradas antes de ser egresso
        if (discenteIds.length > 0) {
          const resCoautoresDiscente = await supabase
            .from('publicacoes_coautores_programa')
            .select('*, publicacoes(*)')
            .in('discente_id', discenteIds)

          const rowsDiscente = (resCoautoresDiscente.data as any[]) || []
          // Mescla evitando duplicatas de id
          const idSet = new Set(coautoresRows.map((r: any) => r.id))
          for (const row of rowsDiscente) {
            if (!idSet.has(row.id)) {
              coautoresRows.push(row)
              idSet.add(row.id)
            }
          }
        }

        const pubsFormatadas: PublicacaoComCoautoria[] = coautoresRows
          .filter((c: any) => c.publicacoes)
          .map((c: any) => ({
            id: c.publicacoes.id,
            titulo: c.publicacoes.titulo,
            periodico: c.publicacoes.periodico,
            ano: c.publicacoes.ano,
            doi: c.publicacoes.doi,
            tipo: c.tipo,
            nome_citado: c.nome_citado,
          }))

        if (!ativo) return
        setOrientacoes(oriList)
        setPublicacoes(pubsFormatadas)
      } catch (err) {
        console.error('Erro ao carregar registros vinculados do egresso:', err)
      } finally {
        if (ativo) setLoading(false)
      }
    }

    carregarRegistros()

    return () => {
      ativo = false
    }
  }, [open, egresso])

  if (!egresso) return null

  const nomeEgressoNormalizado = normalizarNomePessoa(egresso.nome)

  const abasDefinicao: Array<{
    id: EgressoTabKey
    rotulo: string
    icone: React.ComponentType<{ className?: string }>
    total: number
  }> = [
    { id: 'geral', rotulo: 'Dados Cadastrais', icone: GraduationCap, total: 1 },
    { id: 'orientacoes', rotulo: 'Orientações', icone: Users2, total: orientacoes.length },
    { id: 'publicacoes', rotulo: 'Publicações', icone: FileText, total: publicacoes.length },
  ]

  const totalRegistros = orientacoes.length + publicacoes.length

  const renderAbaGeral = () => {
    return (
      <div className="space-y-4 p-4 overflow-y-auto max-h-full">
        {/* Bloco 1: Identificação Básica */}
        <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-lg p-4 border border-slate-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
            <GraduationCap className="h-4 w-4 text-primary" />
            Identificação do Egresso
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Nome Completo:</span>
              <span className="text-slate-900 font-semibold text-sm">{nomeEgressoNormalizado}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Tipo / Nível do Curso:</span>
              {egresso.tipo_curso ? (
                <span className="inline-block mt-0.5 font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                  {egresso.tipo_curso}
                </span>
              ) : (
                <span className="text-slate-400 mt-0.5 block">Não informado</span>
              )}
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Ano de Ingresso:</span>
              <span className="text-slate-800 font-mono mt-0.5 block">
                {egresso.ano_ingresso || 'Não informado'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">
                Ano de Titulação / Conclusão:
              </span>
              <span className="text-slate-800 font-semibold mt-0.5 block">
                {egresso.ano_titulacao ? String(egresso.ano_titulacao) : 'Não informado'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Nacionalidade:</span>
              <span className="text-slate-800 mt-0.5 block">
                {egresso.nacionalidade || 'Não informado'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">ID Lattes (16 dígitos):</span>
              <span className="text-slate-800 font-mono mt-0.5 block">
                {egresso.lattes_id || 'Não informado'}
              </span>
            </div>
          </div>
        </div>

        {/* Bloco 2: Orientador Responsável */}
        <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-lg p-4 border border-slate-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
            <Users2 className="h-4 w-4 text-primary" />
            Orientador Responsável
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Docente Vinculado:</span>
              {docenteOrientador ? (
                <div className="flex items-center gap-2 mt-1">
                  <DocenteNome
                    nome={docenteOrientador.nome}
                    status={docenteOrientador.status}
                    className="font-semibold text-sm"
                  />
                  {docenteOrientador.categoria && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 capitalize">
                      {docenteOrientador.categoria}
                    </Badge>
                  )}
                  {docenteOrientador.status === false && (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1.5 bg-orange-50 text-orange-700 border-orange-300"
                    >
                      Inativo
                    </Badge>
                  )}
                </div>
              ) : egresso.orientador ? (
                <span className="text-slate-800 font-medium mt-1 block">
                  {egresso.orientador}
                  <span className="text-[11px] text-slate-400 font-normal ml-1.5">
                    (texto livre / sem vínculo cadastrado)
                  </span>
                </span>
              ) : (
                <span className="text-slate-400 mt-1 block">Não informado</span>
              )}
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Tipo de Vínculo:</span>
              <span className="text-slate-800 mt-1 block">
                {docenteOrientador ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-300"
                  >
                    Vínculo formal com Docente PPG-DCEM
                  </Badge>
                ) : egresso.orientador ? (
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                    Registro textual livre
                  </Badge>
                ) : (
                  'Não informado'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Bloco 3: Atuação Profissional */}
        <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-lg p-4 border border-slate-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
            <GraduationCap className="h-4 w-4 text-primary" />
            Atuação Profissional Atual
          </h3>
          <div className="text-xs">
            {egresso.atuacao_profissional && egresso.atuacao_profissional.trim() ? (
              <p className="text-slate-800 bg-white p-3 rounded border border-slate-200 whitespace-pre-wrap leading-relaxed">
                {egresso.atuacao_profissional}
              </p>
            ) : (
              <span className="text-slate-400 italic">Não informado</span>
            )}
          </div>
        </div>

        {/* Bloco 4: Links e Observações */}
        <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-lg p-4 border border-slate-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
            <ExternalLink className="h-4 w-4 text-primary" />
            Comprovações e Links
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Currículo Lattes / LinkedIn:</span>
              {egresso.link_lattes ? (
                <a
                  href={
                    egresso.link_lattes.startsWith('http')
                      ? egresso.link_lattes
                      : `http://lattes.cnpq.br/${egresso.link_lattes}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 mt-1 font-medium"
                >
                  <span className="truncate">{egresso.link_lattes}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-slate-400 mt-1 block">Não informado</span>
              )}
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Link de Comprovação:</span>
              {egresso.link_comprovacao ? (
                <a
                  href={egresso.link_comprovacao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1.5 mt-1 font-medium bg-primary/5 px-2.5 py-1 rounded border border-primary/20 w-fit"
                >
                  <span>Abrir documento</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-slate-400 mt-1 block">Não informado</span>
              )}
            </div>

            {egresso.observacoes && (
              <div className="md:col-span-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium block mb-0.5">Observações:</span>
                <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 whitespace-pre-wrap">
                  {egresso.observacoes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderAbaOrientacoes = () => {
    return (
      <div className="p-4 overflow-y-auto max-h-full space-y-3">
        {orientacoes.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            Nenhum registro de orientação associado a este egresso.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="divide-y divide-slate-100 text-xs">
              {orientacoes.map((ori) => (
                <div key={ori.id} className="p-3 space-y-1.5 hover:bg-slate-50/60">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      {ori.tipo || 'Orientação'}
                    </span>
                    <Badge variant="outline" className="capitalize text-[11px]">
                      {ori.status || 'concluído'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-slate-600 text-xs">
                    {ori.docente_nome && (
                      <span className="flex items-center gap-1">
                        <strong className="text-slate-700">Docente Orientador:</strong>
                        <span>{ori.docente_nome}</span>
                      </span>
                    )}
                    <span>
                      <strong className="text-slate-700">Período:</strong> {ori.inicio || '—'}{' '}
                      {ori.fim ? `– ${ori.fim}` : ''}
                    </span>
                    {ori.data_defesa && (
                      <span>
                        <strong className="text-slate-700">Defesa:</strong> {ori.data_defesa}
                      </span>
                    )}
                    {ori.flag_orientador_principal && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                        Orientador Principal
                      </Badge>
                    )}
                  </div>
                  {ori.observacoes && (
                    <p className="text-[11px] text-slate-500 italic pt-1">{ori.observacoes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderAbaPublicacoes = () => {
    return (
      <div className="p-4 overflow-y-auto max-h-full space-y-3">
        {publicacoes.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            Nenhuma coautoria confirmada em publicações do programa vinculada a este egresso.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="divide-y divide-slate-100 text-xs">
              {publicacoes.map((pub) => (
                <div key={pub.id} className="p-3 space-y-1.5 hover:bg-slate-50/60">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{pub.titulo}</span>
                    {pub.ano && (
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {pub.ano}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-slate-600 text-xs">
                    {pub.periodico && (
                      <span>
                        <strong className="text-slate-700">Periódico:</strong> {pub.periodico}
                      </span>
                    )}
                    {pub.doi && (
                      <span>
                        <strong className="text-slate-700">DOI:</strong>{' '}
                        <a
                          href={pub.doi.startsWith('http') ? pub.doi : `https://doi.org/${pub.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {pub.doi}
                        </a>
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]"
                    >
                      Coautoria Confirmada ({pub.tipo})
                    </Badge>
                  </div>
                  {pub.nome_citado && (
                    <p className="text-[11px] text-slate-500">
                      Citado como:{' '}
                      <span className="font-medium text-slate-700">{pub.nome_citado}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
        {/* Cabeçalho */}
        <DialogHeader className="p-5 pb-4 border-b bg-slate-50/90 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-xl text-primary font-bold truncate">
                <GraduationCap className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">{nomeEgressoNormalizado}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-1">
                Visualização detalhada dos dados cadastrais e registros vinculados do egresso.
              </DialogDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/25 text-xs px-2.5 py-1 font-mono font-medium"
              >
                <strong>{totalRegistros}</strong> registro(s) vinculado(s)
              </Badge>
              {egresso.tipo_curso && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {egresso.tipo_curso}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com Abas */}
        <div className="flex-1 overflow-hidden p-5 flex flex-col min-h-0 bg-white">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Carregando dados do egresso...</p>
            </div>
          ) : (
            <Tabs
              value={abaAtiva}
              onValueChange={(val) => setAbaAtiva(val as EgressoTabKey)}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="pb-2 shrink-0 border-b">
                <TabsList className="bg-slate-100 p-1.5 h-auto flex flex-wrap w-full justify-start gap-1.5 rounded-lg">
                  {abasDefinicao.map(({ id, rotulo, icone: Icone, total }) => {
                    const ativo = abaAtiva === id
                    return (
                      <TabsTrigger
                        key={id}
                        value={id}
                        className={`text-xs px-2.5 py-1.5 gap-1.5 flex items-center rounded-md transition-colors ${
                          ativo
                            ? 'bg-white text-primary font-semibold shadow-xs ring-1 ring-slate-200'
                            : 'hover:bg-slate-200/60 text-slate-700'
                        }`}
                      >
                        <Icone className="h-3.5 w-3.5" />
                        <span>{rotulo}</span>
                        {id !== 'geral' && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              total > 0
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'bg-slate-200 text-slate-600'
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

              <TabsContent
                value="geral"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaGeral()}
              </TabsContent>

              <TabsContent
                value="orientacoes"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaOrientacoes()}
              </TabsContent>

              <TabsContent
                value="publicacoes"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaPublicacoes()}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Rodapé com ação Editar alinhado ao padrão */}
        <DialogFooter className="p-4 border-t bg-slate-50/80 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Visualização somente leitura dos registros do egresso.</span>
          </div>

          <div className="flex items-center gap-2">
            {onEditar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  onEditar(egresso)
                }}
                className="gap-1.5 bg-white text-primary border-primary/30 hover:bg-primary/10"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Editar Egresso</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="bg-white hover:bg-slate-50"
            >
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
