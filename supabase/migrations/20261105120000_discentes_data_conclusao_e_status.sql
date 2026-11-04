-- D-26: status do discente = Em andamento, Titulado ou Desligado, derivado da data de conclusão.
--   - sem data ou data futura = em_andamento; data de hoje/passada = titulado; desligado é manual.
--   - a derivação é feita pela aplicação (src/lib/discentes/status.ts); o banco guarda o valor.
--
-- Mudanças:
--   1. Nova coluna discentes.data_conclusao (date, opcional). ano_conclusao continua existindo.
--   2. Valores antigos de status: ativo -> em_andamento, concluido -> titulado.
--   3. A CHECK discentes_status_check do banco real (que NÃO está nas migrações do repositório;
--      aceitava ativo/concluido/titulado/desligado) é recriada com os 3 valores novos.
--
-- Conferido em leitura no banco real antes de escrever: 39 discentes, todos 'ativo', nenhum com
-- ano_conclusao preenchido, então nenhum titulado legado a preservar.
--
-- Aplicada no projeto PPG-DCEM em 2026-11-04 (supabase db push) e conferida no banco.
--
-- ORDEM DE APLICAÇÃO (histórico): o frontend novo grava 'em_andamento' e o antigo grava 'ativo'. Aplicar esta
-- migração e publicar o frontend novo no mesmo momento (janela de poucos minutos).
-- Reversão: recriar a CHECK com os 4 valores antigos e UPDATE inverso
--   (em_andamento -> ativo, titulado -> concluido), e DROP COLUMN data_conclusao.

ALTER TABLE public.discentes ADD COLUMN IF NOT EXISTS data_conclusao date;

ALTER TABLE public.discentes DROP CONSTRAINT IF EXISTS discentes_status_check;

UPDATE public.discentes SET status = 'em_andamento' WHERE status = 'ativo';
UPDATE public.discentes SET status = 'titulado' WHERE status = 'concluido';

ALTER TABLE public.discentes ALTER COLUMN status SET DEFAULT 'em_andamento';

ALTER TABLE public.discentes
  ADD CONSTRAINT discentes_status_check
  CHECK (status IN ('em_andamento', 'titulado', 'desligado'));
