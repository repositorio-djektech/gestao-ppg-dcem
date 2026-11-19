import { describe, it, expect } from 'vitest'
import { criarClienteFake } from '@/test/fake-supabase'
import { cadastrarAlunoRapido } from './aluno-rapido'

// Dados 100% fictícios.
describe('Cadastro rápido de aluno/egresso no formulário de artigo (D-31)', () => {
  it('docente cadastra discente já vinculado a ele como orientador', async () => {
    const { client, tabelas } = criarClienteFake({ discentes: [] })
    const novo = await cadastrarAlunoRapido(
      {
        tipo: 'discente',
        nome: '  Aluno   Ficticio  Novo ',
        tipoCurso: 'Doutorado',
        docenteId: 10,
        docenteNome: 'Docente Alfa Teste',
      },
      client,
    )
    expect(novo).toMatchObject({ tipo: 'discente', nome: 'Aluno Ficticio Novo' })
    expect(tabelas.discentes[0]).toMatchObject({
      nome: 'Aluno Ficticio Novo',
      status: 'em_andamento',
      tipo_curso: 'Doutorado',
      docente_orientador_id: 10,
      orientador: 'Docente Alfa Teste',
    })
  })

  it('egresso exige ano de titulação e grava o docente como orientador (exigido pela RLS)', async () => {
    const { client, tabelas } = criarClienteFake({ egressos: [] })
    await expect(
      cadastrarAlunoRapido({ tipo: 'egresso', nome: 'Egresso Ficticio' }, client),
    ).rejects.toThrow(/ano de titula/i)

    const novo = await cadastrarAlunoRapido(
      {
        tipo: 'egresso',
        nome: 'Egresso Ficticio',
        tipoCurso: 'Mestrado',
        anoTitulacao: 2025,
        docenteId: 10,
        docenteNome: 'Docente Alfa Teste',
      },
      client,
    )
    expect(novo.tipo).toBe('egresso')
    expect(tabelas.egressos[0]).toMatchObject({
      tipo_curso: 'Mestrado',
      ano_titulacao: 2025,
      docente_orientador_id: 10,
    })
  })

  it('coordenação cadastra sem orientador', async () => {
    const { client, tabelas } = criarClienteFake({ discentes: [] })
    await cadastrarAlunoRapido({ tipo: 'discente', nome: 'Aluno Ficticio Dois' }, client)
    expect(tabelas.discentes[0].docente_orientador_id).toBeNull()
  })

  it('recusa nome curto e propaga erro do banco (ex.: RLS)', async () => {
    const { client } = criarClienteFake({ discentes: [] })
    await expect(cadastrarAlunoRapido({ tipo: 'discente', nome: 'ab' }, client)).rejects.toThrow(
      /nome completo/i,
    )
    const { client: ruim } = criarClienteFake(
      { discentes: [] },
      {
        erroEm: {
          tabela: 'discentes',
          op: 'insert',
          mensagem: 'new row violates row-level security',
        },
      },
    )
    await expect(
      cadastrarAlunoRapido({ tipo: 'discente', nome: 'Aluno Ficticio Tres' }, ruim),
    ).rejects.toThrow(/row-level security/)
  })
})
