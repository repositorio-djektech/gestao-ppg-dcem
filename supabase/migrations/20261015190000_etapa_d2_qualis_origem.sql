-- Etapa D2: Sugestão automática de estrato QUALIS (A1-B1) com rastreabilidade de origem
-- Adiciona qualis_origem e qualis_sugestao_justificativa na tabela publicacoes
-- Regra de Ouro:
-- 1. qualis_origem: 'manual' | 'sugerido_confirmado' (nulo permitido para registros pré-existentes ou sem estrato)
-- 2. qualis_sugestao_justificativa: texto legível com a justificativa da métrica (OpenAlex/Scopus)

ALTER TABLE public.publicacoes
  ADD COLUMN IF NOT EXISTS qualis_origem text,
  ADD COLUMN IF NOT EXISTS qualis_sugestao_justificativa text;

-- Constraint para qualis_origem com validação segura
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_publicacoes_qualis_origem'
  ) THEN
    ALTER TABLE public.publicacoes
      ADD CONSTRAINT check_publicacoes_qualis_origem
      CHECK (qualis_origem IS NULL OR qualis_origem IN ('manual', 'sugerido_confirmado'));
  END IF;
END $$;

-- Índice para acelerar filtros de qualis_origem
CREATE INDEX IF NOT EXISTS idx_publicacoes_qualis_origem
  ON public.publicacoes (qualis_origem);
