/**
 * Importação do Lattes pelo docente (D-31, D-33). Dados 100% fictícios, cliente em memória.
 * Cobre os relatos: aluno em andamento antigo, formados (Titulado + Egresso), projetos e
 * UPDATE barrado por RLS.
 */
import { describe, it, expect } from 'vitest'
import { criarClienteFake } from '@/test/fake-supabase'
import {
  gravarOrientacoes,
  gravarProjetosPesquisa,
  gravarDadosLattes,
  converterLattesProjeto,
  type OrientacaoParaGravar,
  type ProjetoPesquisaParaGravar,
} from './gravar'

const DOCENTE = { id: 10, nome: 'Docente Alfa Teste', id_lattes: null }

function ori(extra: Partial<OrientacaoParaGravar> = {}): OrientacaoParaGravar {
  return {
    docente_identificador: '1234567890123456', // ID Lattes do dono do CV (não está no banco)
    docente_nome: 'Docente Alfa Teste',
    discente_nome: 'Aluno Ficticio Um',
    tipo: 'Mestrado',
    inicio: '2025-02',
    fim: '',
    status: 'em_andamento',
    flag_orientador_principal: true,
    ...extra,
  }
}

describe('Orientação concluída: Discente Titulado + Egresso (D-31)', () => {
  const concluida = ori({
    fim: '2025-02',
    status: 'concluido',
    data_defesa: '2025-12-31', // data inventada pelo parser quando o Lattes só traz o ano
  })

  it('cria o discente Titulado, com orientador e mês de conclusão (só ano = fevereiro)', async () => {
    const { client, tabelas } = criarClienteFake({ docentes: [DOCENTE] })
    const res = await gravarOrientacoes([concluida], client)

    expect(res.erros).toEqual([])
    expect(tabelas.discentes).toHaveLength(1)
    expect(tabelas.discentes[0]).toMatchObject({
      nome: 'Aluno Ficticio Um',
      status: 'titulado',
      ano_conclusao: '2025-02',
      tipo_curso: 'Mestrado',
      docente_orientador_id: 10,
      orientador: 'Docente Alfa Teste',
      data_ingresso: '', // o Lattes não informa o ingresso de quem já concluiu: não se inventa
    })
  })

  it('usa o mês real da defesa quando o Lattes informa a data', async () => {
    const { client, tabelas } = criarClienteFake({ docentes: [DOCENTE] })
    await gravarOrientacoes([{ ...concluida, data_defesa: '2025-08-14' }], client)
    expect(tabelas.discentes[0].ano_conclusao).toBe('2025-08')
  })

  it('cria também o Egresso, com ano de titulação e orientador', async () => {
    const { client, tabelas } = criarClienteFake({ docentes: [DOCENTE] })
    const res = await gravarOrientacoes([concluida], client)

    expect(res.egressos.inseridos).toBe(1)
    expect(tabelas.egressos).toHaveLength(1)
    expect(tabelas.egressos[0]).toMatchObject({
      nome: 'Aluno Ficticio Um',
      tipo_curso: 'Mestrado',
      ano_titulacao: 2025,
      docente_orientador_id: 10,
      orientador: 'Docente Alfa Teste',
    })
  })

  it('não duplica o Egresso na reimportação nem quando ele já existe', async () => {
    const { client, tabelas } = criarClienteFake({
      docentes: [DOCENTE],
      egressos: [{ id: 1, nome: 'Aluno Ficticio Um' }],
    })
    const res = await gravarOrientacoes([concluida], client)
    expect(res.egressos.inseridos).toBe(0)
    expect(tabelas.egressos).toHaveLength(1)

    const { client: c2, tabelas: t2 } = criarClienteFake({ docentes: [DOCENTE] })
    await gravarOrientacoes([concluida], c2)
    await gravarOrientacoes([concluida], c2)
    expect(t2.egressos).toHaveLength(1)
    expect(t2.discentes).toHaveLength(1)
    expect(t2.orientacoes).toHaveLength(1)
  })

  it('doutorado concluído também gera Egresso; IC, pós-doutorado e coorientação não', async () => {
    const { client, tabelas } = criarClienteFake({ docentes: [DOCENTE] })
    await gravarOrientacoes(
      [
        { ...concluida, tipo: 'Doutorado', discente_nome: 'Doutora Ficticia' },
        { ...concluida, tipo: 'Iniciação Científica', discente_nome: 'Aluno IC Ficticio' },
        { ...concluida, tipo: 'Pós-Doutorado', discente_nome: 'Pos Doc Ficticio' },
        { ...concluida, discente_nome: 'Aluno Coorientado', flag_orientador_principal: false },
      ],
      client,
    )
    expect(tabelas.egressos.map((e: any) => e.nome)).toEqual(['Doutora Ficticia'])
    // IC e pós-doutorado concluídos viram discente Titulado, sem egresso
    const ic = tabelas.discentes.find((d: any) => d.nome === 'Aluno IC Ficticio')
    expect(ic.status).toBe('titulado')
    expect(ic.tipo_curso).toBe('')
    // coorientação não define o orientador principal do discente
    const co = tabelas.discentes.find((d: any) => d.nome === 'Aluno Coorientado')
    expect(co.docente_orientador_id).toBeNull()
  })

  it('discente que já existe ganha a conclusão (sem criar duplicado)', async () => {
    const { client, tabelas } = criarClienteFake({
      docentes: [DOCENTE],
      discentes: [
        {
          id: 1,
          nome: 'Aluno Ficticio Um',
          status: 'em_andamento',
          ano_conclusao: '',
          tipo_curso: '',
          docente_orientador_id: 10,
        },
      ],
    })
    await gravarOrientacoes([concluida], client)
    expect(tabelas.discentes).toHaveLength(1)
    expect(tabelas.discentes[0]).toMatchObject({ status: 'titulado', ano_conclusao: '2025-02' })
  })
})

describe('Um aluno por curso: egresso do mestrado e aluno do doutorado (D-35)', () => {
  const mestradoConcluido = ori({
    tipo: 'Mestrado',
    fim: '2025-02',
    status: 'concluido',
    data_defesa: '2025-12-31',
  })
  const doutoradoEmAndamento = ori({
    tipo: 'Doutorado',
    inicio: '2025-03',
    fim: '',
    status: 'em_andamento',
  })

  it('a mesma pessoa vira duas fichas: mestrado Titulado e doutorado em andamento', async () => {
    const { client, tabelas } = criarClienteFake({ docentes: [DOCENTE] })
    const res = await gravarOrientacoes([mestradoConcluido, doutoradoEmAndamento], client)

    expect(res.erros).toEqual([])
    expect(tabelas.discentes).toHaveLength(2)
    const mestrado = tabelas.discentes.find((d) => d.tipo_curso === 'Mestrado')
    const doutorado = tabelas.discentes.find((d) => d.tipo_curso === 'Doutorado')
    expect(mestrado).toMatchObject({ status: 'titulado', ano_conclusao: '2025-02' })
    expect(doutorado).toMatchObject({
      status: 'em_andamento',
      ano_conclusao: '',
      data_ingresso: '2025-03',
    })
    // cada orientação aponta para a ficha do seu curso
    const oriM = tabelas.orientacoes.find((o) => o.tipo === 'Mestrado')
    const oriD = tabelas.orientacoes.find((o) => o.tipo === 'Doutorado')
    expect(oriM.discente_id).toBe(mestrado.id)
    expect(oriD.discente_id).toBe(doutorado.id)
  })

  it('só o mestrado concluído gera egresso; o doutorado em andamento não', async () => {
    const { client, tabelas } = criarClienteFake({ docentes: [DOCENTE] })
    await gravarOrientacoes([mestradoConcluido, doutoradoEmAndamento], client)
    expect(tabelas.egressos).toHaveLength(1)
    expect(tabelas.egressos[0]).toMatchObject({ tipo_curso: 'Mestrado', ano_titulacao: 2025 })
  })

  it('depois, ao concluir o doutorado, entra um segundo egresso (um por curso)', async () => {
    const { client, tabelas } = criarClienteFake({ docentes: [DOCENTE] })
    await gravarOrientacoes([mestradoConcluido], client)
    await gravarOrientacoes(
      [{ ...doutoradoEmAndamento, fim: '2029-02', status: 'concluido', data_defesa: '2029-12-31' }],
      client,
    )
    expect(tabelas.egressos.map((e) => e.tipo_curso).sort()).toEqual(['Doutorado', 'Mestrado'])
  })

  it('ficha antiga sem tipo de curso é aproveitada (não duplica) e recebe o curso', async () => {
    const { client, tabelas } = criarClienteFake({
      docentes: [DOCENTE],
      discentes: [
        {
          id: 1,
          nome: 'Aluno Ficticio Um',
          status: 'em_andamento',
          tipo_curso: '',
          ano_conclusao: '',
        },
      ],
    })
    await gravarOrientacoes([doutoradoEmAndamento], client)
    expect(tabelas.discentes).toHaveLength(1)
    expect(tabelas.discentes[0].tipo_curso).toBe('Doutorado')
  })
})

describe('Orientação em andamento (caso "tese iniciada antes de 2025")', () => {
  it('entra como em andamento, sem término, com ingresso = ano de início e orientador', async () => {
    const { client, tabelas } = criarClienteFake({ docentes: [DOCENTE] })
    const res = await gravarOrientacoes(
      [ori({ tipo: 'Doutorado', inicio: '2022-02', discente_nome: 'Jessica Ficticia' })],
      client,
    )
    expect(res.erros).toEqual([])
    expect(tabelas.discentes[0]).toMatchObject({
      status: 'em_andamento',
      data_ingresso: '2022-02',
      ano_conclusao: '',
      docente_orientador_id: 10,
    })
    expect(tabelas.orientacoes[0]).toMatchObject({
      inicio: '2022-02',
      fim: '',
      status: 'em_andamento',
    })
    expect(tabelas.egressos).toHaveLength(0)
  })

  it('reimportar corrige a orientação em andamento que tinha sido gravada como concluída', async () => {
    const { client, tabelas } = criarClienteFake({
      docentes: [DOCENTE],
      discentes: [{ id: 1, nome: 'Aluno Ficticio Um', docente_orientador_id: 10 }],
      orientacoes: [
        {
          id: 5,
          docente_id: 10,
          discente_id: 1,
          tipo: 'Iniciação Científica',
          inicio: '2025-02',
          fim: '2025-02', // erro antigo: o ano de início gravado como término
          status: 'concluido',
        },
      ],
    })
    const res = await gravarOrientacoes([ori({ tipo: 'Iniciação Científica' })], client)
    expect(res.contagem.atualizados).toBe(1)
    expect(tabelas.orientacoes[0]).toMatchObject({ fim: '', status: 'em_andamento' })
  })

  it('resolve o docente pelo nome quando o ID Lattes dele não está cadastrado', async () => {
    const { client, tabelas } = criarClienteFake({ docentes: [DOCENTE] })
    await gravarOrientacoes([ori()], client)
    expect(tabelas.orientacoes[0].docente_id).toBe(10)
  })
})

describe('UPDATE barrado por RLS deixa de contar como sucesso', () => {
  it('orientação: aparece como erro e não conta como atualizada', async () => {
    const { client } = criarClienteFake(
      {
        docentes: [DOCENTE],
        discentes: [{ id: 1, nome: 'Aluno Ficticio Um', docente_orientador_id: 10 }],
        orientacoes: [
          { id: 5, docente_id: 10, discente_id: 1, tipo: 'Mestrado', inicio: '2025-02', fim: '' },
        ],
      },
      { bloquearUpdateEm: ['orientacoes'] },
    )
    const res = await gravarOrientacoes([ori()], client)
    expect(res.contagem.atualizados).toBe(0)
    expect(res.contagem.ignorados).toBe(1)
    expect(res.erros[0].mensagem).toMatch(/permiss/i)
  })
})

describe('Projetos importados pelo docente (D-33)', () => {
  const projeto = (extra: Partial<ProjetoPesquisaParaGravar> = {}): ProjetoPesquisaParaGravar => ({
    titulo: 'Projeto Ficticio de Materiais',
    inicio: '2023-02',
    fim: 'Atual',
    financiamento: false,
    coordenador_identificador: '99999999999999', // coordenador de fora, não cadastrado
    equipe: [
      { id_cnpq: '99999999999999', nome: 'Coordenador Externo', responsavel: true },
      { id_cnpq: null, nome: 'Docente Alfa Teste', responsavel: false },
      { id_cnpq: null, nome: 'Docente Beta Teste', responsavel: false },
    ],
    importador_identificador: '1234567890123456',
    importador_nome: 'Docente Alfa Teste',
    importador_responsavel: false,
    ...extra,
  })
  const docentes = [DOCENTE, { id: 11, nome: 'Docente Beta Teste', id_lattes: null }]

  it('projeto em que o docente só participa: grava sem coordenador e registra o participante', async () => {
    const { client, tabelas } = criarClienteFake({ docentes })
    const res = await gravarProjetosPesquisa([projeto()], client, undefined, {
      papelUsuario: 'docente',
      docenteIdUsuario: 10,
    })
    expect(res.erros).toEqual([])
    expect(res.contagem.inseridos).toBe(1)
    expect(tabelas.projetos_pesquisa[0].coordenador_id).toBeNull()
    // docente só grava a própria participação (a RLS não deixa gravar a de outro docente)
    expect(tabelas.projetos_participantes).toHaveLength(1)
    expect(tabelas.projetos_participantes[0]).toMatchObject({
      projeto_id: 1,
      docente_id: 10,
      papel: 'participante',
    })
    expect(res.participantes).toBe(1)
  })

  it('a coordenação importando registra também os outros docentes da equipe', async () => {
    const { client, tabelas } = criarClienteFake({ docentes })
    await gravarProjetosPesquisa([projeto()], client, undefined, { papelUsuario: 'coordenador' })
    expect(tabelas.projetos_participantes.map((p: any) => p.docente_id).sort()).toEqual([10, 11])
  })

  it('o docente que importa NÃO vira coordenador quando não é o responsável', () => {
    const conv = converterLattesProjeto(
      {
        nome: 'Projeto Ficticio de Materiais',
        ano_inicio: 2023,
        ano_fim: null,
        situacao: 'EM_ANDAMENTO',
        financiadores: [],
        responsavel: false,
        equipe: [{ nome: 'Docente Alfa Teste', id_cnpq: '1234567890123456', responsavel: false }],
      } as any,
      { id_lattes: '1234567890123456', nome: 'Docente Alfa Teste' },
    )
    expect(conv.coordenador_identificador).toBeNull()
  })

  it('o dono do currículo é coordenador quando é o responsável', () => {
    const conv = converterLattesProjeto(
      {
        nome: 'Projeto Ficticio de Materiais',
        ano_inicio: 2023,
        ano_fim: null,
        situacao: 'EM_ANDAMENTO',
        financiadores: [],
        responsavel: true,
        equipe: [],
      } as any,
      { id_lattes: '1234567890123456', nome: 'Docente Alfa Teste' },
    )
    expect(conv.coordenador_identificador).toBe('1234567890123456')
  })

  it('reimportar não apaga o coordenador já cadastrado', async () => {
    const { client, tabelas } = criarClienteFake({
      docentes,
      projetos_pesquisa: [
        { id: 7, titulo: 'Projeto Ficticio de Materiais', inicio: '2023-02', coordenador_id: 11 },
      ],
    })
    const res = await gravarProjetosPesquisa([projeto()], client, undefined, {
      papelUsuario: 'coordenador',
    })
    expect(res.contagem.atualizados).toBe(1)
    expect(tabelas.projetos_pesquisa[0].coordenador_id).toBe(11)
  })

  it('projeto de outro coordenador (UPDATE barrado): não é erro e a participação é registrada', async () => {
    const { client, tabelas } = criarClienteFake(
      {
        docentes,
        projetos_pesquisa: [
          { id: 7, titulo: 'Projeto Ficticio de Materiais', inicio: '2023-02', coordenador_id: 11 },
        ],
      },
      { bloquearUpdateEm: ['projetos_pesquisa'] },
    )
    const res = await gravarProjetosPesquisa([projeto()], client, undefined, {
      papelUsuario: 'docente',
      docenteIdUsuario: 10,
    })
    expect(res.erros).toEqual([])
    expect(res.contagem.atualizados).toBe(0)
    expect(tabelas.projetos_participantes).toHaveLength(1)
    expect(tabelas.projetos_participantes[0]).toMatchObject({
      projeto_id: 7,
      docente_id: 10,
      papel: 'participante',
    })
  })

  it('não duplica a participação ao importar de novo', async () => {
    const { client, tabelas } = criarClienteFake({ docentes })
    const opcoes = { papelUsuario: 'docente', docenteIdUsuario: 10 }
    await gravarProjetosPesquisa([projeto()], client, undefined, opcoes)
    await gravarProjetosPesquisa([projeto()], client, undefined, opcoes)
    expect(tabelas.projetos_participantes).toHaveLength(1)
  })
})

describe('Ordem do import: orientações antes das publicações', () => {
  it('os alunos já existem quando os artigos são casados', async () => {
    const { client, chamadas } = criarClienteFake({ docentes: [DOCENTE] })
    await gravarDadosLattes(
      {
        orientacoes: [ori()],
        publicacoes: [
          {
            titulo: 'Artigo Ficticio',
            autores: 'Teste, D.',
            periodico: 'Revista Ficticia',
            ano: 2025,
          },
        ],
      },
      client,
    )
    const inserts = chamadas.filter((c) => c.op === 'insert').map((c) => c.tabela)
    expect(inserts.indexOf('discentes')).toBeGreaterThanOrEqual(0)
    expect(inserts.indexOf('discentes')).toBeLessThan(inserts.indexOf('publicacoes'))
  })
})
