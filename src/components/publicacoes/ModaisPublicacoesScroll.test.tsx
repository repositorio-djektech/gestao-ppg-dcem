import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { SugerirQualisDialog } from './SugerirQualisDialog'
import { VincularAutoresDocentesDialog } from './VincularAutoresDocentesDialog'

describe('Estrutura de Header e Footer fixos e rolagem interna em modais de Publicações', () => {
  it('SugerirQualisDialog possui header e footer fixos e corpo scrollável interno', () => {
    const html = renderToString(
      <SugerirQualisDialog open={true} onOpenChange={() => {}} onSucesso={() => {}} />,
    )

    // DialogContent tem altura limitada e overflow-hidden para não expandir além da viewport
    expect(html).toContain('max-w-4xl')
    expect(html).toContain('h-[85vh]')
    expect(html).toContain('max-h-[85vh]')
    expect(html).toContain('flex flex-col')
    expect(html).toContain('overflow-hidden')

    // Header fixo (shrink-0)
    expect(html).toContain('Sugestão Automática de Estrato Qualis (OpenAlex / Scopus)')
    expect(html).toContain('shrink-0 pr-12')

    // Corpo central com flex-1 min-h-0 overflow-y-auto
    expect(html).toContain('flex-1 min-h-0 overflow-y-auto')

    // Rodapé fixo na base (shrink-0 e mt-auto)
    expect(html).toContain('mt-auto border-t border-slate-200')
    expect(html).toContain('Fechar')
    expect(html).toContain('Confirmar Selecionadas')
  })

  it('VincularAutoresDocentesDialog possui header e footer fixos, corpo scrollável e textos "Vínculo"', () => {
    const html = renderToString(
      <VincularAutoresDocentesDialog open={true} onOpenChange={() => {}} onSucesso={() => {}} />,
    )

    // Estrutura de fixação e rolagem interna
    expect(html).toContain('max-w-4xl')
    expect(html).toContain('h-[85vh]')
    expect(html).toContain('max-h-[85vh]')
    expect(html).toContain('flex flex-col')
    expect(html).toContain('overflow-hidden')

    // Header fixo (shrink-0)
    expect(html).toContain('Vínculo Automático Autor → Docente')
    expect(html).not.toContain('Casamento Automático Autor → Docente')
    expect(html).not.toContain('Casamento')

    // Corpo central com flex-1 min-h-0 overflow-y-auto
    expect(html).toContain('flex-1 min-h-0 overflow-y-auto')

    // Rodapé fixo (shrink-0 e mt-auto)
    expect(html).toContain('mt-auto border-t border-slate-200')
    expect(html).toContain('Fechar')
    expect(html).toContain('Confirmar Selecionadas')
  })
})
