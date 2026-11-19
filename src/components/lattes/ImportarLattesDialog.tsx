import { useState, useRef, useCallback, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Upload,
  FileCode,
  FileArchive,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  TableProperties,
} from 'lucide-react'
import { processarArquivosLattes, type ResultadoProcessamentoLattes } from '@/lib/lattes/processor'
import { usePeriodo } from '@/hooks/use-periodo'
import { RevisaoImportacaoDialog } from './RevisaoImportacaoDialog'

import type { RelatorioGravacaoLattes } from '@/lib/lattes/gravar'

interface ImportarLattesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProcessado?: (resultado: ResultadoProcessamentoLattes) => void
  onAbrirRevisao?: (resultado: ResultadoProcessamentoLattes) => void
  onGravacaoSucesso?: (relatorio: RelatorioGravacaoLattes) => void
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
  onGravacaoSucesso,
}: ImportarLattesDialogProps) {
  const [arquivos, setArquivos] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoProcessamentoLattes | null>(null)
  const [revisaoOpen, setRevisaoOpen] = useState(false)
  // Janela da importação (D-31): padrão desde 2020, ajustável a cada importação
  // Janela padrão vinda da configuração (D-32); cada importação ainda pode ajustá-la
  const { janelaLattes: janelaPadrao } = usePeriodo()
  const [anoInicio, setAnoInicio] = useState<number>(janelaPadrao.anoInicio)
  const [anoFim, setAnoFim] = useState<number>(janelaPadrao.anoFim)
  useEffect(() => {
    setAnoInicio(janelaPadrao.anoInicio)
    setAnoFim(janelaPadrao.anoFim)
  }, [janelaPadrao.anoInicio, janelaPadrao.anoFim])
  const janelaValida =
    Number.isInteger(anoInicio) &&
    Number.isInteger(anoFim) &&
    anoInicio >= 1990 &&
    anoFim <= 2100 &&
    anoInicio <= anoFim
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFecharComLimpeza = () => {
    if (processando) return
    setArquivos([])
    setResultado(null)
    setIsDragging(false)
    setRevisaoOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onOpenChange(false)
  }

  // Reseta seleção ao fechar
  const handleOpenChange = (proximoOpen: boolean) => {
    if (!proximoOpen && !processando) {
      setArquivos([])
      setResultado(null)
      setIsDragging(false)
      setRevisaoOpen(false)
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
    if (arquivos.length === 0 || processando || !janelaValida) return

    setProcessando(true)
    try {
      const res = await processarArquivosLattes(arquivos, { anoInicio, anoFim })
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
          <DialogTitle className="flex items-center gap-2 text-xl text-primary font-bold">
            <Upload className="h-5 w-5 text-primary" />
            Importar Currículos Lattes (XML)
          </DialogTitle>{' '}
          <DialogDescription className="text-slate-600">
            Selecione arquivos XML ou ZIP exportados da Plataforma Lattes (CNPq). O sistema extrairá
            as produções e orientações do período escolhido abaixo ({anoInicio}–{anoFim}).
            Orientações e projetos em andamento sempre entram, qualquer que seja o ano de início.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Período da importação */}
          <div className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="space-y-1">
              <Label htmlFor="lattes-ano-inicio" className="text-xs text-slate-700">
                Importar a partir de
              </Label>
              <Input
                id="lattes-ano-inicio"
                type="number"
                min={1990}
                max={2100}
                value={Number.isNaN(anoInicio) ? '' : anoInicio}
                disabled={processando}
                onChange={(e) => {
                  setAnoInicio(e.target.value === '' ? NaN : Number(e.target.value))
                  setResultado(null)
                }}
                className="h-9 w-28 bg-white text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lattes-ano-fim" className="text-xs text-slate-700">
                Até
              </Label>
              <Input
                id="lattes-ano-fim"
                type="number"
                min={1990}
                max={2100}
                value={Number.isNaN(anoFim) ? '' : anoFim}
                disabled={processando}
                onChange={(e) => {
                  setAnoFim(e.target.value === '' ? NaN : Number(e.target.value))
                  setResultado(null)
                }}
                className="h-9 w-28 bg-white text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-500 flex-1 min-w-[12rem]">
              O período de avaliação da CAPES não muda: os indicadores continuam calculando só o
              período de avaliação. Os anos anteriores ficam disponíveis para consulta e filtros.
            </p>
            {!janelaValida && (
              <p className="w-full text-[11px] text-rose-700">
                Informe anos válidos (de 1990 a 2100), com o inicial menor ou igual ao final.
              </p>
            )}
          </div>

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
                        className="text-red-500 hover:text-red-700 p-1 rounded transition-colors disabled:opacity-40"
                        title="Remover arquivo"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
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

              {/* Grade de Itens Válidos por Seção (janela de importação) */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">
                  Itens únicos no período ({anoInicio}–{anoFim}) pós-deduplicação:
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

              {/* Aviso da subetapa 1C e Botão de Acesso Direto à Revisão */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50/80 border border-blue-200 rounded text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <TableProperties className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Dados prontos para revisão:</strong> Você pode inspecionar os registros
                    divididos por tabela, escolher quais incluir e conferir os dados antes de
                    gravar.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setRevisaoOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1.5 h-8 text-xs font-semibold"
                >
                  <TableProperties className="h-3.5 w-3.5" />
                  Revisar registros por tabela
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleFecharComLimpeza}
            disabled={processando}
            className="bg-white hover:bg-slate-50"
          >
            Cancelar
          </Button>
          {resultado ? (
            <Button
              type="button"
              onClick={() => setRevisaoOpen(true)}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <TableProperties className="h-4 w-4" />
              Revisar dados ({resultado.curriculosProcessadosCount} currículo(s))
            </Button>
          ) : (
            <Button
              type="button"
              onClick={executarProcessamento}
              disabled={arquivos.length === 0 || processando || !janelaValida}
              className="gap-2"
            >
              {processando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>Processar arquivos</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Diálogo de Revisão por Tabela (Subetapa 1C + 2B) */}
      <RevisaoImportacaoDialog
        open={revisaoOpen}
        onOpenChange={setRevisaoOpen}
        resultado={resultado}
        janela={{ anoInicio, anoFim }}
        onVoltarParaUpload={() => setRevisaoOpen(false)}
        onGravacaoSucesso={(relatorio) => {
          if (onGravacaoSucesso) {
            onGravacaoSucesso(relatorio)
          }
        }}
      />
    </Dialog>
  )
}
