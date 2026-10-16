import { describe, it, expect, vi, beforeEach } from 'vitest'
import { estimativaQualisService, ItemGravacaoQualis } from './estimativa-qualis'
import { supabase } from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  }
})

describe('Serviço de Estimativa Qualis (estimativaQualisService)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Preservação de Estrato Manual e Idempotência', () => {
    it('NUNCA deve sobrescrever estrato atribuído manualmente se vier tentativa sugerido_confirmado', async () => {
      // Simula busca atual de publicações no banco onde a publicação 10 já é 'A1' com origem 'manual'
      const mockSelect = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 10, estrato_qualis: 'A1', qualis_origem: 'manual' },
            { id: 11, estrato_qualis: null, qualis_origem: null },
          ],
          error: null,
        }),
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      ;(supabase.from as any).mockImplementation((table: string) => {
        if (table === 'publicacoes') {
          return {
            select: mockSelect,
            update: mockUpdate,
          }
        }
        return {}
      })

      const itensParaGravar: ItemGravacaoQualis[] = [
        {
          publicacaoId: 10,
          estrato: 'A2',
          origem: 'sugerido_confirmado',
          justificativa: 'OpenAlex P80',
        },
        {
          publicacaoId: 11,
          estrato: 'A1',
          origem: 'sugerido_confirmado',
          justificativa: 'OpenAlex P95',
        },
      ]

      const resultado = await estimativaQualisService.gravarConfirmacoes(itensParaGravar)

      // ID 10 foi ignorado (protegido contra sobrescrita manual)
      expect(resultado.ignorados).toBe(1)
      expect(resultado.sucessos).toBe(1)
      expect(resultado.atualizadosIds).toEqual([11])

      // Verifica que update só foi chamado para id 11
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          estrato_qualis: 'A1',
          qualis_origem: 'sugerido_confirmado',
        }),
      )
    })

    it('deve permitir gravação manual direta', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [{ id: 12, estrato_qualis: null, qualis_origem: null }],
          error: null,
        }),
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      ;(supabase.from as any).mockImplementation(() => ({
        select: mockSelect,
        update: mockUpdate,
      }))

      const itensParaGravar: ItemGravacaoQualis[] = [
        {
          publicacaoId: 12,
          estrato: 'B1',
          origem: 'manual',
          justificativa: 'Atribuição manual pelo coordenador',
        },
      ]

      const resultado = await estimativaQualisService.gravarConfirmacoes(itensParaGravar)
      expect(resultado.sucessos).toBe(1)
      expect(resultado.atualizadosIds).toEqual([12])
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          estrato_qualis: 'B1',
          qualis_origem: 'manual',
          qualis_sugestao_justificativa: 'Atribuição manual pelo coordenador',
        }),
      )
    })
  })
})
