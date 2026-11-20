import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import React from 'react'
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'

const upload = vi.fn()
vi.mock('@/lib/storage/comprovantes-projetos', () => ({
  uploadComprovanteProjeto: (...a: any[]) => upload(...a),
}))
vi.mock('@/services/projetos-pesquisa', () => ({
  projetosPesquisaService: {
    list: () =>
      Promise.resolve([
        { id: 2, titulo: 'Projeto Beta Ficticio' },
        { id: 1, titulo: 'Projeto Alfa Ficticio' },
      ]),
  },
}))
vi.mock('@/services/linhas-pesquisa', () => ({
  linhasPesquisaService: {
    list: () =>
      Promise.resolve([
        { id: 8, nome: 'Linha Zeta Ficticia' },
        { id: 7, nome: 'Linha Alfa Ficticia' },
      ]),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import {
  campoComprovantePdf,
  campoProjetoVinculado,
  campoLinhaVinculada,
  carregarOpcoesProjetos,
  carregarOpcoesLinhas,
} from './campos-extras'

beforeEach(() => upload.mockReset())
afterEach(cleanup)

function Harness({ inicial = {} }: { inicial?: Record<string, any> }) {
  const [form, setForm] = React.useState<Record<string, any>>(inicial)
  const campo = campoComprovantePdf('eventos', 'Comprovante do Evento (PDF)')
  return (
    <div>
      {campo.customRender!({ formData: form, setFormData: setForm, submitting: false })}
      <output data-testid="url">{form.comprovante_url ?? ''}</output>
    </div>
  )
}

describe('campos extras dos formulários (H-31)', () => {
  it('as opções de projeto e linha vêm em ordem alfabética com "Sem vínculo" primeiro', async () => {
    const projetos = await carregarOpcoesProjetos()
    expect(projetos.map((o) => o.label)).toEqual([
      '— Sem vínculo —',
      'Projeto Alfa Ficticio',
      'Projeto Beta Ficticio',
    ])
    expect(projetos[0].value).toBe('')
    const linhas = await carregarOpcoesLinhas()
    expect(linhas.map((o) => o.label)).toEqual([
      '— Sem vínculo —',
      'Linha Alfa Ficticia',
      'Linha Zeta Ficticia',
    ])
  })

  it('os campos de vínculo usam as colunas projeto_id e linha_pesquisa_id', () => {
    expect(campoProjetoVinculado()).toMatchObject({ key: 'projeto_id', type: 'select' })
    expect(campoLinhaVinculada()).toMatchObject({ key: 'linha_pesquisa_id', type: 'select' })
  })

  it('anexar PDF envia para a pasta do módulo e guarda a URL', async () => {
    upload.mockResolvedValue({ url: 'https://exemplo.test/arquivo.pdf' })
    render(<Harness />)
    const input = screen.getByLabelText('Comprovante do Evento (PDF)') as HTMLInputElement
    const arquivo = new File(['%PDF-1.4'], 'certificado.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [arquivo] } })
    await waitFor(() =>
      expect(screen.getByTestId('url').textContent).toBe('https://exemplo.test/arquivo.pdf'),
    )
    expect(upload.mock.calls[0][3]).toBe('eventos')
    expect(screen.getByText('Anexado')).toBeTruthy()
  })

  it('recusa arquivo que não é PDF, sem enviar', async () => {
    render(<Harness />)
    const input = screen.getByLabelText('Comprovante do Evento (PDF)') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] },
    })
    await new Promise((r) => setTimeout(r, 20))
    expect(upload).not.toHaveBeenCalled()
  })

  it('remover anexo limpa a URL', () => {
    render(<Harness inicial={{ comprovante_url: 'https://exemplo.test/a.pdf' }} />)
    fireEvent.click(screen.getByRole('button', { name: /remover anexo/i }))
    expect(screen.getByTestId('url').textContent).toBe('')
  })
})
