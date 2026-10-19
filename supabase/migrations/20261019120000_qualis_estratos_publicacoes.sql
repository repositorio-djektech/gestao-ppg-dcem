-- Atualiza a constraint de estrato_qualis em publicacoes para aceitar todos os estratos da tabela qualis (A1 a C)
ALTER TABLE public.publicacoes
  DROP CONSTRAINT IF EXISTS check_publicacoes_estrato_qualis;

ALTER TABLE public.publicacoes
  ADD CONSTRAINT check_publicacoes_estrato_qualis
  CHECK (
    estrato_qualis IS NULL OR
    estrato_qualis = ANY (ARRAY['A1'::text, 'A2'::text, 'A3'::text, 'A4'::text, 'B1'::text, 'B2'::text, 'B3'::text, 'B4'::text, 'C'::text])
  );
