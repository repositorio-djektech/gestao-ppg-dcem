import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, renderHook, waitFor, act, fireEvent } from '@testing-library/react'

vi.mock('@/services/discentes', () => ({
  discentesService: {
    list: vi.fn(async () => [
      { id: 2, nome: 'Bruna Fictícia', tipo_curso: 'Mestrado' },
      { id: 1, nome: 'Ana Fictícia', tipo_curso: 'Doutorado' },
    ]),
  },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

import { SeletorDiscentes, useDiscentesVinculados } from './discentes-vinculados'

const discentes: any[] = [
  { id: 1, nome: 'Ana Fictícia', tipo_curso: 'Doutorado' },
  { id: 2, nome: 'Bruna Fictícia', tipo_curso: 'Mestrado' },
]

describe('SeletorDiscentes', () => {
  it('mostra os selecionados e remove um deles', () => {
    const onChange = vi.fn()
    render(<SeletorDiscentes discentes={discentes} selecionados={[1, 2]} onChange={onChange} />)
    expect(screen.getByText('Ana Fictícia')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Remover Ana Fictícia'))
    expect(onChange).toHaveBeenCalledWith([2])
  })

  it('avisa quando não há nenhum discente ligado', () => {
    render(<SeletorDiscentes discentes={discentes} selecionados={[]} onChange={() => {}} />)
    expect(screen.getByText('Nenhum discente vinculado')).toBeTruthy()
  })
})

describe('useDiscentesVinculados', () => {
  const servico = {
    listarPorRegistro: vi.fn(async () => ({ 10: [1] })),
    sincronizar: vi.fn(async () => undefined),
  } as any

  beforeEach(() => {
    servico.sincronizar.mockClear()
  })

  it('create grava o registro sem discentes_ids e sincroniza os vínculos depois', async () => {
    const { result } = renderHook(() => useDiscentesVinculados(servico))
    await waitFor(() => expect(servico.listarPorRegistro).toHaveBeenCalled())
    const base = {
      create: vi.fn(async (i: any) => ({ id: 77, ...i })),
      update: vi.fn(),
    }
    const envolvido = result.current.envolverServico(base as any)
    await act(async () => {
      await envolvido.create({ titulo: 'X', discentes_ids: [1, 2] })
    })
    expect(base.create).toHaveBeenCalledWith({ titulo: 'X' })
    expect(servico.sincronizar).toHaveBeenCalledWith(77, [1, 2])
  })

  it('update sincroniza com o id editado e não repassa discentes_ids ao serviço base', async () => {
    const { result } = renderHook(() => useDiscentesVinculados(servico))
    await waitFor(() => expect(servico.listarPorRegistro).toHaveBeenCalled())
    const base = { create: vi.fn(), update: vi.fn(async (_id: any, i: any) => i) }
    const envolvido = result.current.envolverServico(base as any)
    await act(async () => {
      await envolvido.update(10, { titulo: 'Y', discentes_ids: [] })
    })
    expect(base.update).toHaveBeenCalledWith(10, { titulo: 'Y' })
    expect(servico.sincronizar).toHaveBeenCalledWith(10, [])
  })

  it('não mexe nos vínculos quando o formulário não tocou no campo', async () => {
    const { result } = renderHook(() => useDiscentesVinculados(servico))
    await waitFor(() => expect(servico.listarPorRegistro).toHaveBeenCalled())
    const base = { create: vi.fn(), update: vi.fn(async (_id: any, i: any) => i) }
    await act(async () => {
      await result.current.envolverServico(base as any).update(10, { titulo: 'Z' })
    })
    expect(servico.sincronizar).not.toHaveBeenCalled()
  })
})
