import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LIMITE_CARACTERES_POLITICAS_AFIRMATIVAS } from '@/lib/ppg/politicas-afirmativas'

interface PoliticasAfirmativasEditorProps {
  texto: string
  podeEditar: boolean
  salvando?: boolean
  limite?: number
  onSalvar: (texto: string) => void
}

/** Texto do item 1.3: coordenação edita; os demais perfis só leem (H-10). */
export function PoliticasAfirmativasEditor({
  texto,
  podeEditar,
  salvando = false,
  limite = LIMITE_CARACTERES_POLITICAS_AFIRMATIVAS,
  onSalvar,
}: PoliticasAfirmativasEditorProps) {
  const [rascunho, setRascunho] = useState(texto)

  useEffect(() => {
    setRascunho(texto)
  }, [texto])

  if (!podeEditar) {
    return texto.trim() ? (
      <p className="whitespace-pre-wrap text-sm text-slate-700">{texto}</p>
    ) : (
      <p className="text-sm text-slate-500">
        O texto das políticas afirmativas ainda não foi cadastrado pela coordenação.
      </p>
    )
  }

  const acimaDoLimite = rascunho.length > limite
  const semAlteracao = rascunho.trim() === texto.trim()

  return (
    <div className="space-y-3">
      <Textarea
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        rows={8}
        aria-label="Texto das políticas afirmativas"
        placeholder="Descreva as políticas de inclusão, permanência e acessibilidade do programa."
      />
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs ${acimaDoLimite ? 'text-red-600' : 'text-slate-500'}`}>
          {rascunho.length} / {limite}
        </span>
        <Button
          onClick={() => onSalvar(rascunho)}
          disabled={salvando || acimaDoLimite || semAlteracao}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}
