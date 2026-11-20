-- P-36: discentes com o ID Lattes (só dígitos) no texto `orientador`, erro antigo do import.
-- Troca pelo NOME do docente vinculado (docente_orientador_id). Só mexe em quem tem o ID Lattes no
-- texto E docente vinculado; não toca em nenhuma outra coluna nem em fichas com nome já correto.
-- O valor antigo (ID Lattes) é recuperável pelo `id_lattes` do docente vinculado.
BEGIN;

SELECT 'a corrigir' AS passo, count(*) AS n
FROM public.discentes d
WHERE d.orientador ~ '^\d{10,}$'
  AND EXISTS (SELECT 1 FROM public.docentes doc WHERE doc.id = d.docente_orientador_id);

UPDATE public.discentes d
SET orientador = doc.nome
FROM public.docentes doc
WHERE doc.id = d.docente_orientador_id
  AND d.orientador ~ '^\d{10,}$';

SELECT 'ainda com ID Lattes' AS passo, count(*) AS n FROM public.discentes WHERE orientador ~ '^\d{10,}$';
COMMIT;
