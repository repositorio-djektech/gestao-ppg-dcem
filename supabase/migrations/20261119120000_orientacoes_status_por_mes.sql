-- D-29 (H-24): início e término de orientações em MÊS e ANO.
-- A função abaixo é usada por status_efetivo_orientacao() e pelo trigger trg_orientacoes_derivar_status.
-- Passa a devolver o DIA 1º DO MÊS do término, então a orientação vira 'concluido' a partir do próprio
-- mês do término (término 11/2026 já vale em 01/11/2026), como o front (src/lib/datas/mes-ano.ts).
-- Término só com o ano (dado antigo) vale como FEVEREIRO daquele ano. Dia é ignorado.
-- Valor vazio ou inválido continua devolvendo NULL (não conclui a orientação).
--
-- Só substitui a função; não altera dados. A assinatura e os atributos são os mesmos da migração
-- 20261011000000, então nada que depende dela precisa ser recriado.

CREATE OR REPLACE FUNCTION public.parse_data_fim_orientacao(p_fim text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_str text;
  v_ano int;
  v_mes int;
  v_dia int;
BEGIN
  IF p_fim IS NULL THEN
    RETURN NULL;
  END IF;

  v_str := trim(p_fim);
  IF v_str = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    -- AAAA-MM-DD (valida o dia; usa só o mês)
    IF v_str ~ '^\d{4}-\d{2}-\d{2}$' THEN
      v_ano := substring(v_str from 1 for 4)::int;
      v_mes := substring(v_str from 6 for 2)::int;
      v_dia := substring(v_str from 9 for 2)::int;
      PERFORM make_date(v_ano, v_mes, v_dia);
      RETURN make_date(v_ano, v_mes, 1);
    END IF;

    -- DD/MM/AAAA (valida o dia; usa só o mês)
    IF v_str ~ '^\d{2}/\d{2}/\d{4}$' THEN
      v_dia := substring(v_str from 1 for 2)::int;
      v_mes := substring(v_str from 4 for 2)::int;
      v_ano := substring(v_str from 7 for 4)::int;
      PERFORM make_date(v_ano, v_mes, v_dia);
      RETURN make_date(v_ano, v_mes, 1);
    END IF;

    -- AAAA-MM
    IF v_str ~ '^\d{4}-\d{2}$' THEN
      RETURN make_date(substring(v_str from 1 for 4)::int, substring(v_str from 6 for 2)::int, 1);
    END IF;

    -- MM/AAAA ou MM-AAAA
    IF v_str ~ '^\d{2}[/-]\d{4}$' THEN
      RETURN make_date(substring(v_str from 4 for 4)::int, substring(v_str from 1 for 2)::int, 1);
    END IF;

    -- AAAA (só o ano): fevereiro
    IF v_str ~ '^\d{4}$' THEN
      RETURN make_date(v_str::int, 2, 1);
    END IF;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  -- Qualquer outro formato inválido
  RETURN NULL;
END;
$$;
