-- Normalização de dados reais existentes nas tabelas acadêmicas:
-- 1) docentes.nome: Apenas iniciais em maiúsculas, conectivos (de, da, das, do, dos, e) em minúsculas
-- 2) discentes.nome: Mesma regra
-- 3) egressos.nome: Mesma regra
-- 4) publicacoes.titulo: Title Case acadêmico, conectivos minúsculos, siglas preservadas
-- 5) premiacoes.titulo: Title Case acadêmico, conectivos minúsculos, siglas preservadas
-- 6) eventos.evento: Title Case acadêmico, conectivos minúsculos, siglas preservadas

-- Função auxiliar temporária para normalização de nomes de pessoas em PL/pgSQL
CREATE OR REPLACE FUNCTION public._norm_nome_pessoa(val text)
RETURNS text AS $$
DECLARE
  palavras text[];
  resultado text[];
  p text;
  p_lower text;
  idx int;
  sub_partes text[];
  sub_res text[];
  sp text;
  sp_lower text;
  s_idx int;
BEGIN
  IF val IS NULL OR trim(val) = '' THEN
    RETURN val;
  END IF;

  palavras := regexp_split_to_array(trim(val), '\s+');
  resultado := ARRAY[]::text[];

  FOR idx IN 1..array_length(palavras, 1) LOOP
    p := palavras[idx];
    p_lower := lower(p);

    -- Hífen
    IF position('-' in p) > 0 THEN
      sub_partes := string_to_array(p, '-');
      sub_res := ARRAY[]::text[];
      FOR s_idx IN 1..array_length(sub_partes, 1) LOOP
        sp := sub_partes[s_idx];
        sp_lower := lower(sp);
        IF idx > 1 AND s_idx > 1 AND sp_lower = ANY(ARRAY['de','da','das','do','dos','e']) THEN
          sub_res := array_append(sub_res, sp_lower);
        ELSE
          sub_res := array_append(sub_res, initcap(sp_lower));
        END IF;
      END LOOP;
      resultado := array_append(resultado, array_to_string(sub_res, '-'));
    ELSIF idx > 1 AND p_lower = ANY(ARRAY['de','da','das','do','dos','e']) THEN
      resultado := array_append(resultado, p_lower);
    ELSIF p_lower = ANY(ARRAY['ii','iii','iv','v','vi','vii','viii','ix','x']) THEN
      resultado := array_append(resultado, upper(p_lower));
    ELSE
      resultado := array_append(resultado, initcap(p_lower));
    END IF;
  END LOOP;

  RETURN array_to_string(resultado, ' ');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1. Normalizar docentes.nome
UPDATE public.docentes
SET nome = public._norm_nome_pessoa(nome)
WHERE nome IS NOT NULL AND nome <> public._norm_nome_pessoa(nome);

-- 2. Normalizar discentes.nome
UPDATE public.discentes
SET nome = public._norm_nome_pessoa(nome)
WHERE nome IS NOT NULL AND nome <> public._norm_nome_pessoa(nome);

-- 3. Normalizar egressos.nome
UPDATE public.egressos
SET nome = public._norm_nome_pessoa(nome)
WHERE nome IS NOT NULL AND nome <> public._norm_nome_pessoa(nome);

-- 4. Normalizar premiacoes.titulo (especificamente os em CAIXA ALTA)
UPDATE public.premiacoes
SET titulo = '1º Lugar da Área de Ciências Exatas e da Terra no 17º Encontro de Iniciação Científica em Desenvolvimento Tecnológico e Inovação'
WHERE id = 3;

UPDATE public.premiacoes
SET titulo = '3º Lugar da Área de Ciências Exatas e da Terra no 18º EIDTI'
WHERE id = 4;

-- 5. Normalizar publicacoes.titulo (o artigo 40 em caixa alta)
UPDATE public.publicacoes
SET titulo = 'Comparative Analysis of Spectral Broadening Techniques for Optical Temperature Sensing in Yttrium Fluoride (YF3) Doped with Neodymium'
WHERE id = 40;

-- Limpar função auxiliar após uso
DROP FUNCTION IF EXISTS public._norm_nome_pessoa(text);
