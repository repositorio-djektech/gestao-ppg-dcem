-- P-15 (H-04 / F-01): o import Lattes feito por um docente cria discentes SEM orientador
-- (o orientador principal só é definido a partir de orientação principal, ver gravar.ts).
-- A política "discentes_insert" (migração 20261018190600) só deixava o docente inserir com
-- docente_orientador_id = ele mesmo; com orientador nulo o INSERT era barrado pela RLS e a falha
-- ficava silenciosa no import.
--
-- Nova regra para o papel docente (staff continua igual): pode inserir discente com
-- docente_orientador_id = ele mesmo OU sem orientador. Nunca com outro docente como orientador.
-- Discente criado sem orientador pode ser assumido depois por qualquer docente (H-01) ou
-- definido pela coordenação (H-03).
--
-- Aplicada no projeto PPG-DCEM em 2026-11-04 (supabase db push) e conferida em pg_policies.
-- Reversão: recriar a política como em 20261018190600_add_qualis_and_rules.sql.

DROP POLICY IF EXISTS "discentes_insert" ON public.discentes;

CREATE POLICY "discentes_insert" ON public.discentes
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_staff() OR (
      (get_user_role() = 'docente'::text) AND
      (get_user_docente_id() IS NOT NULL) AND
      (docente_orientador_id IS NULL OR docente_orientador_id = get_user_docente_id())
    )
  );
