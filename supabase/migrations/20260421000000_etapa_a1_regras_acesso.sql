-- ==============================================================================
-- Etapa A1: Novo Modelo de Regras de Acesso e Papéis - Gestão PPG-DCEM
-- ==============================================================================

-- 1. PRIMEIRO: Dropar todas as políticas existentes no schema public que referenciam get_user_role()
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

-- 2. Drop da função get_user_role antiga
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;

-- 3. Criação do novo enum de papéis (5 papéis)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM (
      'suporte',
      'coordenador',
      'auxiliar',
      'docente',
      'capes'
    );
  END IF;
END $$;

-- 4. Adicionar coluna docente_id em profiles (FK opcional/única para docentes)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS docente_id bigint UNIQUE REFERENCES public.docentes(id) ON DELETE SET NULL;

-- 5. Alterar a coluna role de profiles para user_role com conversão dos valores existentes
ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.profiles
  ALTER COLUMN role TYPE public.user_role USING (
    CASE
      WHEN email IN ('ppgdcem@djektech.com.br', 'denisson.sillva@gmail.com') THEN 'suporte'::public.user_role
      WHEN role::text = 'admin' THEN 'suporte'::public.user_role
      WHEN role::text = 'editor' THEN 'auxiliar'::public.user_role
      WHEN role::text = 'viewer' THEN 'capes'::public.user_role
      ELSE 'capes'::public.user_role
    END
  );

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'capes'::public.user_role;

-- 6. Remover tipo enum antigo se existir
DROP TYPE IF EXISTS public.role_type CASCADE;

-- 7. Recriar função get_user_role() com o novo tipo user_role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
    'capes'::public.user_role
  );
END;
$$;

-- 8. Função auxiliar get_user_docente_id() para RLS do perfil docente
CREATE OR REPLACE FUNCTION public.get_user_docente_id()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT docente_id FROM public.profiles WHERE user_id = auth.uid());
END;
$$;

-- 9. Atualizar trigger handle_new_user() para o novo default ('capes' - mais restritivo)
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
    'capes'::public.user_role
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 10. Função da Cadeia de Promoção: alterar_papel(alvo_user_id uuid, novo_papel public.user_role)
-- Regras rígidas:
-- - suporte pode definir papel de qualquer usuário para suporte, coordenador, auxiliar, docente ou capes;
-- - coordenador pode transformar apenas docente -> auxiliar (nada mais; NUNCA pode criar/definir suporte);
-- - auxiliar, docente e capes não podem alterar papel de ninguém;
-- - ninguém altera o próprio papel;
-- - valida auth.uid() e lança exceções claras.
CREATE OR REPLACE FUNCTION public.alterar_papel(alvo_user_id uuid, novo_papel public.user_role)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid uuid;
  v_caller_role public.user_role;
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

  SELECT * INTO v_target_profile FROM public.profiles WHERE user_id = alvo_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuário não encontrado para user_id: %', alvo_user_id;
  END IF;

  v_caller_role := public.get_user_role();

  IF v_caller_role::text = 'suporte' THEN
    -- Suporte pode atribuir qualquer papel
    UPDATE public.profiles
    SET role = novo_papel
    WHERE user_id = alvo_user_id
    RETURNING * INTO v_updated_profile;

    RETURN v_updated_profile;

  ELSIF v_caller_role::text = 'coordenador' THEN
    -- Coordenador pode apenas transformar docente -> auxiliar
    IF v_target_profile.role::text = 'docente' AND novo_papel::text = 'auxiliar' THEN
      UPDATE public.profiles
      SET role = novo_papel
      WHERE user_id = alvo_user_id
      RETURNING * INTO v_updated_profile;

      RETURN v_updated_profile;
    ELSE
      RAISE EXCEPTION 'Coordenador só possui permissão para promover docentes para auxiliar';
    END IF;

  ELSE
    RAISE EXCEPTION 'Permissão negada: seu papel (%) não pode alterar papéis de usuários', v_caller_role::text;
  END IF;
END;
$$;

-- 11. Garantir que RLS esteja ativada em todas as tabelas
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

-- Helper macro-like function para staff:
CREATE OR REPLACE FUNCTION public.is_admin_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role()::text IN ('suporte', 'coordenador', 'auxiliar');
$$;

-- ==============================================================================
-- TABELA: profiles
-- Leitura: todos os autenticados
-- Atualização: o próprio usuário pode atualizar apenas seus próprios dados cadastrais
-- ==============================================================================
CREATE POLICY "profiles_select_all_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin_staff()
  )
  WITH CHECK (
    user_id = auth.uid() OR public.is_admin_staff()
  );

-- ==============================================================================
-- TABELA: logs
-- Leitura: todos os autenticados
-- Inserção: qualquer autenticado pode registrar logs da sua ação
-- Edição/Remoção: apenas suporte/coordenador/auxiliar
-- ==============================================================================
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

-- ==============================================================================
-- TABELA: docentes
-- Escrita:
--   - Staff (suporte, coordenador, auxiliar)
--   - Docente: UPDATE limitado ao seu próprio registro (id = get_user_docente_id())
-- ==============================================================================
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
    (public.get_user_role()::text = 'docente' AND id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "docentes_delete_staff"
  ON public.docentes FOR DELETE
  TO authenticated
  USING (public.is_admin_staff());

-- ==============================================================================
-- TABELA: orientacoes
-- Ligação com docente: orientacoes.docente_id
-- ==============================================================================
CREATE POLICY "orientacoes_select_all"
  ON public.orientacoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "orientacoes_insert"
  ON public.orientacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "orientacoes_update"
  ON public.orientacoes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "orientacoes_delete"
  ON public.orientacoes FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- ==============================================================================
-- TABELA: disciplinas
-- Ligação com docente: disciplinas.docente_id
-- ==============================================================================
CREATE POLICY "disciplinas_select_all"
  ON public.disciplinas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "disciplinas_insert"
  ON public.disciplinas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "disciplinas_update"
  ON public.disciplinas FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "disciplinas_delete"
  ON public.disciplinas FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- ==============================================================================
-- TABELA: publicacoes_docentes
-- Ligação com docente: publicacoes_docentes.docente_id
-- ==============================================================================
CREATE POLICY "publicacoes_docentes_select_all"
  ON public.publicacoes_docentes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "publicacoes_docentes_insert"
  ON public.publicacoes_docentes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "publicacoes_docentes_update"
  ON public.publicacoes_docentes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "publicacoes_docentes_delete"
  ON public.publicacoes_docentes FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- ==============================================================================
-- TABELA: projetos_participantes
-- Ligação com docente: projetos_participantes.docente_id
-- ==============================================================================
CREATE POLICY "projetos_participantes_select_all"
  ON public.projetos_participantes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "projetos_participantes_insert"
  ON public.projetos_participantes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "projetos_participantes_update"
  ON public.projetos_participantes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "projetos_participantes_delete"
  ON public.projetos_participantes FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- ==============================================================================
-- TABELA: projetos_pesquisa
-- Ligação com docente: coordenador_id ou via projetos_participantes
-- ==============================================================================
CREATE POLICY "projetos_pesquisa_select_all"
  ON public.projetos_pesquisa FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "projetos_pesquisa_insert"
  ON public.projetos_pesquisa FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND coordenador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "projetos_pesquisa_update"
  ON public.projetos_pesquisa FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND (
      (coordenador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL) OR
      EXISTS (
        SELECT 1 FROM public.projetos_participantes pp
        WHERE pp.projeto_id = projetos_pesquisa.id AND pp.docente_id = public.get_user_docente_id()
      )
    ))
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND (
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
    (public.get_user_role()::text = 'docente' AND coordenador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- ==============================================================================
-- TABELA: publicacoes
-- Ligação com docente: publicacoes_docentes
-- ==============================================================================
CREATE POLICY "publicacoes_select_all"
  ON public.publicacoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "publicacoes_insert"
  ON public.publicacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "publicacoes_update"
  ON public.publicacoes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes.id AND pd.docente_id = public.get_user_docente_id()
    ))
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes.id AND pd.docente_id = public.get_user_docente_id()
    ))
  );

CREATE POLICY "publicacoes_delete"
  ON public.publicacoes FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes.id AND pd.docente_id = public.get_user_docente_id()
    ))
  );

-- ==============================================================================
-- TABELA: publicacoes_coautores_programa
-- ==============================================================================
CREATE POLICY "publicacoes_coautores_programa_select_all"
  ON public.publicacoes_coautores_programa FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "publicacoes_coautores_programa_insert"
  ON public.publicacoes_coautores_programa FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes_coautores_programa.publicacao_id AND pd.docente_id = public.get_user_docente_id()
    ))
  );

CREATE POLICY "publicacoes_coautores_programa_update"
  ON public.publicacoes_coautores_programa FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes_coautores_programa.publicacao_id AND pd.docente_id = public.get_user_docente_id()
    ))
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes_coautores_programa.publicacao_id AND pd.docente_id = public.get_user_docente_id()
    ))
  );

CREATE POLICY "publicacoes_coautores_programa_delete"
  ON public.publicacoes_coautores_programa FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND EXISTS (
      SELECT 1 FROM public.publicacoes_docentes pd
      WHERE pd.publicacao_id = publicacoes_coautores_programa.publicacao_id AND pd.docente_id = public.get_user_docente_id()
    ))
  );

-- ==============================================================================
-- TABELA: iniciacao_cientifica
-- ==============================================================================
CREATE POLICY "iniciacao_cientifica_select_all"
  ON public.iniciacao_cientifica FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "iniciacao_cientifica_insert"
  ON public.iniciacao_cientifica FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "iniciacao_cientifica_update"
  ON public.iniciacao_cientifica FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "iniciacao_cientifica_delete"
  ON public.iniciacao_cientifica FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- ==============================================================================
-- TABELA: discentes
-- ==============================================================================
CREATE POLICY "discentes_select_all"
  ON public.discentes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "discentes_insert"
  ON public.discentes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "discentes_update"
  ON public.discentes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND (
      (docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL) OR
      EXISTS (
        SELECT 1 FROM public.orientacoes o
        WHERE o.discente_id = discentes.id AND o.docente_id = public.get_user_docente_id()
      )
    ))
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND (
      (docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL) OR
      EXISTS (
        SELECT 1 FROM public.orientacoes o
        WHERE o.discente_id = discentes.id AND o.docente_id = public.get_user_docente_id()
      )
    ))
  );

CREATE POLICY "discentes_delete"
  ON public.discentes FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_orientador_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- ==============================================================================
-- TABELA: docentes_linhas
-- ==============================================================================
CREATE POLICY "docentes_linhas_select_all"
  ON public.docentes_linhas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "docentes_linhas_insert"
  ON public.docentes_linhas FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "docentes_linhas_update"
  ON public.docentes_linhas FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

CREATE POLICY "docentes_linhas_delete"
  ON public.docentes_linhas FOR DELETE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (public.get_user_role()::text = 'docente' AND docente_id = public.get_user_docente_id() AND public.get_user_docente_id() IS NOT NULL)
  );

-- ==============================================================================
-- TABELAS RESTANTES:
-- bancas, egressos, eventos, impacto_social, linhas_pesquisa, mobilidade_docente,
-- patentes, ppg, premiacoes, producao_tecnica, scopus_val_log, sugestoes_vinculos_rejeitadas
-- ==============================================================================

-- bancas
CREATE POLICY "bancas_select_all" ON public.bancas FOR SELECT TO authenticated USING (true);
CREATE POLICY "bancas_write_staff" ON public.bancas FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

-- egressos
CREATE POLICY "egressos_select_all" ON public.egressos FOR SELECT TO authenticated USING (true);
CREATE POLICY "egressos_write_staff" ON public.egressos FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

-- eventos
CREATE POLICY "eventos_select_all" ON public.eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "eventos_write_staff" ON public.eventos FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

-- impacto_social
CREATE POLICY "impacto_social_select_all" ON public.impacto_social FOR SELECT TO authenticated USING (true);
CREATE POLICY "impacto_social_write_staff" ON public.impacto_social FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

-- linhas_pesquisa
CREATE POLICY "linhas_pesquisa_select_all" ON public.linhas_pesquisa FOR SELECT TO authenticated USING (true);
CREATE POLICY "linhas_pesquisa_write_staff" ON public.linhas_pesquisa FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

-- mobilidade_docente
CREATE POLICY "mobilidade_docente_select_all" ON public.mobilidade_docente FOR SELECT TO authenticated USING (true);
CREATE POLICY "mobilidade_docente_write_staff" ON public.mobilidade_docente FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

-- patentes
CREATE POLICY "patentes_select_all" ON public.patentes FOR SELECT TO authenticated USING (true);
CREATE POLICY "patentes_write_staff" ON public.patentes FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

-- ppg
CREATE POLICY "ppg_select_all" ON public.ppg FOR SELECT TO authenticated USING (true);
CREATE POLICY "ppg_write_staff" ON public.ppg FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

-- premiacoes
CREATE POLICY "premiacoes_select_all" ON public.premiacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "premiacoes_write_staff" ON public.premiacoes FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

-- producao_tecnica
CREATE POLICY "producao_tecnica_select_all" ON public.producao_tecnica FOR SELECT TO authenticated USING (true);
CREATE POLICY "producao_tecnica_write_staff" ON public.producao_tecnica FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

-- scopus_val_log
CREATE POLICY "scopus_val_log_select_all" ON public.scopus_val_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "scopus_val_log_write_staff" ON public.scopus_val_log FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

-- sugestoes_vinculos_rejeitadas
CREATE POLICY "sugestoes_vinculos_rejeitadas_select_all" ON public.sugestoes_vinculos_rejeitadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "sugestoes_vinculos_rejeitadas_write_staff" ON public.sugestoes_vinculos_rejeitadas FOR ALL TO authenticated USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());
