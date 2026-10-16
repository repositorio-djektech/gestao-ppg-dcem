-- Migração: 20260421000001_etapa_a1_regras_acesso_fix.sql
-- Correção da Etapa A1 do plano de regras de acesso do sistema Gestão PPG-DCEM.
-- 1. Novos papéis válidos: suporte, coordenador, auxiliar, docente, capes (sem enum separado, coluna TEXT com CHECK).
-- 2. Migração segura dos usuários existentes (admin -> suporte, editor -> auxiliar, viewer -> capes; ppgdcem@djektech.com.br -> suporte).
-- 3. Inclusão da coluna docente_id em profiles (FK para docentes, nullable).
-- 4. Funções auxiliares de contexto get_user_role(), get_user_docente_id(), is_admin_staff() e handle_new_user().
-- 5. Função de segurança definer alterar_papel().
-- 6. RLS em todas as tabelas: SELECT liberado para autenticados; escrita restrita conforme os papéis.

-- 1. Remover constraints antigas de role em profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check1;

-- 2. Adicionar coluna docente_id em public.profiles se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'docente_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN docente_id bigint REFERENCES public.docentes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Atualizar papéis dos usuários existentes
UPDATE public.profiles
SET role = 'suporte'
WHERE email = 'ppgdcem@djektech.com.br';

UPDATE public.profiles
SET role = CASE 
  WHEN role = 'admin' THEN 'suporte'
  WHEN role = 'editor' THEN 'auxiliar'
  WHEN role = 'viewer' THEN 'capes'
  ELSE role
END
WHERE email IS NULL OR email <> 'ppgdcem@djektech.com.br';

UPDATE public.profiles
SET role = 'capes'
WHERE role NOT IN ('suporte', 'coordenador', 'auxiliar', 'docente', 'capes');

-- 4. Adicionar nova restrição CHECK em public.profiles
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('suporte', 'coordenador', 'auxiliar', 'docente', 'capes'));

-- 5. Funções auxiliares
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
    'capes'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_docente_id()
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT docente_id FROM public.profiles WHERE user_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() IN ('suporte', 'coordenador', 'auxiliar');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'capes'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

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
    IF novo_papel IN ('suporte', 'coordenador') THEN
      UPDATE public.profiles
      SET role = novo_papel
      WHERE user_id = alvo_user_id
      RETURNING * INTO v_updated_profile;
      RETURN v_updated_profile;
    ELSE
      RAISE EXCEPTION 'Suporte só pode promover outros usuários para suporte ou coordenador';
    END IF;

  ELSIF v_caller_role = 'coordenador' THEN
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

-- 6. Limpar todas as políticas RLS antigas do schema public de forma limpa e idempotente
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 7. Garantir RLS habilitado em todas as tabelas
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.table_name);
  END LOOP;
END $$;

-- 8. Políticas RLS:

-- PROFILES
CREATE POLICY "profiles_select_all_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own_or_staff"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin_staff()
  )
  WITH CHECK (
    user_id = auth.uid() OR public.is_admin_staff()
  );

-- LOGS
CREATE POLICY "logs_select_all"
  ON public.logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "logs_insert_authenticated"
  ON public.logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "logs_update_staff"
  ON public.logs FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "logs_delete_staff"
  ON public.logs FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- DOCENTES
CREATE POLICY "docentes_select_all"
  ON public.docentes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "docentes_insert_staff"
  ON public.docentes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "docentes_update_staff_or_owner"
  ON public.docentes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "docentes_delete_staff"
  ON public.docentes FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- ORIENTACOES
CREATE POLICY "orientacoes_select_all"
  ON public.orientacoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "orientacoes_insert"
  ON public.orientacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "orientacoes_update"
  ON public.orientacoes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "orientacoes_delete"
  ON public.orientacoes FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- DISCIPLINAS
CREATE POLICY "disciplinas_select_all"
  ON public.disciplinas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "disciplinas_insert"
  ON public.disciplinas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "disciplinas_update"
  ON public.disciplinas FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "disciplinas_delete"
  ON public.disciplinas FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- PUBLICACOES_DOCENTES
CREATE POLICY "publicacoes_docentes_select_all"
  ON public.publicacoes_docentes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "publicacoes_docentes_insert"
  ON public.publicacoes_docentes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "publicacoes_docentes_update"
  ON public.publicacoes_docentes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "publicacoes_docentes_delete"
  ON public.publicacoes_docentes FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- PROJETOS_PARTICIPANTES
CREATE POLICY "projetos_participantes_select_all"
  ON public.projetos_participantes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "projetos_participantes_insert"
  ON public.projetos_participantes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "projetos_participantes_update"
  ON public.projetos_participantes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "projetos_participantes_delete"
  ON public.projetos_participantes FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- PROJETOS_PESQUISA
CREATE POLICY "projetos_pesquisa_select_all"
  ON public.projetos_pesquisa FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "projetos_pesquisa_insert"
  ON public.projetos_pesquisa FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND coordenador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "projetos_pesquisa_update"
  ON public.projetos_pesquisa FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND (
      (coordenador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL) OR
      EXISTS (
        SELECT 1 FROM public.projetos_participantes pp
        WHERE pp.projeto_id = projetos_pesquisa.id AND pp.docente_id = public.get_user_docente_id()
      )
    ))
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND (
      (coordenador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL) OR
      EXISTS (
        SELECT 1 FROM public.projetos_participantes pp
        WHERE pp.projeto_id = projetos_pesquisa.id AND pp.docente_id = public.get_user_docente_id()
      )
    ))
  );

CREATE POLICY "projetos_pesquisa_delete"
  ON public.projetos_pesquisa FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND coordenador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- PUBLICACOES
CREATE POLICY "publicacoes_select_all"
  ON public.publicacoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "publicacoes_insert"
  ON public.publicacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "publicacoes_update"
  ON public.publicacoes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes.id AND pd.docente_id = public.get_user_docente_id()
    ))
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes.id AND pd.docente_id = public.get_user_docente_id()
    ))
  );

CREATE POLICY "publicacoes_delete"
  ON public.publicacoes FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes.id AND pd.docente_id = public.get_user_docente_id()
    ))
  );

-- PUBLICACOES_COAUTORES_PROGRAMA
CREATE POLICY "publicacoes_coautores_programa_select_all"
  ON public.publicacoes_coautores_programa FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "publicacoes_coautores_programa_insert"
  ON public.publicacoes_coautores_programa FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes_coautores_programa.publicacao_id AND pd.docente_id = public.get_user_docente_id()
    ))
  );

CREATE POLICY "publicacoes_coautores_programa_update"
  ON public.publicacoes_coautores_programa FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes_coautores_programa.publicacao_id AND pd.docente_id = public.get_user_docente_id()
    ))
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes_coautores_programa.publicacao_id AND pd.docente_id = public.get_user_docente_id()
    ))
  );

CREATE POLICY "publicacoes_coautores_programa_delete"
  ON public.publicacoes_coautores_programa FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes_coautores_programa.publicacao_id AND pd.docente_id = public.get_user_docente_id()
    ))
  );

-- DISCENTES
CREATE POLICY "discentes_select_all"
  ON public.discentes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "discentes_insert_staff"
  ON public.discentes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "discentes_update"
  ON public.discentes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "discentes_delete_staff"
  ON public.discentes FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- EGRESSOS
CREATE POLICY "egressos_select_all"
  ON public.egressos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "egressos_insert_staff"
  ON public.egressos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "egressos_update"
  ON public.egressos FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "egressos_delete_staff"
  ON public.egressos FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- INICIACAO_CIENTIFICA
CREATE POLICY "iniciacao_cientifica_select_all"
  ON public.iniciacao_cientifica FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "iniciacao_cientifica_insert"
  ON public.iniciacao_cientifica FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "iniciacao_cientifica_update"
  ON public.iniciacao_cientifica FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "iniciacao_cientifica_delete"
  ON public.iniciacao_cientifica FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- DOCENTES_LINHAS
CREATE POLICY "docentes_linhas_select_all"
  ON public.docentes_linhas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "docentes_linhas_insert"
  ON public.docentes_linhas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "docentes_linhas_update"
  ON public.docentes_linhas FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "docentes_linhas_delete"
  ON public.docentes_linhas FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role() = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- BANCAS (Institucional / Staff)
CREATE POLICY "bancas_select_all"
  ON public.bancas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "bancas_insert_staff"
  ON public.bancas FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "bancas_update_staff"
  ON public.bancas FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "bancas_delete_staff"
  ON public.bancas FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- EVENTOS (Institucional / Staff)
CREATE POLICY "eventos_select_all"
  ON public.eventos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "eventos_insert_staff"
  ON public.eventos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "eventos_update_staff"
  ON public.eventos FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "eventos_delete_staff"
  ON public.eventos FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- MOBILIDADE_DOCENTE (Institucional / Staff)
CREATE POLICY "mobilidade_docente_select_all"
  ON public.mobilidade_docente FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "mobilidade_docente_insert_staff"
  ON public.mobilidade_docente FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "mobilidade_docente_update_staff"
  ON public.mobilidade_docente FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "mobilidade_docente_delete_staff"
  ON public.mobilidade_docente FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- PATENTES (Institucional / Staff)
CREATE POLICY "patentes_select_all"
  ON public.patentes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "patentes_insert_staff"
  ON public.patentes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "patentes_update_staff"
  ON public.patentes FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "patentes_delete_staff"
  ON public.patentes FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- PRODUCAO_TECNICA (Institucional / Staff)
CREATE POLICY "producao_tecnica_select_all"
  ON public.producao_tecnica FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "producao_tecnica_insert_staff"
  ON public.producao_tecnica FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "producao_tecnica_update_staff"
  ON public.producao_tecnica FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "producao_tecnica_delete_staff"
  ON public.producao_tecnica FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- IMPACTO_SOCIAL (Institucional / Staff)
CREATE POLICY "impacto_social_select_all"
  ON public.impacto_social FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "impacto_social_insert_staff"
  ON public.impacto_social FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "impacto_social_update_staff"
  ON public.impacto_social FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "impacto_social_delete_staff"
  ON public.impacto_social FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- PREMIACOES (Institucional / Staff)
CREATE POLICY "premiacoes_select_all"
  ON public.premiacoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "premiacoes_insert_staff"
  ON public.premiacoes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "premiacoes_update_staff"
  ON public.premiacoes FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "premiacoes_delete_staff"
  ON public.premiacoes FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- LINHAS_PESQUISA (Institucional / Staff)
CREATE POLICY "linhas_pesquisa_select_all"
  ON public.linhas_pesquisa FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "linhas_pesquisa_insert_staff"
  ON public.linhas_pesquisa FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "linhas_pesquisa_update_staff"
  ON public.linhas_pesquisa FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "linhas_pesquisa_delete_staff"
  ON public.linhas_pesquisa FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- PPG (Institucional / Staff)
CREATE POLICY "ppg_select_all"
  ON public.ppg FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ppg_insert_staff"
  ON public.ppg FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "ppg_update_staff"
  ON public.ppg FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "ppg_delete_staff"
  ON public.ppg FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- SUGESTOES_VINCULOS_REJEITADAS (Staff)
CREATE POLICY "sugestoes_rejeitadas_select_all"
  ON public.sugestoes_vinculos_rejeitadas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sugestoes_rejeitadas_insert_staff"
  ON public.sugestoes_vinculos_rejeitadas FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "sugestoes_rejeitadas_update_staff"
  ON public.sugestoes_vinculos_rejeitadas FOR UPDATE
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "sugestoes_rejeitadas_delete_staff"
  ON public.sugestoes_vinculos_rejeitadas FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- SCOPUS_VAL_LOG (Permite leitura de autenticados e service role geral)
CREATE POLICY "scopus_val_log_select_all"
  ON public.scopus_val_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "scopus_val_log_staff_all"
  ON public.scopus_val_log FOR ALL
  TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());
