-- Migração aditiva:
-- 1) Adicionar colunas cpf, siape e email na tabela docentes
ALTER TABLE public.docentes
  ADD COLUMN IF NOT EXISTS cpf text DEFAULT '',
  ADD COLUMN IF NOT EXISTS siape text DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text DEFAULT '';

-- 2) Adicionar colunas orientador, ano_conclusao e tipo_curso na tabela discentes
ALTER TABLE public.discentes
  ADD COLUMN IF NOT EXISTS orientador text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ano_conclusao text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_curso text DEFAULT '';

-- 3) Criar tabela de auditoria logs
CREATE TABLE IF NOT EXISTS public.logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text DEFAULT '',
  user_nome text DEFAULT '',
  acao text NOT NULL, -- ex: criar, editar, excluir
  entidade text NOT NULL, -- ex: docentes, discentes, publicacoes
  entidade_id text, -- ID da entidade afetada (em formato text para flexibilidade)
  detalhes jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices úteis para consultas de auditoria na tabela logs
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_entidade ON public.logs(entidade);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_acao ON public.logs(acao);

-- RLS para tabela logs:
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem inserir logs de auditoria
DROP POLICY IF EXISTS logs_insert ON public.logs;
CREATE POLICY logs_insert ON public.logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Usuários autenticados podem visualizar logs
DROP POLICY IF EXISTS logs_select ON public.logs;
CREATE POLICY logs_select ON public.logs
  FOR SELECT TO authenticated
  USING (true);

-- Apenas admins podem atualizar ou deletar logs (preservação da integridade da auditoria)
DROP POLICY IF EXISTS logs_update ON public.logs;
CREATE POLICY logs_update ON public.logs
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS logs_delete ON public.logs;
CREATE POLICY logs_delete ON public.logs
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');
