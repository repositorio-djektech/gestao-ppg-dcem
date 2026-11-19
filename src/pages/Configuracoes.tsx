import { useState } from 'react'
import { Pencil, Plus, Trash2, CheckCircle2, Settings } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { usePeriodo } from '@/hooks/use-periodo'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { podeEditarConfiguracoes } from '@/services/permissoes'
import {
  ativarPeriodo,
  excluirPeriodo,
  salvarConfiguracao,
  salvarPeriodo,
  type ResultadoPeriodos,
} from '@/services/periodos'
import { registrarLog } from '@/services/logs'
import { anosDoPeriodo, rotuloPeriodo, type PeriodoAvaliacao } from '@/lib/periodos/periodo'

interface FormPeriodo {
  id: number | null
  nome: string
  anoInicio: string
  anoFim: string
  anoReferencia: string
}

const FORM_VAZIO: FormPeriodo = { id: null, nome: '', anoInicio: '', anoFim: '', anoReferencia: '' }

function numeroOuNulo(v: string): number | null {
  const t = v.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

function mensagemDoResultado(r: ResultadoPeriodos): string {
  if (!('motivo' in r)) return ''
  if (r.motivo === 'sem_permissao') return 'Você não tem permissão para alterar as configurações.'
  return r.mensagem
}

export default function Configuracoes() {
  const { role } = useAuth()
  const { periodos, periodo: ativo, configuracao, recarregar } = usePeriodo()
  const podeEditar = podeEditarConfiguracoes(role)

  const [form, setForm] = useState<FormPeriodo | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [paraExcluir, setParaExcluir] = useState<PeriodoAvaliacao | null>(null)
  const [lattesInicio, setLattesInicio] = useState(String(configuracao.lattesAnoInicio))
  const [lattesFim, setLattesFim] = useState(
    configuracao.lattesAnoFim !== null ? String(configuracao.lattesAnoFim) : '',
  )
  const [salvandoLattes, setSalvandoLattes] = useState(false)

  const executar = async (
    acao: () => Promise<ResultadoPeriodos>,
    sucesso: string,
    log: { acao: string; entidade: string; entidade_id?: number | null; detalhes: object },
  ): Promise<boolean> => {
    const resultado = await acao()
    if (!resultado.ok) {
      toast({
        title: 'Não foi possível salvar',
        description: mensagemDoResultado(resultado),
        variant: 'destructive',
      })
      return false
    }
    toast({ title: sucesso })
    void registrarLog({
      acao: log.acao,
      entidade: log.entidade,
      entidade_id: log.entidade_id ?? null,
      detalhes: log.detalhes as Record<string, any>,
    })
    await recarregar()
    return true
  }

  const abrirNovo = () => {
    const ultimo = periodos[0]
    const inicio = ultimo ? ultimo.anoFim + 1 : new Date().getFullYear()
    setForm({
      ...FORM_VAZIO,
      anoInicio: String(inicio),
      anoFim: String(inicio + 3),
      nome: `Quadriênio ${inicio}–${inicio + 3}`,
    })
  }

  const abrirEdicao = (p: PeriodoAvaliacao) =>
    setForm({
      id: p.id,
      nome: p.nome,
      anoInicio: String(p.anoInicio),
      anoFim: String(p.anoFim),
      anoReferencia: p.anoReferencia !== null ? String(p.anoReferencia) : '',
    })

  const salvarFormulario = async () => {
    if (!form) return
    setSalvando(true)
    const dados = {
      id: form.id,
      nome: form.nome,
      anoInicio: Number(form.anoInicio),
      anoFim: Number(form.anoFim),
      anoReferencia: numeroOuNulo(form.anoReferencia),
    }
    const ok = await executar(
      () => salvarPeriodo({ role, periodo: dados }),
      form.id ? 'Período atualizado.' : 'Período cadastrado.',
      {
        acao: form.id ? 'editar' : 'criar',
        entidade: 'periodos_avaliacao',
        entidade_id: form.id,
        detalhes: { nome: dados.nome, ano_inicio: dados.anoInicio, ano_fim: dados.anoFim },
      },
    )
    setSalvando(false)
    if (ok) setForm(null)
  }

  const ativar = (p: PeriodoAvaliacao) => {
    if (p.id === null) return
    void executar(() => ativarPeriodo({ role, id: p.id as number }), `Período ${p.nome} ativado.`, {
      acao: 'editar',
      entidade: 'periodos_avaliacao',
      entidade_id: p.id,
      detalhes: { ativado: true, nome: p.nome, ano_inicio: p.anoInicio, ano_fim: p.anoFim },
    })
  }

  const confirmarExclusao = async () => {
    const p = paraExcluir
    setParaExcluir(null)
    if (!p || p.id === null) return
    await executar(() => excluirPeriodo({ role, id: p.id as number }), 'Período apagado.', {
      acao: 'excluir',
      entidade: 'periodos_avaliacao',
      entidade_id: p.id,
      detalhes: { nome: p.nome, ano_inicio: p.anoInicio, ano_fim: p.anoFim },
    })
  }

  const salvarLattes = async () => {
    setSalvandoLattes(true)
    const configuracaoNova = {
      lattesAnoInicio: Number(lattesInicio),
      lattesAnoFim: numeroOuNulo(lattesFim),
    }
    await executar(
      () => salvarConfiguracao({ role, configuracao: configuracaoNova as any }),
      'Janela de importação do Lattes salva.',
      {
        acao: 'editar',
        entidade: 'ppg_configuracoes',
        entidade_id: 1,
        detalhes: {
          lattes_ano_inicio: configuracaoNova.lattesAnoInicio,
          lattes_ano_fim: configuracaoNova.lattesAnoFim,
        },
      },
    )
    setSalvandoLattes(false)
  }

  const persistido = periodos.some((p) => p.id !== null)

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-slate-600" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Configurações</h1>
          <p className="text-sm text-slate-600">
            Período de avaliação CAPES e janela de importação do Lattes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Períodos de avaliação</CardTitle>
            <CardDescription>
              Os indicadores, a Recondução e o selo do cabeçalho usam o período ativo (hoje:{' '}
              <strong>{rotuloPeriodo(ativo)}</strong>). Os períodos anteriores continuam disponíveis
              para consulta.
            </CardDescription>
          </div>
          {podeEditar && (
            <Button onClick={abrirNovo} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 mr-1" aria-hidden /> Novo período
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!persistido && (
            <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Nenhum período foi lido do banco; o sistema está usando o padrão{' '}
              {rotuloPeriodo(ativo)}. Se esta mensagem persistir, a migração de períodos ainda não
              foi aplicada.
            </p>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Anos</TableHead>
                  <TableHead>Situação</TableHead>
                  {podeEditar && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodos.map((p) => (
                  <TableRow key={p.id ?? 'padrao'}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>
                      {rotuloPeriodo(p)} ({anosDoPeriodo(p).length} anos)
                    </TableCell>
                    <TableCell>
                      {p.ativo ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Anterior ou futuro</Badge>
                      )}
                    </TableCell>
                    {podeEditar && (
                      <TableCell className="text-right whitespace-nowrap">
                        {p.id !== null && (
                          <>
                            {!p.ativo && (
                              <Button variant="ghost" size="sm" onClick={() => ativar(p)}>
                                <CheckCircle2 className="h-4 w-4 mr-1" aria-hidden /> Ativar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar ${p.nome}`}
                              onClick={() => abrirEdicao(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!p.ativo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Apagar ${p.nome}`}
                                onClick={() => setParaExcluir(p)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Importação do Lattes</CardTitle>
          <CardDescription>
            Janela padrão de anos lida do currículo. Cada importação ainda pode ajustá-la na tela.
            Orientações e projetos em andamento sempre entram, qualquer que seja o ano de início.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="lattes-inicio">Importar a partir de</Label>
              <Input
                id="lattes-inicio"
                type="number"
                inputMode="numeric"
                value={lattesInicio}
                onChange={(e) => setLattesInicio(e.target.value)}
                disabled={!podeEditar}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lattes-fim">Até (opcional)</Label>
              <Input
                id="lattes-fim"
                type="number"
                inputMode="numeric"
                placeholder="Fim do período ativo"
                value={lattesFim}
                onChange={(e) => setLattesFim(e.target.value)}
                disabled={!podeEditar}
              />
            </div>
          </div>
          {podeEditar ? (
            <Button onClick={salvarLattes} disabled={salvandoLattes}>
              {salvandoLattes ? 'Salvando…' : 'Salvar janela do Lattes'}
            </Button>
          ) : (
            <p className="text-sm text-slate-600">Apenas leitura para o seu perfil.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={form !== null} onOpenChange={(aberto) => !aberto && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Editar período' : 'Novo período de avaliação'}</DialogTitle>
            <DialogDescription>
              A CAPES usa quadriênios (4 anos) ou triênios (3 anos). Aceitamos de 1 a 10 anos.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="periodo-nome">Nome</Label>
                <Input
                  id="periodo-nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="periodo-inicio">Ano inicial</Label>
                  <Input
                    id="periodo-inicio"
                    type="number"
                    inputMode="numeric"
                    value={form.anoInicio}
                    onChange={(e) => setForm({ ...form, anoInicio: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="periodo-fim">Ano final</Label>
                  <Input
                    id="periodo-fim"
                    type="number"
                    inputMode="numeric"
                    value={form.anoFim}
                    onChange={(e) => setForm({ ...form, anoFim: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="periodo-ref">Ano de referência (opcional)</Label>
                <Input
                  id="periodo-ref"
                  type="number"
                  inputMode="numeric"
                  placeholder="Vazio = ano atual, limitado ao período"
                  value={form.anoReferencia}
                  onChange={(e) => setForm({ ...form, anoReferencia: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                  Anos depois do ano de referência aparecem como &quot;indefinidos&quot; nos
                  indicadores.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvarFormulario} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={paraExcluir !== null} onOpenChange={(a) => !a && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar período?</AlertDialogTitle>
            <AlertDialogDescription>
              O período &quot;{paraExcluir?.nome}&quot; será removido da lista. Nenhum dado de
              docentes, discentes ou publicações é apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
