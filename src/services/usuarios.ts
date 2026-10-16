import { supabase } from '@/lib/supabase/client'
import { registrarLog } from './logs'
import type { Profile, Role, Docente } from '@/types/database'

export interface UsuarioComDetalhes extends Profile {
  created_at: string
  docente_nome?: string | null
  docente?: Docente | null
}

export interface CriarUsuarioInput {
  nome: string
  email: string
  password: string
  role: Role
  docente_id?: number | null
}

/**
 * Traduz mensagens de erro do banco ou da RPC alterar_papel para texto amigável em português.
 */
export function traduzirErroAlterarPapel(erro: any): string {
  if (!erro) return 'Erro desconhecido ao alterar papel.'
  const msg = typeof erro === 'string' ? erro : erro.message || JSON.stringify(erro)

  if (msg.includes('Não autenticado')) {
    return 'Você não está autenticado. Faça login novamente.'
  }
  if (msg.includes('Não é permitido alterar o próprio papel')) {
    return 'Você não pode alterar o seu próprio papel.'
  }
  if (msg.includes('Suporte só pode promover')) {
    return 'Permissão negada para alterar o papel selecionado.'
  }
  if (
    msg.includes('Coordenador só possui permissão para transformar usuários docente em auxiliar')
  ) {
    return 'Como Coordenador, você só tem permissão para alterar usuários com papel Docente para Auxiliar.'
  }
  if (msg.includes('Permissão negada')) {
    return 'Permissão negada: seu papel atual não possui autorização para alterar papéis de usuários.'
  }
  if (msg.includes('Perfil de usuário não encontrado')) {
    return 'Perfil de usuário não encontrado no sistema.'
  }
  return msg
}

export const usuariosService = {
  /**
   * Lista todos os usuários (perfis) com informações enriquecidas do docente vinculado.
   */
  async listar(): Promise<UsuarioComDetalhes[]> {
    const { data: profiles, error: profError } = await (supabase.from('profiles') as any)
      .select('id, user_id, email, name, role, docente_id, created_at')
      .order('name', { ascending: true })

    if (profError) {
      console.error('Erro ao listar perfis de usuários:', profError)
      throw profError
    }

    // Busca docentes para mapear o nome do docente vinculado
    const { data: docentes, error: docError } = await supabase
      .from('docentes')
      .select('id, nome, scopus_id, indice_h, bolsa_cnpq, jdp, licenca, categoria')
      .order('nome', { ascending: true })

    if (docError) {
      console.warn('Erro ao carregar lista de docentes para join de usuários:', docError)
    }

    const mapaDocentes = new Map<number, any>()
    for (const doc of docentes || []) {
      mapaDocentes.set(doc.id, doc)
    }

    return (profiles || []).map((p: any) => {
      const docente = p.docente_id ? mapaDocentes.get(p.docente_id) || null : null
      return {
        ...p,
        docente,
        docente_nome: docente?.nome || null,
      } as UsuarioComDetalhes
    })
  },

  /**
   * Altera o papel de um usuário chamando a RPC SECURITY DEFINER `alterar_papel`.
   */
  async alterarPapel(targetUserId: string, novoPapel: Role): Promise<void> {
    const { error } = await (supabase.rpc as any)('alterar_papel', {
      alvo_user_id: targetUserId,
      novo_papel: novoPapel,
    })

    if (error) {
      const msgAmigavel = traduzirErroAlterarPapel(error)
      throw new Error(msgAmigavel)
    }

    await registrarLog({
      acao: 'editar',
      entidade: 'usuarios',
      entidade_id: targetUserId,
      detalhes: {
        operacao: 'alterar_papel',
        novo_papel: novoPapel,
      },
    })
  },

  /**
   * Vincula ou desvincula um docente a um perfil de usuário.
   * Permissão garantida por RLS para staff (suporte/coordenador/auxiliar).
   */
  async vincularDocente(userId: string, docenteId: number | null): Promise<void> {
    const { error } = await (supabase.from('profiles') as any)
      .update({ docente_id: docenteId })
      .eq('user_id', userId)

    if (error) {
      console.error('Erro ao vincular docente ao perfil:', error)
      throw new Error(error.message || 'Falha ao vincular docente ao usuário.')
    }

    await registrarLog({
      acao: 'editar',
      entidade: 'usuarios',
      entidade_id: userId,
      detalhes: {
        operacao: 'vincular_docente',
        docente_id: docenteId,
      },
    })
  },

  /**
   * Atualiza o nome de exibição de um usuário.
   */
  async atualizarNome(userId: string, novoNome: string): Promise<void> {
    const { error } = await (supabase.from('profiles') as any)
      .update({ name: novoNome.trim() })
      .eq('user_id', userId)

    if (error) {
      console.error('Erro ao atualizar nome do perfil:', error)
      throw new Error(error.message || 'Falha ao atualizar o nome do usuário.')
    }

    await registrarLog({
      acao: 'editar',
      entidade: 'usuarios',
      entidade_id: userId,
      detalhes: {
        operacao: 'atualizar_nome',
        novo_nome: novoNome.trim(),
      },
    })
  },

  /**
   * Cria um novo usuário no Auth e no Profiles via Edge Function `admin-usuarios`.
   * Disponível apenas para usuários com papel 'suporte'.
   */
  /**
   * Autocadastro de docente na tela de login/cadastro confrontando o CPF informado.
   * Não requer autenticação prévia (público / self-service).
   */
  /**
   * Resolve o e-mail cadastrado a partir de um CPF informado no login.
   * Não requer autenticação prévia (público / self-service).
   */
  async resolverEmailPorCpf(cpf: string): Promise<{
    sucesso: boolean
    email?: string
    mensagem?: string
  }> {
    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: {
        acao: 'resolver-cpf',
        cpf: cpf.replace(/\D/g, ''),
      },
    })

    if (error) {
      console.error('Erro ao invocar edge function admin-usuarios (resolver-cpf):', error)
      let mensagemErro = error.message

      try {
        if ((error as any).context && typeof (error as any).context.json === 'function') {
          const body = await (error as any).context.json()
          if (body?.mensagem) mensagemErro = body.mensagem
        }
      } catch {
        // ignora
      }

      return {
        sucesso: false,
        mensagem: mensagemErro || 'Erro ao verificar CPF informado no servidor.',
      }
    }

    if (!data?.sucesso) {
      return {
        sucesso: false,
        mensagem:
          data?.mensagem || 'Nenhum usuário cadastrado foi encontrado para o CPF informado.',
      }
    }

    return {
      sucesso: true,
      email: data.email,
    }
  },

  async signupDocente(
    cpf: string,
    email: string,
    password: string,
  ): Promise<{
    sucesso: boolean
    mensagem: string
    docente_nome?: string
    docente_id?: number
    tipo?: string
  }> {
    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: {
        acao: 'signup-docente',
        cpf: cpf.replace(/\D/g, ''),
        email: email.trim().toLowerCase(),
        password,
      },
    })

    if (error) {
      console.error('Erro ao invocar edge function admin-usuarios (signup-docente):', error)
      let mensagemErro = error.message
      let tipoErro = undefined

      try {
        if ((error as any).context && typeof (error as any).context.json === 'function') {
          const body = await (error as any).context.json()
          if (body?.mensagem) mensagemErro = body.mensagem
          if (body?.tipo) tipoErro = body.tipo
        }
      } catch {
        // ignora
      }

      const err = new Error(mensagemErro || 'Falha na comunicação com o servidor para cadastro.')
      ;(err as any).tipo = tipoErro
      throw err
    }

    if (!data?.sucesso) {
      const err = new Error(data?.mensagem || 'Falha ao realizar cadastro.')
      ;(err as any).tipo = data?.tipo
      throw err
    }

    return data
  },

  async criarUsuario(dados: CriarUsuarioInput): Promise<any> {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente para criar usuários.')
    }

    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: {
        acao: 'criar',
        nome: dados.nome.trim(),
        email: dados.email.trim().toLowerCase(),
        password: dados.password,
        role: dados.role,
        docente_id: dados.docente_id ?? null,
      },
    })

    if (error) {
      console.error('Erro ao invocar edge function admin-usuarios (criar):', error)
      throw new Error(error.message || 'Falha na comunicação com o servidor para criar o usuário.')
    }

    if (!data?.sucesso) {
      throw new Error(data?.mensagem || 'Falha ao criar usuário.')
    }

    return data
  },

  /**
   * Exclui um usuário do Auth e Profiles via Edge Function `admin-usuarios`.
   * Disponível apenas para usuários com papel 'suporte'.
   */
  async excluirUsuario(userId: string): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente para excluir usuários.')
    }

    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: {
        acao: 'excluir',
        userId,
      },
    })

    if (error) {
      console.error('Erro ao invocar edge function admin-usuarios (excluir):', error)
      throw new Error(
        error.message || 'Falha na comunicação com o servidor para excluir o usuário.',
      )
    }

    if (!data?.sucesso) {
      throw new Error(data?.mensagem || 'Falha ao excluir usuário.')
    }
  },
}
