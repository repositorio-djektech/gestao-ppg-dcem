# Segurança, Perfis e Controle de Acesso — Gestão PPG DCEM

Este documento detalha o modelo de segurança, os cinco papéis oficiais de usuário, a matriz de permissões do sistema, a implementação de Row Level Security (RLS) no PostgreSQL e a gestão de credenciais seguras.

---

## 1. Hierarquia dos 5 Papéis Oficiais

O sistema adota um modelo de controle de acesso baseado em papéis (Role-Based Access Control — RBAC) formalizado em `src/types/database.ts` e `src/hooks/use-auth.tsx`:

```typescript
export type Role = 'suporte' | 'coordenador' | 'auxiliar' | 'docente' | 'capes'
```

| Papel             |          Nível           | Descrição e Atribuições Principais                                                                                                                                                                                                                       |
| :---------------- | :----------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`suporte`**     | Administrador do Sistema | Acesso técnico irrestrito. Criação, edição e exclusão de qualquer registro, acesso total à tela `/usuarios` e configuração do sistema.                                                                                                                   |
| **`coordenador`** |    Coordenação do PPG    | Gestão executiva do programa. Permissões globais de criação, edição e exclusão de dados acadêmicos, gestão de usuários (`/usuarios`), relatórios e avaliações.                                                                                           |
| **`auxiliar`**    | Secretaria / Assistente  | Gestão operacional do programa. Pode criar e editar qualquer registro acadêmico, importar currículos e auditar lacunas. **Não possui permissão de exclusão** de registros nem acesso à gestão de usuários.                                               |
| **`docente`**     |   Docente do Programa    | Professor vinculado. Visualiza dados globais para acompanhar indicadores do programa; pode cadastrar e editar **estritamente seus próprios registros** (onde seu `docente_id` estiver vinculado), como orientações, disciplinas, publicações e projetos. |
| **`capes`**       |  Avaliador / Visitante   | Perfil estritamente de consulta (somente leitura). Visualiza relatórios, painel de lacunas, recondução e indicadores CAPES sem permissão de modificação de dados.                                                                                        |

> **Normalização de Papéis Legados:** Para preservar compatibilidade com registros de transição, a função `normalizarPapel()` em `src/hooks/use-auth.tsx` converte automaticamente valores legados: `'admin'` → `'suporte'`, `'editor'` → `'auxiliar'`, `'viewer'` → `'capes'`.

---

## 2. Matriz de Permissões no Frontend (`src/services/permissoes.ts`)

A lógica de autorização no cliente é centralizada em funções puras e auditadas que governam a exibição de botões e o bloqueio de ações na interface:

### 2.1 Permissão de Criação (`podeCriarNaTabela`)

- **`suporte`, `coordenador`, `auxiliar`:** Podem criar novos registros em todas as tabelas.
- **`capes`:** Não pode criar registros em nenhuma tabela.
- **`docente`:**
  - Pode criar em tabelas onde a produção acadêmica pode ser atrelada ao seu `docente_id`: `discentes`, `egressos`, `orientacoes`, `disciplinas`, `projetos_pesquisa`, `publicacoes`, `iniciacao_cientifica`.
  - **Bloqueado** para tabelas institucionais e cadastros globais: `docentes`, `eventos`, `impacto_social`, `linhas_pesquisa`, `mobilidade_docente`, `patentes`, `premiacoes`, `producao_tecnica`, `ppg`, `usuarios`, `qualis`.

### 2.2 Permissão de Edição (`podeEditarRegistro`)

- **`suporte`, `coordenador`, `auxiliar`:** Podem editar qualquer registro.
- **`capes`:** Não pode editar nenhum registro.
- **`docente`:** Apenas registros nos quais há comprovação de vínculo com ele:
  - `docentes`: Apenas o seu próprio registro (`registro.id === docenteId`).
  - `discentes` e `egressos`: Onde é o `docente_orientador_id` ou orientador formal.
  - `orientacoes`: Onde é o `docente_id`.
  - `disciplinas`: Onde é o `docente_id` ou integrante da equipe docente.
  - `iniciacao_cientifica`: Onde é o `docente_orientador_id`.
  - `projetos_pesquisa`: Onde é o coordenador (`coordenador_id`) ou participante registrado em `projetos_participantes`.
  - `publicacoes`: Onde seu `docente_id` está associado via `publicacoes_docentes`.
  - Demais tabelas: Bloqueado.

### 2.3 Permissão de Exclusão (`podeExcluirRegistro`)

- **`suporte`, `coordenador`:** Podem excluir qualquer registro.
- **`auxiliar`:** **Nunca pode excluir registros** em nenhuma tabela (decisão expressa de segurança do produto).
- **`capes`:** Nunca pode excluir.
- **`docente`:**
  - Pode excluir apenas produções e orientações estritamente suas (`orientacoes`, `disciplinas`, `iniciacao_cientifica`, `projetos_pesquisa` onde é coordenador, `publicacoes` com vínculo).
  - **Nunca pode excluir pessoas ou entidades institucionais** (`docentes`, `discentes`, `egressos`).

---

## 3. Row Level Security (RLS) no PostgreSQL

A segurança não depende apenas do frontend; todas as 27 tabelas do schema público do Supabase possuem políticas RLS ativas:

```sql
-- Exemplo de política de atualização para a tabela docentes:
CREATE POLICY docentes_update_staff_or_owner ON public.docentes
  FOR UPDATE
  TO authenticated
  USING (
    is_admin_staff() OR id = get_user_docente_id()
  );

-- Exemplo de política restritiva de exclusão:
CREATE POLICY docentes_delete_staff ON public.docentes
  FOR DELETE
  TO authenticated
  USING (
    get_user_role() IN ('suporte', 'coordenador')
  );
```

### 3.1 Funções Auxiliares de Segurança no Banco

- `get_user_role()`: Recupera o papel do usuário autenticado a partir de `public.profiles`.
- `is_admin_staff()`: Retorna `true` se o usuário for `suporte`, `coordenador` ou `auxiliar`.
- `get_user_docente_id()`: Retorna o ID numérico do docente vinculado ao `auth.uid()` corrente.
- `alterar_papel(user_uuid, novo_papel)`: Função `SECURITY DEFINER` executada exclusivamente por usuários `suporte` ou `coordenador` para alterar o papel de contas de terceiros com validação de enum.

---

## 4. Auditoria e Logs do Sistema (`public.logs`)

Toda operação relevante de criação, edição ou exclusão disparada pelos componentes CRUD e serviços registra um evento na tabela pública `logs` via `src/services/logs.ts`:

- Dados capturados: `user_id`, `user_email`, `user_nome`, `acao` ('criar', 'editar', 'excluir'), `entidade` (tabela afetada), `entidade_id`, `detalhes` (JSON estruturado com nome/título e justificativa), e `created_at`.
- Políticas RLS: Usuários autenticados podem inserir logs e ler o histórico geral de auditoria; modificações ou deleções de registros de log são restritas ao papel `suporte`.

---

## 5. Armazenamento Seguro de Segredos e Variáveis

| Categoria                     | Onde Reside                           | Como é Acessado                       | Exemplo                                       |
| :---------------------------- | :------------------------------------ | :------------------------------------ | :-------------------------------------------- |
| **Público / Cliente**         | Variáveis Vite (`VITE_*`)             | `import.meta.env.VITE_*`              | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| **Segredos Privados de API**  | Supabase Edge Functions Secrets Vault | `Deno.env.get('NOME')`                | `SCOPUS_API_KEY`                              |
| **Credencial Administrativa** | Supabase Auth Service Role            | Automático em Edge Functions internas | `SUPABASE_SERVICE_ROLE_KEY`                   |

> **Regra Obrigatória:** Segredos de serviços externos de backend (como a chave da Elsevier) nunca devem ser injetados em variáveis de ambiente do cliente e nunca devem ser trafegados para o navegador.
