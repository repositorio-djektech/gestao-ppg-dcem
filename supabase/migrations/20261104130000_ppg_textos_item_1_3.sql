-- H-10 / D-12: texto do item 1.3 (políticas afirmativas de inclusão, permanência e acessibilidade).
-- Texto curto, editável pela coordenação (suporte e coordenador). Sem cálculo.
-- Tabela genérica por chave para não exigir nova migração se outros textos curtos entrarem
-- depois (campos qualitativos estão fora do MVP, D-09).
--
-- Aplicada no projeto PPG-DCEM em 2026-11-04 (supabase db push) e conferida em pg_policies.
-- Reversão: DROP TABLE public.ppg_textos;

CREATE TABLE IF NOT EXISTS public.ppg_textos (
  chave      text PRIMARY KEY,
  texto      text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ppg_textos ENABLE ROW LEVEL SECURITY;

-- Leitura: todo usuário autenticado (docentes e auxiliares acompanham o texto vigente).
DROP POLICY IF EXISTS "ppg_textos_select_all" ON public.ppg_textos;
CREATE POLICY "ppg_textos_select_all"
  ON public.ppg_textos FOR SELECT
  TO authenticated
  USING (true);

-- Escrita: somente coordenação (suporte e coordenador). Sem DELETE: para limpar, grava texto vazio.
DROP POLICY IF EXISTS "ppg_textos_insert_coordenacao" ON public.ppg_textos;
CREATE POLICY "ppg_textos_insert_coordenacao"
  ON public.ppg_textos FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() IN ('suporte', 'coordenador'));

DROP POLICY IF EXISTS "ppg_textos_update_coordenacao" ON public.ppg_textos;
CREATE POLICY "ppg_textos_update_coordenacao"
  ON public.ppg_textos FOR UPDATE
  TO authenticated
  USING (public.get_user_role() IN ('suporte', 'coordenador'))
  WITH CHECK (public.get_user_role() IN ('suporte', 'coordenador'));
