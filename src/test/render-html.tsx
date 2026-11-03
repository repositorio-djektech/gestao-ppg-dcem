import type { ReactElement } from 'react'
import { render } from '@testing-library/react'

/**
 * Monta o elemento de verdade (com efeitos) e devolve o HTML do document.body.
 * Serve a diálogos do Radix, que renderizam num portal e por isso saem vazios em renderToString.
 * A limpeza entre testes é automática (globals: true no vitest.config.ts).
 */
export function renderHtmlDoBody(el: ReactElement): string {
  render(el)
  return document.body.innerHTML
}
