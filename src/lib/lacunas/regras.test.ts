import { describe, it, expect } from 'vitest'
import {
  REGRAS_DOCENTES,
  REGRAS_DISCENTES,
  consolidarRelatorioLacunas,
  avaliarColecao,
} from './regras'
import type { Docente, Discente } from '@/types/database'

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

  describe('consolidarRelatorioLacunas', () => {
    it('gera formato correto com resumo e detalhes consolidados', () => {
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

      const relatorio = consolidarRelatorioLacunas({
        docentes,
        discentes,
        dataGeracao: '2026-10-10T12:00:00.000Z',
      })

      expect(relatorio.gerado_em).toBe('2026-10-10T12:00:00.000Z')
      expect(relatorio.resumo).toHaveLength(9) // 5 docentes + 4 discentes
      expect(relatorio.lacunas).toHaveLength(9)

      // Verificar que Ledjane NÃO aparece na lacuna de Scopus, mas Euler aparece
      const lacunaScopus = relatorio.lacunas.find((l) => l.regra_id === 'docente_sem_scopus_id')!
      expect(lacunaScopus).toBeDefined()
      expect(lacunaScopus.registros.map((r) => r.id)).toEqual([5])
      expect(lacunaScopus.registros.some((r) => r.nome.includes('Ledjane'))).toBe(false)

      // Verificar que Amanda aparece na lacuna de CPF e Lattes de discente
      const lacunaCpf = relatorio.lacunas.find((l) => l.regra_id === 'discente_sem_cpf')!
      expect(lacunaCpf.registros.map((r) => r.id)).toContain(23)
      expect(lacunaCpf.registros.map((r) => r.id)).not.toContain(1)
    })
  })
})
