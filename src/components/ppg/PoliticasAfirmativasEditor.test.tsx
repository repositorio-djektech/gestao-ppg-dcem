import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PoliticasAfirmativasEditor } from './PoliticasAfirmativasEditor'

describe('H-10 — editor do texto do item 1.3', () => {
  it('coordenação edita e salva o texto', () => {
    const onSalvar = vi.fn()
    render(<PoliticasAfirmativasEditor texto="Inicial" podeEditar onSalvar={onSalvar} />)
    const campo = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(campo, { target: { value: 'Novo texto ficticio' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(onSalvar).toHaveBeenCalledWith('Novo texto ficticio')
  })

  it('quem não é coordenação só lê: sem campo de edição e sem botão salvar', () => {
    render(
      <PoliticasAfirmativasEditor texto="Texto vigente" podeEditar={false} onSalvar={vi.fn()} />,
    )
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /salvar/i })).toBeNull()
    expect(screen.getByText('Texto vigente')).toBeTruthy()
  })

  it('sem texto cadastrado, avisa em vez de mostrar vazio', () => {
    render(<PoliticasAfirmativasEditor texto="" podeEditar={false} onSalvar={vi.fn()} />)
    expect(screen.getByText(/ainda não foi cadastrado/i)).toBeTruthy()
  })

  it('mostra o contador e bloqueia salvar acima do limite', () => {
    const onSalvar = vi.fn()
    render(<PoliticasAfirmativasEditor texto="" podeEditar onSalvar={onSalvar} limite={10} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x'.repeat(11) } })
    expect(screen.getByText(/11\s*\/\s*10/)).toBeTruthy()
    const botao = screen.getByRole('button', { name: /salvar/i }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    fireEvent.click(botao)
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('não permite salvar sem alteração', () => {
    render(<PoliticasAfirmativasEditor texto="Igual" podeEditar onSalvar={vi.fn()} />)
    expect((screen.getByRole('button', { name: /salvar/i }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })
})
