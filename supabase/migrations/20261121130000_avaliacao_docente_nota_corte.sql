-- D-36 (H-30): nota de corte do PDQ da avaliação do docente (IN 02/2026, art. 8º, §6º).
--
-- A nota de corte é definida TODO ANO pelo Colegiado, a partir da média e distribuição dos PDQ dos
-- docentes. Por isso fica numa tabela por ANO DA AVALIAÇÃO (e não numa configuração única): mudar a
-- nota de um ano não altera o resultado dos anos anteriores. Ano sem linha usa 1,0 (padrão, definido
-- pela coordenação até ela cadastrar outro valor).
--
-- Leitura: todo usuário autenticado (o cálculo da Recondução usa). Escrita: suporte e coordenador.
-- Semente: 2026 = 1,0.
--
-- Reversão: DROP TABLE public.avaliacao_notas_corte;

CREATE TABLE IF NOT EXISTS public.avaliacao_notas_corte (
  ano_avaliacao integer PRIMARY KEY,
  nota_corte    numeric(8,3) NOT NULL DEFAULT 1.0,
  observacao    text NOT NULL DEFAULT '',
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT avaliacao_notas_corte_ano_valido CHECK (ano_avaliacao >= 1990 AND ano_avaliacao <= 2100),
  CONSTRAINT avaliacao_notas_corte_nota_valida CHECK (nota_corte >= 0)
);

ALTER TABLE public.avaliacao_notas_corte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avaliacao_notas_corte_select_all" ON public.avaliacao_notas_corte;
CREATE POLICY "avaliacao_notas_corte_select_all"
  ON public.avaliacao_notas_corte FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "avaliacao_notas_corte_insert_coordenacao" ON public.avaliacao_notas_corte;
CREATE POLICY "avaliacao_notas_corte_insert_coordenacao"
  ON public.avaliacao_notas_corte FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() IN ('suporte', 'coordenador'));

DROP POLICY IF EXISTS "avaliacao_notas_corte_update_coordenacao" ON public.avaliacao_notas_corte;
CREATE POLICY "avaliacao_notas_corte_update_coordenacao"
  ON public.avaliacao_notas_corte FOR UPDATE
  TO authenticated
  USING (public.get_user_role() IN ('suporte', 'coordenador'))
  WITH CHECK (public.get_user_role() IN ('suporte', 'coordenador'));

DROP POLICY IF EXISTS "avaliacao_notas_corte_delete_coordenacao" ON public.avaliacao_notas_corte;
CREATE POLICY "avaliacao_notas_corte_delete_coordenacao"
  ON public.avaliacao_notas_corte FOR DELETE
  TO authenticated
  USING (public.get_user_role() IN ('suporte', 'coordenador'));

INSERT INTO public.avaliacao_notas_corte (ano_avaliacao, nota_corte, observacao)
VALUES (2026, 1.0, 'Valor inicial definido pela coordenação; o Colegiado pode alterar.')
ON CONFLICT (ano_avaliacao) DO NOTHING;
