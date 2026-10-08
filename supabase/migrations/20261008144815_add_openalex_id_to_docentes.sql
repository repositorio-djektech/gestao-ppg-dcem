-- Adiciona coluna openalex_id na tabela docentes (nullable)
-- e índice único parcial em openalex_id (WHERE openalex_id IS NOT NULL)

ALTER TABLE public.docentes
ADD COLUMN IF NOT EXISTS openalex_id TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_docentes_openalex_id_unique
ON public.docentes (openalex_id)
WHERE openalex_id IS NOT NULL;
