/**
 * D-30: iniciação (IC, IT, IE) espelhada em Orientações não pode inflar SO nem DP4A, e o NICT
 * soma só IC e IT (item 2.5.5 da ficha).
 */
import { describe, it, expect } from 'vitest'
import { calcularTodosIndicadores } from './indicadores'
import type { DadosEntradaIndicadores } from './types'

const doc = (id: number, nome: string) =>
  ({ id, nome, categoria: 'permanente', jdp: false, indice_h: 10 }) as any

function dados(extra: Partial<DadosEntradaIndicadores>): DadosEntradaIndicadores {
  return {
    anoReferencia: 2026,
    anoInicio: 2025,
    anoFim: 2028,
    docentes: [doc(1, 'Docente Um'), doc(2, 'Docente Dois'), doc(3, 'Docente Tres')],
    orientacoes: [],
    disciplinas: [],
    projetos: [],
    projetosParticipantes: [],
    publicacoes: [],
    publicacoesDocentes: [],
    publicacoesCoautores: [],
    patentes: [],
    egressos: [],
    discentes: [],
    iniciacoesCientificas: [],
    ...extra,
  }
}

const ind = (rel: ReturnType<typeof calcularTodosIndicadores>, codigo: string) =>
  rel.todosIndicadores.find((i) => i.codigo === codigo)!

// Orientação em andamento em 2026 (sem término), de qualquer tipo
const emAndamento = (id: number, docente_id: number, tipo: string) =>
  ({
    id,
    docente_id,
    discente_id: id + 100,
    tipo,
    status: 'em_andamento',
    inicio: '2025-02',
    fim: '',
  }) as any

describe('SO: iniciação em andamento não conta como orientação do programa (D-30)', () => {
  it('só IC em andamento: SO de 2026 fica indefinido (nenhuma orientação do programa)', () => {
    const rel = calcularTodosIndicadores(
      dados({ orientacoes: [emAndamento(1, 1, 'Iniciação Científica')] }),
    )
    expect(ind(rel, 'SO').anos?.[2026].status).toBe('indefinido')
  })

  it('IC, IT e IE em andamento junto com 1 mestrado: só o mestrado conta (1 de 3 DP)', () => {
    const rel = calcularTodosIndicadores(
      dados({
        orientacoes: [
          emAndamento(1, 1, 'Iniciação Científica'),
          emAndamento(2, 2, 'Iniciação Tecnológica'),
          emAndamento(3, 3, 'Iniciação em Extensão'),
          emAndamento(4, 1, 'Mestrado'),
        ],
      }),
    )
    // só o docente 1 tem orientação do programa (o mestrado): 1/3 = 33,33%
    expect(ind(rel, 'SO').anos?.[2026].valorCalculado).toBe(33.33)
  })

  it('mestrado e doutorado em andamento continuam contando', () => {
    const rel = calcularTodosIndicadores(
      dados({ orientacoes: [emAndamento(1, 1, 'Mestrado'), emAndamento(2, 2, 'Doutorado')] }),
    )
    expect(ind(rel, 'SO').anos?.[2026].valorCalculado).toBe(66.67)
  })
})

describe('DP4A: iniciação não vale como a atividade "orientação em andamento" (D-30)', () => {
  const atividadesDoDocente1 = {
    disciplinas: [
      { id: 1, docente_id: 1, nivel: 'pos_graduacao', nome: 'Disc', ano_semestre: '2026.1' } as any,
    ],
    projetos: [{ id: 1, coordenador_id: 1, titulo: 'Projeto', inicio: '2025-02' } as any],
    publicacoes: [{ id: 1, ano: 2026, autores: 'Docente Um', estrato_qualis: 'A1' } as any],
  }

  it('com mestrado em andamento, o docente 1 cumpre as 4 atividades (1 de 3 DP)', () => {
    const rel = calcularTodosIndicadores(
      dados({ ...atividadesDoDocente1, orientacoes: [emAndamento(1, 1, 'Mestrado')] }),
    )
    expect(ind(rel, 'DP4A').anos?.[2026].valorCalculado).toBe(33.33)
  })

  it('com só IC em andamento no lugar, a atividade de orientação não é cumprida', () => {
    const rel = calcularTodosIndicadores(
      dados({
        ...atividadesDoDocente1,
        orientacoes: [emAndamento(1, 1, 'Iniciação Científica')],
      }),
    )
    const v = ind(rel, 'DP4A').anos?.[2026]
    expect(v?.valorCalculado === 0 || v?.status === 'indefinido').toBe(true)
  })
})

describe('NICT: soma só IC e IT (D-30)', () => {
  const ic = (id: number, tipo: string, ano: number) =>
    ({ id, tipo, docente_orientador_id: 1, ano }) as any

  it('iniciação em extensão não entra: 1 IC + 1 IT + 2 IE = 2 / 3 DP', () => {
    const rel = calcularTodosIndicadores(
      dados({
        iniciacoesCientificas: [
          ic(1, 'iniciacao_cientifica', 2025),
          ic(2, 'iniciacao_tecnologica', 2025),
          ic(3, 'iniciacao_extensao', 2025),
          ic(4, 'iniciacao_extensao', 2025),
        ],
      }),
    )
    const nict = ind(rel, 'NICT').anos?.[2025]
    expect(nict?.status).toBe('calculado')
    expect(nict?.valorCalculado).toBe(0.667)
  })

  it('ano só com extensão continua indefinido (e não vira 0)', () => {
    const rel = calcularTodosIndicadores(
      dados({ iniciacoesCientificas: [ic(1, 'iniciacao_extensao', 2025)] }),
    )
    expect(ind(rel, 'NICT').anos?.[2025].status).toBe('indefinido')
  })
})
