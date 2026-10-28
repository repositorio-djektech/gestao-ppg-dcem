import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModalExcluirDocente } from './ModalExcluirDocente'
import type { Docente } from '@/types/database'

const docenteMock: Docente = {
  id: 8,
  nome: 'Zélia Soares Macedo',
  cpf: '09117145880',
  siape: '2243395',
  email: 'zelia@ufs.br',
  categoria: 'permanente',
  scopus_id: '6602703039',
  indice_h: 22,
  bolsa_cnpq: 'PQ-1C',
  jdp: false,
  licenca: '',
  id_lattes: '5800602432918020',
  openalex_id: 'A5056544714',
  orc_id: '0000-0002-8577-7622',
  status: true,
  jdp_desde: null,
  ano_doutorado: null,
}

describe('ModalExcluirDocente', () => {
  it('exibe o nome completo do docente exatamente como cadastrado', () => {
    render(
      <ModalExcluirDocente
        open={true}
        onOpenChange={() => {}}
        docente={docenteMock}
        onConfirmar={vi.fn()}
      />,
    )

    const elementoNome = screen.getByTestId('docente-nome-alvo')
    expect(elementoNome.textContent).toBe('Zélia Soares Macedo')
  })

  it('mantém o botão de confirmação desabilitado quando o campo está vazio ou com texto incorreto', () => {
    render(
      <ModalExcluirDocente
        open={true}
        onOpenChange={() => {}}
        docente={docenteMock}
        onConfirmar={vi.fn()}
      />,
    )

    const btnConfirmar = screen.getByTestId('btn-confirmar-exclusao') as HTMLButtonElement
    const input = screen.getByTestId('input-confirmacao-nome') as HTMLInputElement

    // Inicialmente vazio -> desabilitado
    expect(btnConfirmar.disabled).toBe(true)

    // Nome digitado sem acento -> desabilitado (exige mesma acentuação)
    fireEvent.change(input, { target: { value: 'Zelia Soares Macedo' } })
    expect(btnConfirmar.disabled).toBe(true)

    // Nome incompleto -> desabilitado
    fireEvent.change(input, { target: { value: 'Zélia' } })
    expect(btnConfirmar.disabled).toBe(true)

    // Espaço a mais ou letra minúscula divergente -> desabilitado
    fireEvent.change(input, { target: { value: 'zélia soares macedo' } })
    expect(btnConfirmar.disabled).toBe(true)
  })

  it('habilita o botão de confirmação apenas quando o texto digitado for idêntico ao nome exibido e aciona o callback', async () => {
    const handleConfirmar = vi.fn().mockResolvedValue(undefined)

    render(
      <ModalExcluirDocente
        open={true}
        onOpenChange={() => {}}
        docente={docenteMock}
        onConfirmar={handleConfirmar}
      />,
    )

    const btnConfirmar = screen.getByTestId('btn-confirmar-exclusao') as HTMLButtonElement
    const input = screen.getByTestId('input-confirmacao-nome') as HTMLInputElement

    // Digita o nome exato
    fireEvent.change(input, { target: { value: 'Zélia Soares Macedo' } })
    expect(btnConfirmar.disabled).toBe(false)

    // Clica no botão
    fireEvent.click(btnConfirmar)
    expect(handleConfirmar).toHaveBeenCalledTimes(1)
    expect(handleConfirmar).toHaveBeenCalledWith(docenteMock)
  })

  it('limpa o campo de confirmação ao reabrir para outro docente', () => {
    const { rerender } = render(
      <ModalExcluirDocente
        open={true}
        onOpenChange={() => {}}
        docente={docenteMock}
        onConfirmar={vi.fn()}
      />,
    )

    const input = screen.getByTestId('input-confirmacao-nome') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Zélia Soares Macedo' } })
    expect(input.value).toBe('Zélia Soares Macedo')

    const outroDocente: Docente = {
      ...docenteMock,
      id: 5,
      nome: 'Euler Araujo dos Santos',
    }

    rerender(
      <ModalExcluirDocente
        open={true}
        onOpenChange={() => {}}
        docente={outroDocente}
        onConfirmar={vi.fn()}
      />,
    )

    const inputAtualizado = screen.getByTestId('input-confirmacao-nome') as HTMLInputElement
    expect(inputAtualizado.value).toBe('')
    const btnConfirmar = screen.getByTestId('btn-confirmar-exclusao') as HTMLButtonElement
    expect(btnConfirmar.disabled).toBe(true)
  })
})
