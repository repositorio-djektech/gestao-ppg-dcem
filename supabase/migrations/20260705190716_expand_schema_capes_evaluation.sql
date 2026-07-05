-- =============================================================
-- 1. Add link_comprovacao and observacoes to existing tables
-- =============================================================
ALTER TABLE public.publicacoes ADD COLUMN IF NOT EXISTS link_comprovacao TEXT NOT NULL DEFAULT '';
ALTER TABLE public.publicacoes ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '';

ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS link_comprovacao TEXT NOT NULL DEFAULT '';
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '';

ALTER TABLE public.mobilidade_docente ADD COLUMN IF NOT EXISTS link_comprovacao TEXT NOT NULL DEFAULT '';
ALTER TABLE public.mobilidade_docente ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '';

ALTER TABLE public.patentes ADD COLUMN IF NOT EXISTS link_comprovacao TEXT NOT NULL DEFAULT '';
ALTER TABLE public.patentes ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '';

-- =============================================================
-- 2. Create new tables for CAPES quadrennial evaluation
-- =============================================================
CREATE TABLE IF NOT EXISTS public.discentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL DEFAULT '',
  data_ingresso TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'titulado', 'desligado')),
  link_lattes TEXT NOT NULL DEFAULT '',
  link_comprovacao TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.egressos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ano_titulacao INTEGER,
  atuacao_profissional TEXT NOT NULL DEFAULT '',
  link_lattes TEXT NOT NULL DEFAULT '',
  link_comprovacao TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_trabalho TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '',
  discente_id UUID REFERENCES public.discentes(id) ON DELETE SET NULL,
  membros TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Mestrado' CHECK (tipo IN ('Mestrado', 'Doutorado', 'Qualificação')),
  link_comprovacao TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orientacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  docente_id UUID REFERENCES public.docentes(id) ON DELETE SET NULL,
  discente_id UUID REFERENCES public.discentes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT '',
  inicio TEXT NOT NULL DEFAULT '',
  fim TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado')),
  link_comprovacao TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projetos_pesquisa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  inicio TEXT NOT NULL DEFAULT '',
  fim TEXT NOT NULL DEFAULT '',
  coordenador_id UUID REFERENCES public.docentes(id) ON DELETE SET NULL,
  financiamento BOOLEAN NOT NULL DEFAULT FALSE,
  orgao_fomento TEXT NOT NULL DEFAULT '',
  link_comprovacao TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.disciplinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL DEFAULT '',
  creditos INTEGER NOT NULL DEFAULT 0,
  ano_semestre TEXT NOT NULL DEFAULT '',
  link_comprovacao TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.producao_tecnica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  ano INTEGER,
  autores TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Software' CHECK (tipo IN ('Software', 'Patente', 'Relatório')),
  link_comprovacao TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.impacto_social (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  ano INTEGER,
  link_comprovacao TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.premiacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  ano INTEGER,
  nome_premiado TEXT NOT NULL DEFAULT '',
  instituicao TEXT NOT NULL DEFAULT '',
  link_comprovacao TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 3. Indexes for new tables
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_discentes_nome ON public.discentes (nome);
CREATE INDEX IF NOT EXISTS idx_discentes_status ON public.discentes (status);
CREATE INDEX IF NOT EXISTS idx_egressos_ano ON public.egressos (ano_titulacao);
CREATE INDEX IF NOT EXISTS idx_bancas_tipo ON public.bancas (tipo);
CREATE INDEX IF NOT EXISTS idx_orientacoes_status ON public.orientacoes (status);
CREATE INDEX IF NOT EXISTS idx_projetos_coordenador ON public.projetos_pesquisa (coordenador_id);
CREATE INDEX IF NOT EXISTS idx_disciplinas_codigo ON public.disciplinas (codigo);
CREATE INDEX IF NOT EXISTS idx_producao_tecnica_ano ON public.producao_tecnica (ano);
CREATE INDEX IF NOT EXISTS idx_impacto_social_ano ON public.impacto_social (ano);
CREATE INDEX IF NOT EXISTS idx_premiacoes_ano ON public.premiacoes (ano);

-- =============================================================
-- 4. Enable RLS on all new tables
-- =============================================================
ALTER TABLE public.discentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egressos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orientacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos_pesquisa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producao_tecnica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impacto_social ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- 5. RLS Policies for new tables
--    admin/editor: SELECT, INSERT, UPDATE, DELETE
--    viewer: SELECT only (handled by granting SELECT to all authenticated)
-- =============================================================

-- Helper: all authenticated users can SELECT
DROP POLICY IF EXISTS "discentes_select" ON public.discentes;
CREATE POLICY "discentes_select" ON public.discentes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "discentes_insert" ON public.discentes;
CREATE POLICY "discentes_insert" ON public.discentes FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "discentes_update" ON public.discentes;
CREATE POLICY "discentes_update" ON public.discentes FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "discentes_delete" ON public.discentes;
CREATE POLICY "discentes_delete" ON public.discentes FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "egressos_select" ON public.egressos;
CREATE POLICY "egressos_select" ON public.egressos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "egressos_insert" ON public.egressos;
CREATE POLICY "egressos_insert" ON public.egressos FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "egressos_update" ON public.egressos;
CREATE POLICY "egressos_update" ON public.egressos FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "egressos_delete" ON public.egressos;
CREATE POLICY "egressos_delete" ON public.egressos FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "bancas_select" ON public.bancas;
CREATE POLICY "bancas_select" ON public.bancas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "bancas_insert" ON public.bancas;
CREATE POLICY "bancas_insert" ON public.bancas FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "bancas_update" ON public.bancas;
CREATE POLICY "bancas_update" ON public.bancas FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "bancas_delete" ON public.bancas;
CREATE POLICY "bancas_delete" ON public.bancas FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "orientacoes_select" ON public.orientacoes;
CREATE POLICY "orientacoes_select" ON public.orientacoes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "orientacoes_insert" ON public.orientacoes;
CREATE POLICY "orientacoes_insert" ON public.orientacoes FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "orientacoes_update" ON public.orientacoes;
CREATE POLICY "orientacoes_update" ON public.orientacoes FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "orientacoes_delete" ON public.orientacoes;
CREATE POLICY "orientacoes_delete" ON public.orientacoes FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "projetos_pesquisa_select" ON public.projetos_pesquisa;
CREATE POLICY "projetos_pesquisa_select" ON public.projetos_pesquisa FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "projetos_pesquisa_insert" ON public.projetos_pesquisa;
CREATE POLICY "projetos_pesquisa_insert" ON public.projetos_pesquisa FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "projetos_pesquisa_update" ON public.projetos_pesquisa;
CREATE POLICY "projetos_pesquisa_update" ON public.projetos_pesquisa FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "projetos_pesquisa_delete" ON public.projetos_pesquisa;
CREATE POLICY "projetos_pesquisa_delete" ON public.projetos_pesquisa FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "disciplinas_select" ON public.disciplinas;
CREATE POLICY "disciplinas_select" ON public.disciplinas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "disciplinas_insert" ON public.disciplinas;
CREATE POLICY "disciplinas_insert" ON public.disciplinas FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "disciplinas_update" ON public.disciplinas;
CREATE POLICY "disciplinas_update" ON public.disciplinas FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "disciplinas_delete" ON public.disciplinas;
CREATE POLICY "disciplinas_delete" ON public.disciplinas FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "producao_tecnica_select" ON public.producao_tecnica;
CREATE POLICY "producao_tecnica_select" ON public.producao_tecnica FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "producao_tecnica_insert" ON public.producao_tecnica;
CREATE POLICY "producao_tecnica_insert" ON public.producao_tecnica FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "producao_tecnica_update" ON public.producao_tecnica;
CREATE POLICY "producao_tecnica_update" ON public.producao_tecnica FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "producao_tecnica_delete" ON public.producao_tecnica;
CREATE POLICY "producao_tecnica_delete" ON public.producao_tecnica FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "impacto_social_select" ON public.impacto_social;
CREATE POLICY "impacto_social_select" ON public.impacto_social FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "impacto_social_insert" ON public.impacto_social;
CREATE POLICY "impacto_social_insert" ON public.impacto_social FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "impacto_social_update" ON public.impacto_social;
CREATE POLICY "impacto_social_update" ON public.impacto_social FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "impacto_social_delete" ON public.impacto_social;
CREATE POLICY "impacto_social_delete" ON public.impacto_social FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "premiacoes_select" ON public.premiacoes;
CREATE POLICY "premiacoes_select" ON public.premiacoes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "premiacoes_insert" ON public.premiacoes;
CREATE POLICY "premiacoes_insert" ON public.premiacoes FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "premiacoes_update" ON public.premiacoes;
CREATE POLICY "premiacoes_update" ON public.premiacoes FOR UPDATE TO authenticated USING (public.get_user_role() IN ('admin', 'editor')) WITH CHECK (public.get_user_role() IN ('admin', 'editor'));
DROP POLICY IF EXISTS "premiacoes_delete" ON public.premiacoes;
CREATE POLICY "premiacoes_delete" ON public.premiacoes FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

-- =============================================================
-- 6. Update DELETE policies on existing tables so editors can also delete
-- =============================================================
DROP POLICY IF EXISTS "ppg_delete" ON public.ppg;
CREATE POLICY "ppg_delete" ON public.ppg FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "docentes_delete" ON public.docentes;
CREATE POLICY "docentes_delete" ON public.docentes FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "publicacoes_delete" ON public.publicacoes;
CREATE POLICY "publicacoes_delete" ON public.publicacoes FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "mobilidade_delete" ON public.mobilidade_docente;
CREATE POLICY "mobilidade_delete" ON public.mobilidade_docente FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "eventos_delete" ON public.eventos;
CREATE POLICY "eventos_delete" ON public.eventos FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "patentes_delete" ON public.patentes;
CREATE POLICY "patentes_delete" ON public.patentes FOR DELETE TO authenticated USING (public.get_user_role() IN ('admin', 'editor'));
