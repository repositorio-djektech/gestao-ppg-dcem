import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CriarUsuarioPayload {
  acao: 'criar'
  nome: string
  email: string
  password: string
  role?: string
  docente_id?: number | null
}

interface ExcluirUsuarioPayload {
  acao: 'excluir'
  userId: string
}

interface ExcluirDocentePayload {
  acao: 'excluir-docente'
  docenteId: number | string
}

interface SignupDocentePayload {
  acao: 'signup-docente'
  cpf: string
  email: string
  password: string
}

interface ResolverCpfPayload {
  acao: 'resolver-cpf'
  cpf: string
}

type AdminUsuariosPayload =
  | CriarUsuarioPayload
  | ExcluirUsuarioPayload
  | ExcluirDocentePayload
  | SignupDocentePayload
  | ResolverCpfPayload

Deno.serve(async (req: Request) => {
  // Trata preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'Variáveis de ambiente do Supabase não configuradas.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    let payload: AdminUsuariosPayload
    try {
      payload = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ sucesso: false, mensagem: 'Corpo da requisição JSON inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // ==========================================
    // AÇÃO: RESOLVER CPF PARA LOGIN (público / self-service)
    // ==========================================
    if (payload.acao === 'resolver-cpf') {
      const cpfDigitos = (payload.cpf || '').replace(/\D/g, '')

      if (!cpfDigitos || cpfDigitos.length !== 11) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'CPF inválido. Informe os 11 dígitos do CPF.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      // 1. Procurar docente correspondente pelo CPF na tabela docentes
      const { data: listaDocentes, error: docError } = await adminClient
        .from('docentes')
        .select('id, nome, cpf')

      if (docError) {
        console.error('[resolver-cpf] Erro ao consultar tabela docentes:', docError)
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'Erro interno ao consultar base de docentes.',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      const docenteEncontrado = (listaDocentes || []).find(
        (d: { id: number; nome: string; cpf?: string | null }) => {
          const cpfLimpo = (d.cpf || '').replace(/\D/g, '')
          return cpfLimpo === cpfDigitos
        },
      )

      let perfilEncontrado: { id: number; email: string; user_id: string; name: string } | null =
        null

      if (docenteEncontrado) {
        // Docente encontrado: verificar se existe perfil vinculado a esse docente_id
        const { data: perfilPorDocente } = await adminClient
          .from('profiles')
          .select('id, email, user_id, name')
          .eq('docente_id', docenteEncontrado.id)
          .maybeSingle()

        if (perfilPorDocente) {
          perfilEncontrado = perfilPorDocente
        }
      }

      // Se ainda não encontrou via docente_id, checar se algum auth.users tem o CPF nos metadados
      if (!perfilEncontrado) {
        // Listar usuários do Auth que possam ter o CPF em user_metadata
        // Paginação básica no auth.admin.listUsers
        const { data: usersData } = await adminClient.auth.admin.listUsers({
          perPage: 1000,
        })

        const userMatch = (usersData?.users || []).find((u) => {
          const uCpf = String(u.user_metadata?.cpf || '').replace(/\D/g, '')
          return uCpf === cpfDigitos
        })

        if (userMatch) {
          const { data: perfilPorUser } = await adminClient
            .from('profiles')
            .select('id, email, user_id, name')
            .eq('user_id', userMatch.id)
            .maybeSingle()

          if (perfilPorUser) {
            perfilEncontrado = perfilPorUser
          } else if (userMatch.email) {
            perfilEncontrado = {
              id: 0,
              email: userMatch.email,
              user_id: userMatch.id,
              name: (userMatch.user_metadata?.name as string) || '',
            }
          }
        }
      }

      if (!perfilEncontrado || !perfilEncontrado.email) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'Nenhum usuário cadastrado foi encontrado para o CPF informado.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      return new Response(
        JSON.stringify({
          sucesso: true,
          email: perfilEncontrado.email,
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    // ==========================================
    // AÇÃO 3: AUTOCADASTRO DE DOCENTE VIA CPF (público / self-service)
    // ==========================================
    if (payload.acao === 'signup-docente') {
      const cpfDigitos = (payload.cpf || '').replace(/\D/g, '')
      const email = payload.email?.trim().toLowerCase()
      const password = payload.password?.trim()

      if (!cpfDigitos || cpfDigitos.length !== 11) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'CPF inválido. Informe os 11 dígitos do CPF.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      if (!email || !password) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'E-mail e senha são obrigatórios para o cadastro.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      if (password.length < 8) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'A senha deve conter no mínimo 8 caracteres.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      // Confrontar CPF no servidor contra a tabela public.docentes (normalizando apenas dígitos)
      // Buscar todos os docentes com CPF não nulo
      const { data: listaDocentes, error: docError } = await adminClient
        .from('docentes')
        .select('id, nome, cpf')

      if (docError) {
        console.error('[signup-docente] Erro ao consultar tabela docentes:', docError)
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'Erro interno ao consultar base de docentes.',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      const docenteEncontrado = (listaDocentes || []).find(
        (d: { id: number; nome: string; cpf?: string | null }) => {
          const cpfLimpo = (d.cpf || '').replace(/\D/g, '')
          return cpfLimpo === cpfDigitos
        },
      )

      if (!docenteEncontrado) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            tipo: 'cpf_nao_encontrado',
            mensagem: 'CPF não consta como registrado em nome de nenhum docente do PPG-DCEM.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      const docenteId = docenteEncontrado.id
      const docenteNome = docenteEncontrado.nome

      // Verificar se este docente já possui perfil cadastrado no sistema
      const { data: perfilExistente } = await adminClient
        .from('profiles')
        .select('id, email, user_id')
        .eq('docente_id', docenteId)
        .maybeSingle()

      if (perfilExistente) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            tipo: 'docente_ja_vinculado',
            mensagem: `Já existe uma conta associada a este docente (${perfilExistente.email}). Caso tenha esquecido sua senha, utilize a opção "Esqueceu a senha?".`,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      // Criar usuário no Auth com email_confirm: true e metadata com o nome do docente
      const { data: newAuthUser, error: createAuthError } = await adminClient.auth.admin.createUser(
        {
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: docenteNome,
            role: 'docente',
            docente_id: docenteId,
            cpf: cpfDigitos,
          },
        },
      )

      if (createAuthError || !newAuthUser?.user) {
        console.error('[signup-docente] Erro createUser Auth:', createAuthError)
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: createAuthError?.message?.includes('already been registered')
              ? 'Este e-mail já está cadastrado no sistema.'
              : createAuthError?.message || 'Falha ao criar usuário no sistema de autenticação.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      const newUserId = newAuthUser.user.id

      // Atualizar o perfil criado pelo trigger handle_new_user() ou fazer upsert
      // Fixando estritamente: role = 'docente', docente_id = docenteId, name = docenteNome
      let profileAtualizado = null
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: prof } = await adminClient
          .from('profiles')
          .select('*')
          .eq('user_id', newUserId)
          .maybeSingle()

        if (prof) {
          const { data: updated, error: upErr } = await adminClient
            .from('profiles')
            .update({
              role: 'docente',
              name: docenteNome,
              docente_id: docenteId,
            })
            .eq('user_id', newUserId)
            .select('*')
            .single()

          if (!upErr && updated) {
            profileAtualizado = updated
            break
          }
        }
        await new Promise((res) => setTimeout(res, 250))
      }

      if (!profileAtualizado) {
        const { data: upserted } = await adminClient
          .from('profiles')
          .upsert({
            user_id: newUserId,
            email,
            name: docenteNome,
            role: 'docente',
            docente_id: docenteId,
          })
          .select('*')
          .single()
        profileAtualizado = upserted
      }

      // Registrar no log do sistema
      await adminClient.from('logs').insert({
        user_id: newUserId,
        user_email: email,
        user_nome: docenteNome,
        acao: 'criar',
        entidade: 'usuarios',
        entidade_id: newUserId,
        detalhes: {
          operacao: 'autocadastro_docente_cpf',
          cpf_mascarado: `${cpfDigitos.slice(0, 3)}.***.***-${cpfDigitos.slice(9)}`,
          docente_id: docenteId,
          docente_nome: docenteNome,
          role: 'docente',
        },
      })

      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: `Bem-vindo(a), ${docenteNome}! Sua conta criada com sucesso.`,
          docente_nome: docenteNome,
          docente_id: docenteId,
          user: newAuthUser.user,
          profile: profileAtualizado,
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    // ==========================================
    // FLUXOS ADMINISTRATIVOS (CRIAR E EXCLUIR) — EXIGEM TOKEN DE 'SUPORTE'
    // ==========================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'Cabeçalho de autorização não fornecido.',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    // Validar identidade e permissões do usuário que está chamando a função
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const {
      data: { user: callerUser },
      error: callerError,
    } = await userClient.auth.getUser()

    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'Sessão inválida ou expirada. Faça login novamente.',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('role, name, email')
      .eq('user_id', callerUser.id)
      .single()

    if (callerProfileError || !callerProfile) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          mensagem: 'Perfil do usuário requisitante não encontrado.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    // Excluir docente em cascata pode ser executado por suporte ou coordenador (permissões de exclusão de docentes do PPG-DCEM).
    // Criação e exclusão avulsa de usuários no Auth continuam restritas a 'suporte'.
    const isSuporte = callerProfile.role === 'suporte'
    const isCoordenador = callerProfile.role === 'coordenador'

    if (payload.acao === 'excluir-docente') {
      if (!isSuporte && !isCoordenador) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem:
              'Permissão negada. Apenas usuários com papel Suporte ou Coordenador podem excluir docentes.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          },
        )
      }
    } else {
      if (!isSuporte) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem:
              'Permissão negada. Apenas usuários com papel Suporte podem gerenciar contas no Auth.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          },
        )
      }
    }

    // ==========================================
    // AÇÃO: EXCLUIR DOCENTE EM CASCATA (docente + profile + auth.users)
    // ==========================================
    if (payload.acao === 'excluir-docente') {
      const targetDocenteId = Number(payload.docenteId)

      if (!targetDocenteId || isNaN(targetDocenteId)) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'ID do docente para exclusão não foi fornecido ou é inválido.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      // 1. Buscar o docente na tabela docentes
      const { data: targetDocente, error: docenteErr } = await adminClient
        .from('docentes')
        .select('*')
        .eq('id', targetDocenteId)
        .maybeSingle()

      if (docenteErr) {
        console.error('[excluir-docente] Erro ao consultar docente:', docenteErr)
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: `Erro ao consultar docente: ${docenteErr.message}`,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      if (!targetDocente) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'Docente não encontrado para exclusão.',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      // 2. Verificar se existe perfil vinculado apontando para esse docente
      const { data: targetProfile, error: profileErr } = await adminClient
        .from('profiles')
        .select('*')
        .eq('docente_id', targetDocenteId)
        .maybeSingle()

      if (profileErr) {
        console.error('[excluir-docente] Erro ao consultar perfil vinculado:', profileErr)
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: `Erro ao verificar perfil vinculado: ${profileErr.message}`,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      const linkedUserId = targetProfile?.user_id || null

      // Proteção de segurança: nunca permitir excluir a si mesmo caso o chamador seja o docente vinculado
      if (linkedUserId && linkedUserId === callerUser.id) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem:
              'Operação proibida: você não pode excluir a sua própria conta de docente vinculada.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      // 3. Se houver usuário vinculado no Auth:
      // Excluir do Auth usando adminClient.auth.admin.deleteUser(linkedUserId)
      // Graças às constraints FK em cascata:
      // - Se o auth.users for excluído, profiles(user_id) é apagado em cascata
      // - Em seguida removemos docentes(id)
      // Se não houver usuário no Auth (apenas docente ou perfil órfão):
      // - Removemos de docentes e profiles
      if (linkedUserId) {
        // Validação extra: assegurar que o perfil do usuário realmente aponta para este docente_id
        if (targetProfile?.docente_id !== targetDocenteId) {
          return new Response(
            JSON.stringify({
              sucesso: false,
              mensagem: 'Inconsistência detectada: o perfil não corresponde ao docente alvo.',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
          )
        }

        const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(linkedUserId)
        if (deleteAuthErr) {
          console.error('[excluir-docente] Erro ao excluir usuário no Auth:', deleteAuthErr)
          return new Response(
            JSON.stringify({
              sucesso: false,
              mensagem: `Erro ao excluir usuário no Auth: ${deleteAuthErr.message}`,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
          )
        }

        // Limpeza explícita de profiles (caso o cascade do postgres auth demore milissegundos)
        await adminClient.from('profiles').delete().eq('user_id', linkedUserId)
      } else if (targetProfile) {
        // Havia profile com docente_id mas sem user_id
        await adminClient.from('profiles').delete().eq('id', targetProfile.id)
      }

      // 4. Excluir o registro de docentes
      const { error: deleteDocenteErr } = await adminClient
        .from('docentes')
        .delete()
        .eq('id', targetDocenteId)

      if (deleteDocenteErr) {
        console.error('[excluir-docente] Erro ao excluir docente:', deleteDocenteErr)
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: `Erro ao excluir docente na base de dados: ${deleteDocenteErr.message}`,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      // 5. Registrar no log institucional
      await adminClient.from('logs').insert({
        user_id: callerUser.id,
        user_email: callerProfile.email || callerUser.email,
        user_nome: callerProfile.name || 'Usuário Staff',
        acao: 'excluir',
        entidade: 'docentes',
        entidade_id: String(targetDocenteId),
        detalhes: {
          docente_nome: targetDocente.nome,
          docente_cpf: targetDocente.cpf,
          teve_usuario_vinculado: Boolean(linkedUserId),
          usuario_id_vinculado: linkedUserId,
          usuario_email_vinculado: targetProfile?.email || null,
        },
      })

      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: `Docente ${targetDocente.nome} e suas vinculações foram excluídos com sucesso.`,
          teve_usuario_vinculado: Boolean(linkedUserId),
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    // ==========================================
    // AÇÃO 1: CRIAR USUÁRIO
    // ==========================================
    if (payload.acao === 'criar') {
      const email = payload.email?.trim().toLowerCase()
      const password = payload.password?.trim()
      const nome = payload.nome?.trim()
      const papelDesejado = payload.role?.trim().toLowerCase() || 'capes'
      const docenteId = payload.docente_id ? Number(payload.docente_id) : null

      if (!email || !password || !nome) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'Campos obrigatórios ausentes: nome, e-mail e senha devem ser informados.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'A senha deve conter no mínimo 6 caracteres.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      const papeisValidos = ['suporte', 'coordenador', 'auxiliar', 'docente', 'capes']
      if (!papeisValidos.includes(papelDesejado)) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: `Papel inválido informado: ${papelDesejado}. Deve ser um de: ${papeisValidos.join(', ')}.`,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      // 1.1 Criar o usuário no Auth via supabase.auth.admin.createUser
      const { data: newAuthUser, error: createAuthError } = await adminClient.auth.admin.createUser(
        {
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: nome,
          },
        },
      )

      if (createAuthError || !newAuthUser.user) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: createAuthError?.message || 'Falha ao criar usuário no Auth.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      const newUserId = newAuthUser.user.id

      // 1.2 O trigger handle_new_user() dispara no banco e cria a linha em public.profiles
      // com role = 'capes' e name = metadata.name.
      // Damos um pequeno delay (se necessário) e atualizamos o role e docente_id no profile.
      let profileAtualizado = null
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: prof } = await adminClient
          .from('profiles')
          .select('*')
          .eq('user_id', newUserId)
          .single()

        if (prof) {
          const updatePayload: Record<string, any> = {
            role: papelDesejado,
            name: nome,
          }
          if (docenteId) {
            updatePayload.docente_id = docenteId
          }
          const { data: updated, error: upErr } = await adminClient
            .from('profiles')
            .update(updatePayload)
            .eq('user_id', newUserId)
            .select('*')
            .single()

          if (!upErr && updated) {
            profileAtualizado = updated
            break
          }
        }
        await new Promise((res) => setTimeout(res, 300))
      }

      // Se o trigger não tiver rodado por algum motivo, faz upsert direto no profile
      if (!profileAtualizado) {
        const { data: upserted } = await adminClient
          .from('profiles')
          .upsert({
            user_id: newUserId,
            email,
            name: nome,
            role: papelDesejado,
            docente_id: docenteId,
          })
          .select('*')
          .single()
        profileAtualizado = upserted
      }

      // Registrar no log institucional
      await adminClient.from('logs').insert({
        user_id: callerUser.id,
        user_email: callerProfile.email || callerUser.email,
        user_nome: callerProfile.name || 'Suporte',
        acao: 'criar',
        entidade: 'usuarios',
        entidade_id: newUserId,
        detalhes: {
          email,
          nome,
          role: papelDesejado,
          docente_id: docenteId,
        },
      })

      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: `Usuário ${email} criado com sucesso!`,
          user: newAuthUser.user,
          profile: profileAtualizado,
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    // ==========================================
    // AÇÃO 2: EXCLUIR USUÁRIO
    // ==========================================
    if (payload.acao === 'excluir') {
      const targetUserId = payload.userId?.trim()

      if (!targetUserId) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'ID do usuário para exclusão não foi fornecido.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      // Impedir que o suporte exclua a si mesmo
      if (targetUserId === callerUser.id) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: 'Operação proibida: você não pode excluir a sua própria conta.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      // Obter dados do usuário para o log antes de deletar
      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single()

      // Excluir no Auth (o ON DELETE CASCADE de profiles_user_id_fkey apaga o profile também)
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId)

      if (deleteAuthError) {
        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: `Erro ao excluir usuário no Auth: ${deleteAuthError.message}`,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        )
      }

      // Garantir limpeza da linha de profiles se não houve cascade imediato
      await adminClient.from('profiles').delete().eq('user_id', targetUserId)

      // Registrar log institucional
      await adminClient.from('logs').insert({
        user_id: callerUser.id,
        user_email: callerProfile.email || callerUser.email,
        user_nome: callerProfile.name || 'Suporte',
        acao: 'excluir',
        entidade: 'usuarios',
        entidade_id: targetUserId,
        detalhes: {
          email: targetProfile?.email || 'desconhecido',
          nome: targetProfile?.name || 'desconhecido',
          role: targetProfile?.role || 'desconhecido',
        },
      })

      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: `Usuário ${targetProfile?.email || targetUserId} excluído com sucesso.`,
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    return new Response(JSON.stringify({ sucesso: false, mensagem: 'Ação não reconhecida.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err: any) {
    console.error('[admin-usuarios] Erro fatal:', err)
    return new Response(
      JSON.stringify({
        sucesso: false,
        mensagem: err?.message || 'Erro inesperado ao gerenciar usuários.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  }
})
