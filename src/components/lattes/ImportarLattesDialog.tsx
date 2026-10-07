import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileCode,
  FileArchive,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  Info,
} from 'lucide-react'
import { processarArquivosLattes, type ResultadoProcessamentoLattes } from '@/lib/lattes/processor'

interface ImportarLattesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProcessado?: (resultado: ResultadoProcessamentoLattes) => void
}

function formatarBytes(bytes: number, decimais: number = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const tamanhos = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimais))} ${tamanhos[i]}`
}

export function ImportarLattesDialog({
  open,
  onOpenChange,
  onProcessado,
}: ImportarLattesDialogProps) {
  const [arquivos, setArquivos] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoProcessamentoLattes | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reseta seleção ao fechar
  const handleOpenChange = (proximoOpen: boolean) => {
    if (!proximoOpen && !processando) {
      setArquivos([])
      setResultado(null)
      setIsDragging(false)
    }
    onOpenChange(proximoOpen)
  }

  const validarEAdicionarArquivos = (novosArquivos: FileList | File[]) => {
    const lista = Array.from(novosArquivos)
    const validos = lista.filter((f) => {
      const lower = f.name.toLowerCase()
      return lower.endsWith('.xml') || lower.endsWith('.zip')
    })

    if (validos.length === 0) return

    setArquivos((atuais) => {
      // Evita duplicar o mesmo nome de arquivo selecionado na lista local
      const nomes = new Set(atuais.map((a) => `${a.name}_${a.size}`))
      const unicos = validos.filter((f) => !nomes.has(`${f.name}_${f.size}`))
      return [...atuais, ...unicos]
    })
    // Se o usuário adicionou novos arquivos, reseta o resultado anterior
    setResultado(null)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      validarEAdicionarArquivos(e.dataTransfer.files)
    }
  }, [])

  const removerArquivo = (indice: number) => {
    setArquivos((atuais) => atuais.filter((_, i) => i !== indice))
    setResultado(null)
  }

  const limparTodosArquivos = () => {
    setArquivos([])
    setResultado(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const executarProcessamento = async () => {
    if (arquivos.length === 0 || processando) return

    setProcessando(true)
    try {
      const res = await processarArquivosLattes(arquivos)
      setResultado(res)
      if (onProcessado) {
        onProcessado(res)
      }
    } catch (err) {
      console.error('Erro ao processar arquivos Lattes:', err)
    } finally {
      setProcessando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="h-5 w-5 text-primary" />
            Importar currículos Lattes
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Selecione arquivos XML ou ZIP exportados da Plataforma Lattes (CNPq). O sistema extrairá
            as produções, orientações e bancas referentes ao recorte do quadriênio CAPES
            (2022–2025).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Área Drag and Drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5 scale-[0.99]'
                : 'border-slate-300 hover:border-primary/60 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xml,.zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  validarEAdicionarArquivos(e.target.files)
                }
              }}
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-800">
                Arraste e solte seus arquivos aqui ou{' '}
                <span className="text-primary underline">clique para procurar</span>
              </p>
              <p className="text-xs text-slate-500">
                Formatos aceitos: <strong>.xml</strong> ou <strong>.zip</strong> (contendo o XML
                oficial do Lattes). Pode selecionar múltiplos arquivos de uma vez.
              </p>
            </div>
          </div>

          {/* Dica de ajuda explicativa */}
          <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50 text-amber-900 border border-amber-200/70 text-xs">
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Aviso sobre o formato do arquivo:</p>
              <p className="mt-0.5 text-amber-800">
                O arquivo de download do Lattes é tipicamente um arquivo <strong>.zip</strong> ou{' '}
                <strong>.xml</strong> correspondente ao currículo de cada docente. Nenhum dado é
                gravado no banco neste passo.
              </p>
            </div>
          </div>

          {/* Lista de Arquivos Selecionados */}
          {arquivos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Arquivos selecionados ({arquivos.length})
                </span>
                <button
                  type="button"
                  onClick={limparTodosArquivos}
                  className="text-xs text-rose-600 hover:underline"
                  disabled={processando}
                >
                  Limpar todos
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-slate-50/50">
                {arquivos.map((arq, idx) => {
                  const isZip = arq.name.toLowerCase().endsWith('.zip')
                  return (
                    <div
                      key={`${arq.name}-${idx}`}
                      className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        {isZip ? (
                          <FileArchive className="h-4 w-4 text-amber-600 shrink-0" />
                        ) : (
                          <FileCode className="h-4 w-4 text-sky-600 shrink-0" />
                        )}
                        <span className="font-medium text-slate-800 truncate" title={arq.name}>
                          {arq.name}
                        </span>
                        <span className="text-slate-400 text-[11px] shrink-0">
                          ({formatarBytes(arq.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removerArquivo(idx)
                        }}
                        disabled={processando}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors disabled:opacity-40"
                        title="Remover arquivo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Erros Encontrados Durante o Processamento */}
          {resultado && resultado.erros.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-rose-900">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Problemas identificados em {resultado.erros.length} arquivo(s):</span>
              </div>
              <ul className="list-disc list-inside text-rose-700 pl-1 space-y-0.5">
                {resultado.erros.map((err, i) => (
                  <li key={i}>
                    <strong>{err.arquivo}:</strong> {err.mensagem}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resumo pós-processamento (Subetapa 1B) */}
          {resultado && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>Processamento concluído com sucesso!</span>
                </div>
                <Badge
                  variant="outline"
                  className="bg-emerald-100 text-emerald-800 border-emerald-300"
                >
                  {resultado.curriculosProcessadosCount} currículo(s) lido(s)
                </Badge>
              </div>

              {/* Lista de Docentes Identificados */}
              {resultado.resultados.length > 0 && (
                <div className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Docente(s) reconhecido(s): </span>
                  {resultado.resultados.map((r, i) => (
                    <span
                      key={i}
                      className="inline-block bg-white px-2 py-0.5 rounded border border-emerald-200 mr-1.5 my-0.5"
                    >
                      {r.nome_docente}{' '}
                      <span className="text-slate-400 font-mono text-[10px]">
                        ({r.id_lattes || 's/ ID'})
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Grade de Itens Válidos por Seção (Quadriênio 2022-2025) */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">
                  Itens únicos no quadriênio (2022–2025) pós-deduplicação:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {Object.values(resultado.resumoGeral.secoes).map((sec) => (
                    <div
                      key={sec.chave}
                      className="bg-white p-2 rounded border border-slate-200 flex flex-col justify-between"
                    >
                      <span className="text-slate-500 text-[11px] truncate">{sec.rotulo}</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-base font-bold text-slate-900">
                          {sec.totalValidos}
                        </span>
                        {(sec.totalDuplicados > 0 || sec.totalForaQuadrienio > 0) && (
                          <span
                            className="text-[10px] text-slate-400"
                            title={`Ignorados: ${sec.totalForaQuadrienio} fora do quadriênio, ${sec.totalDuplicados} duplicatas`}
                          >
                            +{sec.totalDuplicados + sec.totalForaQuadrienio} ign.
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aviso da subetapa 1C */}
              <div className="flex items-center gap-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded text-xs text-blue-900">
                <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Próximo passo (Subetapa 1C):</strong> Nesta subetapa os dados foram apenas
                  processados em memória. A tela de revisão detalhada com seleção de itens por
                  tabela será aberta na próxima versão antes de gravar no banco de dados.
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={processando}
          >
            {resultado ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button
            type="button"
            onClick={executarProcessamento}
            disabled={arquivos.length === 0 || processando}
            className="gap-2"
          >
            {processando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Processar arquivos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
