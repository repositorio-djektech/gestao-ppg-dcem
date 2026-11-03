import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderHtmlDoBody } from '@/test/render-html'
import { SugerirQualisDialog } from './SugerirQualisDialog'
import { VincularAutoresDocentesDialog } from './VincularAutoresDocentesDialog'

describe('Estrutura de Header e Footer fixos e rolagem interna em modais de Publicações', () => {
  it('SugerirQualisDialog possui header e footer fixos e corpo scrollável interno', () => {
    const html = renderHtmlDoBody(
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

    // Corpo central com flex-1 min-h-0 overflow-y-auto (englobando estatísticas, filtros, ações em massa e lista)
    expect(html).toContain('flex-1 min-h-0 overflow-y-auto')

    // Verifica que as barras de estatísticas e filtros estão dentro do contêiner de scroll e não têm shrink-0
    // O DialogHeader é um <div>: o corpo rolável (flex-1 min-h-0 overflow-y-auto) separa header e corpo
    const [headerParte, resto] = html.split('flex-1 min-h-0 overflow-y-auto')
    const [corpoScroll, footerParte] = resto.split('mt-auto border-t border-slate-200')

    expect(headerParte).toContain('Sugestão Automática de Estrato Qualis')
    expect(headerParte).not.toContain('analisadas')
    expect(headerParte).not.toContain('Filtrar por periódico')

    expect(corpoScroll).toContain('analisadas')
    expect(corpoScroll).toContain('Filtrar por periódico, título ou DOI...')
    expect(corpoScroll).toContain('Marcar Alta Confiança')

    // Rodapé fixo na base (shrink-0 e mt-auto)
    expect(footerParte).toContain('Fechar')
    expect(footerParte).toContain('Confirmar Selecionadas')
  })

  it('VincularAutoresDocentesDialog possui header e footer fixos, corpo scrollável e textos "Vínculo"', () => {
    const html = renderHtmlDoBody(
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

    const [headerParte, resto] = html.split('flex-1 min-h-0 overflow-y-auto')
    const [corpoScroll, footerParte] = resto.split('mt-auto border-t border-slate-200')

    expect(headerParte).toContain('Vínculo Automático Autor → Docente')
    expect(headerParte).not.toContain('Filtrar por docente')

    expect(corpoScroll).toContain('Filtrar por docente, autor no artigo ou título...')
    expect(corpoScroll).toContain('Marcar apenas Alta Confiança')

    // Rodapé fixo (shrink-0 e mt-auto)
    expect(footerParte).toContain('Fechar')
    expect(footerParte).toContain('Confirmar Selecionadas')
  })
})
