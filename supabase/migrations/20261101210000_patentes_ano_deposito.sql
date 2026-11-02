-- Ano de depósito (ou concessão) da patente, usado pelos indicadores DPPn/DPPi da Ficha CAPES.
-- Antes, o ano era inferido de created_at (data de cadastro no sistema). Migração aditiva:
-- registros existentes ficam com NULL até o ano real ser informado na tela de Patentes.
ALTER TABLE public.patentes
  ADD COLUMN IF NOT EXISTS ano_deposito integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patentes_ano_deposito_check'
  ) THEN
    ALTER TABLE public.patentes
      ADD CONSTRAINT patentes_ano_deposito_check
      CHECK (ano_deposito IS NULL OR ano_deposito BETWEEN 1900 AND 2100);
  END IF;
END $$;
