-- Migração Etapa E1: Egressos - expansão de campos e correção de constraint em discentes
-- Data: 2026-10-15

-- 1. Colunas novas na tabela egressos
ALTER TABLE public.egressos ADD COLUMN IF NOT EXISTS ano_ingresso text;
ALTER TABLE public.egressos ADD COLUMN IF NOT EXISTS tipo_curso text;
ALTER TABLE public.egressos ADD COLUMN IF NOT EXISTS docente_orientador_id bigint REFERENCES public.docentes(id) ON DELETE SET NULL;
ALTER TABLE public.egressos ADD COLUMN IF NOT EXISTS orientador text DEFAULT ''::text;
ALTER TABLE public.egressos ADD COLUMN IF NOT EXISTS lattes_id text;

-- 2. Índices na tabela egressos
CREATE INDEX IF NOT EXISTS idx_egressos_docente_orientador_id ON public.egressos(docente_orientador_id);
CREATE INDEX IF NOT EXISTS idx_egressos_lattes_id ON public.egressos(lattes_id);
CREATE INDEX IF NOT EXISTS idx_egressos_nome ON public.egressos(nome);

-- 3. Correção de pré-requisito: constraint de status em discentes
-- Permitir também 'concluido' além de 'ativo', 'titulado', 'desligado'
ALTER TABLE public.discentes DROP CONSTRAINT IF EXISTS discentes_status_check;
ALTER TABLE public.discentes ADD CONSTRAINT discentes_status_check
  CHECK (status = ANY (ARRAY['ativo'::text, 'concluido'::text, 'titulado'::text, 'desligado'::text]));

-- 4. RLS na tabela egressos no padrão do projeto
-- Políticas idempotentes (DROP POLICY IF EXISTS + CREATE POLICY)
DROP POLICY IF EXISTS egressos_select ON public.egressos;
CREATE POLICY egressos_select ON public.egressos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS egressos_insert ON public.egressos;
CREATE POLICY egressos_insert ON public.egressos
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]));

DROP POLICY IF EXISTS egressos_update ON public.egressos;
CREATE POLICY egressos_update ON public.egressos
  FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]));

DROP POLICY IF EXISTS egressos_delete ON public.egressos;
CREATE POLICY egressos_delete ON public.egressos
  FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]));
