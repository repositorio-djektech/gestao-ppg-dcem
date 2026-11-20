import { cn } from '@/lib/utils'

interface FiltroSegmentadoProps<T extends string> {
  rotulo: string
  valor: T
  opcoes: Array<{ valor: T; rotulo: string }>
  onChange: (valor: T) => void
}

/** Botões de escolha única (ex.: Todos | Mestrado | Doutorado) para filtrar listas. */
export function FiltroSegmentado<T extends string>({
  rotulo,
  valor,
  opcoes,
  onChange,
}: FiltroSegmentadoProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={rotulo}>
      <span className="text-sm text-slate-600">{rotulo}:</span>
      <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={valor === o.valor}
            onClick={() => onChange(o.valor)}
            className={cn(
              'h-8 rounded px-3 text-sm transition-colors',
              valor === o.valor
                ? 'bg-primary text-primary-foreground'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}
