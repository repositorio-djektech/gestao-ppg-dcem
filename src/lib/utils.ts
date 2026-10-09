/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Aplica máscara de CPF no formato 000.000.000-00.
 * Aceita strings parciais ou completas, com ou sem formatação prévia.
 */
export function formatarCpf(valor?: string | null): string {
  if (!valor) return ''
  const apenasDigitos = String(valor).replace(/\D/g, '').slice(0, 11)
  if (apenasDigitos.length === 0) return ''
  if (apenasDigitos.length <= 3) return apenasDigitos
  if (apenasDigitos.length <= 6) {
    return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3)}`
  }
  if (apenasDigitos.length <= 9) {
    return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6)}`
  }
  return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6, 9)}-${apenasDigitos.slice(9, 11)}`
}
