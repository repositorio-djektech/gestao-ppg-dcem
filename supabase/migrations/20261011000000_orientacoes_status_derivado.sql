-- Migração: status derivado de orientações e coluna cancelado
-- PPG-DCEM

-- 1. Adicionar coluna cancelado se não existir
ALTER TABLE public.orientacoes
  ADD COLUMN IF NOT EXISTS cancelado boolean NOT NULL DEFAULT false;

-- Sincronizar registros existentes com status 'cancelado'
UPDATE public.orientacoes
SET cancelado = true
WHERE status = 'cancelado';

-- 2. Função segura para converter texto de término de orientação em DATE
-- Não quebra com formatos inválidos ou textos diversos
CREATE OR REPLACE FUNCTION public.parse_data_fim_orientacao(p_fim text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_str text;
  v_res date;
BEGIN
  IF p_fim IS NULL THEN
    RETURN NULL;
  END IF;

  v_str := trim(p_fim);
  IF v_str = '' THEN
    RETURN NULL;
  END IF;

  -- Formato YYYY-MM-DD
  IF v_str ~ '^\d{4}-\d{2}-\d{2}$' THEN
    BEGIN
      v_res := to_date(v_str, 'YYYY-MM-DD');
      RETURN v_res;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;

  -- Formato DD/MM/YYYY
  IF v_str ~ '^\d{2}/\d{2}/\d{4}$' THEN
    BEGIN
      v_res := to_date(v_str, 'DD/MM/YYYY');
      RETURN v_res;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;

  -- Formato MM/YYYY -> final do mês
  IF v_str ~ '^\d{2}/\d{4}$' THEN
    BEGIN
      v_res := (to_date(v_str, 'MM/YYYY') + interval '1 month' - interval '1 day')::date;
      RETURN v_res;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;

  -- Formato YYYY-MM -> final do mês
  IF v_str ~ '^\d{4}-\d{2}$' THEN
    BEGIN
      v_res := (to_date(v_str, 'YYYY-MM') + interval '1 month' - interval '1 day')::date;
      RETURN v_res;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;

  -- Formato YYYY -> final do ano (31 de dezembro)
  IF v_str ~ '^\d{4}$' THEN
    BEGIN
      v_res := to_date(v_str || '-12-31', 'YYYY-MM-DD');
      RETURN v_res;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;

  -- Qualquer outro formato inválido
  RETURN NULL;
END;
$$;

-- 3. Função para obter o status efetivo na leitura (sem alterar o registro físico)
CREATE OR REPLACE FUNCTION public.status_efetivo_orientacao(
  p_status text,
  p_fim text,
  p_cancelado boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_fim_date date;
BEGIN
  -- Se cancelado explicitamente ou status gravado for cancelado
  IF p_cancelado IS TRUE OR p_status = 'cancelado' THEN
    RETURN 'cancelado';
  END IF;

  -- Analisar a data de término de forma segura
  v_fim_date := public.parse_data_fim_orientacao(p_fim);

  -- Se tem data válida de término e ela é <= CURRENT_DATE -> 'concluido'
  IF v_fim_date IS NOT NULL AND v_fim_date <= CURRENT_DATE THEN
    RETURN 'concluido';
  END IF;

  -- Se em branco, futura ou data inválida:
  -- Se já estiver como 'concluido' por marcação prévia, preserva
  IF p_status = 'concluido' AND (p_fim IS NULL OR trim(p_fim) = '') THEN
    RETURN 'concluido';
  END IF;

  -- Demais casos (sem término, término futuro, data inválida) -> 'em_andamento'
  RETURN 'em_andamento';
END;
$$;

-- Overload que recebe a tupla de orientacoes
CREATE OR REPLACE FUNCTION public.status_efetivo(o public.orientacoes)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT public.status_efetivo_orientacao(o.status, o.fim, o.cancelado);
$$;

-- 4. Trigger BEFORE INSERT OR UPDATE para gravar o status derivado
CREATE OR REPLACE FUNCTION public.trg_orientacoes_derivar_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_fim_date date;
BEGIN
  -- Se cancelado = true -> status é 'cancelado' (datas preservadas)
  IF NEW.cancelado IS TRUE THEN
    NEW.status := 'cancelado';
    RETURN NEW;
  END IF;

  -- Se foi enviado status = 'cancelado' sem o booleano cancelado, ajusta cancelado = true
  IF NEW.status = 'cancelado' THEN
    NEW.cancelado := true;
    RETURN NEW;
  END IF;

  -- Verifica data de término de forma segura
  v_fim_date := public.parse_data_fim_orientacao(NEW.fim);

  IF v_fim_date IS NOT NULL AND v_fim_date <= CURRENT_DATE THEN
    NEW.status := 'concluido';
    NEW.cancelado := false;
  ELSE
    -- Data em branco, futura ou formato inválido -> 'em_andamento'
    NEW.status := 'em_andamento';
    NEW.cancelado := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orientacoes_derivar_status ON public.orientacoes;

CREATE TRIGGER trg_orientacoes_derivar_status
  BEFORE INSERT OR UPDATE ON public.orientacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orientacoes_derivar_status();
