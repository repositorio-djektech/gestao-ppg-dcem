import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { FrameHorizontalScrollbar, resolveScrollElement } from './FrameHorizontalScrollbar'

function setElementDimensions(
  el: HTMLElement,
  dimensions: { scrollWidth?: number; clientWidth?: number; scrollLeft?: number },
) {
  if (dimensions.scrollWidth !== undefined) {
    Object.defineProperty(el, 'scrollWidth', {
      value: dimensions.scrollWidth,
      configurable: true,
      writable: true,
    })
  }
  if (dimensions.clientWidth !== undefined) {
    Object.defineProperty(el, 'clientWidth', {
      value: dimensions.clientWidth,
      configurable: true,
      writable: true,
    })
  }
  if (dimensions.scrollLeft !== undefined) {
    Object.defineProperty(el, 'scrollLeft', {
      value: dimensions.scrollLeft,
      configurable: true,
      writable: true,
    })
  }
}

describe('resolveScrollElement', () => {
  it('retorna null se o elemento for null', () => {
    expect(resolveScrollElement(null)).toBeNull()
  })

  it('retorna o elemento direto se ele tiver overflow horizontal', () => {
    const el = document.createElement('div')
    setElementDimensions(el, { scrollWidth: 1500, clientWidth: 1000 })
    expect(resolveScrollElement(el)).toBe(el)
  })

  it('retorna o descendente .table-scroll-container se o externo não tiver overflow mas o interno tiver', () => {
    const outer = document.createElement('div')
    setElementDimensions(outer, { scrollWidth: 1000, clientWidth: 1000 })

    const inner = document.createElement('div')
    inner.className = 'relative w-full overflow-auto table-scroll-container'
    setElementDimensions(inner, { scrollWidth: 1800, clientWidth: 1000 })
    outer.appendChild(inner)

    expect(resolveScrollElement(outer)).toBe(inner)
  })

  it('retorna o elemento externo se nem ele nem o descendente tiverem overflow', () => {
    const outer = document.createElement('div')
    setElementDimensions(outer, { scrollWidth: 1000, clientWidth: 1000 })

    const inner = document.createElement('div')
    inner.className = 'table-scroll-container'
    setElementDimensions(inner, { scrollWidth: 1000, clientWidth: 1000 })
    outer.appendChild(inner)

    expect(resolveScrollElement(outer)).toBe(outer)
  })
})

describe('FrameHorizontalScrollbar', () => {
  let mockContainer: HTMLDivElement

  beforeEach(() => {
    mockContainer = document.createElement('div')
    setElementDimensions(mockContainer, {
      scrollWidth: 2000,
      clientWidth: 1000,
      scrollLeft: 0,
    })
  })

  it('não renderiza nada quando não há overflow horizontal (scrollWidth <= clientWidth + 1)', () => {
    setElementDimensions(mockContainer, {
      scrollWidth: 1000,
      clientWidth: 1000,
    })

    const ref = { current: mockContainer }
    const { container } = render(<FrameHorizontalScrollbar targetRef={ref} />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByTestId('frame-horizontal-scrollbar')).toBeNull()
  })

  it('não renderiza quando o externo e o descendente .table-scroll-container não têm overflow', () => {
    const outer = document.createElement('div')
    setElementDimensions(outer, { scrollWidth: 1000, clientWidth: 1000 })

    const inner = document.createElement('div')
    inner.className = 'table-scroll-container'
    setElementDimensions(inner, { scrollWidth: 1000, clientWidth: 1000 })
    outer.appendChild(inner)

    const ref = { current: outer }
    const { container } = render(<FrameHorizontalScrollbar targetRef={ref} />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByTestId('frame-horizontal-scrollbar')).toBeNull()
  })

  it('renderiza e manipula scroll no elemento INTERNO quando o externo não tem overflow mas o interno tem', () => {
    // Cenário idêntico ao shadcn <Table> aninhado:
    // Contêiner externo rola na vertical e tem scrollWidth === clientWidth
    const outer = document.createElement('div')
    setElementDimensions(outer, {
      scrollWidth: 1000,
      clientWidth: 1000,
      scrollLeft: 0,
    })

    // Contêiner interno do <Table> possui a classe table-scroll-container e overflow horizontal
    const inner = document.createElement('div')
    inner.className = 'relative w-full overflow-auto table-scroll-container'
    setElementDimensions(inner, {
      scrollWidth: 2000,
      clientWidth: 1000,
      scrollLeft: 0,
    })
    outer.appendChild(inner)

    const ref = { current: outer }
    render(<FrameHorizontalScrollbar targetRef={ref} />)

    const scrollbar = screen.getByTestId('frame-horizontal-scrollbar')
    const thumb = screen.getByTestId('frame-horizontal-scrollbar-thumb')
    expect(scrollbar).toBeDefined()
    expect(thumb.style.width).toBe('50%')

    // Mock do getBoundingClientRect do trilho (largura 500px, de 0 a 500)
    vi.spyOn(scrollbar, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 100,
      right: 500,
      bottom: 110,
      width: 500,
      height: 10,
      x: 0,
      y: 100,
      toJSON: () => {},
    })

    // Clique no meio do trilho (clientX = 250) deve alterar scrollLeft do elemento INTERNO
    fireEvent.pointerDown(scrollbar, { clientX: 250 })
    expect(inner.scrollLeft).toBeCloseTo(500, 0)
    // O externo permanece intocado em 0
    expect(outer.scrollLeft).toBe(0)

    // Testar arrasto no thumb refletindo no inner.scrollLeft
    thumb.setPointerCapture = vi.fn()
    thumb.releasePointerCapture = vi.fn()

    // Inicia arrasto em x = 50
    fireEvent.pointerDown(thumb, { clientX: 50, pointerId: 2 })
    expect(thumb.setPointerCapture).toHaveBeenCalledWith(2)

    // Move para x = 100 (delta +50px no espaço livre de 250px) -> +200px
    fireEvent.pointerMove(thumb, { clientX: 100, pointerId: 2 })
    expect(inner.scrollLeft).toBeCloseTo(700, 0) // 500 do clique + 200 do arrasto
    fireEvent.pointerUp(thumb, { pointerId: 2 })
  })

  it('renderiza o trilho e o polegar quando há overflow horizontal', () => {
    const ref = { current: mockContainer }
    render(<FrameHorizontalScrollbar targetRef={ref} />)

    const scrollbar = screen.getByTestId('frame-horizontal-scrollbar')
    const thumb = screen.getByTestId('frame-horizontal-scrollbar-thumb')

    expect(scrollbar).toBeDefined()
    expect(thumb).toBeDefined()
    expect(scrollbar.getAttribute('role')).toBe('scrollbar')
    expect(scrollbar.getAttribute('aria-orientation')).toBe('horizontal')
  })

  it('calcula a largura proporcional do thumb baseada em clientWidth / scrollWidth', () => {
    setElementDimensions(mockContainer, {
      clientWidth: 500,
      scrollWidth: 2000, // 500/2000 = 25%
    })

    const ref = { current: mockContainer }
    render(<FrameHorizontalScrollbar targetRef={ref} />)

    const thumb = screen.getByTestId('frame-horizontal-scrollbar-thumb')
    expect(thumb.style.width).toBe('25%')
    expect(thumb.style.left).toBe('0%')
  })

  it('atualiza a posição do thumb ao disparar evento de scroll no contêiner', () => {
    const ref = { current: mockContainer }
    render(<FrameHorizontalScrollbar targetRef={ref} />)

    const thumb = screen.getByTestId('frame-horizontal-scrollbar-thumb')
    expect(thumb.style.left).toBe('0%')

    // Rola para a metade do scroll máximo (scrollWidth - clientWidth = 1000, scrollLeft = 500)
    mockContainer.scrollLeft = 500
    act(() => {
      mockContainer.dispatchEvent(new Event('scroll'))
    })

    // Com thumb de 50% (1000/2000), o espaço restante é 50%, 50% do espaço = 25%
    expect(thumb.style.left).toBe('25%')
  })

  it('posiciona o scroll ao clicar em um ponto do trilho', () => {
    const ref = { current: mockContainer }
    render(<FrameHorizontalScrollbar targetRef={ref} />)

    const scrollbar = screen.getByTestId('frame-horizontal-scrollbar')

    // Mock do getBoundingClientRect do trilho (largura 500px, de 0 a 500)
    vi.spyOn(scrollbar, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 100,
      right: 500,
      bottom: 110,
      width: 500,
      height: 10,
      x: 0,
      y: 100,
      toJSON: () => {},
    })

    // Clique no meio do trilho (clientX = 250)
    fireEvent.pointerDown(scrollbar, { clientX: 250 })

    // O clique centraliza o thumb (largura 50%). Desejado ~500px de scrollLeft
    expect(mockContainer.scrollLeft).toBeCloseTo(500, 0)
  })

  it('arrasta o polegar e move o scrollLeft do contêiner', () => {
    const ref = { current: mockContainer }
    render(<FrameHorizontalScrollbar targetRef={ref} />)

    const scrollbar = screen.getByTestId('frame-horizontal-scrollbar')
    const thumb = screen.getByTestId('frame-horizontal-scrollbar-thumb')

    // Mock do setPointerCapture e releasePointerCapture
    thumb.setPointerCapture = vi.fn()
    thumb.releasePointerCapture = vi.fn()

    vi.spyOn(scrollbar, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 100,
      right: 500,
      bottom: 110,
      width: 500,
      height: 10,
      x: 0,
      y: 100,
      toJSON: () => {},
    })

    // Inicia arrasto em x = 50
    fireEvent.pointerDown(thumb, { clientX: 50, pointerId: 1 })
    expect(thumb.setPointerCapture).toHaveBeenCalledWith(1)

    // Move para x = 100 (delta +50px)
    fireEvent.pointerMove(thumb, { clientX: 100, pointerId: 1 })

    // Delta 50 num espaço livre de 250px (500 * (1 - 0.5)) -> 50/250 = 20% do scroll total (1000px) = 200px
    expect(mockContainer.scrollLeft).toBeCloseTo(200, 0)

    // Solta arrasto
    fireEvent.pointerUp(thumb, { pointerId: 1 })
    expect(thumb.releasePointerCapture).toHaveBeenCalledWith(1)
  })
})
