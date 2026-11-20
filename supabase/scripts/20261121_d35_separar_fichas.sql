-- D-35: separa a ficha de discente de quem concluiu o MESTRADO e segue no DOUTORADO.
-- Hoje as duas coisas estão numa ficha só (tipo Doutorado, status Titulado, conclusão do mestrado).
--
-- Caso tratado (detectado, não fixo por id): discente com tipo_curso = 'Doutorado' que tem uma
-- orientação de Mestrado concluída E uma orientação de Doutorado em andamento.
-- O que faz, em uma transação:
--   1. cria a ficha do MESTRADO (Titulado, com a conclusão que estava na ficha); ingresso fica vazio
--      (a coordenação preenche); o orientador vem do nome do docente (a ficha antiga pode ter o ID Lattes
--      no texto do orientador, erro antigo do import, que este script não corrige nas fichas existentes);
--   2. aponta as orientações de Mestrado concluídas para a nova ficha;
--   3. devolve a ficha original ao DOUTORADO: Em andamento, sem conclusão.
-- O gatilho da orientação (D-35) cria o egresso do mestrado se ainda não existir.
-- Não apaga nada. Coautorias e demais vínculos ficam na ficha original (doutorado).
BEGIN;

CREATE TEMP TABLE _conflitados ON COMMIT DROP AS
SELECT d.id AS antigo
FROM public.discentes d
WHERE d.tipo_curso = 'Doutorado'
  AND EXISTS (SELECT 1 FROM public.orientacoes o WHERE o.discente_id = d.id AND o.tipo = 'Mestrado' AND o.status = 'concluido')
  AND EXISTS (SELECT 1 FROM public.orientacoes o WHERE o.discente_id = d.id AND o.tipo = 'Doutorado' AND o.status = 'em_andamento');

-- Prévia
SELECT 'fichas a separar' AS passo, count(*) AS n FROM _conflitados;

CREATE TEMP TABLE _mapa (antigo bigint, novo bigint) ON COMMIT DROP;

WITH novas AS (
  INSERT INTO public.discentes
    (nome, cpf, data_ingresso, status, ano_conclusao, tipo_curso, link_lattes, link_comprovacao,
     orientador, docente_orientador_id, observacoes)
  SELECT d.nome, d.cpf, '', 'titulado', d.ano_conclusao, 'Mestrado', d.link_lattes, d.link_comprovacao,
         coalesce((SELECT doc.nome FROM public.docentes doc WHERE doc.id = d.docente_orientador_id), d.orientador),
         d.docente_orientador_id,
         'Ficha do mestrado separada da ficha do doutorado (D-35). Preencher o ingresso.'
  FROM public.discentes d JOIN _conflitados c ON c.antigo = d.id
  RETURNING id, nome
)
INSERT INTO _mapa
SELECT c.antigo, n.id
FROM _conflitados c
JOIN public.discentes d ON d.id = c.antigo
JOIN novas n ON n.nome = d.nome;

UPDATE public.orientacoes o
SET discente_id = m.novo
FROM _mapa m
WHERE o.discente_id = m.antigo AND o.tipo = 'Mestrado' AND o.status = 'concluido';

UPDATE public.discentes d
SET status = 'em_andamento', ano_conclusao = '', data_conclusao = NULL
FROM _mapa m
WHERE d.id = m.antigo;

-- Resultado
SELECT 'fichas de mestrado criadas' AS passo, count(*) AS n FROM _mapa;
SELECT m.antigo AS ficha_doutorado, m.novo AS ficha_mestrado FROM _mapa m ORDER BY 1;
COMMIT;
