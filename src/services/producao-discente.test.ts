import { describe, it, expect } from 'vitest'
import { criarClienteFake } from '@/test/fake-supabase'
import { listarProducaoDoDiscente, totalProducao, PRODUCAO_VAZIA } from './producao-discente'

describe('produção ligada ao discente (P-35)', () => {
  const tabelas = () => ({
    publicacoes_coautores_programa: [
      { id: 1, publicacao_id: 10, discente_id: 7, tipo: 'orientando' },
      { id: 2, publicacao_id: 11, discente_id: 7, tipo: 'sem_coautoria' }, // não conta
      { id: 3, publicacao_id: 12, discente_id: 8, tipo: 'orientando' }, // outro discente
    ],
    publicacoes: [
      {
        id: 10,
        titulo: 'Artigo do aluno',
        ano: 2025,
        periodico: 'Revista X',
        estrato_qualis: 'A2',
      },
      { id: 11, titulo: 'Sem coautoria', ano: 2025 },
      { id: 12, titulo: 'De outro aluno', ano: 2025 },
    ],
    patentes_discentes: [{ id: 1, patente_id: 3, discente_id: 7 }],
    patentes: [{ id: 3, titulo: 'Patente P', status: 'Pendente', inpi: 'BR1' }],
    producao_tecnica_discentes: [{ id: 1, producao_tecnica_id: 4, discente_id: 7 }],
    producao_tecnica: [
      { id: 4, titulo: 'Software S', ano: 2024, tipo: 'Software' },
      { id: 5, titulo: 'Não ligada', ano: 2024, tipo: 'Software' },
    ],
    eventos_discentes: [{ id: 1, evento_id: 6, discente_id: 7 }],
    eventos: [
      { id: 6, evento: 'Congresso C', local_data: 'Aracaju - 2025', papel: 'Apresentador' },
    ],
  })

  it('reúne publicações com coautoria confirmada, patentes, produção técnica e eventos', async () => {
    const { client } = criarClienteFake(tabelas())
    const p = await listarProducaoDoDiscente(7, client)
    expect(p.publicacoes.map((x) => x.titulo)).toEqual(['Artigo do aluno'])
    expect(p.publicacoes[0].detalhe).toBe('Revista X · Qualis A2')
    expect(p.patentes.map((x) => x.titulo)).toEqual(['Patente P'])
    expect(p.producaoTecnica.map((x) => x.titulo)).toEqual(['Software S'])
    expect(p.eventos.map((x) => x.titulo)).toEqual(['Congresso C'])
    expect(totalProducao(p)).toBe(4)
  })

  it('discente sem produção devolve tudo vazio; sem id nem consulta', async () => {
    const { client, chamadas } = criarClienteFake(tabelas())
    expect(totalProducao(await listarProducaoDoDiscente(99, client))).toBe(0)
    chamadas.length = 0
    expect(await listarProducaoDoDiscente(0, client)).toBe(PRODUCAO_VAZIA)
    expect(chamadas).toHaveLength(0)
  })

  it('tabela de vínculo ausente (migração ainda não aplicada) não derruba: só some a parte', async () => {
    const t = tabelas()
    const { client } = criarClienteFake(t, {
      erroEm: { tabela: 'patentes_discentes', op: 'select', mensagem: 'relation does not exist' },
    })
    const p = await listarProducaoDoDiscente(7, client)
    expect(p.patentes).toEqual([])
    expect(p.publicacoes).toHaveLength(1)
  })
})
