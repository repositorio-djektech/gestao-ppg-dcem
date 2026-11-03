-- Número de programas de pós-graduação em que o docente atua como permanente (inclui o PPG-DCEM).
-- A Ficha CAPES (Engenharias II, item 2.4.1) divide a produção de DP sem coautoria de discente ou
-- egresso por esse número no DPI e no DPT, e o item 1.2.2 avalia o % de DP exclusivos do programa.
-- Migração aditiva: todos os docentes existentes ficam com 1 (permanente só neste programa).
ALTER TABLE public.docentes
  ADD COLUMN IF NOT EXISTS programas_permanente integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'docentes_programas_permanente_check'
  ) THEN
    ALTER TABLE public.docentes
      ADD CONSTRAINT docentes_programas_permanente_check
      CHECK (programas_permanente >= 1);
  END IF;
END $$;
