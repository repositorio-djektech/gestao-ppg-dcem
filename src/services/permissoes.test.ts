import { describe, it, expect } from 'vitest'
import {
  podeCriarNaTabela,
  podeEditarRegistro,
  podeExcluirRegistro,
  discenteSemOrientador,
  podeAssumirOrientacao,
  podeAlterarOrientadorPrincipal,
  podeEditarTextoItem13,
  podeVerDadosPessoaisDocente,
} from './permissoes'

describe('Serviço de Permissões por Linha e Tabela (permissoes.ts)', () => {
  const DOCENTE_LOGADO_ID = 42
  const OUTRO_DOCENTE_ID = 99

  describe('Papéis de Staff e Capes (comportamentos globais)', () => {
    it('suporte e coordenador podem criar, editar e excluir em qualquer tabela', () => {
      for (const role of ['suporte', 'coordenador'] as const) {
        expect(podeCriarNaTabela(role, 'docentes', null)).toBe(true)
        expect(podeEditarRegistro(role, null, 'docentes', { id: OUTRO_DOCENTE_ID })).toBe(true)
        expect(podeExcluirRegistro(role, null, 'docentes', { id: OUTRO_DOCENTE_ID })).toBe(true)

        expect(podeCriarNaTabela(role, 'discentes', null)).toBe(true)
        expect(
          podeEditarRegistro(role, null, 'discentes', {
            id: 1,
            docente_orientador_id: OUTRO_DOCENTE_ID,
          }),
        ).toBe(true)
        expect(
          podeExcluirRegistro(role, null, 'discentes', {
            id: 1,
            docente_orientador_id: OUTRO_DOCENTE_ID,
          }),
        ).toBe(true)
      }
    })

    it('auxiliar pode criar e editar, mas nunca excluir', () => {
      expect(podeCriarNaTabela('auxiliar', 'docentes', null)).toBe(true)
      expect(podeEditarRegistro('auxiliar', null, 'docentes', { id: OUTRO_DOCENTE_ID })).toBe(true)
      expect(podeExcluirRegistro('auxiliar', null, 'docentes', { id: OUTRO_DOCENTE_ID })).toBe(
        false,
      )
    })

    it('capes não pode criar, editar nem excluir nada', () => {
      expect(podeCriarNaTabela('capes', 'docentes', DOCENTE_LOGADO_ID)).toBe(false)
      expect(
        podeEditarRegistro('capes', DOCENTE_LOGADO_ID, 'docentes', { id: DOCENTE_LOGADO_ID }),
      ).toBe(false)
      expect(
        podeExcluirRegistro('capes', DOCENTE_LOGADO_ID, 'docentes', { id: DOCENTE_LOGADO_ID }),
      ).toBe(false)
    })
  })

  describe('Papel Docente - Tabela "docentes"', () => {
    it('NÃO pode criar novos docentes', () => {
      expect(podeCriarNaTabela('docente', 'docentes', DOCENTE_LOGADO_ID)).toBe(false)
    })

    it('só pode editar seus próprios dados (id == docente_id do profile)', () => {
      // Positivo: seus próprios dados
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'docentes', { id: DOCENTE_LOGADO_ID }),
      ).toBe(true)

      // Negativo: outro docente
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'docentes', { id: OUTRO_DOCENTE_ID }),
      ).toBe(false)
    })

    it('nunca pode excluir docentes (nem a si mesmo, RLS docentes_delete_staff)', () => {
      expect(
        podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, 'docentes', { id: DOCENTE_LOGADO_ID }),
      ).toBe(false)
      expect(
        podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, 'docentes', { id: OUTRO_DOCENTE_ID }),
      ).toBe(false)
    })
  })

  describe('Papel Docente - Tabela "discentes"', () => {
    it('pode criar novos discentes quando autenticado como docente com vínculo', () => {
      expect(podeCriarNaTabela('docente', 'discentes', DOCENTE_LOGADO_ID)).toBe(true)
      expect(podeCriarNaTabela('docente', 'discentes', null)).toBe(false)
    })

    it('só pode editar discentes dos quais é orientador direto ou por vínculo', () => {
      // Positivo: docente_orientador_id igual
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'discentes', {
          id: 1,
          docente_orientador_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(true)

      // Positivo: vínculo via contexto isOrientadorVinculado
      expect(
        podeEditarRegistro(
          'docente',
          DOCENTE_LOGADO_ID,
          'discentes',
          { id: 2, docente_orientador_id: OUTRO_DOCENTE_ID },
          { isOrientadorVinculado: true },
        ),
      ).toBe(true)

      // Negativo: discente orientado por outro docente
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'discentes', {
          id: 3,
          docente_orientador_id: OUTRO_DOCENTE_ID,
        }),
      ).toBe(false)
    })

    it('NÃO pode excluir discentes (discentes_delete_staff restringe a staff)', () => {
      expect(
        podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, 'discentes', {
          id: 1,
          docente_orientador_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(false)
    })
  })

  describe('Papel Docente - Tabela "egressos"', () => {
    it('pode criar novos egressos quando autenticado como docente com vínculo', () => {
      expect(podeCriarNaTabela('docente', 'egressos', DOCENTE_LOGADO_ID)).toBe(true)
      expect(podeCriarNaTabela('docente', 'egressos', null)).toBe(false)
    })

    it('só pode editar egressos que orientou', () => {
      // Positivo
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'egressos', {
          id: 10,
          docente_orientador_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(true)

      // Negativo
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'egressos', {
          id: 11,
          docente_orientador_id: OUTRO_DOCENTE_ID,
        }),
      ).toBe(false)
    })

    it('NÃO pode excluir egressos (egressos_delete_staff)', () => {
      expect(
        podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, 'egressos', {
          id: 10,
          docente_orientador_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(false)
    })
  })

  describe('Papel Docente - Tabela "orientacoes"', () => {
    it('pode criar orientações', () => {
      expect(podeCriarNaTabela('docente', 'orientacoes', DOCENTE_LOGADO_ID)).toBe(true)
    })

    it('pode editar e excluir apenas suas próprias orientações', () => {
      // Positivo
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'orientacoes', {
          id: 20,
          docente_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(true)
      expect(
        podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, 'orientacoes', {
          id: 20,
          docente_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(true)

      // Negativo
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'orientacoes', {
          id: 21,
          docente_id: OUTRO_DOCENTE_ID,
        }),
      ).toBe(false)
      expect(
        podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, 'orientacoes', {
          id: 21,
          docente_id: OUTRO_DOCENTE_ID,
        }),
      ).toBe(false)
    })
  })

  describe('Papel Docente - Tabela "disciplinas"', () => {
    it('pode criar disciplinas', () => {
      expect(podeCriarNaTabela('docente', 'disciplinas', DOCENTE_LOGADO_ID)).toBe(true)
    })

    it('pode editar e excluir apenas disciplinas com seu docente_id', () => {
      // Positivo
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'disciplinas', {
          id: 30,
          docente_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(true)
      expect(
        podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, 'disciplinas', {
          id: 30,
          docente_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(true)

      // Negativo
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'disciplinas', {
          id: 31,
          docente_id: OUTRO_DOCENTE_ID,
        }),
      ).toBe(false)
      expect(
        podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, 'disciplinas', {
          id: 31,
          docente_id: OUTRO_DOCENTE_ID,
        }),
      ).toBe(false)
    })
  })

  describe('Papel Docente - Tabela "iniciacao_cientifica"', () => {
    it('pode criar IC/IT', () => {
      expect(podeCriarNaTabela('docente', 'iniciacao_cientifica', DOCENTE_LOGADO_ID)).toBe(true)
    })

    it('pode editar e excluir apenas IC/IT onde é o orientador', () => {
      // Positivo
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'iniciacao_cientifica', {
          id: 40,
          docente_orientador_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(true)
      expect(
        podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, 'iniciacao_cientifica', {
          id: 40,
          docente_orientador_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(true)

      // Negativo
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'iniciacao_cientifica', {
          id: 41,
          docente_orientador_id: OUTRO_DOCENTE_ID,
        }),
      ).toBe(false)
      expect(
        podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, 'iniciacao_cientifica', {
          id: 41,
          docente_orientador_id: OUTRO_DOCENTE_ID,
        }),
      ).toBe(false)
    })
  })

  describe('Papel Docente - Tabela "projetos_pesquisa"', () => {
    it('pode criar projetos', () => {
      expect(podeCriarNaTabela('docente', 'projetos_pesquisa', DOCENTE_LOGADO_ID)).toBe(true)
    })

    it('edita projeto só como coordenador; participante só visualiza (D-27)', () => {
      // Coordenador edita
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'projetos_pesquisa', {
          id: 50,
          coordenador_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(true)

      // Participante NÃO edita (mesmo com o contexto antigo de participação)
      expect(
        podeEditarRegistro(
          'docente',
          DOCENTE_LOGADO_ID,
          'projetos_pesquisa',
          { id: 51, coordenador_id: OUTRO_DOCENTE_ID },
          { isParticipanteProjeto: true } as any,
        ),
      ).toBe(false)

      // Não vinculado também não
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'projetos_pesquisa', {
          id: 52,
          coordenador_id: OUTRO_DOCENTE_ID,
        }),
      ).toBe(false)
    })

    it('só pode excluir projeto se for o coordenador (RLS projetos_pesquisa_delete)', () => {
      // Coordenador pode
      expect(
        podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, 'projetos_pesquisa', {
          id: 50,
          coordenador_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(true)

      // Apenas participante não pode excluir
      expect(
        podeExcluirRegistro(
          'docente',
          DOCENTE_LOGADO_ID,
          'projetos_pesquisa',
          { id: 51, coordenador_id: OUTRO_DOCENTE_ID },
          { isParticipanteProjeto: true } as any,
        ),
      ).toBe(false)
    })
  })

  describe('Papel Docente - Tabela "publicacoes"', () => {
    it('pode criar publicação', () => {
      expect(podeCriarNaTabela('docente', 'publicacoes', DOCENTE_LOGADO_ID)).toBe(true)
    })

    it('só pode editar e excluir publicações vinculadas a ele via publicacoes_docentes', () => {
      // Positivo: vinculado via publicacoes_docentes
      expect(
        podeEditarRegistro(
          'docente',
          DOCENTE_LOGADO_ID,
          'publicacoes',
          { id: 60, titulo: 'Artigo Vinculado' },
          { publicacoesDocentesIds: [DOCENTE_LOGADO_ID, 100] },
        ),
      ).toBe(true)

      expect(
        podeExcluirRegistro(
          'docente',
          DOCENTE_LOGADO_ID,
          'publicacoes',
          { id: 60, titulo: 'Artigo Vinculado' },
          { publicacoesDocentesIds: [DOCENTE_LOGADO_ID] },
        ),
      ).toBe(true)

      // Negativo: não vinculado
      expect(
        podeEditarRegistro(
          'docente',
          DOCENTE_LOGADO_ID,
          'publicacoes',
          { id: 61, titulo: 'Artigo de Outro' },
          { publicacoesDocentesIds: [OUTRO_DOCENTE_ID] },
        ),
      ).toBe(false)

      expect(
        podeExcluirRegistro(
          'docente',
          DOCENTE_LOGADO_ID,
          'publicacoes',
          { id: 61, titulo: 'Artigo de Outro' },
          { publicacoesDocentesIds: [OUTRO_DOCENTE_ID] },
        ),
      ).toBe(false)
    })
  })

  describe('Papel Docente - Tabelas institucionais (eventos, patentes, etc.)', () => {
    const tabelasInstitucionais = [
      'eventos',
      'impacto_social',
      'linhas_pesquisa',
      'mobilidade_docente',
      'premiacoes',
      'ppg',
    ]

    for (const tabela of tabelasInstitucionais) {
      it(`não pode criar, editar nem excluir na tabela ${tabela}`, () => {
        expect(podeCriarNaTabela('docente', tabela, DOCENTE_LOGADO_ID)).toBe(false)
        expect(podeEditarRegistro('docente', DOCENTE_LOGADO_ID, tabela, { id: 70 })).toBe(false)
        expect(podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, tabela, { id: 70 })).toBe(false)
      })
    }
  })

  // ---------------------------------------------------------------------------
  // D-11 / P-06: vínculo docente–discente. Dados fictícios.
  // ---------------------------------------------------------------------------
  describe('P-06 — causa do bug: docente não edita discente sem orientador (confirmação)', () => {
    it('podeEditarRegistro nega edição de discente sem orientador, por isso o docente nunca consegue se vincular pela edição', () => {
      for (const semOrientador of [null, undefined]) {
        expect(
          podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'discentes', {
            id: 5,
            docente_orientador_id: semOrientador,
          }),
        ).toBe(false)
      }
    })
  })

  describe('H-01 — podeAssumirOrientacao (docente se define orientador)', () => {
    it('discenteSemOrientador: null, undefined, 0 e negativo contam como sem orientador', () => {
      expect(discenteSemOrientador({ docente_orientador_id: null })).toBe(true)
      expect(discenteSemOrientador({ docente_orientador_id: undefined })).toBe(true)
      expect(discenteSemOrientador({ docente_orientador_id: 0 })).toBe(true)
      expect(discenteSemOrientador({ docente_orientador_id: -1 })).toBe(true)
      expect(discenteSemOrientador({ docente_orientador_id: 7 })).toBe(false)
      expect(discenteSemOrientador(null)).toBe(true)
    })

    it('docente vinculado pode assumir a orientação de discente sem orientador', () => {
      expect(
        podeAssumirOrientacao('docente', DOCENTE_LOGADO_ID, { id: 1, docente_orientador_id: null }),
      ).toBe(true)
    })

    it('depois de assumir, o docente passa a poder editar o discente (fluxo completo da H-01)', () => {
      const antes = { id: 1, docente_orientador_id: null as number | null }
      expect(podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'discentes', antes)).toBe(false)
      expect(podeAssumirOrientacao('docente', DOCENTE_LOGADO_ID, antes)).toBe(true)
      const depois = { ...antes, docente_orientador_id: DOCENTE_LOGADO_ID }
      expect(podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'discentes', depois)).toBe(true)
    })

    it('não pode assumir se o discente já tem orientador (outro docente ou ele mesmo)', () => {
      expect(
        podeAssumirOrientacao('docente', DOCENTE_LOGADO_ID, {
          id: 1,
          docente_orientador_id: OUTRO_DOCENTE_ID,
        }),
      ).toBe(false)
      expect(
        podeAssumirOrientacao('docente', DOCENTE_LOGADO_ID, {
          id: 1,
          docente_orientador_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(false)
    })

    it('docente sem vínculo com um cadastro de docente não pode assumir', () => {
      expect(podeAssumirOrientacao('docente', null, { id: 1, docente_orientador_id: null })).toBe(
        false,
      )
      expect(
        podeAssumirOrientacao('docente', undefined, { id: 1, docente_orientador_id: null }),
      ).toBe(false)
    })

    it('outros papéis não usam esta ação (a coordenação define o orientador pela edição; capes é leitura)', () => {
      for (const role of ['suporte', 'coordenador', 'auxiliar', 'capes', null] as const) {
        expect(
          podeAssumirOrientacao(role, DOCENTE_LOGADO_ID, { id: 1, docente_orientador_id: null }),
        ).toBe(false)
      }
    })
  })

  describe('D-24 — coorientador não edita o discente', () => {
    it('ser coorientador (orientador principal é outro docente) não dá permissão de edição', () => {
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'discentes', {
          id: 1,
          docente_orientador_id: OUTRO_DOCENTE_ID,
        }),
      ).toBe(false)
    })
  })

  describe('H-03 — podeAlterarOrientadorPrincipal', () => {
    it('coordenação (suporte, coordenador e auxiliar, que já editam discentes) pode alterar', () => {
      for (const role of ['suporte', 'coordenador', 'auxiliar'] as const) {
        expect(podeAlterarOrientadorPrincipal(role)).toBe(true)
      }
    })

    it('docente nunca altera o orientador principal; capes e sem papel também não', () => {
      for (const role of ['docente', 'capes', null, undefined] as const) {
        expect(podeAlterarOrientadorPrincipal(role)).toBe(false)
      }
    })
  })

  describe('H-10 — podeEditarTextoItem13 (texto do item 1.3, editável pela coordenação)', () => {
    it('suporte e coordenador editam', () => {
      expect(podeEditarTextoItem13('suporte')).toBe(true)
      expect(podeEditarTextoItem13('coordenador')).toBe(true)
    })

    it('auxiliar, docente, capes e sem papel não editam (só leem)', () => {
      for (const role of ['auxiliar', 'docente', 'capes', null, undefined] as const) {
        expect(podeEditarTextoItem13(role)).toBe(false)
      }
    })
  })

  describe('D-25 — CPF e SIAPE de docente: o docente só vê os próprios', () => {
    const meu = { id: DOCENTE_LOGADO_ID }
    const alheio = { id: OUTRO_DOCENTE_ID }

    it('docente vê CPF/SIAPE do próprio registro e não vê os de outros', () => {
      expect(podeVerDadosPessoaisDocente('docente', DOCENTE_LOGADO_ID, meu)).toBe(true)
      expect(podeVerDadosPessoaisDocente('docente', DOCENTE_LOGADO_ID, alheio)).toBe(false)
    })

    it('docente sem cadastro vinculado não vê o de ninguém', () => {
      expect(podeVerDadosPessoaisDocente('docente', null, meu)).toBe(false)
      expect(podeVerDadosPessoaisDocente('docente', undefined, alheio)).toBe(false)
    })

    it('suporte, coordenador, auxiliar e capes continuam vendo tudo', () => {
      for (const role of ['suporte', 'coordenador', 'auxiliar', 'capes'] as const) {
        expect(podeVerDadosPessoaisDocente(role, null, alheio)).toBe(true)
      }
    })

    it('sem papel carregado, por segurança, não mostra', () => {
      expect(podeVerDadosPessoaisDocente(null, null, meu)).toBe(false)
      expect(podeVerDadosPessoaisDocente(undefined, null, meu)).toBe(false)
    })
  })

  describe('D-27 — patentes e produção técnica: docente só nos registros vinculados a ele', () => {
    for (const tabela of ['patentes', 'producao_tecnica']) {
      it(`${tabela}: pode criar, e edita/exclui só quando vinculado`, () => {
        expect(podeCriarNaTabela('docente', tabela, DOCENTE_LOGADO_ID)).toBe(true)
        expect(podeCriarNaTabela('docente', tabela, null)).toBe(false)

        const meu = { id: 70 }
        const vinculado = { docentesVinculadosIds: [DOCENTE_LOGADO_ID, OUTRO_DOCENTE_ID] }
        const alheio = { docentesVinculadosIds: [OUTRO_DOCENTE_ID] }

        expect(podeEditarRegistro('docente', DOCENTE_LOGADO_ID, tabela, meu, vinculado)).toBe(true)
        expect(podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, tabela, meu, vinculado)).toBe(true)
        expect(podeEditarRegistro('docente', DOCENTE_LOGADO_ID, tabela, meu, alheio)).toBe(false)
        expect(podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, tabela, meu, alheio)).toBe(false)
        // sem contexto (vínculos não carregados): nega
        expect(podeEditarRegistro('docente', DOCENTE_LOGADO_ID, tabela, meu)).toBe(false)
        expect(podeExcluirRegistro('docente', DOCENTE_LOGADO_ID, tabela, meu)).toBe(false)
      })

      it(`${tabela}: coordenação mantém todos os poderes`, () => {
        for (const role of ['suporte', 'coordenador'] as const) {
          expect(podeCriarNaTabela(role, tabela, null)).toBe(true)
          expect(podeEditarRegistro(role, null, tabela, { id: 1 })).toBe(true)
          expect(podeExcluirRegistro(role, null, tabela, { id: 1 })).toBe(true)
        }
        expect(podeEditarRegistro('auxiliar', null, tabela, { id: 1 })).toBe(true)
        expect(podeExcluirRegistro('auxiliar', null, tabela, { id: 1 })).toBe(false)
      })
    }
  })
})
