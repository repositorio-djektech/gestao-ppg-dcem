-- H-31 / P-35: data de início e de fim da iniciação (IC, IT e IE), em mês e ano.
--
-- Complementa a sincronização da D-30 (migração 20261119130000). Antes, Iniciações só tinha o ANO e a
-- orientação espelho recebia início fev/AAAA e término dez/AAAA. Agora Iniciações tem `inicio` e `fim`
-- (texto AAAA-MM, como Orientações, D-29) e os dois lados se espelham:
--
--   * criar em Iniciações com início informado: a orientação nasce com esse início e esse término;
--     término em branco continua valendo dez do ano do início (padrão da D-30);
--   * alterar início ou fim em Iniciações: a orientação acompanha (início só muda se vier preenchido;
--     o término pode ser esvaziado = em andamento);
--   * alterar início ou fim em Orientações: Iniciações acompanha;
--   * `ano` segue o ano do início sempre que há início (gatilho de normalização, antes de gravar).
--
-- Só muda o que MUDOU, como na D-30, para um lado não apagar o que só o outro guarda. Os gatilhos
-- continuam com a proteção contra laço (pg_trigger_depth). Registros existentes recebem as datas da
-- orientação ligada a eles; nada é apagado.
--
-- Reversão: restaurar as funções da migração 20261119130000; DROP TRIGGER
-- trg_iniciacao_normaliza_datas ON public.iniciacao_cientifica; DROP COLUMN inicio, fim.

-- 1. Colunas -------------------------------------------------------------------------------------
ALTER TABLE public.iniciacao_cientifica
  ADD COLUMN IF NOT EXISTS inicio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fim text NOT NULL DEFAULT '';

-- 2. `ano` acompanha o ano do início (roda antes dos gatilhos de sincronização, que são
--    ordenados por nome: "normaliza" vem antes de "sync") ------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_iniciacao_normaliza_datas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.ic_ano_de_texto(NEW.inicio) IS NOT NULL THEN
    NEW.ano := public.ic_ano_de_texto(NEW.inicio);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_iniciacao_normaliza_datas ON public.iniciacao_cientifica;
CREATE TRIGGER trg_iniciacao_normaliza_datas
  BEFORE INSERT OR UPDATE ON public.iniciacao_cientifica
  FOR EACH ROW EXECUTE FUNCTION public.trg_iniciacao_normaliza_datas();

-- 3. Orientações -> Iniciações: copia início e término -------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_orientacoes_sync_iniciacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cod text;
  v_ic public.iniciacao_cientifica%ROWTYPE;
  v_tipo text;
  v_disc bigint;
  v_doc bigint;
  v_ano int;
  v_inicio text;
  v_fim text;
BEGIN
  -- Gatilho disparado por outro gatilho (a sincronização do outro lado): não faz nada
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  v_cod := public.ic_codigo_de_tipo_orientacao(NEW.tipo);

  IF TG_OP = 'UPDATE' THEN
    SELECT * INTO v_ic FROM public.iniciacao_cientifica WHERE orientacao_id = NEW.id;
    IF FOUND THEN
      -- Deixou de ser iniciação: some do outro lado
      IF v_cod IS NULL THEN
        DELETE FROM public.iniciacao_cientifica WHERE id = v_ic.id;
        RETURN NULL;
      END IF;

      v_tipo := CASE WHEN NEW.tipo IS DISTINCT FROM OLD.tipo THEN v_cod ELSE v_ic.tipo END;
      v_disc := CASE WHEN NEW.discente_id IS DISTINCT FROM OLD.discente_id THEN NEW.discente_id ELSE v_ic.discente_id END;
      v_doc := CASE WHEN NEW.docente_id IS DISTINCT FROM OLD.docente_id THEN NEW.docente_id ELSE v_ic.docente_orientador_id END;
      v_inicio := CASE WHEN NEW.inicio IS DISTINCT FROM OLD.inicio THEN coalesce(NEW.inicio, '') ELSE v_ic.inicio END;
      v_fim := CASE WHEN NEW.fim IS DISTINCT FROM OLD.fim THEN coalesce(NEW.fim, '') ELSE v_ic.fim END;
      v_ano := v_ic.ano;
      IF public.ic_ano_de_texto(NEW.inicio) IS DISTINCT FROM public.ic_ano_de_texto(OLD.inicio)
         AND public.ic_ano_de_texto(NEW.inicio) IS NOT NULL THEN
        v_ano := public.ic_ano_de_texto(NEW.inicio);
      END IF;

      IF (v_tipo, v_disc, v_doc, v_ano, v_inicio, v_fim) IS DISTINCT FROM
         (v_ic.tipo, v_ic.discente_id, v_ic.docente_orientador_id, v_ic.ano, v_ic.inicio, v_ic.fim) THEN
        UPDATE public.iniciacao_cientifica
           SET tipo = v_tipo,
               discente_id = v_disc,
               docente_orientador_id = v_doc,
               ano = v_ano,
               inicio = v_inicio,
               fim = v_fim,
               updated_at = now()
         WHERE id = v_ic.id;
      END IF;
      RETURN NULL;
    END IF;
  END IF;

  -- INSERT, ou UPDATE de uma orientação que virou iniciação e ainda não tem espelho
  IF v_cod IS NOT NULL THEN
    INSERT INTO public.iniciacao_cientifica
      (discente_id, tipo, ano, docente_orientador_id, titulo, observacoes, bolsa_cnpq, orientacao_id, inicio, fim)
    VALUES (
      NEW.discente_id,
      v_cod,
      coalesce(public.ic_ano_de_texto(NEW.inicio), public.ic_ano_de_texto(NEW.fim)),
      NEW.docente_id,
      public.ic_titulo_de_observacoes(NEW.observacoes),
      public.ic_fomento_de_observacoes(NEW.observacoes),
      '',
      NEW.id,
      coalesce(NEW.inicio, ''),
      coalesce(NEW.fim, '')
    );
  END IF;
  RETURN NULL;
END;
$$;

-- 4. Iniciações -> Orientações -------------------------------------------------------------------
-- A orientação espelho nasce com o início informado (ou fev/AAAA) e o término informado (ou dez/AAAA)
CREATE OR REPLACE FUNCTION public.ic_criar_orientacao_espelho(p public.iniciacao_cientifica)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO public.orientacoes
    (tipo, inicio, fim, status, cancelado, docente_id, discente_id, link_comprovacao, observacoes, flag_orientador_principal)
  VALUES (
    public.ic_tipo_orientacao_de_codigo(p.tipo),
    CASE
      WHEN nullif(btrim(coalesce(p.inicio, '')), '') IS NOT NULL THEN btrim(p.inicio)
      WHEN p.ano IS NULL THEN ''
      ELSE p.ano::text || '-02'
    END,
    CASE
      WHEN nullif(btrim(coalesce(p.fim, '')), '') IS NOT NULL THEN btrim(p.fim)
      WHEN p.ano IS NULL THEN ''
      ELSE p.ano::text || '-12'
    END,
    'em_andamento',
    false,
    p.docente_orientador_id,
    p.discente_id,
    '',
    concat_ws(' | ',
      CASE WHEN coalesce(p.titulo, '') <> '' THEN 'Título: ' || p.titulo END,
      nullif(p.observacoes, ''),
      CASE WHEN p.discente_id IS NULL AND coalesce(p.discente_nome, '') <> ''
           THEN 'Discente (não cadastrado): ' || p.discente_nome END
    ),
    false
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_iniciacao_sync_orientacao_atualizar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_o public.orientacoes%ROWTYPE;
  v_tipo text;
  v_disc bigint;
  v_doc bigint;
  v_inicio text;
  v_fim text;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF NEW.orientacao_id IS NOT NULL THEN
    SELECT * INTO v_o FROM public.orientacoes WHERE id = NEW.orientacao_id;
  END IF;

  -- Sem espelho (registro antigo, ou o espelho foi apagado): cria e vincula
  IF NEW.orientacao_id IS NULL OR NOT FOUND THEN
    UPDATE public.iniciacao_cientifica
       SET orientacao_id = public.ic_criar_orientacao_espelho(NEW)
     WHERE id = NEW.id;
    RETURN NULL;
  END IF;

  v_tipo := CASE WHEN NEW.tipo IS DISTINCT FROM OLD.tipo THEN public.ic_tipo_orientacao_de_codigo(NEW.tipo) ELSE v_o.tipo END;
  v_disc := CASE WHEN NEW.discente_id IS DISTINCT FROM OLD.discente_id THEN NEW.discente_id ELSE v_o.discente_id END;
  v_doc := CASE WHEN NEW.docente_orientador_id IS DISTINCT FROM OLD.docente_orientador_id THEN NEW.docente_orientador_id ELSE v_o.docente_id END;
  v_inicio := v_o.inicio;
  v_fim := v_o.fim;
  -- Mudou o ano: ajusta início e término só se o ano da orientação for outro (preserva os meses)
  IF NEW.ano IS NOT NULL AND NEW.ano IS DISTINCT FROM OLD.ano THEN
    IF public.ic_ano_de_texto(v_o.inicio) IS DISTINCT FROM NEW.ano THEN
      v_inicio := NEW.ano::text || '-02';
    END IF;
    IF public.ic_ano_de_texto(v_o.fim) IS DISTINCT FROM NEW.ano THEN
      v_fim := NEW.ano::text || '-12';
    END IF;
  END IF;
  -- Mudou o início ou o término em Iniciações: a orientação acompanha. O início só muda se vier
  -- preenchido; o término pode ser esvaziado (orientação em andamento).
  IF NEW.inicio IS DISTINCT FROM OLD.inicio AND nullif(btrim(coalesce(NEW.inicio, '')), '') IS NOT NULL THEN
    v_inicio := btrim(NEW.inicio);
  END IF;
  IF NEW.fim IS DISTINCT FROM OLD.fim THEN
    v_fim := btrim(coalesce(NEW.fim, ''));
  END IF;

  IF (v_tipo, v_disc, v_doc, v_inicio, v_fim) IS DISTINCT FROM
     (v_o.tipo, v_o.discente_id, v_o.docente_id, v_o.inicio, v_o.fim) THEN
    UPDATE public.orientacoes
       SET tipo = v_tipo,
           discente_id = v_disc,
           docente_id = v_doc,
           inicio = v_inicio,
           fim = v_fim
     WHERE id = v_o.id;
  END IF;
  RETURN NULL;
END;
$$;

-- 5. Registros que já existem: início e término vêm da orientação ligada --------------------------
UPDATE public.iniciacao_cientifica i
   SET inicio = coalesce(o.inicio, ''),
       fim = coalesce(o.fim, '')
  FROM public.orientacoes o
 WHERE i.orientacao_id = o.id
   AND i.inicio = '' AND i.fim = ''
   AND (coalesce(o.inicio, '') <> '' OR coalesce(o.fim, '') <> '');
