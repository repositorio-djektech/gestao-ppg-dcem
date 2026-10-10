-- Migração Etapa A: Norma de Recondução de Docentes Permanentes (Estrutura de Dados)
-- Aditiva e idempotente. NUNCA remove ou trunca dados existentes.

-- 1. Docentes: adicionar coluna categoria ('permanente' | 'colaborador' | NULL)
ALTER TABLE public.docentes
  ADD COLUMN IF NOT EXISTS categoria text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.docentes'::regclass
      AND conname = 'docentes_categoria_check'
  ) THEN
    ALTER TABLE public.docentes
      ADD CONSTRAINT docentes_categoria_check
      CHECK (categoria IS NULL OR categoria = ANY (ARRAY['permanente'::text, 'colaborador'::text]));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_docentes_categoria ON public.docentes USING btree (categoria);

-- 2. Publicações: adicionar fator_impacto_jcr (numeric nullable para revisão manual posterior)
ALTER TABLE public.publicacoes
  ADD COLUMN IF NOT EXISTS fator_impacto_jcr numeric NULL;

-- 3. Orientações: garantir suporte a orientações CONCLUÍDAS, data_defesa e flag_orientador_principal
ALTER TABLE public.orientacoes
  ADD COLUMN IF NOT EXISTS data_defesa date NULL;

ALTER TABLE public.orientacoes
  ADD COLUMN IF NOT EXISTS flag_orientador_principal boolean NOT NULL DEFAULT false;

-- O CHECK atual em orientacoes já permite ('ativo', 'concluido', 'cancelado').
-- Para garantir idempotência e suporte a 'em_andamento' caso necessário:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orientacoes'::regclass
      AND conname = 'orientacoes_status_check'
  ) THEN
    ALTER TABLE public.orientacoes DROP CONSTRAINT orientacoes_status_check;
  END IF;
  
  ALTER TABLE public.orientacoes
    ADD CONSTRAINT orientacoes_status_check
    CHECK (status = ANY (ARRAY['ativo'::text, 'em_andamento'::text, 'concluido'::text, 'cancelado'::text]));
END $$;

CREATE INDEX IF NOT EXISTS idx_orientacoes_flag_orientador_principal
  ON public.orientacoes USING btree (flag_orientador_principal);

CREATE INDEX IF NOT EXISTS idx_orientacoes_data_defesa
  ON public.orientacoes USING btree (data_defesa);

-- 4. Disciplinas: docente_id FK nullable para docentes com índice
ALTER TABLE public.disciplinas
  ADD COLUMN IF NOT EXISTS docente_id bigint NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.disciplinas'::regclass
      AND conname = 'disciplinas_docente_id_fkey'
  ) THEN
    ALTER TABLE public.disciplinas
      ADD CONSTRAINT disciplinas_docente_id_fkey
      FOREIGN KEY (docente_id) REFERENCES public.docentes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_disciplinas_docente_id
  ON public.disciplinas USING btree (docente_id);

-- 5. Tabela de junção projetos_participantes (projeto_id FK, docente_id FK, papel text, PK composta)
CREATE TABLE IF NOT EXISTS public.projetos_participantes (
  projeto_id bigint NOT NULL REFERENCES public.projetos_pesquisa(id) ON DELETE CASCADE,
  docente_id bigint NOT NULL REFERENCES public.docentes(id) ON DELETE CASCADE,
  papel text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (projeto_id, docente_id)
);

CREATE INDEX IF NOT EXISTS idx_projetos_participantes_docente_id
  ON public.projetos_participantes USING btree (docente_id);

CREATE INDEX IF NOT EXISTS idx_projetos_participantes_projeto_id
  ON public.projetos_participantes USING btree (projeto_id);

-- RLS para projetos_participantes
ALTER TABLE public.projetos_participantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projetos_participantes_select" ON public.projetos_participantes;
CREATE POLICY "projetos_participantes_select" ON public.projetos_participantes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "projetos_participantes_insert" ON public.projetos_participantes;
CREATE POLICY "projetos_participantes_insert" ON public.projetos_participantes
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]));

DROP POLICY IF EXISTS "projetos_participantes_update" ON public.projetos_participantes;
CREATE POLICY "projetos_participantes_update" ON public.projetos_participantes
  FOR UPDATE TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]));

DROP POLICY IF EXISTS "projetos_participantes_delete" ON public.projetos_participantes;
CREATE POLICY "projetos_participantes_delete" ON public.projetos_participantes
  FOR DELETE TO authenticated
  USING (get_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]));
