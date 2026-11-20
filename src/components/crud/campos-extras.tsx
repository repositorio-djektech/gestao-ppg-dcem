/**
 * Campos reutilizáveis dos formulários (H-31): comprovante em PDF e vínculos com projeto e linha de
 * pesquisa. Usados no `fields` do CrudPage das telas de produção e difusão.
 */
import { useRef, useState } from 'react'
import { ExternalLink, FileText, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { FieldDef } from '@/components/crud/types'
import { uploadComprovanteProjeto } from '@/lib/storage/comprovantes-projetos'
import { projetosPesquisaService } from '@/services/projetos-pesquisa'
import { linhasPesquisaService } from '@/services/linhas-pesquisa'

interface CampoComprovanteProps {
  formData: Record<string, any>
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>
  submitting: boolean
  /** Pasta no bucket privado (`eventos`, `premiacoes`...). */
  pasta: string
  rotulo: string
}

function CampoComprovantePdf({
  formData,
  setFormData,
  submitting,
  pasta,
  rotulo,
}: CampoComprovanteProps) {
  const [enviando, setEnviando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const aoSelecionar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    if (!arquivo.name.toLowerCase().endsWith('.pdf')) {
      toast.error('O comprovante deve ser um arquivo PDF (.pdf).')
      return
    }
    setEnviando(true)
    try {
      const res = await uploadComprovanteProjeto(formData.id || 'novo', arquivo, undefined, pasta)
      setFormData((prev) => ({ ...prev, comprovante_url: res.url }))
      toast.success('Comprovante anexado.')
    } catch (err: any) {
      toast.error(`Erro ao anexar o comprovante: ${err?.message || 'falha no envio'}`)
    } finally {
      setEnviando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const url: string = formData.comprovante_url || ''
  return (
    <div className="space-y-2 p-3 bg-slate-50/80 rounded-lg border border-slate-200">
      <Label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-primary" aria-hidden />
          {rotulo}
        </span>
        {url && (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]"
          >
            Anexado
          </Badge>
        )}
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        aria-label={rotulo}
        onChange={aoSelecionar}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={enviando || submitting}
          onClick={() => inputRef.current?.click()}
          className="gap-1.5 h-8 text-xs bg-white"
        >
          <Upload className="h-3.5 w-3.5 text-primary" aria-hidden />
          {enviando ? 'Enviando…' : url ? 'Substituir PDF' : 'Anexar PDF'}
        </Button>
        {url && (
          <>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline px-2 py-1 bg-white rounded border border-slate-200"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Ver comprovante
            </a>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFormData((prev) => ({ ...prev, comprovante_url: '' }))}
              className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              Remover anexo
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

/** Campo de comprovante em PDF (coluna `comprovante_url`), guardado no bucket privado. */
export function campoComprovantePdf(pasta: string, rotulo = 'Comprovante (PDF)'): FieldDef {
  return {
    key: 'comprovante_url',
    label: rotulo,
    type: 'text',
    customRender: (props) => <CampoComprovantePdf {...props} pasta={pasta} rotulo={rotulo} />,
  }
}

const SEM_VINCULO = { value: '', label: '— Sem vínculo —' }

export async function carregarOpcoesProjetos(): Promise<{ value: string; label: string }[]> {
  const projetos = await projetosPesquisaService.list()
  return [
    SEM_VINCULO,
    ...[...projetos]
      .sort((a, b) => String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'))
      .map((p) => ({
        value: String(p.id),
        label: p.titulo.length > 80 ? `${p.titulo.slice(0, 80)}…` : p.titulo,
      })),
  ]
}

export async function carregarOpcoesLinhas(): Promise<{ value: string; label: string }[]> {
  const linhas = await linhasPesquisaService.list()
  return [
    SEM_VINCULO,
    ...[...linhas]
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
      .map((l) => ({ value: String(l.id), label: l.nome })),
  ]
}

export function campoProjetoVinculado(): FieldDef {
  return {
    key: 'projeto_id',
    label: 'Projeto de pesquisa vinculado',
    type: 'select',
    optionsLoader: carregarOpcoesProjetos,
    placeholder: 'Selecione o projeto...',
    helperText: 'Opcional: projeto (individual ou institucional) a que este registro pertence',
  }
}

export function campoLinhaVinculada(): FieldDef {
  return {
    key: 'linha_pesquisa_id',
    label: 'Linha de pesquisa vinculada',
    type: 'select',
    optionsLoader: carregarOpcoesLinhas,
    placeholder: 'Selecione a linha de pesquisa...',
    helperText: 'Opcional: linha de pesquisa do programa a que este registro se liga',
  }
}
