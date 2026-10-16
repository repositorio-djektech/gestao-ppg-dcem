-- Migração: etapa_a2_regras_acesso_alterar_papel
-- Ajusta a função alterar_papel para refletir a cadeia completa:
-- 1. Suporte pode atribuir qualquer um dos 5 papéis oficiais: suporte, coordenador, auxiliar, docente, capes
--    (permitindo tanto promover quanto rebaixar qualquer usuário).
-- 2. Coordenador só pode transformar docente em auxiliar.
-- 3. Ninguém pode alterar o próprio papel.
-- 4. Demais papéis (auxiliar, docente, capes) são estritamente proibidos de alterar papéis.

CREATE OR REPLACE FUNCTION public.alterar_papel(alvo_user_id uuid, novo_papel text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid uuid;
  v_caller_role text;
  v_target_profile public.profiles%ROWTYPE;
  v_updated_profile public.profiles%ROWTYPE;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF v_caller_uid = alvo_user_id THEN
    RAISE EXCEPTION 'Não é permitido alterar o próprio papel';
  END IF;

  IF novo_papel NOT IN ('suporte', 'coordenador', 'auxiliar', 'docente', 'capes') THEN
    RAISE EXCEPTION 'Papel inválido: %', novo_papel;
  END IF;

  SELECT * INTO v_target_profile FROM public.profiles WHERE user_id = alvo_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuário não encontrado para user_id: %', alvo_user_id;
  END IF;

  v_caller_role := public.get_user_role();

  IF v_caller_role = 'suporte' THEN
    -- Suporte tem controle total sobre os 5 papéis
    UPDATE public.profiles
    SET role = novo_papel
    WHERE user_id = alvo_user_id
    RETURNING * INTO v_updated_profile;
    RETURN v_updated_profile;

  ELSIF v_caller_role = 'coordenador' THEN
    -- Coordenador só pode promover docente para auxiliar
    IF v_target_profile.role = 'docente' AND novo_papel = 'auxiliar' THEN
      UPDATE public.profiles
      SET role = novo_papel
      WHERE user_id = alvo_user_id
      RETURNING * INTO v_updated_profile;
      RETURN v_updated_profile;
    ELSE
      RAISE EXCEPTION 'Coordenador só possui permissão para transformar usuários docente em auxiliar';
    END IF;

  ELSE
    RAISE EXCEPTION 'Permissão negada: seu papel (%) não pode alterar papéis de usuários', v_caller_role;
  END IF;
END;
$$;
