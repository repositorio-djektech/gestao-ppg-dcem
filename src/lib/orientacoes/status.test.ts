import { describe, it, expect } from 'vitest'
import {
  parseDataFimOrientacao,
  calcularStatusEfetivoOrientacao,
  aplicarStatusEfetivo,
} from './status'
import { isMestradoConcluido, isDoutoradoConcluido } from '../reconducao/calculo'
import type { Orientacao } from '@/types/database'

describe('Regras de Derivação de Status de Orientações (PPG-DCEM)', () => {
  const dataReferenciaFixa = new Date(2025, 4, 15, 12, 0, 0) // 15 de Maio de 2025

  it('1. Término em branco -> em_andamento', () => {
    expect(calcularStatusEfetivoOrientacao({ fim: '', cancelado: false }, dataReferenciaFixa)).toBe(
      'em_andamento',
    )
    expect(
      calcularStatusEfetivoOrientacao({ fim: null, cancelado: false }, dataReferenciaFixa),
    ).toBe('em_andamento')
    expect(
      calcularStatusEfetivoOrientacao({ fim: '   ', cancelado: false }, dataReferenciaFixa),
    ).toBe('em_andamento')
    expect(
      calcularStatusEfetivoOrientacao({ fim: undefined, cancelado: false }, dataReferenciaFixa),
    ).toBe('em_andamento')
  })

  it('2. Término futuro -> em_andamento', () => {
    // 2025-12-31 é futuro em relação a 2025-05-15
    expect(
      calcularStatusEfetivoOrientacao({ fim: '2025-12-31', cancelado: false }, dataReferenciaFixa),
    ).toBe('em_andamento')

    // Data DD/MM/YYYY futura
    expect(
      calcularStatusEfetivoOrientacao({ fim: '20/12/2026', cancelado: false }, dataReferenciaFixa),
    ).toBe('em_andamento')

    // Ano futuro
    expect(
      calcularStatusEfetivoOrientacao({ fim: '2026', cancelado: false }, dataReferenciaFixa),
    ).toBe('em_andamento')

    // MM/YYYY futuro
    expect(
      calcularStatusEfetivoOrientacao({ fim: '06/2025', cancelado: false }, dataReferenciaFixa),
    ).toBe('em_andamento')
  })

  it('3. Término igual ou passado -> concluido', () => {
    // Mesma data de referência (15/05/2025)
    expect(
      calcularStatusEfetivoOrientacao({ fim: '2025-05-15', cancelado: false }, dataReferenciaFixa),
    ).toBe('concluido')

    // Data passada
    expect(
      calcularStatusEfetivoOrientacao({ fim: '2024-12-31', cancelado: false }, dataReferenciaFixa),
    ).toBe('concluido')

    // Data DD/MM/YYYY passada
    expect(
      calcularStatusEfetivoOrientacao({ fim: '10/01/2025', cancelado: false }, dataReferenciaFixa),
    ).toBe('concluido')

    // Ano passado
    expect(
      calcularStatusEfetivoOrientacao({ fim: '2024', cancelado: false }, dataReferenciaFixa),
    ).toBe('concluido')

    // MM/YYYY passado
    expect(
      calcularStatusEfetivoOrientacao({ fim: '04/2025', cancelado: false }, dataReferenciaFixa),
    ).toBe('concluido')
  })

  it('4. Cancelado = TRUE -> cancelado com datas preservadas', () => {
    const ori = {
      fim: '2024-12-31', // data passada que normalmente seria concluído
      cancelado: true,
      status: 'ativo',
    }
    expect(calcularStatusEfetivoOrientacao(ori, dataReferenciaFixa)).toBe('cancelado')

    const resultadoAplicado = aplicarStatusEfetivo(ori)
    expect(resultadoAplicado.status_efetivo).toBe('cancelado')
    expect(resultadoAplicado.cancelado).toBe(true)
    expect(resultadoAplicado.fim).toBe('2024-12-31') // data preservada intacta!
  })

  it('5. Data inválida ou parcial irreconhecível em fim -> não concluído (em_andamento)', () => {
    expect(
      calcularStatusEfetivoOrientacao(
        { fim: 'data-invalida', cancelado: false },
        dataReferenciaFixa,
      ),
    ).toBe('em_andamento')

    expect(
      calcularStatusEfetivoOrientacao({ fim: '32/13/2024', cancelado: false }, dataReferenciaFixa),
    ).toBe('em_andamento')

    expect(
      calcularStatusEfetivoOrientacao({ fim: 'abc/2024', cancelado: false }, dataReferenciaFixa),
    ).toBe('em_andamento')

    expect(
      calcularStatusEfetivoOrientacao({ fim: '99/99/9999', cancelado: false }, dataReferenciaFixa),
    ).toBe('em_andamento')
  })

  it('6. parseDataFimOrientacao lida com formatos válidos e inválidos', () => {
    expect(parseDataFimOrientacao(null)).toBeNull()
    expect(parseDataFimOrientacao('')).toBeNull()
    expect(parseDataFimOrientacao('invalid')).toBeNull()

    // ISO
    const dIso = parseDataFimOrientacao('2024-05-10')
    expect(dIso).not.toBeNull()
    expect(dIso?.getFullYear()).toBe(2024)
    expect(dIso?.getMonth()).toBe(4) // Maio
    expect(dIso?.getDate()).toBe(10)

    // BR
    const dBr = parseDataFimOrientacao('10/05/2024')
    expect(dBr).not.toBeNull()
    expect(dBr?.getFullYear()).toBe(2024)
    expect(dBr?.getMonth()).toBe(4)

    // Ano puro
    const dAno = parseDataFimOrientacao('2024')
    expect(dAno).not.toBeNull()
    expect(dAno?.getFullYear()).toBe(2024)
    expect(dAno?.getMonth()).toBe(11) // 31 de Dezembro
    expect(dAno?.getDate()).toBe(31)
  })

  it('7. Preserva status antigo concluido sem data de término', () => {
    expect(
      calcularStatusEfetivoOrientacao({ status: 'concluido', fim: null }, dataReferenciaFixa),
    ).toBe('concluido')
  })
})

describe('Regras do Switcher Cancelado (escondido quando concluído)', () => {
  // Simula a lógica exata de visibilidade do switcher usada em Orientacoes.tsx:
  // const statusEfetivo = calcularStatusEfetivoOrientacao(formData)
  // if (statusEfetivo === 'concluido') return null
  function deveExibirSwitcherCancelado(formData: {
    fim?: string | null
    cancelado?: boolean
    status?: string
  }): boolean {
    const statusEfetivo = calcularStatusEfetivoOrientacao({
      status: formData.status,
      fim: formData.fim,
      cancelado: formData.cancelado === true,
    })
    return statusEfetivo !== 'concluido'
  }

  it('Switcher Cancelado é visível quando orientação está em andamento (fim vazio)', () => {
    expect(deveExibirSwitcherCancelado({ fim: '' })).toBe(true)
    expect(deveExibirSwitcherCancelado({ fim: null })).toBe(true)
  })

  it('Switcher Cancelado é visível quando data de término é futura', () => {
    expect(deveExibirSwitcherCancelado({ fim: '2099-12-31' })).toBe(true)
  })

  it('Switcher Cancelado NÃO é exibido quando status derivado for concluído (data de término no passado)', () => {
    expect(deveExibirSwitcherCancelado({ fim: '2020-01-01' })).toBe(false)
    expect(deveExibirSwitcherCancelado({ fim: '1990-05-10' })).toBe(false)
  })

  it('Switcher Cancelado NÃO é exibido quando status antigo for explicitamente concluído', () => {
    expect(deveExibirSwitcherCancelado({ status: 'concluido', fim: '' })).toBe(false)
  })
})

describe('Integração de status efetivo em Mestrado/Doutorado Concluído (Recondução & Indicadores)', () => {
  it('Reconhece mestrado concluído via status efetivo derivado com data no passado', () => {
    const oriMestradoPassado: Orientacao = {
      id: 1,
      docente_id: 10,
      discente_id: 20,
      tipo: 'Mestrado',
      inicio: '2021-01-01',
      fim: '2023-01-01',
      status: 'ativo', // status bruto no banco ainda 'ativo'
      link_comprovacao: '',
      observacoes: '',
    }
    // Graças à derivação temporal ou status_efetivo, deve ser considerado mestrado concluído
    expect(isMestradoConcluido(oriMestradoPassado)).toBe(true)
  })

  it('NÃO considera mestrado concluído quando cancelado=true', () => {
    const oriMestradoCancelado: Orientacao = {
      id: 2,
      docente_id: 10,
      discente_id: 20,
      tipo: 'Mestrado',
      inicio: '2021-01-01',
      fim: '2023-01-01',
      cancelado: true,
      status: 'cancelado',
      link_comprovacao: '',
      observacoes: '',
    }
    expect(isMestradoConcluido(oriMestradoCancelado)).toBe(false)
  })

  it('NÃO considera mestrado concluído quando ainda está em andamento (fim futuro)', () => {
    const oriMestradoFuturo: Orientacao = {
      id: 3,
      docente_id: 10,
      discente_id: 20,
      tipo: 'Mestrado',
      inicio: '2024-01-01',
      fim: '2028-12-31',
      status: 'ativo',
      link_comprovacao: '',
      observacoes: '',
    }
    expect(isMestradoConcluido(oriMestradoFuturo)).toBe(false)
  })

  it('Reconhece doutorado concluído via status efetivo', () => {
    const oriDoutorado: Orientacao = {
      id: 4,
      docente_id: 10,
      discente_id: 20,
      tipo: 'Doutorado',
      inicio: '2020-01-01',
      fim: '2024-06-01',
      status: 'ativo',
      link_comprovacao: '',
      observacoes: '',
    }
    expect(isDoutoradoConcluido(oriDoutorado)).toBe(true)
  })
})
