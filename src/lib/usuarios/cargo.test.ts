import { describe, it, expect } from 'vitest'
import { rotuloDoPapel, podeSerAdjunto, ROTULOS_PAPEL } from './cargo'

describe('cargo de coordenação (H-32)', () => {
  it('coordenador com o cargo de adjunto aparece como "Coordenador adjunto"', () => {
    expect(rotuloDoPapel('coordenador', 'coordenador_adjunto')).toBe('Coordenador adjunto')
    expect(rotuloDoPapel('coordenador', null)).toBe('Coordenador')
    expect(rotuloDoPapel('coordenador')).toBe('Coordenador')
  })
  it('o cargo não muda o rótulo de outros papéis', () => {
    expect(rotuloDoPapel('docente', 'coordenador_adjunto')).toBe('Docente')
  })
  it('nomes dos papéis como a coordenação os chama', () => {
    expect(ROTULOS_PAPEL.auxiliar).toBe('Apoio ao preenchimento (secretaria)')
    expect(ROTULOS_PAPEL.capes).toBe('Avaliador externo (CAPES)')
    expect(ROTULOS_PAPEL.suporte).toBe('Suporte técnico')
  })
  it('papel desconhecido devolve o próprio texto', () => {
    expect(rotuloDoPapel('xyz')).toBe('xyz')
    expect(rotuloDoPapel(null)).toBe('')
  })
  it('só o papel coordenador pode ser adjunto', () => {
    expect(podeSerAdjunto('coordenador')).toBe(true)
    for (const r of ['suporte', 'auxiliar', 'docente', 'capes', null]) {
      expect(podeSerAdjunto(r as any)).toBe(false)
    }
  })
})
