-- Migração aditiva para Etapa Q4: Ficha CAPES
-- Adiciona coluna ambito ('nacional' | 'internacional') à tabela patentes sem afetar dados existentes
ALTER TABLE public.patentes
  ADD COLUMN IF NOT EXISTS ambito text;

-- Restrição de valores permitidos para ambito (nacional / internacional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patentes_ambito_check'
  ) THEN
    ALTER TABLE public.patentes
      ADD CONSTRAINT patentes_ambito_check
      CHECK (ambito IS NULL OR ambito = ANY (ARRAY['nacional'::text, 'internacional'::text]));
  END IF;
END $$;
