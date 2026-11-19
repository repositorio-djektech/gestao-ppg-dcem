import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import { CadastroRapidoAluno } from './CadastroRapidoAluno'

afterEach(cleanup)

describe('Formulário de cadastro rápido de aluno/egresso', () => {
  it('só habilita o botão com nome completo; discente não pede ano', () => {
    const onSalvar = vi.fn()
    render(<CadastroRapidoAluno onSalvar={onSalvar} onCancelar={() => {}} />)
    const botao = screen.getByRole('button', { name: /cadastrar e vincular/i }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    expect(screen.queryByLabelText(/ano de titula/i)).toBeNull()

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'Aluno Ficticio Novo' },
    })
    expect(botao.disabled).toBe(false)
    fireEvent.click(botao)
    expect(onSalvar).toHaveBeenCalledWith({
      tipo: 'discente',
      nome: 'Aluno Ficticio Novo',
      tipoCurso: 'Mestrado',
      anoTitulacao: null,
    })
  })

  it('egresso exige o ano de titulação', () => {
    const onSalvar = vi.fn()
    render(<CadastroRapidoAluno onSalvar={onSalvar} onCancelar={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^egresso$/i }))
    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'Egresso Ficticio' },
    })
    const botao = screen.getByRole('button', { name: /cadastrar e vincular/i }) as HTMLButtonElement
    expect(botao.disabled).toBe(true) // falta o ano

    fireEvent.change(screen.getByLabelText(/ano de titula/i), { target: { value: '2025' } })
    expect(botao.disabled).toBe(false)
    fireEvent.click(botao)
    expect(onSalvar).toHaveBeenCalledWith({
      tipo: 'egresso',
      nome: 'Egresso Ficticio',
      tipoCurso: 'Mestrado',
      anoTitulacao: 2025,
    })
  })

  it('cancelar fecha sem salvar', () => {
    const onSalvar = vi.fn()
    const onCancelar = vi.fn()
    render(<CadastroRapidoAluno onSalvar={onSalvar} onCancelar={onCancelar} />)
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onCancelar).toHaveBeenCalled()
    expect(onSalvar).not.toHaveBeenCalled()
  })
})
