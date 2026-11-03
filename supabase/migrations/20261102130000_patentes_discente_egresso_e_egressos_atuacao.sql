-- Ficha CAPES Engenharias II, quesito 2:
--  * 2.2.3 (DPPDE): patentes com autoria de discentes e egressos
--  * 2.3.1 a 2.3.4: destino e atuação dos egressos (M+D titulados nos últimos 10 anos)
-- Migração aditiva: registros existentes ficam com os valores padrão (não informado).

ALTER TABLE public.patentes
  ADD COLUMN IF NOT EXISTS com_discente_egresso boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discentes_egressos text NOT NULL DEFAULT '';

-- '' significa "não informado" (mesma convenção das demais colunas de texto do esquema).
ALTER TABLE public.egressos
  ADD COLUMN IF NOT EXISTS atuacao_setor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS atuacao_pais text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS destaque boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS destaque_justificativa text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'egressos_atuacao_setor_check'
  ) THEN
    ALTER TABLE public.egressos
      ADD CONSTRAINT egressos_atuacao_setor_check
      CHECK (atuacao_setor IN (
        '', 'ensino_superior', 'instituicao_pesquisa', 'industria_servicos', 'outro', 'nao_atua_na_area'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'egressos_atuacao_pais_check'
  ) THEN
    ALTER TABLE public.egressos
      ADD CONSTRAINT egressos_atuacao_pais_check
      CHECK (atuacao_pais IN ('', 'brasil', 'exterior'));
  END IF;
END $$;
