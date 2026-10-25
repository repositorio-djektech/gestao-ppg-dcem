-- Migração: Bancas (orientador + projeto), Projetos Pesquisa (financiamento + comprovante),
-- Tabela-ponte projetos_discentes e migração de discentes.projeto_id,
-- e Bucket de Storage comprovantes-projetos com RLS.

-- 1. BANCAS: docente_orientador_id e projeto_id
ALTER TABLE public.bancas
  ADD COLUMN IF NOT EXISTS docente_orientador_id BIGINT REFERENCES public.docentes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS projeto_id BIGINT REFERENCES public.projetos_pesquisa(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bancas_docente_orientador_id ON public.bancas(docente_orientador_id);
CREATE INDEX IF NOT EXISTS idx_bancas_projeto_id ON public.bancas(projeto_id);

-- 2. PROJETOS_PESQUISA: financiador_nome, valor_financiamento, comprovante_url
ALTER TABLE public.projetos_pesquisa
  ADD COLUMN IF NOT EXISTS financiador_nome TEXT,
  ADD COLUMN IF NOT EXISTS valor_financiamento NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS comprovante_url TEXT;

-- 3. TABELA-PONTE projetos_discentes
CREATE TABLE IF NOT EXISTS public.projetos_discentes (
  projeto_id BIGINT NOT NULL REFERENCES public.projetos_pesquisa(id) ON DELETE CASCADE,
  discente_id BIGINT NOT NULL REFERENCES public.discentes(id) ON DELETE CASCADE,
  papel TEXT DEFAULT 'participante',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (projeto_id, discente_id)
);

CREATE INDEX IF NOT EXISTS idx_projetos_discentes_projeto ON public.projetos_discentes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projetos_discentes_discente ON public.projetos_discentes(discente_id);

-- RLS para projetos_discentes
ALTER TABLE public.projetos_discentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projetos_discentes_select_policy" ON public.projetos_discentes;
CREATE POLICY "projetos_discentes_select_policy" ON public.projetos_discentes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "projetos_discentes_all_staff" ON public.projetos_discentes;
CREATE POLICY "projetos_discentes_all_staff" ON public.projetos_discentes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('suporte', 'coordenador', 'auxiliar', 'admin', 'editor')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.projetos_pesquisa pp
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE pp.id = projetos_discentes.projeto_id
        AND pp.coordenador_id = p.docente_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('suporte', 'coordenador', 'auxiliar', 'admin', 'editor')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.projetos_pesquisa pp
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE pp.id = projetos_discentes.projeto_id
        AND pp.coordenador_id = p.docente_id
    )
  );

-- Migração de dados de discentes.projeto_id existentes para projetos_discentes
INSERT INTO public.projetos_discentes (projeto_id, discente_id)
SELECT projeto_id, id
FROM public.discentes
WHERE projeto_id IS NOT NULL
ON CONFLICT (projeto_id, discente_id) DO NOTHING;

-- 4. BUCKET PRIVADO NO SUPABASE STORAGE: comprovantes-projetos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprovantes-projetos',
  'comprovantes-projetos',
  false,
  20971520,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf'];

-- Políticas de Storage para o bucket comprovantes-projetos
DROP POLICY IF EXISTS "comprovantes_projetos_select" ON storage.objects;
CREATE POLICY "comprovantes_projetos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprovantes-projetos'
    AND (
      -- Staff
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('suporte', 'coordenador', 'auxiliar', 'capes', 'admin', 'editor', 'viewer')
      )
      -- Ou docente vinculado a projetos
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
          AND profiles.docente_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "comprovantes_projetos_insert" ON storage.objects;
CREATE POLICY "comprovantes_projetos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'comprovantes-projetos'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('suporte', 'coordenador', 'auxiliar', 'admin', 'editor', 'docente')
      )
    )
  );

DROP POLICY IF EXISTS "comprovantes_projetos_update" ON storage.objects;
CREATE POLICY "comprovantes_projetos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'comprovantes-projetos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('suporte', 'coordenador', 'auxiliar', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "comprovantes_projetos_delete" ON storage.objects;
CREATE POLICY "comprovantes_projetos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'comprovantes-projetos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('suporte', 'coordenador', 'auxiliar', 'admin', 'editor')
    )
  );
