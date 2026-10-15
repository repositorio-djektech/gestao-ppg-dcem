-- Etapa Q1: Indicadores da Ficha CAPES na tabela publicacoes
-- Adiciona estrato_qualis, tipo_producao, indicacao_nivel, justificativa_indicacao
-- com constraints e índice para filtros

ALTER TABLE public.publicacoes
  ADD COLUMN IF NOT EXISTS estrato_qualis text,
  ADD COLUMN IF NOT EXISTS tipo_producao text,
  ADD COLUMN IF NOT EXISTS indicacao_nivel integer,
  ADD COLUMN IF NOT EXISTS justificativa_indicacao text;

-- Constraints com validação segura (DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_publicacoes_estrato_qualis'
  ) THEN
    ALTER TABLE public.publicacoes
      ADD CONSTRAINT check_publicacoes_estrato_qualis
      CHECK (estrato_qualis IS NULL OR estrato_qualis IN ('A1', 'A2', 'A3', 'A4', 'B1'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_publicacoes_tipo_producao'
  ) THEN
    ALTER TABLE public.publicacoes
      ADD CONSTRAINT check_publicacoes_tipo_producao
      CHECK (tipo_producao IS NULL OR tipo_producao IN ('Artigo em periódico', 'Trabalho em anais', 'Capítulo'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_publicacoes_indicacao_nivel'
  ) THEN
    ALTER TABLE public.publicacoes
      ADD CONSTRAINT check_publicacoes_indicacao_nivel
      CHECK (indicacao_nivel IS NULL OR indicacao_nivel IN (2, 3));
  END IF;
END $$;

-- Índice para acelerar filtros de estrato_qualis
CREATE INDEX IF NOT EXISTS idx_publicacoes_estrato_qualis
  ON public.publicacoes (estrato_qualis);
