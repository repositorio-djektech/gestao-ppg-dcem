-- Ajusta CHECK constraint de categoria na tabela docentes para permitir 'visitante' e 'jdp'
ALTER TABLE public.docentes DROP CONSTRAINT IF EXISTS docentes_categoria_check;

ALTER TABLE public.docentes
  ADD CONSTRAINT docentes_categoria_check
  CHECK (categoria IS NULL OR categoria = ANY (ARRAY['permanente'::text, 'colaborador'::text, 'visitante'::text, 'jdp'::text]));
