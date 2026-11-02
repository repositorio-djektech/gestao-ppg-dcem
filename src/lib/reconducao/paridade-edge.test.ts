/**
 * Paridade entre src/lib/reconducao/calculo.ts e a cópia usada pela Edge Function
 * `avaliacao-reconducao` (supabase/functions/avaliacao-reconducao/logica.ts).
 * A Edge Function não pode importar de src/, então as duas lógicas precisam andar juntas:
 * este teste falha quando uma delas divergir da outra.
 */
import { describe, it, expect } from 'vitest'
import { avaliarDocente } from './calculo'
import { avaliarDocenteLogica } from '../../../supabase/functions/avaliacao-reconducao/logica'

type Cenario = Record<string, any>

const docente = (extra: Record<string, any> = {}) => ({
  id: 1,
  nome: 'Maria Silva Santos',
  categoria: 'permanente',
  status: true,
  ...extra,
})

const ori = (extra: Record<string, any>) => ({
  id: Math.floor(Math.random() * 1e6),
  docente_id: 1,
  discente_id: 1,
  tipo: 'Mestrado',
  inicio: '2025',
  fim: '',
  status: 'ativo',
  data_defesa: null,
  flag_orientador_principal: true,
  ...extra,
})

const pub = (id: number, extra: Record<string, any> = {}) => ({
  id,
  titulo: `Artigo ${id}`,
  autores: 'Maria Silva Santos; Outro Autor',
  periodico: 'Revista',
  ano: 2026,
  fator_impacto_jcr: 2,
  ...extra,
})

const projeto = (extra: Record<string, any> = {}) => ({
  id: 1,
  titulo: 'Projeto',
  inicio: '2025',
  fim: '2028',
  financiamento: true,
  orgao_fomento: 'CNPq',
  coordenador_id: 1,
  ...extra,
})

const vazio = {
  orientacoes: [],
  disciplinas: [],
  projetos: [],
  participantesProjetos: [],
  publicacoes: [],
  publicacoesDocentes: [],
  coautoresPrograma: [],
}

const cenarios: Array<[string, Cenario]> = [
  ['sem nenhum dado', { docente: docente() }],
  [
    'mestrado concluído só por data_defesa (status gravado "ativo")',
    {
      docente: docente(),
      orientacoes: [ori({ data_defesa: '2026-03-10', status: 'ativo' })],
    },
  ],
  [
    'doutorado concluído pelo status efetivo (fim já passou, status "ativo")',
    {
      docente: docente(),
      orientacoes: [ori({ tipo: 'Doutorado', fim: '2025-06-30', status: 'ativo' })],
    },
  ],
  [
    'titulado (status "titulado") conta como concluído',
    { docente: docente(), orientacoes: [ori({ status: 'titulado', fim: '2026' })] },
  ],
  [
    'orientação cancelada não conta no Critério I',
    {
      docente: docente(),
      orientacoes: [ori({ status: 'cancelado', inicio: '2025' })],
    },
  ],
  [
    'orientação principal em andamento iniciada antes do quadriênio',
    { docente: docente(), orientacoes: [ori({ inicio: '2022', status: 'em_andamento' })] },
  ],
  [
    'orientação não principal não conta no Critério I',
    { docente: docente(), orientacoes: [ori({ flag_orientador_principal: false })] },
  ],
  [
    'PDQ atingido: 2 titulações e 2 publicações com coautoria confirmada',
    {
      docente: docente(),
      orientacoes: [
        ori({ data_defesa: '2025-05-01', status: 'concluido', fim: '2025' }),
        ori({ tipo: 'Doutorado', data_defesa: '2026-05-01', status: 'concluido', fim: '2026' }),
      ],
      publicacoes: [pub(1), pub(2)],
      publicacoesDocentes: [
        { publicacao_id: 1, docente_id: 1 },
        { publicacao_id: 2, docente_id: 1 },
      ],
      coautoresPrograma: [
        { publicacao_id: 1, tipo: 'orientando', nome_citado: 'Aluno A' },
        { publicacao_id: 2, tipo: 'egresso', nome_citado: 'Egresso B' },
      ],
    },
  ],
  [
    'disciplina só na N:N (docentes_ids)',
    {
      docente: docente({ id: 2 }),
      disciplinas: [
        { id: 1, nome: 'D', docente_id: 1, docentes_ids: [1, 2], ano_semestre: '2026/1' },
      ],
    },
  ],
  [
    'disciplina sem ano e disciplina fora do quadriênio',
    {
      docente: docente(),
      disciplinas: [
        { id: 1, nome: 'A', docente_id: 1, ano_semestre: '' },
        { id: 2, nome: 'B', docente_id: 1, ano_semestre: '2019/2' },
      ],
    },
  ],
  [
    'projeto financiado como participante e projeto não financiado',
    {
      docente: docente({ id: 3 }),
      projetos: [
        projeto({ id: 1, coordenador_id: 9 }),
        projeto({ id: 2, financiamento: false, orgao_fomento: '', coordenador_id: 3 }),
      ],
      participantesProjetos: [{ projeto_id: 1, docente_id: 3 }],
    },
  ],
  [
    'projeto sem datas e projeto encerrado antes do quadriênio',
    {
      docente: docente(),
      projetos: [
        projeto({ id: 1, inicio: '', fim: '' }),
        projeto({ id: 2, inicio: '2015', fim: '2018' }),
      ],
    },
  ],
  [
    'fallback textual: sobrenome comum isolado não casa',
    {
      docente: docente(),
      publicacoes: [pub(1, { autores: 'João Silva' }), pub(2, { autores: 'Maria Silva Santos' })],
    },
  ],
  [
    'vínculo estruturado prevalece sobre o texto',
    {
      docente: docente({ nome: 'Docente Teste' }),
      publicacoes: [pub(1, { autores: 'X, Y, Z' })],
      publicacoesDocentes: [{ publicacao_id: 1, docente_id: 1 }],
      coautoresPrograma: [{ publicacao_id: 1, tipo: 'sem_coautoria' }],
    },
  ],
  [
    'JCR abaixo de 1 e publicação fora do quadriênio',
    {
      docente: docente(),
      publicacoes: [pub(1, { fator_impacto_jcr: 0.5 }), pub(2, { ano: 2019 })],
    },
  ],
  ['docente colaborador', { docente: docente({ categoria: 'colaborador' }) }],
  ['docente sem categoria', { docente: docente({ categoria: null }) }],
]

describe('Paridade calculo.ts × Edge Function avaliacao-reconducao', () => {
  it.each(cenarios)('%s', (_nome, cenario) => {
    const params = { ...vazio, ...cenario } as any
    const local = avaliarDocente(params)
    const edge = avaliarDocenteLogica(params)

    for (const crit of ['criterio_i', 'criterio_ii', 'criterio_iii', 'criterio_iv'] as const) {
      expect(edge[crit].atendido, `${crit}.atendido`).toBe(local[crit].atendido)
      expect(edge[crit].quantidade, `${crit}.quantidade`).toBe(local[crit].quantidade)
    }
    expect(edge.pdq_detalhes).toEqual(local.pdq_detalhes)
    expect(edge.np_estrito).toBe(local.np_estrito)
    expect(edge.np_teto).toBe(local.np_teto)
    expect(edge.veredito).toBe(local.veredito)
    expect(edge.motivos).toEqual(local.motivos)
  })
})
