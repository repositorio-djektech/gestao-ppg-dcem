# Modelo de Dados SQL e Schema do Supabase — Gestão PPG DCEM

Este documento detalha o modelo relacional completo implementado no PostgreSQL via Supabase para o sistema **Gestão PPG DCEM**, cobrindo todas as 27 tabelas ativas, seus campos, tipos, chaves primárias e estrangeiras, índices de performance e políticas RLS (Row Level Security).

---

## 1. Visão Geral do Schema e Relacionamentos

```
                        ┌────────────────────────┐
                        │      auth.users        │
                        └───────────┬────────────┘
                                    │ 1:1
                                    ▼
                        ┌────────────────────────┐
                        │        profiles        │
                        └───────────┬────────────┘
                                    │ N:1 (opcional)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                               docentes                                 │
│  (id PK, nome, id_lattes, scopus_id, openalex_id, orc_id, categoria,   │
│   bolsa_cnpq, jdp, jdp_desde, ano_doutorado, status, cpf, siape...)   │
└───────┬──────────────┬──────────────┬──────────────┬──────────────┬────┘
        │              │              │              │              │
        │ N:N          │ 1:N          │ 1:N          │ N:N          │ 1:N
        ▼              ▼              ▼              ▼              ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│  docentes_   ││  discentes   ││  egressos    ││ disciplinas_ ││  projetos_   │
│   linhas     ││(orientador_id││(orientador_id││   docentes   ││   pesquisa   │
└───────┬──────┘└──────┬───────┘└──────┬───────┘└──────┬───────┘└──────┬───────┘
        │              │               │               │               │
        ▼              ▼               ▼               ▼               │
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐       │
│   linhas_    ││ orientacoes  ││  publicacoes_││ disciplinas  │       │
│   pesquisa   ││ (docente_id, ││   coautores_ ││  (docente_id,│       │
└──────────────┘│  discente_id)││   programa   ││   codigo...) │       │
                └──────────────┘└──────┬───────┘└──────────────┘       │
                                       │                               │
                                       ▼                               │
                        ┌────────────────────────┐                     │
                        │      publicacoes       │                     │
                        │(id PK, titulo, autores,│                     │
                        │ estrato_qualis, doi...)│                     │
                        └───────────▲────────────┘                     │
                                    │ N:N                              │
                        ┌───────────┴────────────┐                     │
                        │  publicacoes_docentes  │                     │
                        └────────────────────────┘                     │
                                                                       │
        ┌──────────────────────────────────────────────────────────────┘
        │
        ├─► projetos_participantes (N:N com docentes)
        ├─► projetos_discentes (N:N com discentes)
        └─► iniciacao_cientifica (N:1 com discentes, projetos e docentes)
```

---

## 2. Dicionário de Tabelas do Banco de Dados

### 2.1 Pessoas e Estrutura Institucional

#### `docentes`

Armazena o corpo docente vinculado ao programa (Permanentes, Colaboradores, Visitantes).

- `id`: `bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY`
- `nome`: `text NOT NULL`
- `scopus_id`: `text DEFAULT ''` — ID numérico no Scopus/Elsevier
- `indice_h`: `integer DEFAULT 0` — Índice-h informado
- `bolsa_cnpq`: `text DEFAULT ''` — Nível de bolsa de produtividade (ex: '1A', '1B', '2', 'Não possui')
- `jdp`: `boolean DEFAULT false` — Flag de Jovem Docente Permanente
- `jdp_desde`: `integer` — Ano de entrada como JDP (limite CAPES de 4 anos)
- `ano_doutorado`: `integer` — Ano de obtenção do doutorado (limite CAPES de 10 anos para JDP)
- `programas_permanente`: `integer NOT NULL DEFAULT 1` (≥ 1) — Número de programas em que o docente é permanente, incluindo o PPG-DCEM. A produção sem coautoria de discente ou egresso é dividida por esse número em DPI, DPT e DPI2 (Ficha CAPES, item 2.4.1). Migration `20261102120000_docentes_programas_permanente.sql`
- `categoria`: `text` — `'permanente'`, `'colaborador'`, `'visitante'`, `'jdp'`
- `id_lattes`: `text` — Identificador estável de 16 dígitos do CNPq (possui índice único `idx_docentes_id_lattes_unique`)
- `openalex_id`: `text` — Identificador OpenAlex (índice único `idx_docentes_openalex_id_unique`)
- `orc_id`: `text` — Código ORCID
- `cpf`: `text DEFAULT '' UNIQUE` — CPF (apenas dígitos)
- `siape`: `text DEFAULT ''` — Matrícula SIAPE na UFS
- `email`: `text DEFAULT ''` — E-mail de contato
- `licenca`: `text DEFAULT ''` — Períodos de licença
- `status`: `boolean DEFAULT true` — Docente ativo ou inativo
- `created_at`: `timestamp with time zone DEFAULT now()`

#### `discentes`

Registra os discentes de mestrado e doutorado do programa.

- `id`: `bigint PRIMARY KEY`
- `nome`: `text NOT NULL`
- `cpf`: `text DEFAULT ''`
- `data_ingresso`: `text DEFAULT ''`
- `ano_conclusao`: `text DEFAULT ''`
- `status`: `text DEFAULT 'ativo'` — `'ativo'`, `'concluido'`, `'titulado'`, `'desligado'`
- `tipo_curso`: `text DEFAULT ''` — `'Mestrado'` ou `'Doutorado'`
- `link_lattes`: `text DEFAULT ''`
- `orientador`: `text DEFAULT ''` — Nome textual legado
- `docente_orientador_id`: `bigint REFERENCES docentes(id)` — Vínculo relacional com docente
- `projeto_id`: `bigint REFERENCES projetos_pesquisa(id)`
- `link_comprovacao`: `text DEFAULT ''`
- `observacoes`: `text DEFAULT ''`
- `created_at`: `timestamp with time zone DEFAULT now()`

#### `egressos`

Acompanhamento dos profissionais titulados pelo programa.

- `id`: `bigint PRIMARY KEY`
- `nome`: `text NOT NULL`
- `ano_titulacao`: `integer`
- `ano_ingresso`: `text`
- `tipo_curso`: `text` — `'Mestrado'` ou `'Doutorado'`
- `atuacao_profissional`: `text DEFAULT ''`
- `atuacao_setor`: `text NOT NULL DEFAULT ''` — `'ensino_superior'`, `'instituicao_pesquisa'`, `'industria_servicos'`, `'outro'`, `'nao_atua_na_area'` ou `''` (não informado); indicadores 2.3.1 a 2.3.3
- `atuacao_pais`: `text NOT NULL DEFAULT ''` — `'brasil'`, `'exterior'` ou `''`
- `destaque`: `boolean NOT NULL DEFAULT false` e `destaque_justificativa`: `text NOT NULL DEFAULT ''` — destaques do item 2.3.4 (até 5 por faixa: 2020–2024, 2015–2019, 2010–2014). Migration `20261102130000_patentes_discente_egresso_e_egressos_atuacao.sql`
- `lattes_id`: `text`
- `link_lattes`: `text DEFAULT ''`
- `orientador`: `text DEFAULT ''`
- `docente_orientador_id`: `bigint REFERENCES docentes(id)`
- `link_comprovacao`: `text DEFAULT ''`
- `observacoes`: `text DEFAULT ''`
- `created_at`: `timestamp with time zone DEFAULT now()`

#### `ppg`

Dados institucionais do programa.

- `id`: `bigint PRIMARY KEY`
- `nome`: `text NOT NULL` (PPG-DCEM)
- `modalidade`: `text DEFAULT 'Acadêmico'`
- `nivel`: `text DEFAULT 'Mestrado/Doutorado'`
- `uf`: `text DEFAULT 'SE'` (ou default 'SP' no legado)
- `created_at`: `timestamp with time zone DEFAULT now()`

#### `ppg_textos`

Textos curtos do programa por chave (H-10). Hoje só o item 1.3 da ficha (políticas afirmativas). Migração `20261104130000` aplicada em 04/11.

- `chave`: `text PRIMARY KEY` (`item_1_3_politicas_afirmativas`)
- `texto`: `text NOT NULL DEFAULT ''` (limite de 4000 caracteres validado na aplicação)
- `updated_at`: `timestamp with time zone DEFAULT now()`
- RLS: leitura para autenticados; INSERT e UPDATE só `suporte` e `coordenador`; sem DELETE.

#### `profiles`

Tabela de perfis que estende `auth.users` do Supabase.

- `id`: `bigint PRIMARY KEY`
- `user_id`: `uuid UNIQUE REFERENCES auth.users(id)`
- `email`: `text NOT NULL`
- `name`: `text DEFAULT ''`
- `role`: `text DEFAULT 'capes'` — Valores oficiais: `'suporte'`, `'coordenador'`, `'auxiliar'`, `'docente'`, `'capes'`
- `docente_id`: `bigint UNIQUE REFERENCES docentes(id)` — Vincula o login ao registro do docente
- `created_at`: `timestamp with time zone DEFAULT now()`

---

### 2.2 Formação e Ensino

#### `orientacoes`

Orientações de mestrado, doutorado, pós-doutorado, IC e TCC.

- `id`: `bigint PRIMARY KEY`
- `docente_id`: `bigint REFERENCES docentes(id)`
- `discente_id`: `bigint REFERENCES discentes(id)`
- `tipo`: `text DEFAULT ''` — Nível (`'Mestrado'`, `'Doutorado'`, etc.)
- `inicio`: `text DEFAULT ''`
- `fim`: `text DEFAULT ''`
- `status`: `text DEFAULT 'ativo'` — `'ativo'`, `'concluido'`, `'cancelado'`, `'em_andamento'`
- `data_defesa`: `date` — Data exata da defesa
- `flag_orientador_principal`: `boolean DEFAULT false` — Diferencia orientador principal de coorientador
- `cancelado`: `boolean DEFAULT false`
- `link_comprovacao`: `text DEFAULT ''`
- `observacoes`: `text DEFAULT ''`
- `created_at`: `timestamp with time zone DEFAULT now()`
- **Nota arquitetural:** Possui função trigger `trg_orientacoes_derivar_status()` para manter sincronizado o status efetivo da orientação.

#### `disciplinas`

Disciplinas ofertadas na pós-graduação e graduação.

- `id`: `bigint PRIMARY KEY`
- `nome`: `text NOT NULL`
- `codigo`: `text DEFAULT ''`
- `creditos`: `integer DEFAULT 0`
- `ano_semestre`: `text DEFAULT ''` (ex: '2025/1')
- `nivel`: `text` — `'pos_graduacao'` ou `'graduacao'`
- `docente_id`: `bigint REFERENCES docentes(id)` — Docente responsável principal legado
- `link_comprovacao`: `text DEFAULT ''`
- `observacoes`: `text DEFAULT ''`
- `created_at`: `timestamp with time zone DEFAULT now()`
- **Decisão do Cliente:** Esta tabela **NÃO é preenchida pela Importação Lattes**. O preenchimento é manual pelo programa.

#### `disciplinas_docentes`

Tabela N:N que permite múltiplos docentes vinculados a uma mesma disciplina.

- `id`: `bigint PRIMARY KEY`
- `disciplina_id`: `bigint REFERENCES disciplinas(id) ON DELETE CASCADE`
- `docente_id`: `bigint REFERENCES docentes(id) ON DELETE CASCADE`
- `created_at`: `timestamp with time zone DEFAULT now()`
- Constraint única: `uq_disciplinas_docentes (disciplina_id, docente_id)`

---

### 2.3 Pesquisa, Produção e Fomento

#### `publicacoes`

Produção bibliográfica (artigos em periódicos, trabalhos em anais, capítulos de livros).

- `id`: `bigint PRIMARY KEY`
- `titulo`: `text NOT NULL`
- `autores`: `text NOT NULL`
- `periodico`: `text NOT NULL`
- `ano`: `integer NOT NULL`
- `doi`: `text DEFAULT ''`
- `fator_impacto_jcr`: `numeric` — Fator de impacto JCR do periódico
- `estrato_qualis`: `text` — Código textual do Qualis (`'A1'`, `'A2'`, `'A3'`, `'A4'`, `'B1'`, `'B2'`, `'B3'`, `'B4'`, `'C'`)
- `tipo_producao`: `text` — `'Artigo em periódico'`, `'Trabalho em anais'`, `'Capítulo'`
- `indicacao_nivel`: `integer` — Destaque de nível (2 ou 3) para relatório CAPES
- `justificativa_indicacao`: `text`
- `qualis_origem`: `text` — `'manual'` ou `'sugerido_confirmado'`
- `qualis_sugestao_justificativa`: `text` — Justificativa da sugestão baseada em métricas
- `justificativa`: `text DEFAULT ''`
- `link_comprovacao`: `text DEFAULT ''`
- `observacoes`: `text DEFAULT ''`
- `created_at`: `timestamp with time zone DEFAULT now()`

#### `publicacoes_docentes`

Tabela N:N que relaciona publicações a múltiplos docentes do programa.

- `id`: `bigint PRIMARY KEY`
- `publicacao_id`: `bigint REFERENCES publicacoes(id) ON DELETE CASCADE`
- `docente_id`: `bigint REFERENCES docentes(id) ON DELETE CASCADE`
- `created_at`: `timestamp with time zone DEFAULT now()`
- Constraint única: `uq_publicacoes_docentes (publicacao_id, docente_id)`

#### `publicacoes_coautores_programa`

Rastreamento e confirmação de coautorias com alunos e egressos para o cálculo do índice PDQ e indicadores CAPES.

- `id`: `bigint PRIMARY KEY`
- `publicacao_id`: `bigint REFERENCES publicacoes(id) ON DELETE CASCADE`
- `discente_id`: `bigint REFERENCES discentes(id)`
- `egresso_id`: `bigint REFERENCES egressos(id)`
- `tipo`: `text DEFAULT 'orientando'` — `'orientando'`, `'egresso'`, `'sem_coautoria'`
- `nome_citado`: `text DEFAULT ''`
- `grau_confianca`: `numeric DEFAULT 1.0`
- `confirmado_por`: `text`
- `confirmado_em`: `timestamp with time zone DEFAULT now()`
- `created_at`: `timestamp with time zone DEFAULT now()`

#### `qualis`

Catálogo oficial de referência dos estratos Qualis da CAPES.

- `id`: `bigint PRIMARY KEY`
- `estrato`: `text NOT NULL` (`'A1'`, `'A2'`, etc. com índice `idx_qualis_estrato`)
- `nome`: `text DEFAULT ''`
- `descricao`: `text DEFAULT ''`
- `created_at`: `timestamp with time zone DEFAULT now()`
- `updated_at`: `timestamp with time zone DEFAULT now()`
- **Regra de Propagação:** A edição ou exclusão de um estrato no catálogo é sincronizada e propagada para a coluna `publicacoes.estrato_qualis` através do serviço `src/services/qualis.ts`.

#### `projetos_pesquisa`

Projetos de pesquisa coordenados ou executados pelo corpo do programa.

- `id`: `bigint PRIMARY KEY`
- `titulo`: `text NOT NULL`
- `descricao`: `text DEFAULT ''`
- `inicio`: `text DEFAULT ''`
- `fim`: `text DEFAULT ''`
- `coordenador_id`: `bigint REFERENCES docentes(id)`
- `financiamento`: `boolean DEFAULT false`
- `orgao_fomento`: `text DEFAULT ''`
- `financiador_nome`: `text`
- `valor_financiamento`: `numeric`
- `classificacao`: `text` — `'institucional'` ou `'individual'`
- `comprovante_url`: `text` — URL do PDF anexado no Supabase Storage
- `link_comprovacao`: `text DEFAULT ''`
- `observacoes`: `text DEFAULT ''`
- `created_at`: `timestamp with time zone DEFAULT now()`

#### `projetos_participantes`

Membros docentes participantes da equipe de um projeto.

- `projeto_id`: `bigint REFERENCES projetos_pesquisa(id) ON DELETE CASCADE`
- `docente_id`: `bigint REFERENCES docentes(id) ON DELETE CASCADE`
- `papel`: `text` (ex.: 'Pesquisador', 'Colaborador')
- `created_at`: `timestamp with time zone DEFAULT now()`
- Chave primária composta: `(projeto_id, docente_id)`

#### `projetos_discentes`

Discentes vinculados à equipe do projeto de pesquisa.

- `projeto_id`: `bigint REFERENCES projetos_pesquisa(id) ON DELETE CASCADE`
- `discente_id`: `bigint REFERENCES discentes(id) ON DELETE CASCADE`
- `papel`: `text DEFAULT 'participante'`
- `created_at`: `timestamp with time zone DEFAULT timezone('utc'::text, now())`
- Chave primária composta: `(projeto_id, discente_id)`

#### `iniciacao_cientifica`

Bolsistas e voluntários de IC, IT e Iniciação em Extensão.

- `id`: `bigint PRIMARY KEY`
- `discente_id`: `bigint REFERENCES discentes(id)`
- `discente_nome`: `text`
- `tipo`: `text` — `'iniciacao_cientifica'`, `'iniciacao_tecnologica'`, `'iniciacao_extensao'`
- `ano`: `integer`
- `docente_orientador_id`: `bigint REFERENCES docentes(id)`
- `projeto_id`: `bigint REFERENCES projetos_pesquisa(id)`
- `titulo`: `text DEFAULT ''`
- `bolsa_cnpq`: `text DEFAULT ''`
- `observacoes`: `text DEFAULT ''`
- `created_at`: `timestamp with time zone DEFAULT now()`
- `updated_at`: `timestamp with time zone DEFAULT now()`

#### `linhas_pesquisa` e `docentes_linhas`

- `linhas_pesquisa`: `id`, `nome`, `area`, `created_at`
- `docentes_linhas`: Chave N:N (`id PK`, `docente_id FK`, `linha_id FK`, `created_at`), com constraint única `uq_docentes_linhas`.

---

### 2.4 Demais Produções e Extensão

- **`patentes`:** `id`, `titulo`, `status` ('Concessão', 'Licenciamento', 'Pendente'), `autores`, `inpi`, `ambito` ('nacional', 'internacional'), `ano_deposito` (inteiro opcional, 1900–2100: ano de depósito ou concessão usado em DPPn/DPPi; sem ele os indicadores usam o ano de cadastro `created_at` como aproximação legada), `com_discente_egresso` (boolean, padrão `false`: patente com autoria de discente ou egresso, usada no DPPDE) e `discentes_egressos` (texto com nomes e vínculo, como evidência), `tipo` ('PI', 'MU', etc.), `link_comprovacao`, `observacoes`.
- **`producao_tecnica`:** `id`, `titulo`, `ano`, `autores`, `tipo` ('Software', 'Relatório', 'Patente'), `link_comprovacao`, `observacoes`.
- **`premiacoes`:** `id`, `titulo`, `ano`, `nome_premiado`, `instituicao`, `link_comprovacao`, `observacoes`.
- **`eventos`:** `id`, `docente`, `evento`, `local_data`, `papel`, `tipo` ('Trabalho completo', 'Resumo'), `nacionalidade` ('Nacional', 'Internacional'), `link_comprovacao`, `observacoes`.
- **`mobilidade_docente`:** `id`, `tipo` ('docente', 'discente', 'visitante'), `nome`, `instituicao`, `periodo`, `link`, `modalidade` ('nacional', 'internacional'), `link_comprovacao`, `observacoes`.
- **`impacto_social`:** `id`, `titulo`, `descricao`, `ano`, `link_comprovacao`, `observacoes`.
- **`impactos_vinculos`:** Vínculo N:N entre um impacto social e entidades do sistema (`id PK`, `impacto_social_id FK`, `entidade` text, `entidade_id` bigint), constraint única `uq_impactos_vinculos_impacto_entidade`.

---

### 2.5 Auditoria e Integrações

- **`logs`:** Histórico de auditoria de alterações do sistema (`id`, `user_id FK`, `user_email`, `user_nome`, `acao`, `entidade`, `entidade_id`, `detalhes jsonb`, `created_at`).
- **`scopus_val_log`:** Log técnico das validações de chamadas Scopus (`id`, `stage`, `data jsonb`, `created_at`).
- **`sugestoes_vinculos_rejeitadas`:** Guarda histórico de sugestões automáticas rejeitadas manualmente pelo usuário para não re-sugerir o mesmo casamento (`id`, `tipo_vinculo`, `origem_identificador`, `alvo_identificador`, `motivo`, `rejeitado_por`, `created_at`).

---

## 3. Decisões Estruturais e Histórico de Decisões do Cliente

1. **A tabela `bancas` foi DROPada por decisão do cliente (v0.0.164):**
   - A gestão de bancas examinadoras foi descontinuada do escopo do sistema. A tabela foi removida do PostgreSQL, assim como suas rotas, abas no diálogo do docente, regras de lacunas e persistência no Lattes. **Não recriar a tabela `bancas`.**
2. **Disciplinas NÃO são gravadas pela Importação Lattes:**
   - O XML do Lattes contém dados de atividades de docência dispersos e heterogêneos. O cliente decidiu que as disciplinas da pós-graduação e seus vínculos devem ser cadastrados e mantidos manualmente na tela dedicada `/disciplinas`.
3. **Preservação de Dados Reais:**
   - Todos os docentes, discentes e produções cadastrados manualmente no banco representam dados acadêmicos reais do PPG-DCEM. Operações de sincronização e importação operam exclusivamente em modo de acréscimo e atualização por dedupe (`dedupe.ts`), sendo expressamente vedado truncar ou excluir registros sob alegação de "dados de teste".

---

## 4. Funções e Políticas RLS (Row Level Security)

### 4.1 Funções no Banco de Dados

- `get_user_role() RETURNS text`: Retorna o papel (`role`) do usuário atual a partir da tabela `profiles`.
- `is_admin_staff() RETURNS boolean`: Retorna `true` se o usuário logado pertencer ao staff administrativo (`suporte`, `coordenador` ou `auxiliar`).
- `get_user_docente_id() RETURNS bigint`: Retorna o `docente_id` associado ao perfil do usuário atual.
- `alterar_papel(uuid, text) RETURNS profiles`: Função com permissões `SECURITY DEFINER` para alterar papéis de usuários de forma auditada.
- `trg_orientacoes_derivar_status()`: Trigger que deriva o status de orientações com base na data de defesa ou término.

### 4.2 Políticas de Segurança RLS

Todas as tabelas do schema público possuem RLS ativado. O padrão de segurança estabelecido:

- **SELECT:** `SELECT` é concedido a todos os usuários autenticados (`profiles_select_all_authenticated`, `docentes_select_all`, `publicacoes_select_all`, etc.). Isso é necessário porque o sistema calcula métricas agregadas do programa para relatórios da CAPES.
- **INSERT / UPDATE:**
  - Usuários Staff (`suporte`, `coordenador`, `auxiliar`) possuem permissão de inserção e atualização em todas as tabelas.
  - Usuários com papel `docente` só possuem permissão de inserção e atualização em registros onde há vínculo direto com seu `docente_id` (ex.: suas próprias publicações via `publicacoes_docentes`, seus projetos coordenados, orientações onde é orientador e seus discentes).
- **DELETE:**
  - Restrito estritamente a administradores (`suporte` e `coordenador`). O papel `auxiliar` não possui permissão de exclusão (política `_delete_staff`).
  - Docentes têm direito de exclusão apenas em produções e orientações estritamente suas, sendo impedidos de excluir registros institucionais (docentes, discentes, egressos, eventos, patentes).
