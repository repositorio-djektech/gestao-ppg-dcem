-- Migração para aprimorar handle_new_user() para preservar role e docente_id
-- quando fornecidos via raw_user_meta_data (ex.: autocadastro de docentes).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_docente_id bigint;
BEGIN
  -- Extrair role do metadata se for válido ('suporte', 'coordenador', 'auxiliar', 'docente', 'capes')
  v_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', ''));
  IF v_role NOT IN ('suporte', 'coordenador', 'auxiliar', 'docente', 'capes') THEN
    v_role := 'capes';
  END IF;

  -- Extrair docente_id caso presente no metadata
  IF (NEW.raw_user_meta_data->>'docente_id') IS NOT NULL AND (NEW.raw_user_meta_data->>'docente_id') ~ '^\d+$' THEN
    v_docente_id := (NEW.raw_user_meta_data->>'docente_id')::bigint;
  ELSE
    v_docente_id := NULL;
  END IF;

  INSERT INTO public.profiles (user_id, email, name, role, docente_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    v_role,
    v_docente_id
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE public.profiles.name END,
    role = CASE WHEN EXCLUDED.role <> 'capes' THEN EXCLUDED.role ELSE public.profiles.role END,
    docente_id = COALESCE(EXCLUDED.docente_id, public.profiles.docente_id);

  RETURN NEW;
END;
$$;
