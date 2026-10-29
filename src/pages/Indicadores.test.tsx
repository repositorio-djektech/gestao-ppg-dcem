import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import Indicadores from './Indicadores'
import type { RelatorioIndicadoresCapes } from '@/lib/capes/types'

const mockRelatorio: RelatorioIndicadoresCapes = {
  anoReferencia: 2025,
  quadrienio: { inicio: 2025, fim: 2028 },
  geradoEm: new Date().toISOString(),
  resumoGeral: {
    totalIndicadores: 18,
    calculados: 10,
    indefinidos: 8,
    totalDP: 12,
    totalJdpValidos: 2,
    denominadorEfetivo: 10,
  },
  quesitos: [
    {
      quesito: '1',
      titulo: 'Quesito 1 — Adequação do Corpo Docente',
      pesoTotalPercentual: 35,
      indicadores: [
        {
          id: 'ade',
          codigo: 'ADE',
          nome: 'Adequação do Corpo Docente (% DP)',
          quesito: '1',
          itemFicha: '1.2.1',
          pesoPercentual: 15,
          formulaTexto: 'ADE = DP / (DP + DC + DV)',
          status: 'calculado',
          valorCalculado: 75.0,
          unidade: '%',
          decomposicao: [
            { termo: 'DP', descricao: 'Docentes Permanentes', valor: 12 },
            { termo: 'DC', descricao: 'Docentes Colaboradores', valor: 4 },
          ],
          insumos: [{ totalExistente: 16, descricao: '16 docentes cadastrados', atendido: true }],
        },
      ],
    },
    {
      quesito: '2',
      titulo: 'Quesito 2 — Produção e Formação',
      pesoTotalPercentual: 55,
      indicadores: [
        {
          id: 'ori',
          codigo: 'ORI',
          nome: 'Taxa de Titulações Concluídas por Docente Permanente',
          quesito: '2',
          itemFicha: '2.1.1',
          pesoPercentual: 10,
          formulaTexto: 'ORI = (M + 3D) / (DP − JDP)',
          status: 'calculado',
          valorCalculado: 2.5,
          unidade: '',
          decomposicao: [
            { termo: 'M', descricao: 'Mestrados', valor: 10 },
            { termo: 'D', descricao: 'Doutorados', valor: 5 },
            { termo: 'DP - JDP', descricao: 'Denominador efetivo', valor: 10 },
          ],
          insumos: [{ totalExistente: 15, descricao: '15 titulações concluídas', atendido: true }],
        },
        {
          id: 'dpide2',
          codigo: 'DPIDE2',
          nome: 'DPI de Publicações Melhores com Discentes (Nível 2)',
          quesito: '2',
          itemFicha: '2.2.2',
          pesoPercentual: 12,
          formulaTexto: 'DPIDE2 = [A1 + 0,875·A2...] / (DP − JDP)',
          status: 'indefinido',
          motivoIndefinido:
            'aguardando indicação de publicações Nível 2 pelo programa (indicacao_nivel=2)',
          valorCalculado: null,
          decomposicao: [],
          insumos: [
            {
              totalExistente: 0,
              totalEsperado: 12,
              descricao: '0 publicações Nível 2',
              atendido: false,
            },
          ],
        },
      ],
    },
  ],
  todosIndicadores: [],
}

describe('Página Indicadores', () => {
  it('renderiza o cabeçalho, botões e estrutura base da página', () => {
    const mockLoader = vi.fn().mockResolvedValue({
      sucesso: true,
      dados: mockRelatorio,
    })

    const html = renderToString(<Indicadores carregarDadosFn={mockLoader} />)

    expect(html).toContain('Indicadores de Avaliação')
    expect(html).not.toContain('Etapa Q4')
    expect(html).not.toContain('Nota Metodológica')
    expect(html).toContain('Exportar CSV')
    expect(html).toContain('Exportar PDF')
    expect(html).toContain('Ano:')
  })
})
