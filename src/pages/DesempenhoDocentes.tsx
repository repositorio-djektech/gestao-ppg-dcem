import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileSpreadsheet, RefreshCw, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { obterAvaliacaoReconducao } from '@/services/reconducao'
import { janelaAvaliacaoDocente } from '@/lib/reconducao/calculo'
import { restringirRelatorioReconducaoAoDocente } from '@/lib/reconducao/escopo-docente'
import {
  gerarCsvDesempenhoDocentes,
  montarDesempenhoDocentes,
} from '@/lib/reconducao/desempenho-docentes'
import type { RelatorioReconducaoResposta } from '@/lib/reconducao/types'

const fmt = (n: number | null, casas = 2) => (n === null ? '—' : n.toFixed(casas))

/**
 * Desempenho dos docentes (H-32): PDQ e seus termos por docente, separado dos indicadores do
 * programa (Indicadores). É a avaliação do ano (IN 02/2026): produção dos 4 anos anteriores.
 */
export default function DesempenhoDocentes() {
  const { role, profile } = useAuth()
  const anoCorrente = new Date().getFullYear()
  const [anoAvaliacao, setAnoAvaliacao] = useState(anoCorrente)
  const [relatorio, setRelatorio] = useState<RelatorioReconducaoResposta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const janela = janelaAvaliacaoDocente(anoAvaliacao)
  const anos = useMemo(() => {
    const lista: number[] = []
    for (let a = anoCorrente + 1; a >= anoCorrente - 6; a--) lista.push(a)
    return lista
  }, [anoCorrente])

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const res = await obterAvaliacaoReconducao({ anoAvaliacao })
      if (res.sucesso && res.dados) setRelatorio(res.dados)
      else setErro(res.mensagemErro || 'Não foi possível carregar o desempenho dos docentes.')
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado ao carregar o desempenho dos docentes.')
    } finally {
      setCarregando(false)
    }
  }, [anoAvaliacao])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // D-25: o docente vê só o próprio desempenho
  const linhas = useMemo(
    () =>
      relatorio
        ? montarDesempenhoDocentes(
            restringirRelatorioReconducaoAoDocente(relatorio, role, profile?.docente_id).avaliacoes,
          )
        : [],
    [relatorio, role, profile?.docente_id],
  )

  const exportarCsv = () => {
    const csv = gerarCsvDesempenhoDocentes(linhas, {
      anoAvaliacao,
      anoInicio: janela.anoInicio,
      anoFim: janela.anoFim,
    })
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `desempenho_docentes_${anoAvaliacao}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto" data-testid="pagina-desempenho-docentes">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary shrink-0" aria-hidden />
            <span>Desempenho dos Docentes</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Indicadores de cada docente (PDQ = 2 × ATD + DPIDE1 + DPTDE1), separados dos indicadores
            do programa, que ficam em{' '}
            <Link to="/indicadores" className="text-primary underline underline-offset-2">
              Indicadores
            </Link>
            . O veredito de cada docente está em{' '}
            <Link to="/reconducao" className="text-primary underline underline-offset-2">
              Credenciamento
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-600 shrink-0">Ano da avaliação:</span>
          <Select value={String(anoAvaliacao)} onValueChange={(v) => setAnoAvaliacao(Number(v))}>
            <SelectTrigger
              className="w-[210px] bg-white h-9 text-xs"
              data-testid="select-ano-desempenho"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => {
                const j = janelaAvaliacaoDocente(a)
                return (
                  <SelectItem key={a} value={String(a)}>
                    {a} (produção {j.anoInicio}–{j.anoFim})
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={carregar}
            disabled={carregando}
            className="h-9"
          >
            <RefreshCw
              className={`h-4 w-4 mr-1.5 ${carregando ? 'animate-spin' : ''}`}
              aria-hidden
            />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarCsv}
            disabled={carregando || linhas.length === 0}
            className="h-9 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" aria-hidden />
            Exportar CSV
          </Button>
        </div>
      </div>

      {erro && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {erro}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#e9effc]">
            <TableRow className="bg-[#e9effc] hover:bg-[#e9effc]">
              <TableHead className="font-semibold text-slate-700">Docente</TableHead>
              <TableHead className="font-semibold text-slate-700">Categoria</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">
                M / D concluídos
              </TableHead>
              <TableHead className="text-center font-semibold text-slate-700">
                Pub. c/ coautoria
              </TableHead>
              <TableHead className="text-center font-semibold text-slate-700">ATD</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">DPIDE1</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">DPTDE1</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">PDQ</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">
                Nota de corte
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                  Nenhum docente para exibir.
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((l) => (
                <TableRow key={l.docenteId}>
                  <TableCell className="font-medium text-slate-900">{l.nome}</TableCell>
                  <TableCell>{l.categoria}</TableCell>
                  <TableCell className="text-center">
                    {l.mestrados} / {l.doutorados}
                  </TableCell>
                  <TableCell className="text-center">
                    {l.publicacoesComCoautoria}
                    <span className="text-slate-400"> de {l.publicacoesTotal}</span>
                  </TableCell>
                  <TableCell
                    className="text-center"
                    title={
                      l.atd === null
                        ? 'Sem titulações: ATD não calculável (entra como 0 no PDQ)'
                        : undefined
                    }
                  >
                    {fmt(l.atd)}
                  </TableCell>
                  <TableCell className="text-center">{fmt(l.dpide1)}</TableCell>
                  <TableCell className="text-center">{fmt(l.dptde1, 0)}</TableCell>
                  <TableCell className="text-center">
                    {l.pdq === null ? (
                      '—'
                    ) : (
                      <Badge
                        variant="outline"
                        className={
                          l.metaAtingida
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-mono'
                            : 'bg-amber-50 text-amber-700 border-amber-300 font-mono'
                        }
                      >
                        {l.pdq.toFixed(2)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-slate-600">
                    {fmt(l.notaCorte, 1)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-slate-500">
        Conta a publicação com coautoria confirmada de discente ou de egresso titulado há até 5
        anos; sem Qualis cadastrado só o DPTDE1 pontua. Mestrados e doutorados contam como
        orientador principal.
      </p>
    </div>
  )
}
