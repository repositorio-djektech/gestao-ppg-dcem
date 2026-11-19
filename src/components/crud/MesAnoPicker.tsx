import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { exibirMesAno, normalizarMesAno, parseMesAno } from '@/lib/datas/mes-ano'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface MesAnoPickerProps {
  id: string
  /** Valor gravado (`AAAA-MM`); aceita também formatos antigos, que são lidos pelo mês. */
  value: unknown
  /** Recebe `AAAA-MM`, ou '' ao limpar. */
  onChange: (valor: string) => void
  placeholder?: string
  required?: boolean
}

/** Seletor de mês e ano (D-29): navega de ano em ano e escolhe o mês. */
export function MesAnoPicker({ id, value, onChange, placeholder, required }: MesAnoPickerProps) {
  const agora = new Date()
  const atual = parseMesAno(value)
  const texto = exibirMesAno(value)
  const [anoVisivel, setAnoVisivel] = useState<number | null>(null)
  const [aberto, setAberto] = useState(false)

  const ano = anoVisivel ?? atual?.ano ?? agora.getFullYear()
  const escolher = (mes: number) => {
    onChange(normalizarMesAno(`${String(mes).padStart(2, '0')}/${ano}`) ?? '')
    setAberto(false)
  }

  return (
    <Popover
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o)
        if (o) setAnoVisivel(null)
      }}
    >
      <div className="flex items-center gap-1.5">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            className={`w-full justify-between text-left font-normal bg-white h-9 border-input hover:bg-slate-50 ${
              !texto ? 'text-muted-foreground' : 'text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="font-medium">
                {texto || placeholder || 'Selecione mês e ano...'}
              </span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {texto ? 'Alterar' : 'Escolher'}
            </span>
          </Button>
        </PopoverTrigger>
        {texto && !required && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-400 hover:text-slate-600 shrink-0"
            title="Limpar"
            onClick={() => onChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <PopoverContent className="w-64 p-3 bg-white" align="start">
        <div className="flex items-center justify-between pb-2 mb-2 border-b">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-600 hover:bg-slate-100"
            onClick={() => setAnoVisivel(ano - 1)}
            title="Ano anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-slate-700">{ano}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-600 hover:bg-slate-100"
            onClick={() => setAnoVisivel(ano + 1)}
            title="Próximo ano"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MESES.map((nome, i) => {
            const mes = i + 1
            const selecionado = atual?.ano === ano && atual?.mes === mes
            const eAgora = agora.getFullYear() === ano && agora.getMonth() + 1 === mes
            return (
              <Button
                key={nome}
                type="button"
                variant={selecionado ? 'default' : 'ghost'}
                size="sm"
                className={`h-8 text-xs font-medium ${
                  selecionado
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : eAgora
                      ? 'border border-primary/40 text-primary hover:bg-primary/10 font-bold'
                      : 'hover:bg-slate-100 text-slate-800'
                }`}
                onClick={() => escolher(mes)}
              >
                {nome}
              </Button>
            )
          })}
        </div>
        <div className="flex items-center justify-between pt-2 mt-2 border-t text-[11px]">
          <button
            type="button"
            className="text-primary hover:underline font-medium h-7 flex items-center"
            onClick={() => {
              onChange(`${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`)
              setAberto(false)
            }}
          >
            Mês atual
          </button>
          {!required && texto && (
            <button
              type="button"
              className="text-slate-500 hover:underline h-7 flex items-center"
              onClick={() => {
                onChange('')
                setAberto(false)
              }}
            >
              Limpar
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
