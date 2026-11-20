-- D-35 (H-29): o egresso nasce da conclusão da orientação de mestrado ou doutorado, um por curso.
--
-- O ano de conclusão do curso identifica o egresso. A mesma pessoa pode ser egresso do mestrado e
-- ainda aluno em andamento do doutorado, então a chave é nome + curso.
--
-- sincronizar_egressos_orientacoes(p_orientacao_id) cria os egressos que faltam, de forma idempotente:
--   - orientação de Mestrado ou Doutorado, orientador principal, não cancelada;
--   - concluída = mês do término já atingido (D-29: vale a partir do dia 1º do mês, como no front);
--   - egresso já cadastrado (mesmo nome e mesmo curso, ou cadastro antigo sem curso) não é duplicado;
--   - ano de titulação = ano do término; orientador = docente da orientação; ingresso = ano do ingresso
--     do discente, quando houver.
-- Sem p_orientacao_id, varre todas as orientações (cobre quem concluiu só pela passagem do tempo).
--
-- O gatilho chama a função quando uma orientação é criada ou tem término, tipo, principal ou
-- cancelamento alterados. Falha do gatilho nunca impede de gravar a orientação (vira aviso).
--
-- Só cria; nunca altera nem apaga egresso existente. SECURITY DEFINER para valer também quando quem
-- grava é docente (a RLS de egressos só deixa o docente inserir os próprios).

CREATE OR REPLACE FUNCTION public.sincronizar_egressos_orientacoes(p_orientacao_id bigint DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_criados integer := 0;
BEGIN
  WITH concluidas AS (
    SELECT DISTINCT ON (lower(btrim(regexp_replace(di.nome, '\s+', ' ', 'g'))), o.tipo)
      btrim(regexp_replace(di.nome, '\s+', ' ', 'g')) AS nome,
      lower(btrim(regexp_replace(di.nome, '\s+', ' ', 'g'))) AS chave,
      o.tipo AS tipo_curso,
      extract(year FROM public.parse_data_fim_orientacao(o.fim))::int AS ano_titulacao,
      o.docente_id,
      doc.nome AS orientador,
      NULLIF(left(btrim(coalesce(di.data_ingresso, '')), 4), '') AS ano_ingresso
    FROM public.orientacoes o
    JOIN public.discentes di ON di.id = o.discente_id
    LEFT JOIN public.docentes doc ON doc.id = o.docente_id
    WHERE (p_orientacao_id IS NULL OR o.id = p_orientacao_id)
      AND o.tipo IN ('Mestrado', 'Doutorado')
      AND o.flag_orientador_principal IS TRUE
      AND coalesce(o.cancelado, false) IS FALSE
      AND o.status <> 'cancelado'
      AND public.parse_data_fim_orientacao(o.fim) IS NOT NULL
      AND public.parse_data_fim_orientacao(o.fim) <= current_date
      AND btrim(coalesce(di.nome, '')) <> ''
    ORDER BY lower(btrim(regexp_replace(di.nome, '\s+', ' ', 'g'))), o.tipo, o.fim DESC
  ),
  novos AS (
    INSERT INTO public.egressos (
      nome, tipo_curso, ano_titulacao, docente_orientador_id, orientador, ano_ingresso, observacoes
    )
    SELECT c.nome, c.tipo_curso, c.ano_titulacao, c.docente_id, coalesce(c.orientador, ''),
           c.ano_ingresso, 'Cadastrado automaticamente ao concluir a orientação'
    FROM concluidas c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.egressos e
      WHERE lower(btrim(regexp_replace(e.nome, '\s+', ' ', 'g'))) = c.chave
        AND (coalesce(btrim(e.tipo_curso), '') = '' OR e.tipo_curso = c.tipo_curso)
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_criados FROM novos;

  RETURN v_criados;
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_egressos_orientacoes(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sincronizar_egressos_orientacoes(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_orientacoes_sincroniza_egresso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.sincronizar_egressos_orientacoes(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sincronizar_egressos_orientacoes falhou para a orientação %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orientacoes_sincroniza_egresso ON public.orientacoes;
CREATE TRIGGER trg_orientacoes_sincroniza_egresso
  AFTER INSERT OR UPDATE OF fim, tipo, flag_orientador_principal, cancelado, status, discente_id
  ON public.orientacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orientacoes_sincroniza_egresso();
