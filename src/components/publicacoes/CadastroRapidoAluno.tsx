import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UserPlus } from 'lucide-react'
import type { DadosAlunoRapido, TipoAlunoRapido } from '@/services/aluno-rapido'

interface CadastroRapidoAlunoProps {
  salvando?: boolean
  /** Recebe os dados do aluno (sem docente: quem chama completa). */
  onSalvar: (dados: Pick<DadosAlunoRapido, 'tipo' | 'nome' | 'tipoCurso' | 'anoTitulacao'>) => void
  onCancelar: () => void
}

const NIVEIS = ['Mestrado', 'Doutorado']

/** Formulário compacto para cadastrar um aluno ou egresso que não veio do Lattes. */
export function CadastroRapidoAluno({ salvando, onSalvar, onCancelar }: CadastroRapidoAlunoProps) {
  const [tipo, setTipo] = useState<TipoAlunoRapido>('discente')
  const [nome, setNome] = useState('')
  const [tipoCurso, setTipoCurso] = useState('Mestrado')
  const [anoTitulacao, setAnoTitulacao] = useState('')

  const anoNumero = Number(anoTitulacao)
  const anoValido = Number.isInteger(anoNumero) && anoNumero >= 1970 && anoNumero <= 2100
  const podeSalvar = nome.trim().length >= 3 && (tipo === 'discente' || anoValido)

  return (
    <div
      className="rounded-md border border-blue-200 bg-blue-50/60 p-3 space-y-2"
      data-testid="cadastro-rapido-aluno"
    >
      <p className="text-xs text-slate-700">
        Cadastre o aluno ou egresso que não está na lista. Ele é vinculado a este artigo e fica
        disponível nas telas de Discentes e Egressos.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-700">Tipo</Label>
          <div className="flex gap-1">
            {(['discente', 'egresso'] as const).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={tipo === t ? 'default' : 'outline'}
                className="h-8 text-xs"
                onClick={() => setTipo(t)}
              >
                {t === 'discente' ? 'Discente (orientando)' : 'Egresso'}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1 flex-1 min-w-[12rem]">
          <Label htmlFor="aluno-rapido-nome" className="text-[11px] text-slate-700">
            Nome completo
          </Label>
          <Input
            id="aluno-rapido-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="h-8 text-xs bg-white"
            placeholder="Nome como consta no currículo"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="aluno-rapido-curso" className="text-[11px] text-slate-700">
            Nível
          </Label>
          <select
            id="aluno-rapido-curso"
            value={tipoCurso}
            onChange={(e) => setTipoCurso(e.target.value)}
            className="h-8 rounded-md border border-input bg-white px-2 text-xs"
          >
            {NIVEIS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {tipo === 'egresso' && (
          <div className="space-y-1">
            <Label htmlFor="aluno-rapido-ano" className="text-[11px] text-slate-700">
              Ano de titulação
            </Label>
            <Input
              id="aluno-rapido-ano"
              type="number"
              min={1970}
              max={2100}
              value={anoTitulacao}
              onChange={(e) => setAnoTitulacao(e.target.value)}
              className="h-8 w-24 text-xs bg-white"
            />
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={onCancelar}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs gap-1"
          disabled={!podeSalvar || salvando}
          onClick={() =>
            onSalvar({
              tipo,
              nome: nome.trim(),
              tipoCurso,
              anoTitulacao: tipo === 'egresso' ? anoNumero : null,
            })
          }
        >
          {salvando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          Cadastrar e vincular
        </Button>
      </div>
    </div>
  )
}
