import { describe, it, expect } from 'vitest'
import {
  REGRAS_DOCENTES,
  REGRAS_DISCENTES,
  REGRAS_PUBLICACOES,
  REGRAS_ORIENTACOES,
  REGRAS_PROJETOS_PESQUISA,
  REGRAS_EVENTOS,
  REGRAS_MOBILIDADE,
  REGRAS_PATENTES,
  REGRAS_PREMIACOES,
  REGRAS_PRODUCAO_TECNICA,
  TODAS_AS_REGRAS,
  consolidarRelatorioLacunas,
  avaliarColecao,
} from './regras'
import type {
  Docente,
  Discente,
  Publicacao,
  Orientacao,
  ProjetoPesquisa,
  Evento,
  Mobilidade,
  Patente,
  Premiacao,
  ProducaoTecnica,
} from '@/types/database'

describe('Regras de Lacunas - Etapa 1', () => {
  describe('Regras de Docentes', () => {
    const docenteCompleto: Docente = {
      id: 4,
      nome: 'Ledjane Silva Barreto',
      scopus_id: '7005598575',
      indice_h: 22,
      bolsa_cnpq: 'PQ 1D',
      jdp: false,
      licenca: '',
      id_lattes: '3104369029830651',
      openalex_id: 'A5012512598',
    }

    const docenteSemIdentificadores: Docente = {
      id: 99,
      nome: 'Docente Incompleto Mock',
      scopus_id: '',
      indice_h: 0,
      bolsa_cnpq: '',
      jdp: false,
      licenca: '',
      id_lattes: null,
      openalex_id: null,
    }

    it('docente preenchido (Ledjane) NÃO deve ter nenhuma lacuna', () => {
      const { resumo, lacunas } = avaliarColecao([docenteCompleto], REGRAS_DOCENTES)

      for (const r of resumo) {
        expect(r.total_lacunas).toBe(0)
      }
      for (const l of lacunas) {
        expect(l.registros).toHaveLength(0)
      }
    })

    it('docente sem scopus_id entra na regra crítica correspondente', () => {
      const regraScopus = REGRAS_DOCENTES.find((r) => r.id === 'docente_sem_scopus_id')!
      expect(regraScopus).toBeDefined()
      expect(regraScopus.severidade).toBe('critica')

      const resLedjane = regraScopus.avaliar(docenteCompleto)
      expect(resLedjane.temLacuna).toBe(false)

      const resIncompleto = regraScopus.avaliar(docenteSemIdentificadores)
      expect(resIncompleto.temLacuna).toBe(true)
      expect(resIncompleto.motivo).toMatch(/Scopus/i)
    })

    it('docente sem openalex_id entra como atenção', () => {
      const regraOpenAlex = REGRAS_DOCENTES.find((r) => r.id === 'docente_sem_openalex_id')!
      expect(regraOpenAlex.severidade).toBe('atencao')

      expect(regraOpenAlex.avaliar(docenteCompleto).temLacuna).toBe(false)
      expect(regraOpenAlex.avaliar(docenteSemIdentificadores).temLacuna).toBe(true)
    })

    it('docente sem id_lattes entra como crítica', () => {
      const regraLattes = REGRAS_DOCENTES.find((r) => r.id === 'docente_sem_id_lattes')!
      expect(regraLattes.severidade).toBe('critica')

      expect(regraLattes.avaliar(docenteCompleto).temLacuna).toBe(false)
      expect(regraLattes.avaliar(docenteSemIdentificadores).temLacuna).toBe(true)
    })

    it('índice_h ausente ou zero entra como atenção', () => {
      const regraH = REGRAS_DOCENTES.find((r) => r.id === 'docente_indice_h_ausente_ou_zero')!
      expect(regraH.severidade).toBe('atencao')

      expect(regraH.avaliar(docenteCompleto).temLacuna).toBe(false)
      expect(regraH.avaliar(docenteSemIdentificadores).temLacuna).toBe(true)

      const docenteHNull = { ...docenteCompleto, indice_h: null as any }
      expect(regraH.avaliar(docenteHNull).temLacuna).toBe(true)
    })

    it('sem bolsa CNPq informada entra como atenção', () => {
      const regraBolsa = REGRAS_DOCENTES.find((r) => r.id === 'docente_sem_bolsa_cnpq')!
      expect(regraBolsa.severidade).toBe('atencao')

      expect(regraBolsa.avaliar(docenteCompleto).temLacuna).toBe(false)
      expect(regraBolsa.avaliar(docenteSemIdentificadores).temLacuna).toBe(true)
    })
  })

  describe('Regras de Discentes', () => {
    const discenteCompleto: Discente = {
      id: 1,
      nome: 'João Pedro Alves',
      cpf: '12345678901',
      data_ingresso: '2024-03-01',
      status: 'ativo',
      link_lattes: 'http://lattes.cnpq.br/1234567890123456',
      link_comprovacao: '',
      observacoes: '',
    }

    const discenteIncompleto: Discente = {
      id: 10,
      nome: 'Discente Sem Nada',
      cpf: '',
      data_ingresso: '',
      status: '' as any,
      link_lattes: '',
      link_comprovacao: '',
      observacoes: '',
    }

    it('discente completo não apresenta nenhuma lacuna', () => {
      const { resumo, lacunas } = avaliarColecao([discenteCompleto], REGRAS_DISCENTES)
      for (const r of resumo) {
        expect(r.total_lacunas).toBe(0)
      }
      for (const l of lacunas) {
        expect(l.registros).toHaveLength(0)
      }
    })

    it('discente sem CPF entra como crítica', () => {
      const regraCpf = REGRAS_DISCENTES.find((r) => r.id === 'discente_sem_cpf')!
      expect(regraCpf.severidade).toBe('critica')
      expect(regraCpf.avaliar(discenteCompleto).temLacuna).toBe(false)
      expect(regraCpf.avaliar(discenteIncompleto).temLacuna).toBe(true)
    })

    it('discente sem data de ingresso entra como atenção', () => {
      const regraData = REGRAS_DISCENTES.find((r) => r.id === 'discente_sem_data_ingresso')!
      expect(regraData.severidade).toBe('atencao')
      expect(regraData.avaliar(discenteCompleto).temLacuna).toBe(false)
      expect(regraData.avaliar(discenteIncompleto).temLacuna).toBe(true)
    })

    it('discente sem link Lattes entra como atenção', () => {
      const regraLattes = REGRAS_DISCENTES.find((r) => r.id === 'discente_sem_link_lattes')!
      expect(regraLattes.severidade).toBe('atencao')
      expect(regraLattes.avaliar(discenteCompleto).temLacuna).toBe(false)
      expect(regraLattes.avaliar(discenteIncompleto).temLacuna).toBe(true)
    })

    it('discente sem status entra como crítica', () => {
      const regraStatus = REGRAS_DISCENTES.find((r) => r.id === 'discente_sem_status')!
      expect(regraStatus.severidade).toBe('critica')
      expect(regraStatus.avaliar(discenteCompleto).temLacuna).toBe(false)
      expect(regraStatus.avaliar(discenteIncompleto).temLacuna).toBe(true)
    })
  })

  describe('Regras das 8 tabelas restantes (Etapa 5) e R4', () => {
    it('totaliza 31 regras no sistema (9 doc + 6 disc + 4 pub + 3 ori + 3 proj + 2 ev + 2 mob + 2 pat + 2 prem + 1 pt)', () => {
      expect(TODAS_AS_REGRAS).toHaveLength(31)
    })

    it('identifica docente JDP com prazo expirado', () => {
      const regra = REGRAS_DOCENTES.find((r) => r.id === 'docente_jdp_expirado')!
      expect(regra).toBeDefined()
      const d1 = { id: 1, nome: 'Prof A', jdp: true, jdp_desde: 2018, ano_doutorado: 2022 } as any
      expect(regra.avaliar(d1).temLacuna).toBe(true)

      const d2 = { id: 2, nome: 'Prof B', jdp: true, jdp_desde: 2024, ano_doutorado: 2022 } as any
      expect(regra.avaliar(d2).temLacuna).toBe(false)
    })

    it('identifica docente JDP sem categoria permanente', () => {
      const regra = REGRAS_DOCENTES.find((r) => r.id === 'docente_jdp_sem_categoria_permanente')!
      expect(regra).toBeDefined()
      const d1 = { id: 1, nome: 'Prof A', jdp: true, categoria: 'colaborador' } as any
      expect(regra.avaliar(d1).temLacuna).toBe(true)

      const d2 = { id: 2, nome: 'Prof B', jdp: true, categoria: 'permanente' } as any
      expect(regra.avaliar(d2).temLacuna).toBe(false)
    })

    it('R4: docente permanente sem linha de pesquisa gera lacuna crítica', () => {
      const regra = REGRAS_DOCENTES.find((r) => r.id === 'docente_permanente_sem_linha_pesquisa')!
      expect(regra).toBeDefined()
      expect(regra.severidade).toBe('critica')

      const d1 = { id: 1, nome: 'Prof A', categoria: 'Permanente', total_linhas: 0 } as any
      expect(regra.avaliar(d1).temLacuna).toBe(true)

      const d2 = { id: 2, nome: 'Prof B', categoria: 'Permanente', total_linhas: 2 } as any
      expect(regra.avaliar(d2).temLacuna).toBe(false)

      const d3 = { id: 3, nome: 'Prof C', categoria: 'Colaborador', total_linhas: 0 } as any
      expect(regra.avaliar(d3).temLacuna).toBe(false)
    })

    it('R4: docente sem participação nem coordenação em projeto gera lacuna atenção', () => {
      const regra = REGRAS_DOCENTES.find((r) => r.id === 'docente_sem_projeto_pesquisa')!
      expect(regra).toBeDefined()
      expect(regra.severidade).toBe('atencao')

      const d1 = {
        id: 1,
        nome: 'Prof A',
        total_participacoes_projetos: 0,
        total_projetos_coordenados: 0,
      } as any
      expect(regra.avaliar(d1).temLacuna).toBe(true)

      const d2 = {
        id: 2,
        nome: 'Prof B',
        total_participacoes_projetos: 1,
        total_projetos_coordenados: 0,
      } as any
      expect(regra.avaliar(d2).temLacuna).toBe(false)

      const d3 = {
        id: 3,
        nome: 'Prof C',
        total_participacoes_projetos: 0,
        total_projetos_coordenados: 1,
      } as any
      expect(regra.avaliar(d3).temLacuna).toBe(false)
    })

    it('R4: discente sem docente_orientador_id gera lacuna crítica', () => {
      const regra = REGRAS_DISCENTES.find((r) => r.id === 'discente_sem_docente_orientador')!
      expect(regra).toBeDefined()
      expect(regra.severidade).toBe('critica')

      const disc1 = { id: 1, nome: 'Aluno A', docente_orientador_id: null } as any
      expect(regra.avaliar(disc1).temLacuna).toBe(true)

      const disc2 = { id: 2, nome: 'Aluno B', docente_orientador_id: 10 } as any
      expect(regra.avaliar(disc2).temLacuna).toBe(false)
    })

    it('R4: discente sem projeto_id gera lacuna atenção, mas ponte projetos_discentes satisfaz a regra', () => {
      const regra = REGRAS_DISCENTES.find((r) => r.id === 'discente_sem_projeto_pesquisa')!
      expect(regra).toBeDefined()
      expect(regra.severidade).toBe('atencao')

      const disc1 = { id: 1, nome: 'Aluno A', projeto_id: null } as any
      expect(regra.avaliar(disc1).temLacuna).toBe(true)

      const disc2 = { id: 2, nome: 'Aluno B', projeto_id: 5 } as any
      expect(regra.avaliar(disc2).temLacuna).toBe(false)

      const disc3 = {
        id: 3,
        nome: 'Aluno C',
        projeto_id: null,
        total_projetos_vinculados: 1,
      } as any
      expect(regra.avaliar(disc3).temLacuna).toBe(false)

      const disc4 = {
        id: 4,
        nome: 'Aluno D',
        projeto_id: null,
        projetos_discentes: [{ projeto_id: 8, discente_id: 4 }],
      } as any
      expect(regra.avaliar(disc4).temLacuna).toBe(false)
    })

    it('R4: publicação JCR >= 1.0 sem nenhum docente autor vinculado gera lacuna atenção', () => {
      const regra = REGRAS_PUBLICACOES.find((r) => r.id === 'publicacao_jcr_sem_docente_vinculado')!
      expect(regra).toBeDefined()
      expect(regra.severidade).toBe('atencao')

      const p1 = {
        id: 1,
        titulo: 'Artigo X',
        fator_impacto_jcr: 2.5,
        total_docentes_vinculados: 0,
      } as any
      expect(regra.avaliar(p1).temLacuna).toBe(true)

      const p2 = {
        id: 2,
        titulo: 'Artigo Y',
        fator_impacto_jcr: 1.8,
        total_docentes_vinculados: 1,
      } as any
      expect(regra.avaliar(p2).temLacuna).toBe(false)

      const p3 = {
        id: 3,
        titulo: 'Artigo Z',
        fator_impacto_jcr: 0.8,
        total_docentes_vinculados: 0,
      } as any
      expect(regra.avaliar(p3).temLacuna).toBe(false)
    })

    it('avalia regras de publicações (ano crítica, doi e periódico atenção)', () => {
      const pubCompleta: Publicacao = {
        id: 1,
        titulo: 'Artigo Completo',
        autores: 'Silva, J.; Barreto, L.',
        periodico: 'Journal of Materials',
        ano: 2025,
        doi: '10.1016/j.mat.2025',
        justificativa: '',
        link_comprovacao: '',
        observacoes: '',
      }
      const pubIncompleta: Publicacao = {
        id: 2,
        titulo: 'Artigo Incompleto',
        autores: 'Silva, J.',
        periodico: '',
        ano: 0,
        doi: '',
        justificativa: '',
        link_comprovacao: '',
        observacoes: '',
      }

      const aval = avaliarColecao([pubCompleta, pubIncompleta], REGRAS_PUBLICACOES)
      expect(aval.resumo.find((r) => r.regra_id === 'publicacao_sem_ano')?.total_lacunas).toBe(1)
      expect(aval.resumo.find((r) => r.regra_id === 'publicacao_sem_doi')?.total_lacunas).toBe(1)
      expect(
        aval.resumo.find((r) => r.regra_id === 'publicacao_sem_periodico')?.total_lacunas,
      ).toBe(1)
    })

    it('avalia regras de orientações (docente e discente críticas, período atenção)', () => {
      const oriSemDocente: Orientacao = {
        id: 10,
        docente_id: null,
        discente_id: 2,
        tipo: 'Mestrado',
        inicio: '2025',
        fim: '',
        status: 'ativo',
        link_comprovacao: '',
        observacoes: '',
      }
      const aval = avaliarColecao([oriSemDocente], REGRAS_ORIENTACOES)
      const lacDoc = aval.lacunas.find((l) => l.regra_id === 'orientacao_sem_docente')!
      expect(lacDoc.registros).toHaveLength(1)
      expect(lacDoc.severidade).toBe('critica')
    })

    it('avalia regras de projetos de pesquisa (coordenador crítica, fomento atenção se financiado)', () => {
      const proj: ProjetoPesquisa = {
        id: 3,
        titulo: 'Projeto Sem Coord Financiado Sem Orgao',
        descricao: '',
        inicio: '2025',
        fim: '',
        coordenador_id: null,
        financiamento: true,
        orgao_fomento: '',
        link_comprovacao: '',
        observacoes: '',
      }
      const aval = avaliarColecao([proj], REGRAS_PROJETOS_PESQUISA)
      expect(
        aval.lacunas.find((l) => l.regra_id === 'projeto_sem_coordenador')?.registros,
      ).toHaveLength(1)
      expect(
        aval.lacunas.find((l) => l.regra_id === 'projeto_financiado_sem_orgao_fomento')?.registros,
      ).toHaveLength(1)
    })

    it('avalia regras de eventos, mobilidade, patentes, premiações e produção técnica', () => {
      const evento: Evento = {
        id: 2,
        docente: '',
        evento: 'Seminário',
        local_data: '',
        papel: '',
        link_comprovacao: '',
        observacoes: '',
      }
      const avalEv = avaliarColecao([evento], REGRAS_EVENTOS)
      expect(
        avalEv.lacunas.find((l) => l.regra_id === 'evento_sem_docente')?.registros,
      ).toHaveLength(1)
      expect(avalEv.lacunas.find((l) => l.regra_id === 'evento_sem_data')?.registros).toHaveLength(
        1,
      )

      const mob: Mobilidade = {
        id: 3,
        tipo: 'docente',
        nome: '',
        instituicao: 'UFS',
        periodo: '',
        modalidade: 'nacional',
        link: '',
        link_comprovacao: '',
        observacoes: '',
      }
      const avalMob = avaliarColecao([mob], REGRAS_MOBILIDADE)
      expect(
        avalMob.lacunas.find((l) => l.regra_id === 'mobilidade_sem_pessoa')?.registros,
      ).toHaveLength(1)
      expect(
        avalMob.lacunas.find((l) => l.regra_id === 'mobilidade_sem_periodo')?.registros,
      ).toHaveLength(1)

      const pat: Patente = {
        id: 4,
        titulo: 'Patente Nova',
        status: 'Pendente',
        autores: '',
        inpi: '',
        link_comprovacao: '',
        observacoes: '',
      }
      const avalPat = avaliarColecao([pat], REGRAS_PATENTES)
      expect(
        avalPat.lacunas.find((l) => l.regra_id === 'patente_sem_autores')?.registros,
      ).toHaveLength(1)
      expect(
        avalPat.lacunas.find((l) => l.regra_id === 'patente_sem_deposito')?.registros,
      ).toHaveLength(1)

      const prem: Premiacao = {
        id: 5,
        titulo: 'Prêmio Regional',
        ano: null,
        nome_premiado: '',
        instituicao: '',
        link_comprovacao: '',
        observacoes: '',
      }
      const avalPrem = avaliarColecao([prem], REGRAS_PREMIACOES)
      expect(
        avalPrem.lacunas.find((l) => l.regra_id === 'premiacao_sem_premiado')?.registros,
      ).toHaveLength(1)
      expect(
        avalPrem.lacunas.find((l) => l.regra_id === 'premiacao_sem_ano')?.registros,
      ).toHaveLength(1)

      const pt: ProducaoTecnica = {
        id: 6,
        titulo: 'Software PPG',
        ano: 2025,
        autores: '',
        tipo: 'Software',
        link_comprovacao: '',
        observacoes: '',
      }
      const avalPt = avaliarColecao([pt], REGRAS_PRODUCAO_TECNICA)
      expect(
        avalPt.lacunas.find((l) => l.regra_id === 'producao_tecnica_sem_autores')?.registros,
      ).toHaveLength(1)
    })
  })

  describe('consolidarRelatorioLacunas', () => {
    it('gera formato correto com resumo e detalhes consolidados de todas as 10 tabelas', () => {
      const docentes: Docente[] = [
        {
          id: 4,
          nome: 'Ledjane Silva Barreto',
          scopus_id: '7005598575',
          indice_h: 22,
          bolsa_cnpq: 'PQ 1D',
          jdp: false,
          licenca: '',
          id_lattes: '3104369029830651',
          openalex_id: 'A5012512598',
        },
        {
          id: 5,
          nome: 'Euler Araujo dos Santos',
          scopus_id: '',
          indice_h: 16,
          bolsa_cnpq: '',
          jdp: false,
          licenca: '',
          id_lattes: '0053610145197408',
          openalex_id: 'A5034285306',
        },
      ]

      const discentes: Discente[] = [
        {
          id: 1,
          nome: 'João Pedro Alves',
          cpf: '12345678901',
          data_ingresso: '2024-03-01',
          status: 'ativo',
          link_lattes: 'http://lattes.cnpq.br/1234567890123456',
          link_comprovacao: '',
          observacoes: '',
        },
        {
          id: 23,
          nome: 'Amanda Santana Lima',
          cpf: '',
          data_ingresso: '2026',
          status: 'ativo',
          link_lattes: '',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const publicacoes: Publicacao[] = [
        {
          id: 101,
          titulo: 'Artigo Sem DOI',
          autores: 'Barreto, L.',
          periodico: 'Revista X',
          ano: 2025,
          doi: '',
          justificativa: '',
          link_comprovacao: '',
          observacoes: '',
        },
      ]

      const relatorio = consolidarRelatorioLacunas({
        docentes,
        discentes,
        publicacoes,
        dataGeracao: '2026-10-10T12:00:00.000Z',
      })

      expect(relatorio.gerado_em).toBe('2026-10-10T12:00:00.000Z')
      expect(relatorio.resumo).toHaveLength(31) // Todas as 31 regras consolidadas (+2 regras JDP)
      expect(relatorio.lacunas).toHaveLength(31)

      // Verificar que Ledjane NÃO aparece na lacuna de Scopus, mas Euler aparece
      const lacunaScopus = relatorio.lacunas.find((l) => l.regra_id === 'docente_sem_scopus_id')!
      expect(lacunaScopus).toBeDefined()
      expect(lacunaScopus.registros.map((r) => r.id)).toEqual([5])
      expect(lacunaScopus.registros.some((r) => r.nome.includes('Ledjane'))).toBe(false)

      // Verificar que Amanda aparece na lacuna de CPF e Lattes de discente
      const lacunaCpf = relatorio.lacunas.find((l) => l.regra_id === 'discente_sem_cpf')!
      expect(lacunaCpf.registros.map((r) => r.id)).toContain(23)
      expect(lacunaCpf.registros.map((r) => r.id)).not.toContain(1)

      // Verificar que Artigo Sem DOI aparece na regra de DOI de publicação
      const lacunaDoi = relatorio.lacunas.find((l) => l.regra_id === 'publicacao_sem_doi')!
      expect(lacunaDoi.registros.map((r) => r.id)).toContain(101)
    })
  })
})
