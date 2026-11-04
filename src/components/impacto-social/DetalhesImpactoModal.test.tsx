import { describe, it, expect } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { DetalhesImpactoModal } from './DetalhesImpactoModal'

const base = {
  open: true,
  onOpenChange: () => {},
  producoesTecnicas: [],
  patentes: [],
  premiacoes: [],
}
const impacto = (link: string) =>
  ({
    id: 1,
    titulo: 'Impacto Ficticio',
    descricao: 'Descricao',
    ano: 2025,
    link_comprovacao: link,
  }) as any

function abrir(link: string): string {
  cleanup()
  render(<DetalhesImpactoModal {...(base as any)} impacto={impacto(link)} />)
  return document.body.innerHTML
}

describe('Modal de detalhes do Impacto Social', () => {
  it('não mostra o ícone de estrelinhas (Sparkles) no título', () => {
    expect(abrir('https://lattes.cnpq.br/1')).not.toContain('lucide-sparkles')
  })

  it('link real: mostra "Link de Comprovação da Ação de Impacto" apontando para ele', () => {
    const html = abrir('https://lattes.cnpq.br/1234567890123456')
    expect(html).toContain('Link de Comprovação da Ação de Impacto')
    expect(html).toContain('href="https://lattes.cnpq.br/1234567890123456"')
  })

  it.each(['https://exemplo.com/impacto', 'https://example.com', '', 'texto qualquer'])(
    'link de exemplo ou inválido (%s): não mostra o link',
    (link) => {
      const html = abrir(link)
      expect(html).not.toContain('Link de Comprovação da Ação de Impacto')
      expect(html).not.toContain('exemplo.com')
    },
  )

  describe('Comprovantes dos registros vinculados (produção técnica, patente, premiação)', () => {
    const registros = (link: string) => ({
      ...base,
      totalVinculos: 3,
      producoesTecnicas: [
        {
          id: 1,
          titulo: 'Producao Ficticia',
          tipo: 'Software',
          autores: 'A',
          ano: 2025,
          link_comprovacao: link,
        },
      ],
      patentes: [
        {
          id: 2,
          titulo: 'Patente Ficticia',
          status: 'Pendente',
          autores: 'A',
          link_comprovacao: link,
        },
      ],
      premiacoes: [
        {
          id: 3,
          titulo: 'Premiacao Ficticia',
          nome_premiado: 'A',
          ano: 2025,
          link_comprovacao: link,
        },
      ],
    })
    const abrirComRegistros = (link: string) => {
      cleanup()
      render(<DetalhesImpactoModal {...(registros(link) as any)} impacto={impacto('')} />)
      return document.body.innerHTML
    }

    it('link real: mostra o "Comprovante" dos três tipos', () => {
      const html = abrirComRegistros('https://doi.org/10.1000/xyz')
      expect(html.match(/Comprovante/g)?.length).toBe(3)
    })

    it('link de exemplo: não mostra nenhum "Comprovante"', () => {
      const html = abrirComRegistros('https://exemplo.com/x')
      expect(html).not.toContain('Comprovante')
      expect(html).not.toContain('exemplo.com')
    })
  })
})
