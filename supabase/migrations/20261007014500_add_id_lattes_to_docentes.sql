-- Adiciona coluna id_lattes na tabela docentes (nullable)
-- e índice único parcial em id_lattes (WHERE id_lattes IS NOT NULL)

ALTER TABLE public.docentes
ADD COLUMN IF NOT EXISTS id_lattes TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_docentes_id_lattes_unique
ON public.docentes (id_lattes)
WHERE id_lattes IS NOT NULL;
