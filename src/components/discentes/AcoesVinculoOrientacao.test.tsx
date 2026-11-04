import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AcoesVinculoOrientacao } from './AcoesVinculoOrientacao'

const DOCENTE = 42
const OUTRO = 99

function renderizar(
  props: Partial<React.ComponentProps<typeof AcoesVinculoOrientacao>> & {
    discente: { id: number; docente_orientador_id: number | null }
  },
) {
  const onAssumir = vi.fn()
  render(
    <AcoesVinculoOrientacao
      role="docente"
      docenteId={DOCENTE}
      onAssumir={onAssumir}
      {...props}
    />,
  )
  return { onAssumir }
}

describe('H-01 — ação de vínculo do docente na lista de discentes (sem autovinculação como coorientador)', () => {
  it('discente sem orientador: mostra "Assumir orientação" e chama o callback', () => {
    const { onAssumir } = renderizar({
      discente: { id: 1, docente_orientador_id: null },
    })
    fireEvent.click(screen.getByRole('button', { name: /assumir orientação/i }))
    expect(onAssumir).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /coorientador/i })).toBeNull()
  })

  it('discente com outro orientador: nenhuma ação (o docente NÃO se inclui como coorientador; a coordenação vincula)', () => {
    renderizar({ discente: { id: 2, docente_orientador_id: OUTRO } })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('já é orientador principal: nenhuma ação de vínculo', () => {
    renderizar({ discente: { id: 3, docente_orientador_id: DOCENTE } })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('coordenação e capes não veem as ações (a coordenação edita o orientador pelo formulário)', () => {
    for (const role of ['coordenador', 'auxiliar', 'suporte', 'capes'] as const) {
      const { unmount } = render(
        <AcoesVinculoOrientacao
          role={role}
          docenteId={DOCENTE}
          discente={{ id: 5, docente_orientador_id: null }}
          onAssumir={vi.fn()}
        />,
      )
      expect(screen.queryByRole('button')).toBeNull()
      unmount()
    }
  })

  it('ocupado desabilita o botão para evitar clique duplo', () => {
    renderizar({ discente: { id: 6, docente_orientador_id: null }, ocupado: true })
    expect(
      (screen.getByRole('button', { name: /assumir orientação/i }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})
