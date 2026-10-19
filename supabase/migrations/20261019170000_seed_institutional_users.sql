-- Migração para cadastrar os 3 usuários institucionais solicitados pelo cliente:
-- 1. Suporte Técnico (suporte@djektech.com.br / papel: suporte)
-- 2. Auxiliar DCEM (auxiliar@djektech.com.br / papel: auxiliar)
-- 3. Observador CAPES (observador@djektech.com.br / papel: capes)

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1. Suporte Técnico
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'suporte@djektech.com.br') THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'suporte@djektech.com.br',
      crypt('Suporte@Dev1', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "Suporte Técnico", "role": "suporte"}'::jsonb,
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;

  -- Garantir perfil correspondente com role 'suporte' e nome correto (sem docente_id)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'suporte@djektech.com.br';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, email, name, role, docente_id)
    VALUES (v_user_id, 'suporte@djektech.com.br', 'Suporte Técnico', 'suporte', NULL)
    ON CONFLICT (user_id) DO UPDATE
    SET
      role = 'suporte',
      name = 'Suporte Técnico',
      email = 'suporte@djektech.com.br',
      docente_id = NULL;
  END IF;

  -- 2. Auxiliar DCEM
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'auxiliar@djektech.com.br') THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'auxiliar@djektech.com.br',
      crypt('Aux@PPG-DCEM', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "Auxiliar DCEM", "role": "auxiliar"}'::jsonb,
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;

  -- Garantir perfil correspondente com role 'auxiliar' e nome correto (sem docente_id)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'auxiliar@djektech.com.br';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, email, name, role, docente_id)
    VALUES (v_user_id, 'auxiliar@djektech.com.br', 'Auxiliar DCEM', 'auxiliar', NULL)
    ON CONFLICT (user_id) DO UPDATE
    SET
      role = 'auxiliar',
      name = 'Auxiliar DCEM',
      email = 'auxiliar@djektech.com.br',
      docente_id = NULL;
  END IF;

  -- 3. Observador CAPES
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'observador@djektech.com.br') THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'observador@djektech.com.br',
      crypt('Obs@CAPES', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "Observador CAPES", "role": "capes"}'::jsonb,
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;

  -- Garantir perfil correspondente com role 'capes' e nome correto (sem docente_id)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'observador@djektech.com.br';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, email, name, role, docente_id)
    VALUES (v_user_id, 'observador@djektech.com.br', 'Observador CAPES', 'capes', NULL)
    ON CONFLICT (user_id) DO UPDATE
    SET
      role = 'capes',
      name = 'Observador CAPES',
      email = 'observador@djektech.com.br',
      docente_id = NULL;
  END IF;

END $$;
