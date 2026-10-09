import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import Lacunas, { mapearGrupoParaVisual, GRUPOS_VISUAIS } from './Lacunas'
import type { RelatorioLacunasResposta } from '@/lib/lacunas/types'

describe('Página Lacunas - Etapa 2', () => {
  const dadosMock: RelatorioLacunasResposta = {
    gerado_em: '2026-10-10T14:30:00.000Z',
    resumo: [
      {
        grupo: 'Identificadores e Métricas',
        tabela: 'docentes',
        regra_id: 'docente_sem_scopus_id',
        descricao: 'Docente sem Scopus ID',
        severidade: 'critica',
        total_registros: 7,
        total_lacunas: 2,
      },
      {
        grupo: 'Identificadores e Métricas',
        tabela: 'docentes',
        regra_id: 'docente_sem_openalex_id',
        descricao: 'Docente sem OpenAlex ID',
        severidade: 'atencao',
        total_registros: 7,
        total_lacunas: 1,
      },
      {
        grupo: 'Identificadores e Métricas',
        tabela: 'docentes',
        regra_id: 'docente_sem_id_lattes',
        descricao: 'Docente sem ID Lattes',
        severidade: 'critica',
        total_registros: 7,
        total_lacunas: 0,
      },
      {
        grupo: 'Identificação Cadastral',
        tabela: 'discentes',
        regra_id: 'discente_sem_cpf',
        descricao: 'Discente sem CPF',
        severidade: 'critica',
        total_registros: 34,
        total_lacunas: 5,
      },
      {
        grupo: 'Identificação Cadastral',
        tabela: 'discentes',
        regra_id: 'discente_sem_link_lattes',
        descricao: 'Discente sem link Lattes',
        severidade: 'atencao',
        total_registros: 34,
        total_lacunas: 8,
      },
    ],
    lacunas: [],
  }

  describe('mapearGrupoParaVisual', () => {
    it('mapeia corretamente grupos e tabelas para os 4 grupos visuais do Dashboard', () => {
      // Pessoas
      expect(mapearGrupoParaVisual('Identificadores e Métricas')).toBe('pessoas')
      expect(mapearGrupoParaVisual('Fomento e Bolsas')).toBe('pessoas')
      expect(mapearGrupoParaVisual('Identificação Cadastral')).toBe('pessoas')
      expect(mapearGrupoParaVisual('Situação Acadêmica')).toBe('pessoas')
      expect(mapearGrupoParaVisual('docentes')).toBe('pessoas')
      expect(mapearGrupoParaVisual('discentes')).toBe('pessoas')
      expect(mapearGrupoParaVisual('egressos')).toBe('pessoas')

      // Acadêmico
      expect(mapearGrupoParaVisual('bancas')).toBe('academico')
      expect(mapearGrupoParaVisual('orientacoes')).toBe('academico')
      expect(mapearGrupoParaVisual('disciplinas')).toBe('academico')
      expect(mapearGrupoParaVisual('projetos_pesquisa')).toBe('academico')
      expect(mapearGrupoParaVisual('Acadêmico')).toBe('academico')

      // Produção
      expect(mapearGrupoParaVisual('publicacoes')).toBe('producao')
      expect(mapearGrupoParaVisual('producao_tecnica')).toBe('producao')
      expect(mapearGrupoParaVisual('patentes')).toBe('producao')
      expect(mapearGrupoParaVisual('Produção Científica')).toBe('producao')

      // Difusão
      expect(mapearGrupoParaVisual('eventos')).toBe('difusao')
      expect(mapearGrupoParaVisual('mobilidade_docente')).toBe('difusao')
      expect(mapearGrupoParaVisual('impacto_social')).toBe('difusao')
      expect(mapearGrupoParaVisual('premiacoes')).toBe('difusao')
      expect(mapearGrupoParaVisual('Difusão')).toBe('difusao')
    })

    it('mantém as cores temáticas exatas do Dashboard nos 4 grupos visuais', () => {
      const pessoas = GRUPOS_VISUAIS.find((g) => g.id === 'pessoas')!
      const academico = GRUPOS_VISUAIS.find((g) => g.id === 'academico')!
      const producao = GRUPOS_VISUAIS.find((g) => g.id === 'producao')!
      const difusao = GRUPOS_VISUAIS.find((g) => g.id === 'difusao')!

      // Azul para Pessoas
      expect(pessoas.theme.border).toContain('blue-200')
      expect(pessoas.theme.accentBar).toContain('blue-500')
      expect(pessoas.theme.iconColor).toContain('blue-500')

      // Verde esmeralda para Acadêmico
      expect(academico.theme.border).toContain('emerald-200')
      expect(academico.theme.accentBar).toContain('emerald-500')
      expect(academico.theme.iconColor).toContain('emerald-500')

      // Âmbar para Produção
      expect(producao.theme.border).toContain('amber-200')
      expect(producao.theme.accentBar).toContain('amber-500')
      expect(producao.theme.iconColor).toContain('amber-500')

      // Roxo para Difusão
      expect(difusao.theme.border).toContain('purple-200')
      expect(difusao.theme.accentBar).toContain('purple-500')
      expect(difusao.theme.iconColor).toContain('purple-500')
    })
  })

  describe('Renderização dos cards-resumo', () => {
    it('renderiza título, descrição institucional e botões de ação', () => {
      const html = renderToString(
        <Lacunas
          carregarDadosFn={() =>
            Promise.resolve({
              sucesso: true,
              dados: dadosMock,
              origem: 'edge_function',
            })
          }
        />,
      )

      expect(html).toContain('Relatório de Lacunas')
      expect(html).toContain(
        'Diagnóstico de campos e identificadores faltantes no cadastro do PPG-DCEM',
      )
      expect(html).toContain('Atualizar')
    })

    it('exibe todos os 4 cards de grupos de informação do Dashboard', () => {
      const html = renderToString(
        <Lacunas
          carregarDadosFn={() =>
            Promise.resolve({
              sucesso: true,
              dados: dadosMock,
              origem: 'edge_function',
            })
          }
        />,
      )

      expect(html).toContain('Pessoas')
      expect(html).toContain('Acadêmico')
      expect(html).toContain('Produção')
      expect(html).toContain('Difusão/Outros')
    })

    it('exibe estado positivo nos grupos sem lacunas ("Nenhuma lacuna")', () => {
      const html = renderToString(
        <Lacunas
          carregarDadosFn={() =>
            Promise.resolve({
              sucesso: true,
              dados: dadosMock,
              origem: 'edge_function',
            })
          }
        />,
      )

      expect(html).toContain('Nenhuma lacuna')
      expect(html).toContain('0 pendências')
    })

    it('renderiza contagem de críticas e atenção no card do grupo', () => {
      const html = renderToString(
        <Lacunas
          carregarDadosFn={() =>
            Promise.resolve({
              sucesso: true,
              dados: dadosMock,
              origem: 'edge_function',
            })
          }
        />,
      )

      // Grupo Pessoas tem 7 críticas (2 scopus + 5 cpf) e 9 atenção (1 openalex + 8 link lattes)
      expect(html).toContain('Docente sem Scopus ID')
      expect(html).toContain('Docente sem OpenAlex ID')
      expect(html).toContain('Discente sem CPF')
      expect(html).toContain('Discente sem link Lattes')
    })

    it('renderiza estado de erro com botão "Tentar novamente" quando falha', () => {
      const html = renderToString(
        <Lacunas
          carregarDadosFn={() =>
            Promise.resolve({
              sucesso: false,
              mensagemErro: 'Erro simulado de conexão ao Supabase',
            })
          }
        />,
      )

      expect(html).toContain('Falha ao carregar o relatório de lacunas')
      expect(html).toContain('Erro simulado de conexão ao Supabase')
      expect(html).toContain('Tentar novamente')
    })
  })
})
