import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DocenteContato } from './DocenteContato'

const docente = { email: 'docente.ficticio@exemplo.br', cpf: '11122233344', siape: '1234567' }

describe('D-25 — linha de contato do docente na tabela', () => {
  it('mostra e-mail, CPF e SIAPE quando permitido', () => {
    const { container } = render(<DocenteContato docente={docente} mostrarDadosPessoais />)
    expect(container.textContent).toContain('docente.ficticio@exemplo.br')
    expect(container.textContent).toContain('CPF: 11122233344')
    expect(container.textContent).toContain('SIAPE: 1234567')
  })

  it('sem permissão, esconde CPF e SIAPE e mantém o e-mail', () => {
    const { container } = render(<DocenteContato docente={docente} mostrarDadosPessoais={false} />)
    expect(container.textContent).toContain('docente.ficticio@exemplo.br')
    expect(container.textContent).not.toContain('CPF')
    expect(container.textContent).not.toContain('11122233344')
    expect(container.textContent).not.toContain('SIAPE')
    expect(container.textContent).not.toContain('1234567')
  })

  it('não renderiza nada quando não há o que mostrar', () => {
    const { container } = render(
      <DocenteContato
        docente={{ email: '', cpf: '11122233344', siape: '1' }}
        mostrarDadosPessoais={false}
      />,
    )
    expect(container.innerHTML).toBe('')
  })
})
