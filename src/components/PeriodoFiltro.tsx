import { CalendarRange, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { usePeriodo } from '@/hooks/use-periodo'
import { rotuloPeriodo } from '@/lib/periodos/periodo'
import { lerFiltroPeriodo, type FiltroPeriodo } from '@/lib/periodos/filtro'

export interface ValorPeriodoFiltro {
  inicio: string
  fim: string
}

export const PERIODO_FILTRO_VAZIO: ValorPeriodoFiltro = { inicio: '', fim: '' }

interface PeriodoFiltroProps {
  valor: ValorPeriodoFiltro
  onChange: (valor: ValorPeriodoFiltro) => void
  /** Rótulo curto antes dos campos. */
  rotulo?: string
}

/** Filtro de intervalo de anos (ex.: 2021–2023), com atalhos para o período ativo e para "tudo". */
export function PeriodoFiltro({ valor, onChange, rotulo = 'Período' }: PeriodoFiltroProps) {
  const { periodo } = usePeriodo()
  const { erro } = lerFiltroPeriodo(valor.inicio, valor.fim)
  const vazio = !valor.inicio && !valor.fim

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={`Filtro de ${rotulo.toLowerCase()}`}
    >
      <CalendarRange className="h-4 w-4 text-slate-500" aria-hidden />
      <span className="text-sm text-slate-600">{rotulo}:</span>
      <Input
        type="number"
        inputMode="numeric"
        placeholder="De"
        aria-label={`${rotulo}: ano inicial`}
        className="h-9 w-24 bg-white text-sm"
        value={valor.inicio}
        onChange={(e) => onChange({ ...valor, inicio: e.target.value })}
      />
      <span className="text-sm text-slate-500">a</span>
      <Input
        type="number"
        inputMode="numeric"
        placeholder="Até"
        aria-label={`${rotulo}: ano final`}
        className="h-9 w-24 bg-white text-sm"
        value={valor.fim}
        onChange={(e) => onChange({ ...valor, fim: e.target.value })}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 bg-white"
        onClick={() => onChange({ inicio: String(periodo.anoInicio), fim: String(periodo.anoFim) })}
        title="Usar o período de avaliação ativo"
      >
        Avaliação {rotuloPeriodo(periodo)}
      </Button>
      {!vazio && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1"
          onClick={() => onChange(PERIODO_FILTRO_VAZIO)}
        >
          <X className="h-4 w-4" aria-hidden /> Tudo
        </Button>
      )}
      {erro && (
        <span role="alert" className="text-sm text-red-600">
          {erro}
        </span>
      )}
    </div>
  )
}

/** Converte o valor digitado no filtro; intervalo inválido não filtra. */
export function filtroDoValor(valor: ValorPeriodoFiltro): FiltroPeriodo {
  return lerFiltroPeriodo(valor.inicio, valor.fim).filtro
}
