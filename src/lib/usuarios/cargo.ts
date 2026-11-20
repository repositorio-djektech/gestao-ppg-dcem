/**
 * Cargo de coordenação (H-32): o coordenador adjunto tem o papel `coordenador` (mesmas permissões)
 * e um cargo que só rotula. Também reúne os nomes dos papéis como a coordenação os chama.
 */
import type { Role } from '@/types/database'

export type Cargo = 'coordenador_adjunto'

export const ROTULOS_PAPEL: Record<Role, string> = {
  suporte: 'Suporte técnico',
  coordenador: 'Coordenador',
  auxiliar: 'Apoio ao preenchimento (secretaria)',
  docente: 'Docente',
  capes: 'Avaliador externo (CAPES)',
}

export const ROTULO_ADJUNTO = 'Coordenador adjunto'

/** Rótulo para exibir: coordenador com o cargo de adjunto vira "Coordenador adjunto". */
export function rotuloDoPapel(role: string | null | undefined, cargo?: string | null): string {
  if (role === 'coordenador' && cargo === 'coordenador_adjunto') return ROTULO_ADJUNTO
  return (ROTULOS_PAPEL as Record<string, string>)[String(role)] ?? String(role ?? '')
}

/** Só quem tem o papel coordenador pode ser adjunto. */
export function podeSerAdjunto(role: string | null | undefined): boolean {
  return role === 'coordenador'
}
