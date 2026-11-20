-- H-32 (P-35): cargo "coordenador adjunto".
--
-- A coordenação tem coordenador e coordenador adjunto, com as MESMAS permissões. Por isso o adjunto
-- continua com o papel (role) `coordenador`; o que o distingue é um CARGO, só rótulo, que aparece na
-- tela de Usuários e no menu. Nenhuma política de acesso (RLS) muda.
--
--   * profiles.cargo: NULL ou 'coordenador_adjunto'; só vale para quem tem o papel coordenador
--     (se o papel muda, o cargo é limpo);
--   * só a função definir_cargo() altera o cargo, e só suporte e coordenador podem chamá-la; ninguém
--     edita o próprio cargo por UPDATE direto.
--
-- Reversão: DROP FUNCTION public.definir_cargo(uuid, text); DROP TRIGGER trg_profiles_cargo ON
-- public.profiles; DROP FUNCTION public.trg_profiles_cargo(); ALTER TABLE public.profiles DROP COLUMN cargo;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_cargo_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_cargo_check CHECK (cargo IS NULL OR cargo IN ('coordenador_adjunto'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_profiles_cargo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- O cargo só existe para o papel coordenador
  IF NEW.role::text IS DISTINCT FROM 'coordenador' THEN
    NEW.cargo := NULL;
    RETURN NEW;
  END IF;

  -- Só a função definir_cargo() (que liga a marca abaixo) altera o cargo
  IF NEW.cargo IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.cargo ELSE NULL END)
     AND coalesce(current_setting('ppg.definindo_cargo', true), '') <> 'on' THEN
    RAISE EXCEPTION 'O cargo só pode ser alterado por quem coordena o programa.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_cargo ON public.profiles;
CREATE TRIGGER trg_profiles_cargo
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_profiles_cargo();

CREATE OR REPLACE FUNCTION public.definir_cargo(p_alvo uuid, p_cargo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_papel_alvo text;
BEGIN
  IF public.get_user_role() NOT IN ('suporte', 'coordenador') THEN
    RAISE EXCEPTION 'Sem permissão para definir o cargo.' USING ERRCODE = '42501';
  END IF;
  IF p_cargo IS NOT NULL AND p_cargo NOT IN ('coordenador_adjunto') THEN
    RAISE EXCEPTION 'Cargo inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT role::text INTO v_papel_alvo FROM public.profiles WHERE user_id = p_alvo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário inexistente.' USING ERRCODE = 'P0002';
  END IF;
  IF p_cargo IS NOT NULL AND v_papel_alvo <> 'coordenador' THEN
    RAISE EXCEPTION 'O cargo de coordenador adjunto vale só para quem tem o papel coordenador.' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('ppg.definindo_cargo', 'on', true);
  UPDATE public.profiles SET cargo = p_cargo WHERE user_id = p_alvo;
  PERFORM set_config('ppg.definindo_cargo', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.definir_cargo(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.definir_cargo(uuid, text) TO authenticated;
