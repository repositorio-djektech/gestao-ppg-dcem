-- Migração para histórico de snapshots do relatório de lacunas
CREATE TABLE IF NOT EXISTS public.lacunas_historico (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total INTEGER NOT NULL DEFAULT 0,
  criticas INTEGER NOT NULL DEFAULT 0,
  atencao INTEGER NOT NULL DEFAULT 0,
  detalhe JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_lacunas_historico_criado_em ON public.lacunas_historico (criado_em DESC);

-- Habilita RLS
ALTER TABLE public.lacunas_historico ENABLE ROW LEVEL SECURITY;

-- Políticas RLS seguindo o padrão de autenticados do projeto
DROP POLICY IF EXISTS "lacunas_historico_select" ON public.lacunas_historico;
CREATE POLICY "lacunas_historico_select" ON public.lacunas_historico
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "lacunas_historico_insert" ON public.lacunas_historico;
CREATE POLICY "lacunas_historico_insert" ON public.lacunas_historico
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "lacunas_historico_update" ON public.lacunas_historico;
CREATE POLICY "lacunas_historico_update" ON public.lacunas_historico
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lacunas_historico_delete" ON public.lacunas_historico;
CREATE POLICY "lacunas_historico_delete" ON public.lacunas_historico
  FOR DELETE TO authenticated USING (get_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]));
