import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { processarArquivosLattes } from './processor'
import { mapearDadosParaRevisao } from './revisao'

describe('Subetapa 1C - Revisão por Tabela Lattes', () => {
  const xmlPath = 'docs/3104369029830651.xml'

  it('mapeia todas as 9 tabelas alvo e agrupa contagens e amostras corretamente', async () => {
    const rawBuffer = fs.readFileSync(xmlPath)
    const xmlFile = new File([rawBuffer], '3104369029830651.xml', { type: 'text/xml' })

    const resultadoProcessado = await processarArquivosLattes([xmlFile])
    expect(resultadoProcessado.curriculosProcessadosCount).toBe(1)
    expect(resultadoProcessado.erros).toHaveLength(0)

    const tabelas = mapearDadosParaRevisao(resultadoProcessado)

    // Verifica que todas as tabelas requeridas existem no mapeamento
    const chavesEsperadas = [
      'docentes',
      'publicacoes',
      'orientacoes',
      'bancas',
      'projetos_pesquisa',
      'premiacoes',
      'producao_tecnica',
      'patentes',
      'eventos',
    ]
    expect(Object.keys(tabelas)).toEqual(expect.arrayContaining(chavesEsperadas))

    // 1. Docentes
    expect(tabelas.docentes.inseridos).toBe(1)
    expect(tabelas.docentes.itens).toHaveLength(1)
    const docente = tabelas.docentes.itens[0] as any
    expect(docente.nome).toBe('Ledjane Silva Barreto')
    expect(docente.id_lattes).toBe('3104369029830651')

    // 2. Publicações (agrupando artigos, livros e capítulos)
    expect(tabelas.publicacoes.inseridos).toBeGreaterThan(0)
    expect(tabelas.publicacoes.itens.length).toBe(tabelas.publicacoes.inseridos)
    const tiposPub = new Set(tabelas.publicacoes.itens.map((p: any) => p.tipo))
    expect(tiposPub.has('ARTIGO')).toBe(true)

    // 3. Orientações
    expect(tabelas.orientacoes.inseridos).toBeGreaterThan(0)
    expect(tabelas.orientacoes.itens.length).toBe(tabelas.orientacoes.inseridos)
    const primeiraOri = tabelas.orientacoes.itens[0] as any
    expect(primeiraOri.orientando).toBeTruthy()
    expect(primeiraOri.status).toMatch(/Concluída|Em andamento/)

    // 4. Bancas
    expect(tabelas.bancas.inseridos).toBeGreaterThan(0)
    expect(tabelas.bancas.itens.length).toBe(tabelas.bancas.inseridos)
    const primeiraBanca = tabelas.bancas.itens[0] as any
    expect(primeiraBanca.titulo).toBeTruthy()
    expect(primeiraBanca.ano).toBeGreaterThanOrEqual(2022)

    // 5. Projetos de Pesquisa
    expect(tabelas.projetos_pesquisa.inseridos).toBeGreaterThanOrEqual(0)

    // 6. Premiações
    expect(tabelas.premiacoes.inseridos).toBeGreaterThan(0)
    expect(tabelas.premiacoes.itens.length).toBe(tabelas.premiacoes.inseridos)

    // 7. Produção Técnica
    expect(tabelas.producao_tecnica.inseridos).toBeGreaterThan(0)
    expect(tabelas.producao_tecnica.itens.length).toBe(tabelas.producao_tecnica.inseridos)

    // 8. Eventos
    expect(tabelas.eventos.inseridos).toBeGreaterThan(0)
    expect(tabelas.eventos.itens.length).toBe(tabelas.eventos.inseridos)

    // Valida que itens ignorados foram contabilizados
    const totalIgnorados = Object.values(tabelas).reduce((acc, t) => acc + t.ignorados, 0)
    expect(totalIgnorados).toBeGreaterThan(0)
  })

  it('lida com seleção e deseleção de tabelas e cálculo de totais para gravação', async () => {
    const rawBuffer = fs.readFileSync(xmlPath)
    const xmlFile = new File([rawBuffer], '3104369029830651.xml', { type: 'text/xml' })

    const resultadoProcessado = await processarArquivosLattes([xmlFile])
    const tabelas = mapearDadosParaRevisao(resultadoProcessado)

    // Simula estado de checkbox do usuário: apenas docentes e publicações marcados
    const selecao: Record<string, boolean> = {
      docentes: true,
      publicacoes: true,
      orientacoes: false,
      bancas: false,
      projetos_pesquisa: false,
      premiacoes: false,
      producao_tecnica: false,
      patentes: false,
      eventos: false,
    }

    const totalMarcado = Object.entries(tabelas).reduce(
      (sum, [key, t]) => (selecao[key] ? sum + t.inseridos : sum),
      0,
    )

    expect(totalMarcado).toBe(tabelas.docentes.inseridos + tabelas.publicacoes.inseridos)
    expect(totalMarcado).toBeLessThan(
      Object.values(tabelas).reduce((sum, t) => sum + t.inseridos, 0),
    )
  })
})
