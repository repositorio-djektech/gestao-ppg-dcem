# Arquitetura do Sistema e Estrutura de Código — Gestão PPG DCEM

Este documento descreve a arquitetura de software, padrões de projeto, organização do diretório `src/`, padrões de componentes CRUD e componentes compartilhados de interface da aplicação.

---

## 1. Visão Geral da Arquitetura

O sistema é estruturado como uma **Single Page Application (SPA)** desenvolvida em React com TypeScript, comunicando-se diretamente com o Supabase (PostgreSQL + PostgREST) por meio do cliente JavaScript oficial (`@supabase/supabase-js`), complementado por **Supabase Edge Functions** para operações restritas ou de alta complexidade.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Cliente Web (SPA React)                       │
│                                                                        │
│   ┌───────────────┐   ┌────────────────────────┐   ┌───────────────┐   │
│   │  React Router │   │ AuthContext & useAuth  │   │  Layout Base  │   │
│   │  (App.tsx)    │   │ (Permissões de Papel)  │   │ (Sidebar/Top) │   │
│   └───────┬───────┘   └───────────┬────────────┘   └───────┬───────┘   │
│           │                       │                        │           │
│           ▼                       ▼                        ▼           │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Páginas Especializadas (/docentes, /lacunas, /reconducao, etc) │   │
│   │ Páginas CRUD Padrão (/discentes, /orientacoes, /eventos, etc.) │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                 ┌─────────────────┴─────────────────┐                  │
│                 ▼                                   ▼                  │
│   ┌───────────────────────────┐       ┌────────────────────────────┐   │
│   │      src/services/        │       │         src/lib/           │   │
│   │  (Serviços de Domínio,    │       │  (Cálculos CAPES, Lattes,  │   │
│   │   CRUDs e Edge Functions) │       │   Lacunas, Recondução)     │   │
│   └─────────────┬─────────────┘       └────────────────────────────┘   │
└─────────────────┼──────────────────────────────────────────────────────┘
                  │ HTTPS (PostgREST / Edge Functions / Auth)
                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Backend Supabase (Nuvem)                       │
│                                                                        │
│   ┌────────────────────────┐   ┌───────────────────────────────────┐   │
│   │      PostgreSQL 15     │   │      Supabase Edge Functions      │   │
│   │   - 27 Tabelas RLS     │   │   - scopus-buscar                 │   │
│   │   - Triggers & Views   │   │   - relatorio-lacunas             │   │
│   │   - Auth Schema        │   │   - avaliacao-reconducao          │   │
│   │   - Storage Buckets    │   │   - admin-usuarios                │   │
│   └────────────────────────┘   └───────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Pastas do Projeto (`src/`)

```
src/
├── App.tsx                     # Ponto de entrada de rotas e providers da aplicação
├── main.tsx                    # Renderização inicial no DOM e montagem do React
├── main.css                    # Estilos globais e tokens CSS do Tailwind
├── vite-env.d.ts               # Declaração de tipos de variáveis de ambiente Vite
│
├── components/                 # Componentes React reutilizáveis da aplicação
│   ├── AppHeader.tsx           # Cabeçalho da aplicação (usuário, perfil, logout)
│   ├── AppSidebar.tsx          # Barra de navegação lateral fixa com agrupamento
│   ├── Layout.tsx              # Estrutura mestra unindo AppSidebar + AppHeader + Conteúdo
│   ├── KeepAlive.tsx           # Mantenedor de pulso de conexão do cliente
│   ├── crud/                   # Componentes base do ecossistema CRUD compartilhado
│   │   ├── CrudPage.tsx        # Página de listagem, busca, paginação e ações
│   │   ├── CrudFormDialog.tsx  # Diálogo de criação/edição genérico baseado em schema
│   │   ├── FrameHorizontalScrollbar.tsx # Barra de rolagem horizontal permanente
│   │   ├── TablePaginationFooter.tsx    # Rodapé fixo de paginação e contagem
│   │   └── types.ts            # Tipagens de colunas, campos e opções do CRUD
│   ├── discentes/              # Diálogos especializados de visualização de discentes
│   ├── docentes/               # Modais de docentes (detalhes, exclusão cascade, OpenAlex)
│   ├── egressos/               # Diálogo de visualização completa de egressos
│   ├── impacto-social/         # Seletor e badges de impactos vinculados
│   ├── lattes/                 # Diálogos de importação e revisão tabular Lattes
│   ├── publicacoes/            # Seletor de coautoria, sugestão Qualis e vínculos
│   ├── pwa/                    # Prompt de instalação PWA
│   └── ui/                     # Primitivas shadcn/ui (Button, Dialog, Card, Input, etc.)
│
├── hooks/                      # React Hooks customizados
│   ├── use-auth.tsx            # Contexto de autenticação, sessão e papel do usuário
│   ├── use-crud-data.ts        # Hook reativo para carregar, criar, atualizar e excluir dados
│   ├── use-keep-alive.ts       # Pulso de requisições para evitar hibernação de sessão
│   ├── use-mobile.tsx          # Detecção de telas móveis
│   └── use-toast.ts            # Gerenciamento de alertas e toasts do shadcn
│
├── lib/                        # Motores de regra de negócio, utilitários e cálculos puros
│   ├── capes/                  # Cálculos de indicadores CAPES (Ficha Engenharias II)
│   │   ├── indicadores.ts      # Motor central com MMA (Média das Médias Anuais)
│   │   ├── jdp.ts              # Regras de Jovem Docente Permanente (limites de 4 e 10 anos)
│   │   ├── exportacao.ts       # Geradores de HTML para impressão e exportação CSV
│   │   └── types.ts            # Tipos de quesitos, insumos e decomposições
│   ├── disciplinas/            # Helpers da N:N disciplinas_docentes (idsDocentesDaDisciplina, anexarDocentesNasDisciplinas)
│   ├── docentes/               # Geração de dossiê completo de impressão do docente via iframe
│   ├── lacunas/                # Motor de 34 regras de lacunas em 10 tabelas
│   │   ├── regras.ts           # Definição funcional das 34 regras de auditoria
│   │   ├── imprimirLacunasIframe.ts # Relatório impresso de pendências
│   │   └── types.ts            # Tipagens de severidade, grupos e relatórios
│   ├── lattes/                 # Pipeline completo de leitura e parse de currículos Lattes
│   │   ├── parser.ts           # Parse estruturado do DOM XML do CNPq
│   │   ├── readFiles.ts        # Descompactação JSZip e decodificação ISO-8859-1
│   │   ├── quadrienio.ts       # Recorte temporal quadrienal (2025–2028)
│   │   ├── dedupe.ts           # Deduplicação por título normalizado e ano
│   │   ├── revisao.ts          # Mapeamento para interface de revisão do usuário
│   │   ├── gravar.ts           # Persistência idempotente nas tabelas do Supabase
│   │   └── types.ts            # Tipos estruturados de nós Lattes
│   ├── normalizacao.ts         # Title Case inteligente com preservação de siglas acadêmicas
│   ├── openalex/               # Normalização e busca de autores no OpenAlex
│   ├── orientacoes/            # Regras de status efetivo de orientações
│   ├── publicacoes/            # Estimativa de Qualis e matching de autores docentes
│   ├── reconducao/             # Motor de cálculo da Norma de Recondução (§ 4º) e PDQ
│   ├── scopus/                 # Lógica cliente para busca e tratamento de dados Scopus
│   ├── storage/                # Upload e compressão de comprovantes em PDF
│   ├── supabase/               # Instância do cliente Supabase e tipagens do schema
│   ├── titleCase.ts            # Utilitário de formatação de títulos
│   └── utils.ts                # Utilitários gerais (formatação de CPF, cn/tailwind-merge)
│
├── pages/                      # Telas da aplicação (roteadas no App.tsx)
│   ├── Login.tsx               # Tela de autenticação por e-mail e senha
│   ├── Dashboard.tsx           # Painel de controle principal com resumos e atalhos
│   ├── Docentes.tsx            # Gestão de docentes, modal de detalhes com 10 abas e dossiê
│   ├── Discentes.tsx           # Gestão de alunos ativos, concluídos e desligados
│   ├── Egressos.tsx            # Gestão de egressos e acompanhamento de carreira
│   ├── Orientacoes.tsx         # Gestão de orientações com status efetivo derivado
│   ├── Disciplinas.tsx         # Gestão manual de disciplinas e vínculos com docentes
│   ├── IniciacaoCientifica.tsx # Gestão de bolsistas e voluntários de IC/IT
│   ├── LinhasPesquisa.tsx      # Linhas de pesquisa do programa
│   ├── ProjetosPesquisa.tsx    # Projetos, participantes docentes e discentes, upload de PDF
│   ├── Publicacoes.tsx         # Produção bibliográfica, coautoria e estimativa Qualis
│   ├── ProducaoTecnica.tsx     # Softwares, relatórios e produtos técnicos
│   ├── Patentes.tsx            # Depósitos e concessões INPI
│   ├── Qualis.tsx              # Catálogo de estratos A1–C e propagação em publicações
│   ├── Eventos.tsx             # Participação e organização de eventos científicos
│   ├── Mobilidade.tsx          # Mobilidade docente e discente nacional/internacional
│   ├── ImpactoSocial.tsx       # Mapeamento de ações de impacto social e seus vínculos
│   ├── Premiacoes.tsx          # Prêmios e distinções acadêmicas recebidas
│   ├── Lacunas.tsx             # Painel de auditoria cadastral com 34 regras em 10 tabelas
│   ├── Reconducao.tsx          # Painel de avaliação de credenciamento/recondução docente
│   ├── Indicadores.tsx         # Painel de indicadores CAPES da Área Engenharias II
│   ├── Usuarios.tsx            # Administração de usuários, papéis e permissões
│   ├── PrintView.tsx           # Visualização para impressão avulsa de relatórios
│   └── NotFound.tsx            # Página 404 para rotas desconhecidas
│
├── services/                   # Camada de comunicação de dados e APIs
│   ├── crud.ts                 # Fábrica genérica de serviços CRUD baseados no Supabase
│   ├── permissoes.ts           # Regras de autorização por papel no frontend
│   ├── logs.ts                 # Registro de auditoria na tabela pública logs
│   ├── docentes.ts             # Serviço especializado de docentes e cascade de exclusão
│   ├── disciplinas.ts          # Gestão de disciplinas e tabela N:N disciplinas_docentes
│   ├── qualis.ts               # Propagação e atualização em lote de estratos Qualis
│   ├── scopus.ts               # Invocação da Edge Function scopus-buscar
│   ├── usuarios.ts             # Invocação da Edge Function admin-usuarios e perfis
│   └── ...                     # Serviços dedicados para cada entidade do sistema
│
└── types/                      # Definições centrais de tipagem TypeScript
    └── database.ts             # Interfaces de domínio (Docente, Discente, Publicacao, Role, etc.)
```

---

## 3. Padrão Arquitetural das Telas CRUD

Aproximadamente 15 telas do sistema seguem uma arquitetura centralizada e consistente para operações de Listagem, Criação, Leitura, Edição e Exclusão (CRUD), alavancando os componentes `CrudPage`, `CrudFormDialog` e o hook `useCrudData`.

### 3.1 Fábrica `createCrudService<T>(tableName)`

No arquivo `src/services/crud.ts`, a fábrica recebe o nome da tabela no PostgreSQL e entrega uma interface unificada:

```typescript
export interface CrudService<T> {
  getAll: () => Promise<T[]>
  getById: (id: number | string) => Promise<T | null>
  create: (item: Omit<T, 'id'>) => Promise<T>
  update: (id: number | string, item: Partial<T>) => Promise<T>
  delete: (id: number | string) => Promise<void>
}
```

### 3.2 O Componente Central `CrudPage<T>`

Localizado em `src/components/crud/CrudPage.tsx`, ele encapsula de forma padronizada:

1. **Cabeçalho com Ações:** Título, ícone, descrição, campo de busca com normalização fonética e de acentos, botão "Novo Registro" (respeitando permissões via `podeCriarNaTabela`) e atalhos de exportação/impressão.
2. **Tabela Responsiva em Moldura Desktop Estilo Supabase:**
   - Cabeçalho de colunas fixo (`sticky top-0 bg-slate-100 z-10`).
   - Linhas zebradas com efeito hover suave.
   - Suporte a renderizadores customizados por coluna (`ColumnDef<T>`).
   - Normalização automática de caixas de texto com `toTitleCase`.
   - Coluna de ações fixada à direita com botões Editar e Excluir protegidos pelas regras de papel (`podeEditarRegistro`, `podeExcluirRegistro`).
3. **Paginação Integrada (`TablePaginationFooter`):**
   - Rodapé fixado na parte inferior da moldura.
   - Exibição de contagem de registros (`Exibindo X–Y de Z registros`).
   - Seletor de páginas com botões de navegação e atalhos rápidos.
4. **Barra de Rolagem Horizontal Permanente (`FrameHorizontalScrollbar`):**
   - Resolve o problema de sistemas operacionais (como macOS e iOS) onde barras de rolagem nativas são invisíveis até haver rolagem vertical até o fim da página.
   - Componente sob `src/components/crud/FrameHorizontalScrollbar.tsx` com trilho discreto e thumb arrastável com captura de ponteiro (`setPointerCapture`).
5. **Deep-linking com Destaque de Linha (`?destaque=<id>`):**
   - Qualquer link externo ou modal (ex.: clicar em uma publicação na tela de Docentes) pode navegar para `/publicacoes?destaque=123`.
   - O `CrudPage` identifica o registro, calcula em qual página ele reside, altera a paginação, rola suavemente a tabela até a linha e aplica uma classe visual pulsante temporária de destaque antes de limpar o parâmetro da URL.
6. **Diálogo de Formulário (`CrudFormDialog`):**
   - Renderização dinâmica de formulários com base na lista de `FieldDef[]`.
   - Suporte a tipos de campo: texto, textarea, número, data, booleano, select com opções assíncronas (`optionsLoader`), máscaras de CPF e SIAPE, e links externos validados.
   - Limpeza e conversão automática de chaves estrangeiras vazias para `null` (evitando violação de integridade no PostgreSQL).

---

## 4. Telas Especializadas e Customizadas

Determinadas páginas exigem fluxos mais ricos do que um CRUD genérico:

### 4.1 Docentes (`src/pages/Docentes.tsx`)

- Tabela de docentes com badges de categoria (Permanente, Colaborador, Visitante), bolsista CNPq e flag JDP.
- Ações customizadas:
  - **Visualizar Docente (`VisualizarDocenteDialog`):** Modal em tela cheia com 10 abas de acervo detalhado (Dados Gerais, Publicações, Orientações, Projetos, Disciplinas, Iniciação Científica, Produção Técnica, Patentes, Eventos, Premiações). Permite navegar via deep-link para a tela original com `?destaque=id`.
  - **Dossiê Completo em PDF (`imprimirDocenteViaIframe`):** Geração de relatório limpo e estruturado para impressão institucional através de um iframe oculto isolado do DOM principal.
  - **Vincular OpenAlex e Scopus:** Abas dedicadas no modal para buscar e atrelar identificadores acadêmicos internacionais.
  - **Exclusão Segura com Cascade (`ModalExcluirDocente`):** Exclusão assistida que confere vínculos prévios e desvincula registros associados conforme permissões.

### 4.2 Publicações (`src/pages/Publicacoes.tsx`)

- Tabela com filtros de ano, estrato Qualis e coautoria.
- **Seletor de Coautoria com Orientando/Egresso:** Gerencia a tabela N:N `publicacoes_coautores_programa`.
- **Vincular Autores a Docentes do PPG:** Analisa a string de autores e sugere o casamento com docentes permanentes da base com grau de confiança (alto/médio/baixo).
- **Sugerir Estrato Qualis (`SugerirQualisDialog`):** Algoritmo que consulta métricas OpenAlex e Scopus (SJR, percentil de citações) e sugere um estrato Qualis (A1–C) fundamentado para validação pelo usuário.

### 4.3 Recondução e Credenciamento (`src/pages/Reconducao.tsx`)

- Tela de acompanhamento do cumprimento dos 4 critérios da Norma PPG-DCEM (§ 4º).
- Tabela analítica com cards de veredito (**Reconduzido**, **Não atende**, **PDQ insuficiente**, **Não aplicável**).
- Exibição transparente do cálculo do índice PDQ (`NP / (MSc + DSc)`).
- Relatório de recondução com exportação em PDF via iframe e CSV.

### 4.4 Lacunas Cadastrais (`src/pages/Lacunas.tsx`)

- Painel de auditoria com 34 regras ativas distribuídas em 10 tabelas.
- Agrupamento em cartões visuais temáticos (Identificadores e Métricas, Fomento e Bolsas, Produção, Situação Acadêmica, etc.).
- Correção de pendências em um clique com abertura do diálogo de edição ou deep-link.

### 4.5 Indicadores CAPES (`src/pages/Indicadores.tsx`)

- Implementação integral da Ficha de Avaliação da Área Engenharias II (2025).
- Cálculo da Média das Médias Anuais (MMA) para o quadriênio 2025–2028.
- Filtros por quesito da ficha (Quesito 1, Quesito 2, Quesito 3) com decomposição matemática dos termos.

### 4.6 Usuários (`src/pages/Usuarios.tsx`)

- Tela protegida por Route Guard (`UsuariosRouteGuard` em `src/App.tsx`), restrita exclusivamente aos papéis `suporte` e `coordenador`.
- Permite criar novos usuários convidando por e-mail, atribuir um dos 5 papéis e vincular um perfil ao respectivo registro na tabela `docentes`.

---

## 5. Roteamento e Ciclo de Vida de Sessão

### 5.1 Roteamento (`src/App.tsx`)

O React Router gerencia as rotas dentro do layout mestre `Layout.tsx`, composto por:

- `AppSidebar`: Barra lateral com agrupamento lógico (Principal, Pessoas & Formação, Pesquisa & Produção, Avaliação & CAPES, Administração).
- `AppHeader`: Barra superior exibindo nome do usuário autenticado, badge colorido do papel atual, atalho de recarga e botão de logout.
- `KeepAlive`: Componente silencioso que dispara pings em segundo plano para manter ativa a conexão do Supabase Auth e evitar encerramento prematuro de sessão.

### 5.2 Contexto de Autenticação (`src/hooks/use-auth.tsx`)

O `AuthProvider` expõe o estado do usuário (`user`, `session`, `profile`, `role`) e flags booleanas convenientes:

- `isSuporte`, `isCoordenador`, `isAuxiliar`, `isDocente`, `isCapes`.
- `isStaff`: Agrupa `suporte`, `coordenador` e `auxiliar`.
- `podeEditarGlobal`: Permite editar qualquer registro do sistema (`isStaff`).
- `podeExcluirGlobal`: Restrito exclusivamente a `suporte` e `coordenador` (o papel `auxiliar` não possui permissão de exclusão).
