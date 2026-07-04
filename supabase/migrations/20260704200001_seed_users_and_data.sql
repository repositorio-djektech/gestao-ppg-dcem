DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ppgdcem@djektech.com.br') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000',
      'ppgdcem@djektech.com.br', crypt('ppg@dcem', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Administrador DCEM"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;
  INSERT INTO public.profiles (id, email, name, role)
  SELECT id, 'ppgdcem@djektech.com.br', 'Administrador DCEM', 'admin' FROM auth.users WHERE email = 'ppgdcem@djektech.com.br'
  ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'Administrador DCEM', email = 'ppgdcem@djektech.com.br';

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'editor@ppg.edu.br') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000',
      'editor@ppg.edu.br', crypt('ppg@dcem', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Editor"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;
  INSERT INTO public.profiles (id, email, name, role)
  SELECT id, 'editor@ppg.edu.br', 'Editor', 'editor' FROM auth.users WHERE email = 'editor@ppg.edu.br'
  ON CONFLICT (id) DO UPDATE SET role = 'editor', name = 'Editor', email = 'editor@ppg.edu.br';

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'viewer@ppg.edu.br') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000',
      'viewer@ppg.edu.br', crypt('ppg@dcem', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Visualizador"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;
  INSERT INTO public.profiles (id, email, name, role)
  SELECT id, 'viewer@ppg.edu.br', 'Visualizador', 'viewer' FROM auth.users WHERE email = 'viewer@ppg.edu.br'
  ON CONFLICT (id) DO UPDATE SET role = 'viewer', name = 'Visualizador', email = 'viewer@ppg.edu.br';

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'denisson.sillva@gmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000',
      'denisson.sillva@gmail.com', crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Denisson Silva"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;
  INSERT INTO public.profiles (id, email, name, role)
  SELECT id, 'denisson.sillva@gmail.com', 'Denisson Silva', 'admin' FROM auth.users WHERE email = 'denisson.sillva@gmail.com'
  ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'Denisson Silva', email = 'denisson.sillva@gmail.com';
END $$;

INSERT INTO public.ppg (id, nome, modalidade, nivel, uf) VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Engenharia de Sistemas e Processos', 'Acadêmico', 'Mestrado/Doutorado', 'SP')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.docentes (id, nome, scopus_id, indice_h, bolsa_cnpq, jdp, licenca) VALUES
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'Dr. Carlos Roberto', '123456789', 25, 'PQ 1A', false, ''),
  ('a1000000-0000-0000-0000-000000000002'::uuid, 'Dra. Aline Mendes', '987654321', 18, 'PQ 2', true, 'Saúde (2 meses)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.publicacoes (id, titulo, autores, periodico, ano, doi, justificativa) VALUES
  ('a2000000-0000-0000-0000-000000000001'::uuid, 'Otimização de Processos Químicos Industriais', 'Carlos Roberto, João Silva', 'Chemical Engineering Journal', 2025, '10.1016/j.cej.2025', 'Alto impacto na indústria de base.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.mobilidade_docente (id, tipo, nome, instituicao, periodo, link, modalidade) VALUES
  ('a3000000-0000-0000-0000-000000000001'::uuid, 'docente', 'Dra. Aline Mendes', 'MIT - USA', '01/2025 a 06/2025', 'https://exemplo.com/doc', 'internacional')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.eventos (id, docente, evento, local_data, papel) VALUES
  ('a4000000-0000-0000-0000-000000000001'::uuid, 'Dr. Carlos Roberto', 'Congresso Brasileiro de Engenharia', 'São Paulo - Out/2025', 'Coordenador de Comissão Científica')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patentes (id, titulo, status, autores, inpi) VALUES
  ('a5000000-0000-0000-0000-000000000001'::uuid, 'Sistema de Controle Reativo de Polímeros', 'Concessão', 'Carlos Roberto, Marcos Souza', 'BR 10 2025 123456 7')
ON CONFLICT (id) DO NOTHING;
