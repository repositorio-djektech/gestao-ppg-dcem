-- Migração: Atualização dos valores permitidos de eventos.tipo
-- De 'Trabalho' / 'Resumo' para 'Trabalho completo' / 'Resumo'

-- 1. Atualizar registros existentes com 'Trabalho' para 'Trabalho completo'
UPDATE public.eventos
SET tipo = 'Trabalho completo'
WHERE tipo = 'Trabalho';

-- 2. Atualizar a constraint eventos_tipo_check de forma idempotente
ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_tipo_check;

ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_tipo_check
  CHECK (
    tipo IS NULL OR tipo = ANY (ARRAY[
      'Trabalho completo'::text,
      'Resumo'::text
    ])
  );
