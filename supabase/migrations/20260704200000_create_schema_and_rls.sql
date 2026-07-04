CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ppg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  modalidade TEXT NOT NULL DEFAULT 'Acadêmico',
  nivel TEXT NOT NULL DEFAULT 'Mestrado/Doutorado',
  uf TEXT NOT NULL DEFAULT 'SP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.docentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  scopus_id TEXT NOT NULL DEFAULT '',
  indice_h INTEGER NOT NULL DEFAULT 0,
  bolsa_cnpq TEXT NOT NULL DEFAULT '',
  jdp BOOLEAN NOT NULL DEFAULT FALSE,
  licenca TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.publicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  autores TEXT NOT NULL,
  periodico TEXT NOT NULL,
  ano INTEGER NOT NULL,
  doi TEXT NOT NULL DEFAULT '',
  justificativa TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mobilidade_docente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'docente' CHECK (tipo IN ('docente', 'discente', 'visitante')),
  nome TEXT NOT NULL,
  instituicao TEXT NOT NULL,
  periodo TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '',
  modalidade TEXT NOT NULL DEFAULT 'nacional' CHECK (modalidade IN ('nacional', 'internacional')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  docente TEXT NOT NULL,
  evento TEXT NOT NULL,
  local_data TEXT NOT NULL,
  papel TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Concessão', 'Licenciamento', 'Pendente')),
  autores TEXT NOT NULL,
  inpi TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docentes_nome ON public.docentes (nome);
CREATE INDEX IF NOT EXISTS idx_publicacoes_ano ON public.publicacoes (ano);
CREATE INDEX IF NOT EXISTS idx_mobilidade_tipo ON public.mobilidade_docente (tipo);

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'viewer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''), 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppg ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobilidade_docente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin') WITH CHECK (public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "ppg_select" ON public.ppg;
CREATE POLICY "ppg_select" ON public.ppg FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ppg_insert" ON public.ppg;
CREATE POLICY "ppg_insert" ON public.ppg FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "ppg_update" ON public.ppg;
CREATE POLICY "ppg_update" ON public.ppg FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "ppg_delete" ON public.ppg;
CREATE POLICY "ppg_delete" ON public.ppg FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "docentes_select" ON public.docentes;
CREATE POLICY "docentes_select" ON public.docentes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "docentes_insert" ON public.docentes;
CREATE POLICY "docentes_insert" ON public.docentes FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "docentes_update" ON public.docentes;
CREATE POLICY "docentes_update" ON public.docentes FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "docentes_delete" ON public.docentes;
CREATE POLICY "docentes_delete" ON public.docentes FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "publicacoes_select" ON public.publicacoes;
CREATE POLICY "publicacoes_select" ON public.publicacoes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "publicacoes_insert" ON public.publicacoes;
CREATE POLICY "publicacoes_insert" ON public.publicacoes FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "publicacoes_update" ON public.publicacoes;
CREATE POLICY "publicacoes_update" ON public.publicacoes FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "publicacoes_delete" ON public.publicacoes;
CREATE POLICY "publicacoes_delete" ON public.publicacoes FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "mobilidade_select" ON public.mobilidade_docente;
CREATE POLICY "mobilidade_select" ON public.mobilidade_docente FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "mobilidade_insert" ON public.mobilidade_docente;
CREATE POLICY "mobilidade_insert" ON public.mobilidade_docente FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "mobilidade_update" ON public.mobilidade_docente;
CREATE POLICY "mobilidade_update" ON public.mobilidade_docente FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "mobilidade_delete" ON public.mobilidade_docente;
CREATE POLICY "mobilidade_delete" ON public.mobilidade_docente FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "eventos_select" ON public.eventos;
CREATE POLICY "eventos_select" ON public.eventos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "eventos_insert" ON public.eventos;
CREATE POLICY "eventos_insert" ON public.eventos FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "eventos_update" ON public.eventos;
CREATE POLICY "eventos_update" ON public.eventos FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "eventos_delete" ON public.eventos;
CREATE POLICY "eventos_delete" ON public.eventos FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "patentes_select" ON public.patentes;
CREATE POLICY "patentes_select" ON public.patentes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "patentes_insert" ON public.patentes;
CREATE POLICY "patentes_insert" ON public.patentes FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "patentes_update" ON public.patentes;
CREATE POLICY "patentes_update" ON public.patentes FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "patentes_delete" ON public.patentes;
CREATE POLICY "patentes_delete" ON public.patentes FOR DELETE TO authenticated USING (public.get_user_role() = 'admin');
