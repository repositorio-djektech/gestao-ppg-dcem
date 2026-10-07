import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw, ChevronDown } from 'lucide-react'

export interface RevisaoBoundaryProps {
  children?: ReactNode
  /** Nome ou rótulo opcional da seção protegida para exibição no fallback */
  nomeSecao?: string
  /** Ação opcional a ser disparada ao clicar no botão voltar/reset */
  onVoltar?: () => void
  /** Callback opcional chamado quando um erro é capturado */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

export interface RevisaoBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * Error Boundary de classe React para isolamento de erros de renderização
 * dentro da tela de revisão de importação Lattes.
 *
 * Evita o desmonte da aplicação inteira (tela branca) caso uma aba específica
 * ou componente interno sofra um erro em tempo de renderização.
 */
export class RevisaoBoundary extends Component<RevisaoBoundaryProps, RevisaoBoundaryState> {
  constructor(props: RevisaoBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): RevisaoBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Erro capturado pelo RevisaoBoundary:', error, errorInfo)
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo)
      } catch (cbErr) {
        console.error('Erro no callback onError do RevisaoBoundary:', cbErr)
      }
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    if (this.props.onVoltar) {
      this.props.onVoltar()
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const { nomeSecao, onVoltar } = this.props
      const titulo = nomeSecao
        ? `Erro ao exibir a seção "${nomeSecao}"`
        : 'Erro ao exibir esta seção'
      const mensagemErro = this.state.error?.message || 'Erro desconhecido de renderização'
      const stackErro = this.state.error?.stack || ''
      const componentStack = this.state.errorInfo?.componentStack || ''

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-slate-50/80 rounded-lg border border-slate-200 min-h-[320px] m-2"
        >
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4 shrink-0 shadow-sm">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">{titulo}</h3>

          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mb-4 leading-relaxed">
            Não foi possível renderizar os dados desta aba. Os demais dados continuam disponíveis.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {onVoltar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-1.5 text-xs"
              >
                Voltar
              </Button>
            )}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={this.handleReset}
              className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Tentar novamente
            </Button>
          </div>

          {/* Detalhe técnico do erro recolhido para diagnóstico */}
          <details className="w-full max-w-xl text-left bg-white border border-slate-200 rounded-md p-3 text-xs text-slate-700 cursor-pointer group">
            <summary className="font-medium text-slate-700 flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 group-hover:text-slate-800">
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                Detalhes técnicos do erro (para diagnóstico)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {this.state.error?.name ?? 'Error'}
              </span>
            </summary>
            <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2 cursor-text select-text">
              <div className="bg-rose-50 text-rose-900 p-2 rounded text-[11px] font-mono break-words border border-rose-100">
                <strong>Mensagem:</strong> {mensagemErro}
              </div>
              {stackErro && (
                <div className="text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded max-h-36 overflow-y-auto whitespace-pre-wrap break-all border border-slate-100">
                  {stackErro}
                </div>
              )}
              {componentStack && (
                <div className="text-[10px] font-mono text-slate-500 bg-slate-50 p-2 rounded max-h-28 overflow-y-auto whitespace-pre-wrap break-all border border-slate-100">
                  <strong>Component Stack:</strong>
                  {componentStack}
                </div>
              )}
            </div>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Export alias para compatibilidade com usos existentes de RevisaoErrorBoundary.
 */
export const RevisaoErrorBoundary = RevisaoBoundary
