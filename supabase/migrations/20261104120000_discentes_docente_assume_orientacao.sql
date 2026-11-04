-- H-01 / D-11 (P-06): o docente pode se definir orientador de um discente que AINDA NÃO TEM orientador.
--
-- Causa do bug: a política "discentes_update" só deixava o docente atualizar linhas em que
-- docente_orientador_id já era ele. Com orientador nulo a linha ficava inatingível.
--
-- Nova regra para o papel docente (staff continua igual):
--   USING      : a linha é dele OU não tem orientador (docente_orientador_id IS NULL).
--   WITH CHECK : depois do UPDATE o orientador TEM de ser ele. Assim o docente só consegue
--                se definir como orientador (H-01); não consegue passar o discente a outro
--                docente nem limpar o orientador. Alterar o orientador principal é da
--                coordenação (H-03).
--
-- Aplicada no projeto PPG-DCEM em 2026-11-04 (supabase db push) e conferida em pg_policies.
-- Reversão: recriar a política com a definição anterior, em
-- 20260421000001_etapa_a1_regras_acesso_fix.sql (bloco "DISCENTES").

DROP POLICY IF EXISTS "discentes_update" ON public.discentes;

CREATE POLICY "discentes_update"
  ON public.discentes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_staff() OR
    (
      public.get_user_role() = 'docente'
      AND public.get_user_docente_id() IS NOT NULL
      AND (
        docente_orientador_id = public.get_user_docente_id()
        OR docente_orientador_id IS NULL
      )
    )
  )
  WITH CHECK (
    public.is_admin_staff() OR
    (
      public.get_user_role() = 'docente'
      AND public.get_user_docente_id() IS NOT NULL
      AND docente_orientador_id = public.get_user_docente_id()
    )
  );
