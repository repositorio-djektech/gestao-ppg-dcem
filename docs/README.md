# Documentação Técnica do Projeto — Gestão PPG DCEM

Este diretório reúne o mapeamento técnico completo, arquitetural, de engenharia de software, modelagem de banco de dados, regras de negócio e integrações do sistema **Gestão PPG DCEM** (Programa de Pós-Graduação em Ciência e Engenharia de Materiais — DCEM / UFS).

---

## Índice da Documentação

1. **[Visão Geral e Stack Tecnológica](stack.md)**
   - Tecnologias de frontend e backend.
   - Padrões adotados (React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Deno Edge Functions).
   - Dependências principais, bibliotecas utilitárias e ferramentas de teste (Vitest).

2. **[Arquitetura do Sistema e Estrutura de Código](arquitetura.md)**
   - Arquitetura SPA (Single Page Application) baseada no template Skip.
   - Estrutura de pastas sob `src/` (`pages/`, `components/`, `services/`, `lib/`, `hooks/`, `types/`).
   - Padrão arquitetural das telas CRUD (`CrudPage`, `CrudFormDialog`, `useCrudData`, `createCrudService`).
   - Telas customizadas e especializadas (`Docentes`, `Publicações`, `Recondução`, `Lacunas`, `Indicadores`, `Usuários`, `Disciplinas`, `ProjetosPesquisa`).
   - Roteamento, Route Guards e ciclo de vida de sessão (`useAuth`, `AuthProvider`, `KeepAlive`).
   - Moldura de tabelas desktop estilo Supabase (cabeçalho sticky, rodapé fixo, paginação e scrollbar horizontal bidirecional `FrameHorizontalScrollbar`).

3. **[Modelo de Dados SQL e Schema do Supabase](modelo-de-dados.md)**
   - Mapeamento detalhado de todas as 27 tabelas ativas no banco de dados PostgreSQL.
   - Chaves primárias, estrangeiras, índices e constraints de unicidade.
   - Políticas RLS (Row Level Security) e funções auxiliares do banco (`get_user_role`, `is_admin_staff`, `alterar_papel`, triggers de derivação de status).
   - Catálogo de Qualis (estratos A1–C, vínculo por código textual, propagação em cascata).
   - Relacionamento de disciplinas e docentes (`disciplinas` e tabela N:N `disciplinas_docentes`).
   - Decisões estruturais importantes (ex.: tabela `bancas` foi DROPada por decisão do cliente; `disciplinas` não são preenchidas pela importação Lattes).

4. **[Pipeline de Importação Lattes](importacao-lattes.md)**
   - Processamento em 2 etapas: (1) upload/parse DOM/revisão em memória; (2) persistência idempotente no Supabase.
   - Decodificação ISO-8859-1 e suporte a arquivos XML avulsos e arquivos compactados ZIP.
   - Recorte temporal quadrienal estrito centralizado em `ANO_INICIO = 2025` e `ANO_FIM = 2028`.
   - Motor de deduplicação idempotente (`dedupe.ts`) e proteção contra exclusão de dados manuais pré-existentes.
   - Criação automática de registros na tabela `discentes` quando necessário.
   - Não-gravação de disciplinas (preenchimento manual pelo cliente).

5. **[Integrações Externas](integracoes.md)**
   - **OpenAlex:** busca e sugestão de autores, vinculação de `openalex_id`, consulta de métricas e works.
   - **Scopus / Elsevier:** arquitetura via Edge Function `scopus-buscar`, segredo `SCOPUS_API_KEY` no vault do Supabase, entitlement básico (apenas primeiro autor), vinculação direta de `scopus_id`.
   - **Extrator Lattes Institucional:** planejamento da chave para entidade educacional UFS.
   - **Edge Functions implantadas no Supabase:** `scopus-buscar`, `relatorio-lacunas`, `avaliacao-reconducao`, `admin-usuarios`.

6. **[Segurança, Perfis e Controle de Acesso](seguranca-e-perfis.md)**
   - Hierarquia dos 5 papéis: `suporte`, `coordenador`, `auxiliar`, `docente`, `capes`.
   - Matriz de permissões em `src/services/permissoes.ts` (`podeCriarNaTabela`, `podeEditarRegistro`, `podeExcluirRegistro`).
   - Escopo do papel `docente`: visualização ampla para métricas do programa, edição/exclusão estritamente restrita a produções vinculadas ao seu `docente_id`.
   - Row Level Security (RLS) no PostgreSQL e funções de verificação de papel no banco.
   - Gestão de credenciais e segredos (Vite client envs vs. Supabase Edge Functions Secrets).

7. **[Módulos Especializados e Regras de Negócio](regras-de-negocio-e-modulos.md)**
   - **Módulo de Lacunas (`/lacunas`):** 34 regras de auditoria em 10 tabelas, severidades (crítica e atenção), agrupamento visual, correção inline ou direcionada, exportação e impressão de relatório via iframe.
   - **Módulo de Recondução e Credenciamento (`/reconducao`):** cálculo dos 4 critérios da Norma PPG-DCEM (§ 4º), índice PDQ (`NP / (MSc + DSc) >= 1.0`), vereditos automáticos (Reconduzido, Não atende, PDQ insuficiente, Não aplicável), relatório com justificativas.
   - **Módulo de Indicadores CAPES (`/indicadores`):** Ficha de Avaliação da Área Engenharias II (2025), recorte 2025–2028, MMA (Média das Médias Anuais), cálculo com DP, JDP, pesos de Qualis com saturação em B1.
   - **Módulo de Egressos e Discentes:** acompanhamento de titulação, vínculos e inserção profissional.
   - **Módulo de Impacto Social:** vinculação transversal de impactos a produções, patentes e projetos.

8. **[Convenções de UI e Engenharia de Frontend](convencoes-de-ui.md)**
   - Normalização textual na renderização: `toTitleCase` / `normalizarNomePessoa` / `normalizarTituloAcademico` (Title Case inteligente, conectivos em minúsculas, siglas preservadas).
   - Deep-linking com parâmetro de URL `?destaque=<id>` e rolagem suave automática.
   - Padrão de botões e ações de cabeçalho: Atualizar, Exportar CSV, Imprimir / Gerar PDF via iframe isolado.
   - Feedback ao usuário com toasts (`sonner`), diálogos de confirmação (`AlertDialog`) e estados de carregamento com Skeletons.
