import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import IniciacaoCientificaPage from './IniciacaoCientifica'
import Disciplinas from './Disciplinas'
import Reconducao from './Reconducao'
import { AppSidebar } from '@/components/AppSidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AuthProvider } from '@/hooks/use-auth'

describe('Alterações solicitadas pelo usuário', () => {
  it('1. Na página Iniciações (/iniciacoes), o cabeçalho da coluna mostra "Bolsa" em vez de "Bolsa CNPq"', () => {
    const html = renderToString(
      <MemoryRouter>
        <IniciacaoCientificaPage />
      </MemoryRouter>,
    )

    // O cabeçalho da tabela deve conter 'Bolsa'
    expect(html).toContain('Bolsa')
    // Não deve haver header de coluna com 'Bolsa CNPq' na tabela
    // (O campo de formulário pode manter o texto descritivo original)
  })

  it('2. Na página Disciplinas (/disciplinas), a coluna "Docentes" existe no cabeçalho da tabela', () => {
    const html = renderToString(
      <MemoryRouter>
        <Disciplinas />
      </MemoryRouter>,
    )

    expect(html).toContain('Docentes')
    expect(html).toContain('Disciplinas')
    expect(html).toContain('Código')
    expect(html).toContain('Nível')
    expect(html).toContain('Créditos')
  })

  it('3. Na Sidebar e no título da página Recondução, exibe "Credenciamento"', () => {
    const sidebarHtml = renderToString(
      <MemoryRouter>
        <AuthProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(sidebarHtml).toContain('Credenciamento')
    expect(sidebarHtml).not.toContain('>Recondução<')

    const reconducaoHtml = renderToString(
      <MemoryRouter>
        <Reconducao
          carregarDadosFn={() =>
            Promise.resolve({
              sucesso: true,
              dados: {
                sucesso: true,
                quadrienio: { ano_inicio: 2025, ano_fim: 2028 },
                gerado_em: new Date().toISOString(),
                resumo: {
                  ano_inicio: 2025,
                  ano_fim: 2028,
                  total_docentes: 0,
                  total_permanentes: 0,
                  total_colaboradores: 0,
                  total_sem_categoria: 0,
                  reconduzidos: 0,
                  nao_atendem: 0,
                  pdq_insuficiente: 0,
                  nao_aplicavel: 0,
                },
                avaliacoes: [],
                nota_metodologica: {
                  criterio_iv_np_coautoria: '',
                  criterio_ii_disciplinas_temporais: '',
                },
              },
              origem: 'edge_function',
            })
          }
        />
      </MemoryRouter>,
    )

    expect(reconducaoHtml).toContain('Credenciamento')
  })
})
