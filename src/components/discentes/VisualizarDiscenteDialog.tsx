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
import {
  GraduationCap,
  FileText,
  Users2,
  ClipboardList,
  FlaskConical,
  ExternalLink,
  Calendar,
  BookOpen,
  Award,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { Discente, Docente, ProjetoPesquisa, Orientacao, Banca } from '@/types/database'
import { normalizarNomePessoa } from '@/lib/normalizacao'
import { formatarCpf } from '@/lib/utils'
import { DocenteNome } from '@/components/docentes/DocenteNome'

export type DiscenteTabKey = 'geral' | 'orientacoes' | 'bancas' | 'projeto'

export interface VisualizarDiscenteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  discente: Discente | null
  docentes?: Docente[]
  projetos?: ProjetoPesquisa[]
}

export function VisualizarDiscenteDialog({
  open,
  onOpenChange,
  discente,
  docentes = [],
  projetos = [],
}: VisualizarDiscenteDialogProps) {
  const [abaAtiva, setAbaAtiva] = useState<DiscenteTabKey>('geral')
  const [loading, setLoading] = useState(false)
  const [orientacoes, setOrientacoes] = useState<(Orientacao & { docente_nome?: string })[]>([])
  const [bancas, setBancas] = useState<Banca[]>([])

  // Docente orientador vinculado
  const docenteOrientador = useMemo(() => {
    if (!discente?.docente_orientador_id) return null
    return docentes.find((d) => d.id === discente.docente_orientador_id) || null
  }, [discente?.docente_orientador_id, docentes])

  // Projeto vinculado
  const projetoVinculado = useMemo(() => {
    if (!discente?.projeto_id) return null
    return projetos.find((p) => p.id === discente.projeto_id) || null
  }, [discente?.projeto_id, projetos])

  useEffect(() => {
    if (!open || !discente) {
      setAbaAtiva('geral')
      return
    }

    let ativo = true
    setLoading(true)

    async function carregarRegistros() {
      try {
        const [resOri, resBancas] = await Promise.all([
          supabase
            .from('orientacoes')
            .select('*, docentes(nome)')
            .eq('discente_id', discente!.id)
            .order('inicio', { ascending: false }),
          supabase
            .from('bancas')
            .select('*')
            .eq('discente_id', discente!.id)
            .order('data', { ascending: false }),
        ])

        if (!ativo) return

        const oriFormatadas = ((resOri.data as any[]) || []).map((ori) => ({
          ...ori,
          docente_nome: ori.docentes?.nome || undefined,
        }))

        setOrientacoes(oriFormatadas)
        setBancas((resBancas.data as Banca[]) || [])
      } catch (err) {
        console.error('Erro ao carregar dados do discente:', err)
      } finally {
        if (ativo) setLoading(false)
      }
    }

    carregarRegistros()

    return () => {
      ativo = false
    }
  }, [open, discente])

  if (!discente) return null

  const nomeDiscenteNormalizado = normalizarNomePessoa(discente.nome)

  const abasDefinicao: Array<{
    id: DiscenteTabKey
    rotulo: string
    icone: React.ComponentType<{ className?: string }>
    total: number
  }> = [
    { id: 'geral', rotulo: 'Dados Cadastrais', icone: GraduationCap, total: 1 },
    { id: 'orientacoes', rotulo: 'Orientações', icone: Users2, total: orientacoes.length },
    { id: 'bancas', rotulo: 'Bancas', icone: ClipboardList, total: bancas.length },
    {
      id: 'projeto',
      rotulo: 'Projeto de Pesquisa',
      icone: FlaskConical,
      total: projetoVinculado ? 1 : 0,
    },
  ]

  const totalRegistros = orientacoes.length + bancas.length + (projetoVinculado ? 1 : 0)

  const statusColors: Record<string, string> = {
    ativo: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    titulado: 'bg-blue-50 text-blue-700 border-blue-300',
    desligado: 'bg-red-50 text-red-700 border-red-300',
  }

  const renderAbaGeral = () => {
    return (
      <div className="space-y-4 p-4 overflow-y-auto max-h-full">
        {/* Bloco 1: Identificação Básica */}
        <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-lg p-4 border border-slate-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
            <GraduationCap className="h-4 w-4 text-primary" />
            Identificação do Discente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="flex flex-col gap-0.5 break-words">
              <span className="text-slate-500 font-medium block">Nome Completo:</span>
              <span className="text-slate-900 font-semibold text-sm">
                {nomeDiscenteNormalizado}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 break-words">
              <span className="text-slate-500 font-medium block">CPF:</span>
              <span className="text-slate-800 font-mono">
                {discente.cpf ? formatarCpf(discente.cpf) : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 break-words">
              <span className="text-slate-500 font-medium block">Status no Programa:</span>
              <Badge
                variant="outline"
                className={`capitalize mt-0.5 w-fit ${statusColors[discente.status] ?? ''}`}
              >
                {discente.status}
              </Badge>
            </div>
            <div className="flex flex-col gap-0.5 break-words">
              <span className="text-slate-500 font-medium block">Tipo / Nível do Curso:</span>
              <span className="text-slate-800 font-medium">{discente.tipo_curso || '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5 break-words">
              <span className="text-slate-500 font-medium block">Data de Ingresso:</span>
              <span className="text-slate-800 font-mono">{discente.data_ingresso || '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5 break-words">
              <span className="text-slate-500 font-medium block">Ano de Conclusão / Defesa:</span>
              <span className="text-slate-800 font-semibold">{discente.ano_conclusao || '—'}</span>
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
            <div className="flex flex-col gap-0.5 break-words">
              <span className="text-slate-500 font-medium block">Docente Vinculado:</span>
              {docenteOrientador ? (
                <div className="flex flex-wrap items-center gap-2 mt-1">
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
              ) : discente.orientador ? (
                <span className="text-slate-800 font-medium mt-1 block">
                  {discente.orientador}
                  <span className="text-[11px] text-slate-400 font-normal ml-1.5">
                    (texto livre / sem vínculo cadastrado)
                  </span>
                </span>
              ) : (
                <span className="text-slate-400 mt-1 block">Não informado</span>
              )}
            </div>

            <div className="flex flex-col gap-0.5 break-words">
              <span className="text-slate-500 font-medium block">Tipo de Vínculo:</span>
              <span className="text-slate-800 mt-1 block">
                {docenteOrientador ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-300 w-fit"
                  >
                    Vínculo formal com Docente PPG-DCEM
                  </Badge>
                ) : discente.orientador ? (
                  <Badge
                    variant="outline"
                    className="bg-slate-100 text-slate-700 border-slate-200 w-fit"
                  >
                    Registro textual livre
                  </Badge>
                ) : (
                  '—'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Bloco 3: Projeto Vinculado */}
        <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-lg p-4 border border-slate-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-primary" />
            Projeto de Pesquisa
          </h3>
          {projetoVinculado ? (
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Título do Projeto:</span>
                <span className="text-slate-900 font-semibold text-sm">
                  {projetoVinculado.titulo}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-slate-600">
                <div>
                  <span className="font-medium text-slate-700">Período: </span>
                  <span>
                    {projetoVinculado.inicio || '—'}{' '}
                    {projetoVinculado.fim ? `– ${projetoVinculado.fim}` : ''}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Financiamento: </span>
                  <span>
                    {projetoVinculado.financiamento
                      ? `Sim (${projetoVinculado.orgao_fomento || 'Fomento'})`
                      : 'Não'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Classificação: </span>
                  <span className="capitalize">{projetoVinculado.classificacao || '—'}</span>
                </div>
              </div>
              {projetoVinculado.descricao && (
                <div className="pt-1 text-slate-600">
                  <span className="font-medium text-slate-700 block mb-0.5">Descrição:</span>
                  <p className="text-xs leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                    {projetoVinculado.descricao}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Nenhum projeto de pesquisa vinculado a este discente.
            </p>
          )}
        </div>

        {/* Bloco 4: Links e Observações */}
        <div className="bg-slate-50 dark:bg-neutral-800/60 rounded-lg p-4 border border-slate-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100 flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-primary" />
            Comprovações e Links
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-0.5 break-words">
              <span className="text-slate-500 font-medium block">Currículo Lattes:</span>
              {discente.link_lattes ? (
                <a
                  href={discente.link_lattes}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 mt-0.5 font-medium break-all"
                >
                  <span className="break-all">{discente.link_lattes}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-slate-400 mt-0.5 block">Não informado</span>
              )}
            </div>

            <div className="flex flex-col gap-0.5 break-words">
              <span className="text-slate-500 font-medium block">Documento de Comprovação:</span>
              {discente.link_comprovacao ? (
                <a
                  href={discente.link_comprovacao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 mt-0.5 font-medium break-all"
                >
                  <span className="break-all">{discente.link_comprovacao}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-slate-400 mt-0.5 block">Não informado</span>
              )}
            </div>

            {discente.observacoes && (
              <div className="md:col-span-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium block mb-0.5">Observações:</span>
                <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 whitespace-pre-wrap">
                  {discente.observacoes}
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
            Nenhum registro de orientação associado a este discente.
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
                      {ori.status || 'em andamento'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-slate-600 text-xs">
                    {ori.docente_nome && (
                      <span className="flex items-center gap-1">
                        <strong className="text-slate-700">Docente:</strong>
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

  const renderAbaBancas = () => {
    return (
      <div className="p-4 overflow-y-auto max-h-full space-y-3">
        {bancas.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            Nenhuma banca examinadora associada a este discente.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="divide-y divide-slate-100 text-xs">
              {bancas.map((banca) => (
                <div key={banca.id} className="p-3 space-y-1.5 hover:bg-slate-50/60">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      {banca.titulo_trabalho || 'Trabalho de Conclusão / Defesa'}
                    </span>
                    <Badge variant="outline" className="text-[11px]">
                      {banca.tipo}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-slate-600 text-xs">
                    <span>
                      <strong className="text-slate-700">Data:</strong> {banca.data || '—'}
                    </span>
                  </div>
                  {banca.membros && (
                    <div className="text-[11px] text-slate-600 pt-1">
                      <strong className="text-slate-700 block mb-0.5">Membros da Banca:</strong>
                      <span className="bg-slate-50 p-1.5 rounded border border-slate-100 block">
                        {banca.membros}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderAbaProjeto = () => {
    if (!projetoVinculado) {
      return (
        <div className="text-center py-12 text-slate-500 text-xs">
          Nenhum projeto de pesquisa vinculado ao discente.
        </div>
      )
    }

    return (
      <div className="p-4 overflow-y-auto max-h-full space-y-3">
        <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-3 text-xs">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Título do Projeto
            </span>
            <h4 className="text-base font-bold text-slate-900 mt-0.5">{projetoVinculado.titulo}</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <span className="text-slate-500 font-medium block">Período de Execução:</span>
              <span className="font-semibold text-slate-800">
                {projetoVinculado.inicio || '—'}{' '}
                {projetoVinculado.fim ? `– ${projetoVinculado.fim}` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Financiamento:</span>
              <span className="font-semibold text-slate-800">
                {projetoVinculado.financiamento
                  ? `Sim (${projetoVinculado.orgao_fomento || 'Fomento'})`
                  : 'Sem Financiamento'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Classificação:</span>
              <span className="capitalize font-semibold text-slate-800">
                {projetoVinculado.classificacao || '—'}
              </span>
            </div>
          </div>

          {projetoVinculado.descricao && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-500 font-medium block mb-1">Descrição:</span>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-100">
                {projetoVinculado.descricao}
              </p>
            </div>
          )}

          {projetoVinculado.observacoes && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-500 font-medium block mb-1">Observações:</span>
              <p className="text-slate-600 italic">{projetoVinculado.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        bottomSheetOnMobile
        className="max-w-4xl md:max-h-[90vh] md:h-[85vh] flex flex-col p-0 overflow-hidden bg-white"
      >
        {/* Cabeçalho */}
        <DialogHeader className="p-4 md:p-5 pb-3 md:pb-4 border-b bg-slate-50/90 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-xl text-primary font-bold truncate">
                <GraduationCap className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">{nomeDiscenteNormalizado}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-1">
                Visualização detalhada dos dados cadastrais e acadêmicos do discente.
              </DialogDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/25 text-xs px-2.5 py-1 font-mono font-medium"
              >
                <strong>{totalRegistros}</strong> registro(s) vinculado(s)
              </Badge>
              {discente.tipo_curso && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {discente.tipo_curso}
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
              <p className="text-sm font-medium">Carregando dados do discente...</p>
            </div>
          ) : (
            <Tabs
              value={abaAtiva}
              onValueChange={(val) => setAbaAtiva(val as DiscenteTabKey)}
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
                value="bancas"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaBancas()}
              </TabsContent>

              <TabsContent
                value="projeto"
                className="flex-1 flex flex-col overflow-hidden mt-3 p-0 data-[state=inactive]:hidden min-h-0"
              >
                {renderAbaProjeto()}
              </TabsContent>
            </Tabs>
          )}
        </div>
        {/* Rodapé com safe-area no mobile */}
        <DialogFooter className="p-3 md:p-4 border-t bg-slate-50/80 dark:bg-neutral-900/80 shrink-0 flex flex-row items-center justify-between gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
            <span>Visualização de registros vinculados no banco de dados.</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-white hover:bg-slate-50 min-h-[44px] md:min-h-8 w-full sm:w-auto"
          >
            Fechar
          </Button>
        </DialogFooter>{' '}
      </DialogContent>
    </Dialog>
  )
}
