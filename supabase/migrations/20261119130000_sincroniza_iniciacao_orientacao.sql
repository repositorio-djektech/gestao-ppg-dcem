-- D-30 (H-25): sincronização entre Orientações (tipos de iniciação) e Iniciações.
--
-- Uma iniciação (científica, tecnológica ou em extensão) criada, alterada ou apagada em uma das telas
-- aparece igual na outra. A sincronização é feita no banco, por gatilhos, então vale para qualquer
-- caminho de gravação (telas, import do Lattes, SQL).
--
--   orientacoes.tipo                         iniciacao_cientifica.tipo
--   'Iniciação Científica'      <->          'iniciacao_cientifica'
--   'Iniciação Tecnológica'     <->          'iniciacao_tecnologica'
--   'Iniciação em Extensão'     <->          'iniciacao_extensao'
--
-- Vínculo: iniciacao_cientifica.orientacao_id (uma orientação para no máximo uma iniciação).
-- Campos que se espelham: tipo, discente, orientador e ano (= ano do início da orientação).
-- Só o que mudou é propagado, para não sobrescrever o que cada tela guarda sozinha
-- (título e fomento só existem em Iniciações; término e meses só existem em Orientações).
-- Laço: o gatilho que dispara dentro de outro gatilho (pg_trigger_depth() > 1) não faz nada.
--
-- Iniciação nova vinda de Iniciações cria uma orientação com início fev/AAAA e término dez/AAAA
-- (o ano é o ano de vigência do plano), orientador não principal (flag_orientador_principal = false).
-- Apagar de um lado apaga o espelho do outro.

-- 1. Vínculo ------------------------------------------------------------------------------------
ALTER TABLE public.iniciacao_cientifica ADD COLUMN IF NOT EXISTS orientacao_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'iniciacao_cientifica_orientacao_id_fkey'
  ) THEN
    ALTER TABLE public.iniciacao_cientifica
      ADD CONSTRAINT iniciacao_cientifica_orientacao_id_fkey
      FOREIGN KEY (orientacao_id) REFERENCES public.orientacoes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS iniciacao_cientifica_orientacao_id_key
  ON public.iniciacao_cientifica (orientacao_id) WHERE orientacao_id IS NOT NULL;

-- 2. Funções auxiliares ------------------------------------------------------------------------
-- Tipo de Orientações -> código de Iniciações (NULL se o tipo não é iniciação)
CREATE OR REPLACE FUNCTION public.ic_codigo_de_tipo_orientacao(p_tipo text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE translate(lower(btrim(coalesce(p_tipo, ''))), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
    WHEN 'iniciacao cientifica' THEN 'iniciacao_cientifica'
    WHEN 'iniciacao tecnologica' THEN 'iniciacao_tecnologica'
    WHEN 'iniciacao em extensao' THEN 'iniciacao_extensao'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.ic_tipo_orientacao_de_codigo(p_codigo text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_codigo
    WHEN 'iniciacao_cientifica' THEN 'Iniciação Científica'
    WHEN 'iniciacao_tecnologica' THEN 'Iniciação Tecnológica'
    WHEN 'iniciacao_extensao' THEN 'Iniciação em Extensão'
    ELSE NULL
  END;
$$;

-- Primeiro ano (AAAA) encontrado em um texto de data; NULL se não houver
CREATE OR REPLACE FUNCTION public.ic_ano_de_texto(p_texto text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(substring(coalesce(p_texto, '') from '((?:19|20)[0-9]{2})'), '')::int;
$$;

-- Título e fomento guardados em orientacoes.observacoes ("Título: X | Fomento: Y", formato do import)
CREATE OR REPLACE FUNCTION public.ic_titulo_de_observacoes(p_obs text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(
    btrim(
      replace(replace(replace(substring(coalesce(p_obs, '') from 'Título: (.*?)(?: \| |$)'), '&quot;', '"'), '&amp;', '&'), '&#39;', ''''),
      ' "'
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.ic_fomento_de_observacoes(p_obs text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(substring(coalesce(p_obs, '') from '(Fomento: .*?)(?: \| |$)'), '');
$$;

-- 3. Orientações -> Iniciações ------------------------------------------------------------------
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
      v_ano := v_ic.ano;
      IF public.ic_ano_de_texto(NEW.inicio) IS DISTINCT FROM public.ic_ano_de_texto(OLD.inicio)
         AND public.ic_ano_de_texto(NEW.inicio) IS NOT NULL THEN
        v_ano := public.ic_ano_de_texto(NEW.inicio);
      END IF;

      IF (v_tipo, v_disc, v_doc, v_ano) IS DISTINCT FROM
         (v_ic.tipo, v_ic.discente_id, v_ic.docente_orientador_id, v_ic.ano) THEN
        UPDATE public.iniciacao_cientifica
           SET tipo = v_tipo,
               discente_id = v_disc,
               docente_orientador_id = v_doc,
               ano = v_ano,
               updated_at = now()
         WHERE id = v_ic.id;
      END IF;
      RETURN NULL;
    END IF;
  END IF;

  -- INSERT, ou UPDATE de uma orientação que virou iniciação e ainda não tem espelho
  IF v_cod IS NOT NULL THEN
    INSERT INTO public.iniciacao_cientifica
      (discente_id, tipo, ano, docente_orientador_id, titulo, observacoes, bolsa_cnpq, orientacao_id)
    VALUES (
      NEW.discente_id,
      v_cod,
      coalesce(public.ic_ano_de_texto(NEW.inicio), public.ic_ano_de_texto(NEW.fim)),
      NEW.docente_id,
      public.ic_titulo_de_observacoes(NEW.observacoes),
      public.ic_fomento_de_observacoes(NEW.observacoes),
      '',
      NEW.id
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_orientacoes_sync_iniciacao ON public.orientacoes;
CREATE TRIGGER trg_orientacoes_sync_iniciacao
  AFTER INSERT OR UPDATE ON public.orientacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_orientacoes_sync_iniciacao();

CREATE OR REPLACE FUNCTION public.trg_orientacoes_sync_iniciacao_apagar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  DELETE FROM public.iniciacao_cientifica WHERE orientacao_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_orientacoes_sync_iniciacao_apagar ON public.orientacoes;
CREATE TRIGGER trg_orientacoes_sync_iniciacao_apagar
  BEFORE DELETE ON public.orientacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_orientacoes_sync_iniciacao_apagar();

-- 4. Iniciações -> Orientações ------------------------------------------------------------------
-- Cria a orientação espelho de uma iniciação e devolve o id dela
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
    CASE WHEN p.ano IS NULL THEN '' ELSE p.ano::text || '-02' END,
    CASE WHEN p.ano IS NULL THEN '' ELSE p.ano::text || '-12' END,
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

CREATE OR REPLACE FUNCTION public.trg_iniciacao_sync_orientacao_criar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 OR NEW.orientacao_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  NEW.orientacao_id := public.ic_criar_orientacao_espelho(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_iniciacao_sync_orientacao_criar ON public.iniciacao_cientifica;
CREATE TRIGGER trg_iniciacao_sync_orientacao_criar
  BEFORE INSERT ON public.iniciacao_cientifica
  FOR EACH ROW EXECUTE FUNCTION public.trg_iniciacao_sync_orientacao_criar();

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

DROP TRIGGER IF EXISTS trg_iniciacao_sync_orientacao_atualizar ON public.iniciacao_cientifica;
CREATE TRIGGER trg_iniciacao_sync_orientacao_atualizar
  AFTER UPDATE ON public.iniciacao_cientifica
  FOR EACH ROW EXECUTE FUNCTION public.trg_iniciacao_sync_orientacao_atualizar();

CREATE OR REPLACE FUNCTION public.trg_iniciacao_sync_orientacao_apagar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;
  IF OLD.orientacao_id IS NOT NULL THEN
    DELETE FROM public.orientacoes WHERE id = OLD.orientacao_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_iniciacao_sync_orientacao_apagar ON public.iniciacao_cientifica;
CREATE TRIGGER trg_iniciacao_sync_orientacao_apagar
  AFTER DELETE ON public.iniciacao_cientifica
  FOR EACH ROW EXECUTE FUNCTION public.trg_iniciacao_sync_orientacao_apagar();

-- 5. Vínculo dos registros que já existem -------------------------------------------------------
-- 5a. Iniciações já copiadas de Orientações (19/11): liga cada uma à sua orientação, quando só há uma
--     candidata (mesmo discente, orientador e tipo).
UPDATE public.iniciacao_cientifica i
   SET orientacao_id = o.id
  FROM public.orientacoes o
 WHERE i.orientacao_id IS NULL
   AND o.discente_id = i.discente_id
   AND o.docente_id = i.docente_orientador_id
   AND public.ic_codigo_de_tipo_orientacao(o.tipo) = i.tipo
   AND NOT EXISTS (SELECT 1 FROM public.iniciacao_cientifica j WHERE j.orientacao_id = o.id)
   AND (SELECT count(*) FROM public.orientacoes o2
         WHERE o2.discente_id = i.discente_id
           AND o2.docente_id = i.docente_orientador_id
           AND public.ic_codigo_de_tipo_orientacao(o2.tipo) = i.tipo) = 1;

-- 5b. Orientações de iniciação que ainda não têm espelho em Iniciações
INSERT INTO public.iniciacao_cientifica
  (discente_id, tipo, ano, docente_orientador_id, titulo, observacoes, bolsa_cnpq, orientacao_id)
SELECT o.discente_id,
       public.ic_codigo_de_tipo_orientacao(o.tipo),
       coalesce(public.ic_ano_de_texto(o.inicio), public.ic_ano_de_texto(o.fim)),
       o.docente_id,
       public.ic_titulo_de_observacoes(o.observacoes),
       public.ic_fomento_de_observacoes(o.observacoes),
       '',
       o.id
  FROM public.orientacoes o
 WHERE public.ic_codigo_de_tipo_orientacao(o.tipo) IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.iniciacao_cientifica j WHERE j.orientacao_id = o.id)
   AND NOT EXISTS (
     SELECT 1 FROM public.iniciacao_cientifica j
      WHERE j.orientacao_id IS NULL
        AND j.discente_id = o.discente_id
        AND j.docente_orientador_id = o.docente_id
        AND j.tipo = public.ic_codigo_de_tipo_orientacao(o.tipo)
   );
