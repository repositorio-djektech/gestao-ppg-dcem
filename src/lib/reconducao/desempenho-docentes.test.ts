import { describe, it, expect } from 'vitest'
import { montarDesempenhoDocentes, gerarCsvDesempenhoDocentes } from './desempenho-docentes'
import { avaliarDocente } from './calculo'
import type { Docente, Orientacao, Publicacao } from '@/types/database'

const docente = (id: number, nome: string, categoria: any = 'permanente'): Docente =>
  ({
    id,
    nome,
    categoria,
    scopus_id: '',
    indice_h: 0,
    bolsa_cnpq: '',
    jdp: false,
    licenca: '',
  }) as Docente

function avaliar(d: Docente, extra: Record<string, unknown> = {}) {
  return avaliarDocente({
    docente: d,
    orientacoes: [],
    disciplinas: [],
    projetos: [],
    participantesProjetos: [],
    publicacoes: [],
    anoInicio: 2022,
    anoFim: 2025,
    ...extra,
  })
}

describe('desempenho dos docentes (H-32)', () => {
  it('lista em ordem alfabética (ignora acento) e traduz a categoria', () => {
    const linhas = montarDesempenhoDocentes([
      avaliar(docente(1, 'Zélia Teste')),
      avaliar(docente(2, 'Álvaro Teste', 'colaborador')),
      avaliar(docente(3, 'Bia Teste', null)),
    ])
    expect(linhas.map((l) => l.nome)).toEqual(['Álvaro Teste', 'Bia Teste', 'Zélia Teste'])
    expect(linhas[0].categoria).toBe('Colaborador')
    expect(linhas[1].categoria).toBe('Sem categoria')
    expect(linhas[2].categoria).toBe('Permanente')
  })

  it('traz M, D, ATD, DPIDE1, DPTDE1, PDQ e a nota de corte do cálculo da IN', () => {
    const orientacoes = [
      {
        id: 1,
        docente_id: 1,
        discente_id: 1,
        tipo: 'Mestrado',
        inicio: '2022',
        fim: '2024',
        status: 'concluido',
        data_defesa: '2024-05-10',
        flag_orientador_principal: true,
      },
    ] as unknown as Orientacao[]
    const publicacoes = [
      { id: 10, titulo: 'T', autores: 'Docente', periodico: 'R', ano: 2023, estrato_qualis: 'A2' },
    ] as unknown as Publicacao[]
    const a = avaliar(docente(1, 'Docente Um'), {
      orientacoes,
      publicacoes,
      publicacoesDocentes: [{ publicacao_id: 10, docente_id: 1 }],
      coautoresPrograma: [{ publicacao_id: 10, tipo: 'orientando', nome_citado: 'Aluno' }],
      notaCorte: 1,
    })
    const [l] = montarDesempenhoDocentes([a])
    expect(l).toMatchObject({
      mestrados: 1,
      doutorados: 0,
      publicacoesComCoautoria: 1,
      atd: 1,
      dpide1: 0.875,
      dptde1: 1,
      notaCorte: 1,
      metaAtingida: true,
    })
    expect(l.pdq).toBe(3.875)
  })

  it('sem titulações o ATD fica vazio (não calculável), nunca 0', () => {
    const [l] = montarDesempenhoDocentes([avaliar(docente(1, 'Sem Titulação'))])
    expect(l.atd).toBeNull()
    expect(l.pdq).toBe(0)
    expect(l.metaAtingida).toBe(false)
  })

  it('CSV com separador ponto e vírgula, vírgula decimal e cabeçalho da avaliação', () => {
    const linhas = montarDesempenhoDocentes([avaliar(docente(1, 'Silva; "Jr"'))])
    const csv = gerarCsvDesempenhoDocentes(linhas, {
      anoAvaliacao: 2026,
      anoInicio: 2022,
      anoFim: 2025,
    })
    const partes = csv.split('\r\n')
    expect(partes[0]).toBe('Desempenho dos docentes - avaliação de 2026 (produção 2022-2025)')
    expect(partes[1]).toContain('Docente;Categoria;Mestrados concluídos')
    expect(partes[2].startsWith('"Silva; ""Jr""";Permanente;0;0;0;0;;0;0;0;1;Não')).toBe(true)
  })
})
