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
    lacunas: [
      {
        regra_id: 'docente_sem_scopus_id',
        severidade: 'critica',
        grupo: 'Identificadores e Métricas',
        registros: [
          {
            id: 5,
            nome: 'Euler Araujo dos Santos',
            motivo: 'Scopus ID não informado',
          },
          {
            id: 6,
            nome: 'Iara de Fatima Gimenez',
            motivo: 'Scopus ID não informado',
          },
        ],
      },
      {
        regra_id: 'docente_sem_openalex_id',
        severidade: 'atencao',
        grupo: 'Identificadores e Métricas',
        registros: [
          {
            id: 5,
            nome: 'Euler Araujo dos Santos',
            motivo: 'OpenAlex ID não informado',
          },
        ],
      },
      {
        regra_id: 'discente_sem_cpf',
        severidade: 'critica',
        grupo: 'Identificação Cadastral',
        registros: [
          {
            id: 101,
            nome: 'Lucas Silva',
            motivo: 'CPF não informado',
          },
        ],
      },
    ],
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

  describe('Etapa 3 e Etapa 4 - Lista Detalhada de Lacunas e Ação Corrigir', () => {
    it('renderiza botão Corrigir para cada pendência com atributo data-testid acessível', () => {
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

      expect(html).toContain('btn-corrigir-docente_sem_scopus_id-5')
      expect(html).toContain('btn-corrigir-docente_sem_scopus_id-6')
      expect(html).toContain('btn-corrigir-docente_sem_openalex_id-5')
      expect(html).toContain('btn-corrigir-discente_sem_cpf-101')
    })

    it('renderiza a tabela com as colunas Quem, O que falta, Grupo, Severidade e Ação Corrigir', () => {
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

      expect(html).toContain('Lista Detalhada de Lacunas')
      expect(html).toContain('Quem')
      expect(html).toContain('O que falta')
      expect(html).toContain('Grupo')
      expect(html).toContain('Severidade')
      expect(html).toContain('Ação')
      expect(html).toContain('4 lacunas encontradas')

      // Registros individuais presentes
      expect(html).toContain('Euler Araujo dos Santos')
      expect(html).toContain('Iara de Fatima Gimenez')
      expect(html).toContain('Lucas Silva')

      // Botão de Corrigir presente nas linhas
      expect(html).toContain('Corrigir')
      expect(html).toContain('btn-corrigir-docente_sem_scopus_id-5')
      expect(html).toContain('btn-corrigir-discente_sem_cpf-101')
    })

    it('critério do cliente: Ledjane Silva Barreto (com scopus_id gravado) NÃO deve constar na regra Docentes sem Scopus ID; demais sem scopus_id devem aparecer', () => {
      // Simula avaliação com Ledjane Silva Barreto (scopus_id = '7005598575') e dois sem scopus_id
      const relatorioComDocentes: RelatorioLacunasResposta = {
        gerado_em: '2026-10-10T14:30:00.000Z',
        resumo: [
          {
            grupo: 'Identificadores e Métricas',
            tabela: 'docentes',
            regra_id: 'docente_sem_scopus_id',
            descricao: 'Docente sem Scopus ID',
            severidade: 'critica',
            total_registros: 3,
            total_lacunas: 2,
          },
        ],
        lacunas: [
          {
            regra_id: 'docente_sem_scopus_id',
            severidade: 'critica',
            grupo: 'Identificadores e Métricas',
            registros: [
              {
                id: 5,
                nome: 'Euler Araujo dos Santos',
                motivo: 'Scopus ID não informado',
              },
              {
                id: 6,
                nome: 'Iara de Fatima Gimenez',
                motivo: 'Scopus ID não informado',
              },
              // Ledjane Silva Barreto NÃO está presente aqui porque possui scopus_id = 7005598575
            ],
          },
        ],
      }

      const html = renderToString(
        <Lacunas
          carregarDadosFn={() =>
            Promise.resolve({
              sucesso: true,
              dados: relatorioComDocentes,
              origem: 'edge_function',
            })
          }
          filtroRegraInicial="docente_sem_scopus_id"
        />,
      )

      // Ledjane não pode aparecer nesta lista
      expect(html).not.toContain('Ledjane Silva Barreto')

      // Os demais docentes sem scopus_id devem aparecer
      expect(html).toContain('Euler Araujo dos Santos')
      expect(html).toContain('Iara de Fatima Gimenez')
      expect(html).toContain('Docente sem Scopus ID')
      expect(html).toContain('2 lacunas encontradas')
    })

    it('aplica filtro de severidade (ex.: apenas Críticas)', () => {
      const html = renderToString(
        <Lacunas
          carregarDadosFn={() =>
            Promise.resolve({
              sucesso: true,
              dados: dadosMock,
              origem: 'edge_function',
            })
          }
          filtroSeveridadeInicial="critica"
        />,
      )

      // Críticas: docente_sem_scopus_id (2) e discente_sem_cpf (1) = 3 lacunas
      expect(html).toContain('3 lacunas encontradas')
      expect(html).toContain('Euler Araujo dos Santos')
      expect(html).toContain('Lucas Silva')
    })

    it('aplica filtro por grupo visual (ex.: grupo sem lacunas exibe mensagem limpa)', () => {
      const html = renderToString(
        <Lacunas
          carregarDadosFn={() =>
            Promise.resolve({
              sucesso: true,
              dados: dadosMock,
              origem: 'edge_function',
            })
          }
          filtroGrupoInicial="producao"
        />,
      )

      // Grupo Produção não tem lacunas no dadosMock
      expect(html).toContain('0 lacunas encontradas')
      expect(html).toContain('Nenhuma lacuna corresponde aos filtros selecionados')
    })
  })
})
