import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog'

describe('Dialog responsivo para mobile e desktop', () => {
  it('DialogContent possui classes max-h-[90dvh] e overflow-y-auto para rolagem interna', () => {
    const html = renderToString(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Título do Modal</DialogTitle>
          </DialogHeader>
          <div className="h-[1200px]">Conteúdo longo de teste</div>
          <DialogFooter>
            <button type="button">Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    )

    // Altura máxima e rolagem interna no conteúdo do modal
    expect(html).toContain('max-h-[90dvh]')
    expect(html).toContain('overflow-y-auto')

    // Botão de fechar (Close) com fixed no mobile para permanecer visível e sm:absolute no desktop
    expect(html).toContain('fixed sm:absolute')
    expect(html).toContain('right-4 top-4')

    // Rodapé de ações (DialogFooter) sticky na base no mobile e sm:static no desktop
    expect(html).toContain('sticky bottom-0')
    expect(html).toContain('sm:static')
    expect(html).toContain('Salvar')
  })
})
