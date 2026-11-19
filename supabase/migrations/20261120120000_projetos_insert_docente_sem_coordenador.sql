-- D-33 (H-26): projetos importados do Lattes pelo docente.
--
-- Antes, o docente só podia CRIAR projeto em que ele mesmo era o coordenador. No import do próprio
-- currículo, os projetos em que ele é apenas participante (ou cujo coordenador não está cadastrado)
-- eram barrados e apareciam como "ignorados". Agora o docente pode criar projeto com coordenador
-- VAZIO ou ele mesmo; o import o registra como participante em projetos_participantes (a RLS dessa
-- tabela já permite gravar a própria linha).
--
-- Não muda o que o docente pode EDITAR ou APAGAR: continua só o projeto que coordena (D-27:
-- participante apenas visualiza). Não permite criar projeto coordenado por outro docente.

DROP POLICY IF EXISTS "projetos_pesquisa_insert" ON public.projetos_pesquisa;

CREATE POLICY "projetos_pesquisa_insert"
  ON public.projetos_pesquisa
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_staff()
    OR (
      public.get_user_role() = 'docente'
      AND public.get_user_docente_id() IS NOT NULL
      AND (
        coordenador_id IS NULL
        OR coordenador_id = public.get_user_docente_id()
      )
    )
  );
