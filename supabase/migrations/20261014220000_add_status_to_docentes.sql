-- Migração aditiva para adicionar coluna status na tabela docentes
-- Pedido 1: status boolean NOT NULL DEFAULT TRUE
-- Idempotente com ADD COLUMN IF NOT EXISTS

ALTER TABLE public.docentes
  ADD COLUMN IF NOT EXISTS status boolean NOT NULL DEFAULT TRUE;

-- Garantir que qualquer registro existente tenha status = TRUE
UPDATE public.docentes
  SET status = TRUE
  WHERE status IS NULL;
