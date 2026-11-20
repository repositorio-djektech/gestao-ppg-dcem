// Autenticação das Edge Functions que leem dados do programa (P-38).
//
// Antes, `avaliacao-reconducao` e `relatorio-lacunas` respondiam a qualquer chamada, sem login: sem o
// cabeçalho Authorization a consulta caía na chave de serviço (acesso total). Agora a chamada precisa
// vir de um usuário autenticado com perfil cadastrado; sem isso, 401 ou 403.
//
// Módulo PURO (sem imports): as dependências (buscar usuário e perfil) entram por parâmetro, para
// testar sem banco. É usado pelas funções e pelos testes do front.

export const PAPEIS_VALIDOS = [
  'suporte',
  'coordenador',
  'auxiliar',
  'docente',
  'capes',
  // papéis antigos que ainda podem existir em perfis antigos
  'admin',
  'editor',
  'viewer',
] as const

export interface PerfilChamador {
  userId: string
  role: string
  docenteId: number | null
}

export type ResultadoAutenticacao =
  | { ok: true; perfil: PerfilChamador }
  | { ok: false; status: 401 | 403; mensagem: string }

export interface DependenciasAutenticacao {
  /** Valor do cabeçalho Authorization (`Bearer <token>`), ou null. */
  authHeader: string | null
  /** Resolve o usuário do token; null se o token for inválido, expirado ou não for de usuário. */
  buscarUsuario: (authHeader: string) => Promise<{ id: string } | null>
  /** Perfil (`profiles`) do usuário; null se não existir. */
  buscarPerfil: (
    userId: string,
  ) => Promise<{ role?: string | null; docente_id?: number | null } | null>
}

export async function autenticarChamador(
  deps: DependenciasAutenticacao,
): Promise<ResultadoAutenticacao> {
  const header = (deps.authHeader || '').trim()
  if (!/^Bearer\s+\S+/i.test(header)) {
    return {
      ok: false,
      status: 401,
      mensagem: 'Login necessário: cabeçalho de autorização ausente.',
    }
  }

  let usuario: { id: string } | null = null
  try {
    usuario = await deps.buscarUsuario(header)
  } catch {
    usuario = null
  }
  if (!usuario?.id) {
    return {
      ok: false,
      status: 401,
      mensagem: 'Sessão inválida ou expirada. Faça login novamente.',
    }
  }

  let perfil: { role?: string | null; docente_id?: number | null } | null = null
  try {
    perfil = await deps.buscarPerfil(usuario.id)
  } catch {
    perfil = null
  }
  const role = String(perfil?.role ?? '')
    .trim()
    .toLowerCase()
  if (!perfil || !(PAPEIS_VALIDOS as readonly string[]).includes(role)) {
    return { ok: false, status: 403, mensagem: 'Usuário sem perfil de acesso ao programa.' }
  }

  const docenteId = Number(perfil.docente_id)
  return {
    ok: true,
    perfil: {
      userId: usuario.id,
      role,
      docenteId: Number.isFinite(docenteId) && docenteId > 0 ? docenteId : null,
    },
  }
}

/**
 * Credenciamento: o docente vê os cards gerais, mas só a própria avaliação na lista (D-25).
 * Os demais papéis recebem a lista inteira. Docente sem cadastro vinculado recebe lista vazia.
 */
export function restringirAvaliacoesAoDocente<T extends { docente_id: number }>(
  avaliacoes: T[],
  perfil: PerfilChamador,
): T[] {
  if (perfil.role !== 'docente') return avaliacoes
  if (perfil.docenteId === null) return []
  return avaliacoes.filter((a) => Number(a.docente_id) === perfil.docenteId)
}

export function respostaNegada(
  r: { status: number; mensagem: string },
  cabecalhos: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ sucesso: false, mensagem: r.mensagem, mensagemErro: r.mensagem }),
    {
      status: r.status,
      headers: { 'Content-Type': 'application/json', ...cabecalhos },
    },
  )
}
