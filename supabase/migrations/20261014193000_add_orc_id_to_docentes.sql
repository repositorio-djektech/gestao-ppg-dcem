-- Migração aditiva: adicionar coluna orc_id na tabela docentes
-- Tipo TEXT nulo, seguindo padrão de lattes_id, scopus_id, openalex_id. Preserva dados reais existentes.
ALTER TABLE public.docentes
  ADD COLUMN IF NOT EXISTS orc_id text NULL;

CREATE INDEX IF NOT EXISTS idx_docentes_orc_id ON public.docentes USING btree (orc_id);
