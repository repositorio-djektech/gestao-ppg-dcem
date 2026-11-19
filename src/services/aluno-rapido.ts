/**
 * Cadastro rápido de aluno ou egresso a partir do formulário de artigo (D-31).
 *
 * O docente que não encontra o aluno na lista (não veio do Lattes) cadastra na hora e já o vincula
 * como coautor. A RLS já permite: discente com orientador vazio ou o próprio docente, e egresso com
 * o próprio docente como orientador. Staff cadastra sem orientador.
 */
import { supabase } from '@/lib/supabase/client'

export type TipoAlunoRapido = 'discente' | 'egresso'

export interface DadosAlunoRapido {
  tipo: TipoAlunoRapido
  nome: string
  tipoCurso?: string | null
  /** Obrigatório para egresso (conta nos indicadores de egressos). */
  anoTitulacao?: number | null
  /** Docente logado, quando o papel é docente; o aluno nasce vinculado a ele. */
  docenteId?: number | null
  docenteNome?: string | null
}

export interface AlunoCadastrado {
  id: number
  nome: string
  tipo: TipoAlunoRapido
}

const OBS = 'Cadastrado pelo formulário de publicação'

export async function cadastrarAlunoRapido(
  dados: DadosAlunoRapido,
  client: any = supabase,
): Promise<AlunoCadastrado> {
  const nome = dados.nome.trim().replace(/\s+/g, ' ')
  if (nome.length < 3) throw new Error('Informe o nome completo.')

  if (dados.tipo === 'egresso') {
    const ano = Number(dados.anoTitulacao)
    if (!Number.isInteger(ano) || ano < 1970 || ano > 2100) {
      throw new Error('Informe o ano de titulação do egresso.')
    }
    const { data, error } = await client
      .from('egressos')
      .insert([
        {
          nome,
          tipo_curso: dados.tipoCurso || null,
          ano_titulacao: ano,
          docente_orientador_id: dados.docenteId ?? null,
          orientador: dados.docenteNome || '',
          observacoes: OBS,
        },
      ])
      .select('id, nome')
      .single()
    if (error || !data) throw new Error(error?.message || 'Não foi possível cadastrar o egresso.')
    return { id: data.id, nome: data.nome, tipo: 'egresso' }
  }

  const { data, error } = await client
    .from('discentes')
    .insert([
      {
        nome,
        cpf: '',
        data_ingresso: '',
        status: 'em_andamento',
        tipo_curso: dados.tipoCurso || '',
        docente_orientador_id: dados.docenteId ?? null,
        orientador: dados.docenteNome || '',
        link_lattes: '',
        link_comprovacao: '',
        observacoes: OBS,
      },
    ])
    .select('id, nome')
    .single()
  if (error || !data) throw new Error(error?.message || 'Não foi possível cadastrar o aluno.')
  return { id: data.id, nome: data.nome, tipo: 'discente' }
}
