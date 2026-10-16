import { describe, it, expect, vi, beforeEach } from 'vitest'
import { casamentoDocentesService } from './casamento-docentes'
import { publicacoesDocentesService } from './publicacoes-docentes'
import { sugestoesRejeitadasService } from './sugestoes-rejeitadas'
import { supabase } from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('./publicacoes-docentes', () => ({
  publicacoesDocentesService: {
    listarTodos: vi.fn(),
    vincularDocente: vi.fn(),
  },
}))

vi.mock('./sugestoes-rejeitadas', () => ({
  sugestoesRejeitadasService: {
    listarTodas: vi.fn(),
    rejeitarSugestao: vi.fn(),
    removerRejeicao: vi.fn(),
  },
}))

vi.mock('./logs', () => ({
  registrarLog: vi.fn(),
}))

describe('casamentoDocentesService (Etapa D1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gerarSugestoesCasamento analisa publicações reais e retorna dados estruturados', async () => {
    const mockPublicacoes = [
      {
        id: 2,
        titulo: 'Effects of ethylene glycol',
        autores: 'SANTOS, H. C.; Barreto, Ledjane Silva',
        ano: 2025,
      },
    ]

    const mockDocentes = [
      {
        id: 4,
        nome: 'Ledjane Silva Barreto',
        categoria: 'permanente',
        status: true,
      },
    ]

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'publicacoes') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPublicacoes, error: null }),
          }),
        } as any
      }
      if (table === 'docentes') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockDocentes, error: null }),
          }),
        } as any
      }
      return {} as any
    })

    vi.mocked(publicacoesDocentesService.listarTodos).mockResolvedValue([])
    vi.mocked(sugestoesRejeitadasService.listarTodas).mockResolvedValue([])

    const relatorio = await casamentoDocentesService.gerarSugestoesCasamento()

    expect(relatorio.publicacoesAnalisadas).toBe(1)
    expect(relatorio.publicacoesComSugestao).toBe(1)
    expect(relatorio.totalAltaConfianca).toBe(1)
    expect(relatorio.itens[0].sugestoes[0].docenteNome).toBe('Ledjane Silva Barreto')
  })

  it('confirmarIndividual chama publicacoesDocentesService e remove eventual rejeição', async () => {
    vi.mocked(publicacoesDocentesService.vincularDocente).mockResolvedValue()
    vi.mocked(sugestoesRejeitadasService.removerRejeicao).mockResolvedValue(true)

    const sucesso = await casamentoDocentesService.confirmarIndividual({
      publicacaoId: 2,
      docenteId: 4,
      usuarioNome: 'Admin',
    })

    expect(sucesso).toBe(true)
    expect(publicacoesDocentesService.vincularDocente).toHaveBeenCalledWith(2, 4)
    expect(sugestoesRejeitadasService.removerRejeicao).toHaveBeenCalledWith({
      tipoVinculo: 'publicacao_docente',
      origemIdentificador: '2',
      alvoIdentificador: '4',
    })
  })

  it('confirmarEmLote é idempotente e não duplica registros já existentes', async () => {
    // Simula que vínculo (pub 2, doc 4) já existia
    vi.mocked(publicacoesDocentesService.listarTodos).mockResolvedValue([
      { id: 1, publicacao_id: 2, docente_id: 4 } as any,
    ])

    const insertMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock,
    } as any)

    const resultado = await casamentoDocentesService.confirmarEmLote({
      itens: [
        { publicacaoId: 2, docenteId: 4 }, // Já existente
        { publicacaoId: 52, docenteId: 18 }, // Novo
      ],
      usuarioNome: 'Admin',
    })

    expect(resultado.sucessos).toBe(2)
    // O insert deve conter apenas o item que ainda não existia
    expect(insertMock).toHaveBeenCalledWith([{ publicacao_id: 52, docente_id: 18 }])
  })
})
