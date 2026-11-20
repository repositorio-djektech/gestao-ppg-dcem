import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  listarProducaoDoDiscente,
  PRODUCAO_VAZIA,
  totalProducao,
  type ItemProducao,
  type ProducaoDoDiscente,
} from '@/services/producao-discente'
import { exibirPeriodoMesAno } from '@/lib/datas/mes-ano'
import type { Orientacao } from '@/types/database'

interface Props {
  orientacao: Orientacao | null
  docenteNome?: string
  discenteNome?: string
  projetoTitulo?: string
  linhaNome?: string
  onClose: () => void
}

function Lista({ titulo, itens }: { titulo: string; itens: ItemProducao[] }) {
  if (itens.length === 0) return null
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {titulo} ({itens.length})
      </h4>
      <ul className="space-y-1">
        {itens.map((i) => (
          <li
            key={`${titulo}-${i.id}`}
            className="rounded border border-slate-200 bg-white p-2 text-xs"
          >
            <div className="font-medium text-slate-900">{i.titulo}</div>
            <div className="text-slate-500">{[i.ano, i.detalhe].filter(Boolean).join(' · ')}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Orientação com o título da dissertação ou tese (TCC), a linha e o projeto, e a produção do
 * discente ligada a ela (publicações com coautoria confirmada, patentes, produção técnica e
 * eventos). A orientação continua sendo editada na própria tabela (P-35).
 */
export function DetalhesOrientacaoDialog({
  orientacao,
  docenteNome,
  discenteNome,
  projetoTitulo,
  linhaNome,
  onClose,
}: Props) {
  const [producao, setProducao] = useState<ProducaoDoDiscente>(PRODUCAO_VAZIA)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!orientacao?.discente_id) {
      setProducao(PRODUCAO_VAZIA)
      return
    }
    let ativo = true
    setCarregando(true)
    listarProducaoDoDiscente(Number(orientacao.discente_id))
      .then((p) => ativo && setProducao(p))
      .catch(() => ativo && setProducao(PRODUCAO_VAZIA))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [orientacao?.id, orientacao?.discente_id])

  const periodo = orientacao ? exibirPeriodoMesAno(orientacao.inicio, orientacao.fim) : null
  return (
    <Dialog open={orientacao !== null} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Orientação: {discenteNome || 'discente'}</DialogTitle>
          <DialogDescription>
            {orientacao?.tipo}
            {docenteNome ? ` · orientador(a) ${docenteNome}` : ''}
            {periodo ? ` · ${periodo}` : ''}
          </DialogDescription>
        </DialogHeader>
        {orientacao && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Título da dissertação ou tese (TCC)
              </div>
              <div className="text-sm text-slate-900" data-testid="titulo-tcc">
                {orientacao.titulo_trabalho?.trim() || (
                  <span className="text-slate-400">Não informado</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {linhaNome && <Badge variant="outline">Linha: {linhaNome}</Badge>}
                {projetoTitulo && <Badge variant="outline">Projeto: {projetoTitulo}</Badge>}
              </div>
            </div>

            <div className="space-y-3" data-testid="producao-do-discente">
              <h3 className="text-sm font-semibold text-slate-800">Produção do discente</h3>
              {carregando ? (
                <Skeleton className="h-16 w-full" />
              ) : totalProducao(producao) === 0 ? (
                <p className="text-xs text-slate-500">
                  Nenhuma produção ligada a este discente. As publicações aparecem quando a
                  coautoria dele é confirmada; patentes, produção técnica e eventos, quando o
                  discente é ligado ao registro.
                </p>
              ) : (
                <>
                  <Lista titulo="Publicações" itens={producao.publicacoes} />
                  <Lista titulo="Patentes" itens={producao.patentes} />
                  <Lista titulo="Produção técnica" itens={producao.producaoTecnica} />
                  <Lista titulo="Eventos" itens={producao.eventos} />
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
