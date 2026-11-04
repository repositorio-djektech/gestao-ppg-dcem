# Backlog do MVP — PPG-DCEM

Versão: 1.1 · 2026-11-04 · Formato: histórias no padrão "Como [ator], quero [ação], para [benefício]", com critérios em Given/When/Then.

Fluxos de aceite (D-08):
- **F-01** O docente importa o próprio Lattes e confirma seus vínculos.
- **F-02** O docente edita uma publicação em que é coautor.
- **F-03** A coordenação define o orientador de um discente sem orientador.
- **F-04** Os indicadores ADE e DPI batem com o cálculo manual em três docentes reais.
- **F-05** A coordenação gera o relatório de lacunas sem registros órfãos.

## Épicos
- **E-01 Vínculos** (corrige P1 do diagnóstico): H-01, H-02, H-03, H-06.
- **E-02 Edição pelo docente**: H-04, H-05.
- **E-03 Import Lattes em duas etapas**: H-04.
- **E-04 Cálculo confiável**: H-07, H-08.
- **E-05 Conformidade CAPES no MVP**: H-09, H-10.

## Histórias

| ID | História | Épico | Fluxo | Prioridade | Status |
|---|---|---|---|---|---|
| H-01 | Como docente, quero me definir como orientador de um discente sem orientador, para editar seus dados sem depender da coordenação. | E-01 | F-03 | 1 | **Em validação** (código, testes e migração aplicada; falta verificar F-03 com cada papel) |
| H-02 | Como docente, quero me incluir como coorientador de um discente já orientado, para registrar minha participação. | E-01 | — | 1 | **Em validação** (código e testes prontos; coorientação fora dos cálculos, D-19) |
| H-03 | Como coordenador, quero alterar o orientador principal de um discente, para corrigir vínculos. | E-01 | F-03 | 1 | **Em validação** (caminho já existia pelo formulário; agora coberto por teste e pela RLS) |
| H-04 | Como docente, quero importar meu Lattes e confirmar apenas os meus vínculos antes da gravação, para não depender de busca por sobrenome. | E-03 | F-01 | 2 | Não iniciada |
| H-05 | Como docente coautor, quero editar uma publicação em que sou coautor, para manter os dados corretos. | E-02 | F-02 | 2 | Não iniciada |
| H-06 | Como sistema, não quero vincular publicações ao docente só pelo sobrenome, para evitar atribuições erradas. | E-01 | F-01 | 1 | **Em validação** (código e testes prontos; ver P-13) |
| H-07 | Como coordenador, quero que ADE e DPI sejam conferidos com o cálculo manual em docentes reais, para confiar nos números. | E-04 | F-04 | 2 | Não iniciada |
| H-08 | Como coordenador, quero que o relatório de lacunas não tenha registros órfãos, para ter um painel confiável. | E-04 | F-05 | 2 | Não iniciada |
| H-09 | Como coordenador, quero cadastrar as linhas de pesquisa e vinculá-las a projetos e docentes, para comprovar coerência (item 1.1.1). | E-05 | — | 2 | Não iniciada |
| H-10 | Como coordenador, quero registrar o texto do item 1.3 (políticas afirmativas), para cumprir o requisito obrigatório em 2025–2028. | E-05 | — | 1 | **Em validação** (código, testes e migração aplicada; falta redigir o texto, P-09) |

## Critérios de aceite das histórias de prioridade 1

> Derivados em 2026-11-04 de D-11 e D-12, porque o backlog v1.0 anuncia critérios em Given/When/Then mas não os traz. **Coordenação: confirmar ou ajustar.** Os testes citam o ID da história.

**H-01 — Docente se define orientador**
- Dado um discente sem orientador, quando o docente aciona "Assumir orientação", então `discentes.docente_orientador_id` passa a ser o docente e o texto do orientador acompanha.
- Dado um discente que já tem orientador, quando o docente tenta assumir, então nada é alterado e ele é orientado a se incluir como coorientador.
- Depois de assumir, o docente passa a poder editar o discente.
- O import Lattes só define orientador principal a partir de orientação principal (coorientação não define).
- Testes: `permissoes.test.ts` (P-06, H-01), `vinculos-orientacao.test.ts` (H-01), `AcoesVinculoOrientacao.test.tsx`, `gravar-vinculos.test.ts` (H-01/H-02).
- Também registra a orientação principal em `orientacoes` (D-20), para contar nos indicadores.
- Import por docente (P-15, D-22): o discente criado sem orientador deixa de ser barrado; se não puder ser criado, a orientação não é gravada e o erro é reportado.
- Banco: migrações `20261104120000_discentes_docente_assume_orientacao.sql` e `20261104140000_discentes_insert_docente_sem_orientador.sql` (aplicada em 04/11).

**H-02 — Docente se inclui como coorientador**
- Dado um discente com outro orientador, quando o docente se inclui, então é criada uma orientação do docente com `flag_orientador_principal = false` e o orientador principal não muda.
- Não duplica se o docente já tem orientação com o discente; recusa se o discente não tem orientador ou se o docente já é o principal.
- Ser coorientador não dá permissão de editar o discente (D-24).
- Coorientação não entra em ORI, ATD, SO, PSA e DP4A (D-19). Testes: `principal.test.ts` e bloco P-12 de `indicadores.test.ts`.
- Testes: `permissoes.test.ts` (H-02), `vinculos-orientacao.test.ts` (H-02), `AcoesVinculoOrientacao.test.tsx`.

**H-03 — Coordenação altera o orientador principal**
- Dado um discente (com ou sem orientador), quando a coordenação escolhe outro docente no formulário, então o orientador principal e o texto do orientador são atualizados (F-03).
- O docente nunca troca o orientador principal: o formulário só oferece ele mesmo e a RLS exige `docente_orientador_id` = docente após o UPDATE.
- O auxiliar também altera (D-21). Na troca, a orientação em andamento do anterior é encerrada como cancelada e o novo ganha a principal (D-23).
- Testes: `orientador-form.test.ts`, `permissoes.test.ts` (H-03).

**H-06 — Sem vínculo só por sobrenome**
- Dado um autor "Sobrenome, Iniciais" (ex.: `Silva, R.`), então não é sugerido nem vinculado a docente de mesmo sobrenome.
- Dois sobrenomes sem o primeiro nome também não bastam.
- Continuam casando: nome completo, ordem trocada com vírgula, primeiro nome + sobrenome com inicial do meio, acentos e caixa.
- No import (`resolucao-vinculos.ts`), sobrenome + inicial segue como sugestão não pré-aceita (ver P-13).
- Testes: `matching-docentes.test.ts` (H-06), `resolucao-vinculos.test.ts` (H-06).

**H-10 — Texto do item 1.3**
- Dado um coordenador (ou suporte), quando salva o texto, então ele fica gravado (uma linha por chave) e aparece para todos; sem cálculo.
- Docente, auxiliar e capes só leem. Limite de 4000 caracteres, sem truncar.
- Testes: `politicas-afirmativas.test.ts`, `ppg-textos.test.ts`, `PoliticasAfirmativasEditor.test.tsx`, `permissoes.test.ts` (H-10).
- Banco: migração `20261104130000_ppg_textos_item_1_3.sql` (aplicada em 04/11). Tela: `/politicas-afirmativas`.

**Falta para o DoD de todas:** teste funcional no sistema real com cada papel (docente assume um discente sem orientador; docente não troca orientador de outro; coordenação define/troca orientador, F-03; import de Lattes por docente com discente novo; coordenação salva o texto do item 1.3) e o commit citando o ID. As três migrações já foram aplicadas (04/11).

## Requisitos não funcionais (pendentes)
- **RNF-01 LGPD:** dados pessoais, incluindo CPF de discentes. Depende de P-07 (responsável por backup e acesso). Sem história ainda.

## Definição de Pronto (DoD)
- Teste automatizado passando (`npm test`) e lint limpo (`npm run lint`).
- Regra de negócio atualizada em `docs/` quando mudou.
- Decisão nova registrada em `00-decisoes-e-pendencias.md`.
- Commit citando o ID da história.
- Verificado no fluxo de aceite correspondente com dados reais de forma controlada.

## Ordem sugerida
1. H-01, H-02, H-03, H-06 (vínculos, bloqueiam os cálculos).
2. H-04, H-05 (import e edição).
3. H-07, H-08 (validação dos números).
4. H-09, H-10 (conformidade CAPES).
