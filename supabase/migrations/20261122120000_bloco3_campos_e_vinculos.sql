-- H-31 (P-35): campos e vínculos que a coordenação pediu nas telas.
--
-- Só ADICIONA colunas (todas opcionais ou com padrão vazio) e amplia duas listas de valores; nada é
-- apagado nem reescrito, exceto a cópia do fator de impacto (JCR) para o campo novo.
--
--  1. Disciplinas: ementa e referências bibliográficas.
--  2. Linhas de pesquisa: descrição.
--  3. Publicações: fator de impacto com TIPO (JCR, FWCI ou outro) e valor; vínculo com projeto e linha.
--  4. Eventos: classificação nacional/internacional/regional/local, financiadores, valor, comprovante
--     (PDF), vínculo com projeto e linha.
--  5. Mobilidade: classificação também "regional".
--  6. Premiações: abrangência, tipo do prêmio (recursos, bolsa, menção honrosa...), comprovante,
--     vínculo com projeto.
--  7. Impacto social: item do quesito 3 da ficha e abrangência; vínculo com projeto e linha; comprovante.
--  8. Produção técnica e patentes: vínculo com projeto e linha; comprovante.
--  9. Projetos: linha de pesquisa.
-- 10. Orientações: título do trabalho (dissertação ou tese), linha e projeto.
-- 11. Iniciação: linha de pesquisa.
--
-- Vínculos são chaves opcionais (ON DELETE SET NULL): apagar um projeto ou uma linha não apaga o registro.
--
-- Reversão: DROP COLUMN das colunas listadas; restaurar as CHECKs de eventos e mobilidade.

-- 1. Disciplinas
ALTER TABLE public.disciplinas
  ADD COLUMN IF NOT EXISTS ementa text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS referencias text NOT NULL DEFAULT '';

-- 2. Linhas de pesquisa
ALTER TABLE public.linhas_pesquisa
  ADD COLUMN IF NOT EXISTS descricao text NOT NULL DEFAULT '';

-- 3. Publicações
ALTER TABLE public.publicacoes
  ADD COLUMN IF NOT EXISTS fator_impacto_tipo text,
  ADD COLUMN IF NOT EXISTS fator_impacto_valor numeric,
  ADD COLUMN IF NOT EXISTS fator_impacto_outro text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS projeto_id bigint REFERENCES public.projetos_pesquisa(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linha_pesquisa_id bigint REFERENCES public.linhas_pesquisa(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'publicacoes_fator_impacto_tipo_check') THEN
    ALTER TABLE public.publicacoes
      ADD CONSTRAINT publicacoes_fator_impacto_tipo_check
      CHECK (fator_impacto_tipo IS NULL OR fator_impacto_tipo IN ('JCR', 'FWCI', 'OUTRO'));
  END IF;
END $$;

-- O valor já cadastrado como JCR passa a constar também no campo novo (o campo antigo continua)
UPDATE public.publicacoes
SET fator_impacto_tipo = 'JCR', fator_impacto_valor = fator_impacto_jcr
WHERE fator_impacto_jcr IS NOT NULL AND fator_impacto_tipo IS NULL;

-- 4. Eventos
ALTER TABLE public.eventos DROP CONSTRAINT IF EXISTS eventos_nacionalidade_check;
ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_nacionalidade_check
  CHECK (nacionalidade IS NULL OR nacionalidade IN ('Nacional', 'Internacional', 'Regional', 'Local'));

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS financiadores text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS valor_total numeric,
  ADD COLUMN IF NOT EXISTS comprovante_url text,
  ADD COLUMN IF NOT EXISTS projeto_id bigint REFERENCES public.projetos_pesquisa(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linha_pesquisa_id bigint REFERENCES public.linhas_pesquisa(id) ON DELETE SET NULL;

-- 5. Mobilidade
ALTER TABLE public.mobilidade_docente DROP CONSTRAINT IF EXISTS mobilidade_docente_modalidade_check;
ALTER TABLE public.mobilidade_docente
  ADD CONSTRAINT mobilidade_docente_modalidade_check
  CHECK (modalidade IN ('nacional', 'internacional', 'regional'));

-- 6. Premiações
ALTER TABLE public.premiacoes
  ADD COLUMN IF NOT EXISTS abrangencia text,
  ADD COLUMN IF NOT EXISTS tipo_premio text,
  ADD COLUMN IF NOT EXISTS comprovante_url text,
  ADD COLUMN IF NOT EXISTS projeto_id bigint REFERENCES public.projetos_pesquisa(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'premiacoes_abrangencia_check') THEN
    ALTER TABLE public.premiacoes
      ADD CONSTRAINT premiacoes_abrangencia_check
      CHECK (abrangencia IS NULL OR abrangencia IN ('internacional', 'nacional', 'regional', 'local'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'premiacoes_tipo_premio_check') THEN
    ALTER TABLE public.premiacoes
      ADD CONSTRAINT premiacoes_tipo_premio_check
      CHECK (tipo_premio IS NULL OR tipo_premio IN ('recursos_pesquisa', 'bolsa', 'mencao_honrosa', 'outro'));
  END IF;
END $$;

-- 7. Impacto social
ALTER TABLE public.impacto_social
  ADD COLUMN IF NOT EXISTS item_ficha text,
  ADD COLUMN IF NOT EXISTS abrangencia text,
  ADD COLUMN IF NOT EXISTS comprovante_url text,
  ADD COLUMN IF NOT EXISTS projeto_id bigint REFERENCES public.projetos_pesquisa(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linha_pesquisa_id bigint REFERENCES public.linhas_pesquisa(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'impacto_social_item_ficha_check') THEN
    ALTER TABLE public.impacto_social
      ADD CONSTRAINT impacto_social_item_ficha_check
      CHECK (item_ficha IS NULL OR item_ficha IN (
        '3.1', '3.2_economico', '3.2_social', '3.2_cultural', '3.3.1', '3.3.2', '3.3.3'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'impacto_social_abrangencia_check') THEN
    ALTER TABLE public.impacto_social
      ADD CONSTRAINT impacto_social_abrangencia_check
      CHECK (abrangencia IS NULL OR abrangencia IN ('local', 'regional', 'nacional', 'internacional'));
  END IF;
END $$;

-- 8. Produção técnica e patentes
ALTER TABLE public.producao_tecnica
  ADD COLUMN IF NOT EXISTS comprovante_url text,
  ADD COLUMN IF NOT EXISTS projeto_id bigint REFERENCES public.projetos_pesquisa(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linha_pesquisa_id bigint REFERENCES public.linhas_pesquisa(id) ON DELETE SET NULL;

ALTER TABLE public.patentes
  ADD COLUMN IF NOT EXISTS comprovante_url text,
  ADD COLUMN IF NOT EXISTS projeto_id bigint REFERENCES public.projetos_pesquisa(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linha_pesquisa_id bigint REFERENCES public.linhas_pesquisa(id) ON DELETE SET NULL;

-- 9. Projetos
ALTER TABLE public.projetos_pesquisa
  ADD COLUMN IF NOT EXISTS linha_pesquisa_id bigint REFERENCES public.linhas_pesquisa(id) ON DELETE SET NULL;

-- 10. Orientações: título do trabalho (dissertação ou tese), linha e projeto
ALTER TABLE public.orientacoes
  ADD COLUMN IF NOT EXISTS titulo_trabalho text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS linha_pesquisa_id bigint REFERENCES public.linhas_pesquisa(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS projeto_id bigint REFERENCES public.projetos_pesquisa(id) ON DELETE SET NULL;

-- 11. Iniciação
ALTER TABLE public.iniciacao_cientifica
  ADD COLUMN IF NOT EXISTS linha_pesquisa_id bigint REFERENCES public.linhas_pesquisa(id) ON DELETE SET NULL;

-- Índices dos vínculos (consultas "tudo do projeto" e "tudo da linha")
CREATE INDEX IF NOT EXISTS idx_publicacoes_projeto ON public.publicacoes (projeto_id) WHERE projeto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eventos_projeto ON public.eventos (projeto_id) WHERE projeto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projetos_linha ON public.projetos_pesquisa (linha_pesquisa_id) WHERE linha_pesquisa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orientacoes_projeto ON public.orientacoes (projeto_id) WHERE projeto_id IS NOT NULL;
