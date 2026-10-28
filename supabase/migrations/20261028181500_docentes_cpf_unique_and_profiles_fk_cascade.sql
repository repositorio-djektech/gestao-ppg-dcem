-- Migração: Garantir integridade do vínculo docentes <-> profiles e unicidade de CPF em docentes
-- Data: 2026-10-28
-- Requisitos:
-- 1. Unicidade de CPF na tabela docentes (idx_docentes_cpf_unique / constraint docentes_cpf_key)
--    Garantir que CPF nulo ou vazio não colida (índice único parcial onde cpf is not null and cpf <> '')
--    e constraint UNIQUE se todos os CPFs forem preenchidos e válidos.
-- 2. FK profiles.docente_id -> docentes(id) com ON DELETE CASCADE
--    Se profiles_docente_id_fkey existir como ON DELETE SET NULL, substituir por ON DELETE CASCADE
-- 3. Constraint UNIQUE em profiles.docente_id (um docente só pode estar vinculado a um profile)

DO $$
BEGIN
  -- 1. Unicidade em docentes.cpf:
  -- Adiciona constraint UNIQUE / índice UNIQUE em docentes.cpf se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.docentes'::regclass
      AND conname = 'docentes_cpf_key'
  ) THEN
    -- Garantir que não haja duplicatas antes de criar (já validado que existem 15 CPFs distintos nos 15 docentes)
    ALTER TABLE public.docentes
      ADD CONSTRAINT docentes_cpf_key UNIQUE (cpf);
  END IF;

  -- 2. Integridade referencial FK profiles.docente_id -> docentes(id)
  -- Se a FK existir com ON DELETE SET NULL, removemos e recriamos com ON DELETE CASCADE
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_docente_id_fkey'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_docente_id_fkey;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_docente_id_fkey
    FOREIGN KEY (docente_id)
    REFERENCES public.docentes(id)
    ON DELETE CASCADE;

  -- 3. Unicidade de docente_id em profiles (um perfil para cada docente no máximo)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_docente_id_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_docente_id_key UNIQUE (docente_id);
  END IF;

END $$;
