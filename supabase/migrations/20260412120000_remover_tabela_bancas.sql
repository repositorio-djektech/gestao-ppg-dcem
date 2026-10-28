-- Migração: Remoção completa da tabela bancas examinadoras conforme decisão do cliente
-- Remove constraints, policies e a tabela public.bancas em si

ALTER TABLE IF EXISTS public.bancas DROP CONSTRAINT IF EXISTS bancas_discente_id_fkey;
ALTER TABLE IF EXISTS public.bancas DROP CONSTRAINT IF EXISTS bancas_docente_orientador_id_fkey;
ALTER TABLE IF EXISTS public.bancas DROP CONSTRAINT IF EXISTS bancas_projeto_id_fkey;
ALTER TABLE IF EXISTS public.bancas DROP CONSTRAINT IF EXISTS bancas_tipo_check;

DROP POLICY IF EXISTS bancas_delete_staff ON public.bancas;
DROP POLICY IF EXISTS bancas_insert_staff ON public.bancas;
DROP POLICY IF EXISTS bancas_select_all ON public.bancas;
DROP POLICY IF EXISTS bancas_update_staff ON public.bancas;

DROP TABLE IF EXISTS public.bancas CASCADE;
