/**
 * Autenticação das Edge Functions (P-38): sem login não há resposta, e o docente só recebe a
 * própria avaliação. Módulo puro compartilhado: supabase/functions/_shared/auth.ts.
 */
import { describe, it, expect } from 'vitest'
import {
  autenticarChamador,
  restringirAvaliacoesAoDocente,
  respostaNegada,
  type DependenciasAutenticacao,
} from '../../../supabase/functions/_shared/auth'

function deps(extra: Partial<DependenciasAutenticacao> = {}): DependenciasAutenticacao {
  return {
    authHeader: 'Bearer token-valido',
    buscarUsuario: async () => ({ id: 'u-1' }),
    buscarPerfil: async () => ({ role: 'coordenador', docente_id: null }),
    ...extra,
  }
}

describe('autenticarChamador (P-38)', () => {
  it('sem cabeçalho de autorização: 401 e nem consulta o usuário', async () => {
    let consultou = false
    const r = await autenticarChamador(
      deps({
        authHeader: null,
        buscarUsuario: async () => {
          consultou = true
          return { id: 'x' }
        },
      }),
    )
    expect(r).toMatchObject({ ok: false, status: 401 })
    expect(consultou).toBe(false)
  })

  it('cabeçalho que não é Bearer, ou Bearer vazio: 401', async () => {
    for (const h of ['', 'Basic abc', 'Bearer', 'Bearer   ', 'token-solto']) {
      expect(await autenticarChamador(deps({ authHeader: h }))).toMatchObject({
        ok: false,
        status: 401,
      })
    }
  })

  it('token que não é de usuário (chave anônima, expirado) ou erro ao validar: 401', async () => {
    expect(await autenticarChamador(deps({ buscarUsuario: async () => null }))).toMatchObject({
      ok: false,
      status: 401,
    })
    expect(
      await autenticarChamador(
        deps({
          buscarUsuario: async () => {
            throw new Error('falha de rede')
          },
        }),
      ),
    ).toMatchObject({ ok: false, status: 401 })
  })

  it('usuário sem perfil, com papel vazio ou desconhecido: 403', async () => {
    expect(await autenticarChamador(deps({ buscarPerfil: async () => null }))).toMatchObject({
      ok: false,
      status: 403,
    })
    for (const role of ['', null, 'hacker', 'anon']) {
      expect(
        await autenticarChamador(deps({ buscarPerfil: async () => ({ role, docente_id: null }) })),
      ).toMatchObject({ ok: false, status: 403 })
    }
  })

  it('perfil válido passa, com papel normalizado e docente_id numérico', async () => {
    for (const role of ['suporte', 'coordenador', 'auxiliar', 'capes', 'docente']) {
      const r = await autenticarChamador(
        deps({ buscarPerfil: async () => ({ role: ` ${role.toUpperCase()} `, docente_id: 7 }) }),
      )
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.perfil.role).toBe(role)
        expect(r.perfil.docenteId).toBe(7)
        expect(r.perfil.userId).toBe('u-1')
      }
    }
    const semDocente = await autenticarChamador(
      deps({ buscarPerfil: async () => ({ role: 'docente', docente_id: null }) }),
    )
    expect(semDocente.ok && semDocente.perfil.docenteId).toBe(null)
  })
})

describe('restringirAvaliacoesAoDocente (D-25, agora no servidor)', () => {
  const lista = [{ docente_id: 1 }, { docente_id: 2 }, { docente_id: 3 }]
  const perfil = (role: string, docenteId: number | null) => ({ userId: 'u', role, docenteId })

  it('docente recebe só a própria avaliação', () => {
    expect(restringirAvaliacoesAoDocente(lista, perfil('docente', 2))).toEqual([{ docente_id: 2 }])
  })
  it('docente sem cadastro vinculado recebe lista vazia (nunca a lista inteira)', () => {
    expect(restringirAvaliacoesAoDocente(lista, perfil('docente', null))).toEqual([])
  })
  it('demais papéis recebem a lista inteira', () => {
    for (const role of ['coordenador', 'suporte', 'auxiliar', 'capes']) {
      expect(restringirAvaliacoesAoDocente(lista, perfil(role, null))).toHaveLength(3)
    }
  })
})

describe('respostaNegada', () => {
  it('devolve o status, a mensagem e os cabeçalhos CORS', async () => {
    const r = respostaNegada({ status: 401, mensagem: 'Login necessário' }, { 'X-Teste': '1' })
    expect(r.status).toBe(401)
    expect(r.headers.get('X-Teste')).toBe('1')
    expect(await r.json()).toMatchObject({ sucesso: false, mensagem: 'Login necessário' })
  })
})
