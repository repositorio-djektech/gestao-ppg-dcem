import { describe, it, expect } from 'vitest'
import { podeCriarNaTabela, podeEditarRegistro, podeExcluirRegistro } from './permissoes'

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

    it('pode editar projeto se for coordenador OU participante', () => {
      // Coordenador
      expect(
        podeEditarRegistro('docente', DOCENTE_LOGADO_ID, 'projetos_pesquisa', {
          id: 50,
          coordenador_id: DOCENTE_LOGADO_ID,
        }),
      ).toBe(true)

      // Participante
      expect(
        podeEditarRegistro(
          'docente',
          DOCENTE_LOGADO_ID,
          'projetos_pesquisa',
          { id: 51, coordenador_id: OUTRO_DOCENTE_ID },
          { isParticipanteProjeto: true },
        ),
      ).toBe(true)

      // Não vinculado
      expect(
        podeEditarRegistro(
          'docente',
          DOCENTE_LOGADO_ID,
          'projetos_pesquisa',
          { id: 52, coordenador_id: OUTRO_DOCENTE_ID },
          { isParticipanteProjeto: false },
        ),
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
          { isParticipanteProjeto: true },
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
      'patentes',
      'premiacoes',
      'producao_tecnica',
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
})
