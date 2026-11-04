# 00 — Decisões, pendências e riscos

Versão: 1.8 · Atualizado em 2026-11-04 · Fonte de verdade para decisões de produto no repositório.
Cópia de trabalho também no projeto do claude.ai (PO PPG-DCEM).

Legenda de origem: **[Decisão]** = resposta da coordenação. **[Fato]** = documento ou código.

## Decisões

| ID | Decisão | Origem | Efeito |
|---|---|---|---|
| D-01 | Modalidade: **acadêmica**. Pesos profissionais não entram nos cálculos. | Decisão | Vale a ficha acadêmica. |
| D-02 | Referência normativa: **Ficha de Avaliação 2025, Engenharias II**. | Decisão | A4 = 0,675; saturação em B1 ≤ DP. |
| D-03 | Estratos de periódicos: manter o **estrato atual** até a CAPES confirmar a nova classificação. | Decisão | Dependência externa (P-02). |
| D-04 | Usuários operacionais: coordenação, docentes e auxiliares. Perfil `capes` só para demonstração. | Decisão | Avaliadores externos fora do escopo atual. |
| D-05 | Docente edita o que é referente a ele: dados pessoais, indicadores, discentes, orientações e publicações. | Decisão | Permissões já previstas; falta corrigir vínculos. |
| D-06 | Coautores docentes e coordenação editam registros compartilhados. | Decisão | Consistente com `publicacoes_docentes`. |
| D-07 | Import Lattes em duas partes: o docente confirma seus vínculos; depois a coordenação deduplica e depura. | Decisão | Nova visão do docente no import. |
| D-08 | Escopo do MVP: funcionalidades que funcionam corretamente com uso real, com os fluxos de aceite F-01 a F-05 (ver `backlog.md`). | Decisão | Critério de pronto da primeira entrega. |
| D-09 | Campos qualitativos e autoavaliação ficam **fora do MVP**, exceto o texto do item 1.3 (D-12). | Decisão | Coordenação registra esses itens fora do sistema por ora (R-01). |
| D-10 | Avaliadores externos e perfil `capes` fora do escopo atual. | Decisão | Sem campos próprios para avaliadores. |
| D-11 | **Docente vincula os próprios discentes e os edita**, sem depender da coordenação. Se o discente não tem orientador, o docente pode se definir como orientador. Se já tem orientador, o docente pode se incluir como **coorientador**; só a coordenação altera o orientador principal. | Decisão (04/11) | Corrige o bug de orientador (P-06 → H-01, H-02, H-03). |
| D-12 | O item **1.3 (políticas afirmativas de inclusão, permanência e acessibilidade)** é obrigatório em 2025–2028 e **entra no MVP** como texto curto, editável pela coordenação. | Decisão (04/11) | Novo: H-10. Fecha R-06 na parte do texto. |
| D-13 | A data de submissão à CAPES **não é necessária agora**. Risco aceito por enquanto. | Decisão (04/11) | R-03 aceito. |
| D-14 | `CLAUDE.md` na raiz e `docs/po/` no repositório são a fonte de contexto para o Claude Code. | Decisão (04/11) | Ver `CLAUDE.md`. |
| D-15 | **Coorientador = orientação não principal** (`orientacoes.flag_orientador_principal = false`), o mesmo formato que o import Lattes já grava. Coorientador **não** ganha permissão de editar o discente. | Decisão técnica (implementação H-02, 04/11) — **validar** | Ver P-11, P-12 e P-14. |
| D-16 | **Sobrenome com inicial não vincula docente a publicação.** Só casa com o primeiro nome por extenso + sobrenome (aceita inicial do meio). Sobrenome + inicial no import segue como sugestão manual, nunca pré-aceita. | Decisão técnica (implementação H-06, 04/11) — **validar** | Ver P-13. |
| D-17 | O texto do item 1.3 fica em `ppg_textos` (chave `item_1_3_politicas_afirmativas`, limite de 4000 caracteres), editável por **suporte e coordenador**; todos leem. O auxiliar não edita. | Decisão técnica (implementação H-10, 04/11) — **validar** | Ver P-10 e P-18. |
| D-18 | A coordenação, para fins de alterar o orientador principal (H-03), inclui os papéis que já editam discentes pela RLS (suporte, coordenador, auxiliar). Foi mantido o comportamento existente para não retirar capacidade da secretaria sem decisão. | Decisão técnica (implementação H-03, 04/11) — **validar** | Ver P-10. |
| D-19 | **Coorientação não conta nos cálculos** (ORI, ATD, SO, PSA, DP4A). Coorientação = vínculo não principal (`flag_orientador_principal = false`) de docente que **não** é o orientador principal do discente. Base na ficha: ORI = (M+3D)/(DP−JDP) e ATD = .../(M+2D) contam dissertações e teses (o trabalho, uma vez), não vínculos; SO, PSA e DP4A falam só em "orientações ativas/titulações" do DP e **não mencionam coorientação** (a ficha é silenciosa). | Decisão (04/11, PO) | `lib/orientacoes/principal.ts`, usado em `lib/capes/indicadores.ts`. A fórmula não mudou; mudou o insumo. Ver P-12. |
| D-20 | **Assumir a orientação (H-01) também registra a orientação principal** em `orientacoes` (`flag_orientador_principal = true`), para contar nos indicadores e na Recondução. Se o discente já tem orientador, o docente entra como coorientador (H-02). | Decisão (04/11, PO) | Fecha P-14 para a H-01. |
| D-21 | O **auxiliar pode** alterar o orientador principal (mantido o que a RLS já permite). | Decisão (04/11, PO) | Confirma D-18; fecha P-10. |
| D-22 | O import Lattes feito por docente cria discente **sem orientador**; a RLS de INSERT aceita orientador nulo ou o próprio docente. Se o discente não puder ser criado, a orientação **não** é gravada e o erro é reportado. | Decisão (04/11, PO: "corrija isso") | Fecha P-15. Migração `20261104140000` (aplicada em 04/11). |
| D-23 | **Troca do orientador principal pela coordenação encerra a orientação do anterior** e cria a principal do novo. "Encerrar" = `cancelado = true` (datas preservadas), só para orientação **em andamento** do anterior com aquele discente; orientação já concluída ou defendida não é tocada. Não usa "concluída" porque uma data de fim passada viraria titulação em ORI e PSA. | Decisão (04/11, PO) | `sincronizarTrocaDeOrientador`, chamada pelo formulário de Discentes. Fecha P-19. |
| D-24 | **Coorientador não edita o discente** (confirma D-15). | Decisão (04/11, PO) | Fecha P-11. |
| D-25 | **Visão restrita do docente.** O docente vê só o que é dele: Lacunas (só os números dele em todos os cards), Credenciamento (5 cards gerais, só o próprio nome na lista), Docentes (CPF e SIAPE só do próprio; "Editar Identificação" só no próprio) e Discentes (os que orienta, os que coorienta e os sem orientador). Suporte, coordenador e auxiliar não mudam. **O docente não se inclui mais como coorientador:** a coordenação vincula pela tela Orientações. Supera a parte de coorientação da D-11/D-15 (sem editá-las). | Decisão (04/11, PO) | H-11 a H-14. Restrição só de interface (P-20). |
| D-26 | **Status do discente:** Em andamento, Titulado ou Desligado. A data de conclusão define: sem data ou futura = Em andamento; hoje ou passada = Titulado. Desligado é manual e prevalece. "Concluído" deixa de existir (vira Titulado). | Decisão (04/11, PO) | H-15. Migração `20261105120000` (P-21). |
| D-27 | **Visão restrita do docente em mais telas.** Orientações: só as próprias e coorientações (com badges por tipo, coluna Término, "—" sem data). Linhas de Pesquisa: sem coluna Ações. Projetos de Pesquisa: vê os que coordena e aqueles em que participa; **edita e apaga só como coordenador, participante apenas visualiza**. Publicações: só as vinculadas a ele (CRUD nas próprias). Patentes e Produção Técnica: só as vinculadas a ele (CRUD nas próprias), por **novas tabelas de vínculo** (`patentes_docentes`, `producao_tecnica_docentes`), como em publicações. Impressão (`/imprimir/*`) aplica a mesma visão. Visuais: Atuação Profissional de Egressos à esquerda; sem ícone de estrelinhas no Impacto Social. | Decisão (04/11, PO) | H-16 a H-22. Migração `20261105130000` (aplicada em 04/11). Restrição de leitura só de interface (P-20). |

## Pendências

| ID | Pendência | Situação | Dono sugerido |
|---|---|---|---|
| P-01 | Pesos dos quesitos 1, 2 e 3 em nível macro. | **Parcial.** Pesos de itens e subitens acadêmicos confirmados pela ficha (imagens de 04/11). Pesos macro não aparecem nas imagens. | Desenvolvedor, na ficha original |
| P-02 | Nova classificação de periódicos (A1–A8). | Aberta. Sem data da CAPES. | Coordenação |
| P-03 | Coeficiente A4 de 0,625 e saturação em A5 em fontes históricas. | Histórico. Confirmar que relatórios antigos não são reusados. | Desenvolvedor |
| P-04 | Nome do ciclo ("Ficha 2025", "quadriênio 2025–2028", "Quadrienal 2029"). | Aberta. Assumido como o mesmo ciclo. | Coordenação |
| P-05 | Linhas de pesquisa atuais. | **Fechada:** preenchidas pela coordenação em 04/11. | — |
| P-06 | Bug do orientador. | Convertida em H-01, H-02 e H-03 (D-11). | — |
| P-07 | Responsável por backup e acesso ao banco de produção. | Aberta. Há CPFs reais de discentes. | Coordenação |
| P-08 | Quando e quem preenche os campos qualitativos. | Aberta, após o MVP. | Coordenação |
| P-09 | Texto do item 1.3 (políticas afirmativas). | Decisão tomada (D-12). Falta redigir o texto. | Coordenação, com apoio |
| P-10 | O auxiliar pode alterar o orientador principal? | **Fechada (04/11):** sim (D-21). | — |
| P-11 | O coorientador pode editar o discente? | **Fechada (04/11):** não (D-24). | — |
| P-12 | Indicadores e coorientação. | **Fechada (D-19)**, com ressalva: a ficha é silenciosa sobre coorientação em SO, PSA e DP4A; o critério vem da decisão do PO. **Os valores reais podem mudar:** orientações lançadas à mão têm flag `false` por padrão e só contam se o docente é o orientador do discente (ou se o discente não tem orientador). Conferir ORI, SO, PSA e DP4A antes e depois, com dados reais, de forma controlada. | Coordenação + desenvolvedor |
| P-13 | Sobrenome + inicial no import (`resolucao-vinculos.ts`) e no `SeletorDocentesAutores` segue como sugestão de confiança média (0,75), sem pré-seleção. Remover de vez também aí? Mexer exige alterar `calcularSimilaridadeNome`, que também alimenta discentes/egressos. | Aberta | Desenvolvedor |
| P-14 | Duas fontes de "orientador principal" (`discentes.docente_orientador_id` e `orientacoes.flag_orientador_principal`). | **Fechada para a H-01 (D-20).** Aberta para a H-03: ver P-19. | — |
| P-15 | Import feito por docente: o discente criado sem orientador era barrado pela RLS e a falha era silenciosa, deixando orientação sem `discente_id`. | **Fechada (D-22):** teste reproduziu o problema; código corrigido; falta aplicar a migração `20261104140000` (P-17). | — |
| P-16 | A RLS de `orientacoes` deixa o docente inserir orientação com `flag_orientador_principal = true` para qualquer discente, contornando "só a coordenação altera o orientador principal". A interface não oferece isso. Avaliar trigger ou política. | Aberta | Desenvolvedor |
| P-17 | Conferir as políticas do banco real e aplicar as migrações. | **Fechada (04/11):** `discentes_update` e `discentes_insert` do banco real eram idênticas às das migrações; as 3 migrações (`20261104120000`, `20261104130000`, `20261104140000`) foram aplicadas com `supabase db push` no projeto PPG-DCEM e conferidas em `pg_policies` (RLS ativa em `ppg_textos`). Contagens de discentes e orientações inalteradas. Não existe staging (sem branches): foi aplicado direto, por ser só política e tabela nova. **Falta o teste funcional com cada papel** (ver backlog). | — |
| P-18 | Limite do texto do item 1.3 (4000 caracteres) e quem redige (P-09). | Aberta | Coordenação |
| P-19 | Troca do orientador principal pela coordenação e `orientacoes`. | **Fechada (D-23).** Efeito colateral: a orientação cancelada do anterior deixa de contar em ORI/SO/PSA/DP4A e no critério I da Recondução, mesmo que ele tenha orientado por um período. | — |
| P-20 | **Restrição do docente só na interface.** A RLS de leitura continua `USING (true)`: um docente que consulte a API enxerga CPF, SIAPE, discentes e demais registros. Para proteção real é preciso restringir `SELECT` por papel nas tabelas `docentes` (colunas sensíveis, p.ex. via view) e `discentes`, e revisar o que depende de ler tudo (publicações, coautoria, Lacunas, Edge Functions). Decidido (04/11) começar só pelo front-end. | **Aberta (segurança)** | Desenvolvedor + coordenação |
| P-21 | Migração `20261105120000_discentes_data_conclusao_e_status.sql` (H-15) **não aplicada**. Ela recria a CHECK `discentes_status_check`, que existe no banco real mas **não está nas migrações do repositório** (divergência). Aplicar junto da publicação do frontend novo (o novo grava `em_andamento`, o antigo grava `ativo`). Conferido em leitura: 39 discentes, todos `ativo`, sem `ano_conclusao`. | Aberta | Responsável pelo banco |
| P-22 | Interpretações assumidas na D-25: "CIAP" = **SIAPE** (não existe CIAP no sistema) e "o nome do próprio discente" no Credenciamento = próprio **docente**. Confirmar. | Aberta (confirmação) | Coordenação |
| P-23 | No relatório de Lacunas do docente, registros por nome em texto (eventos, patentes, premiações, produção técnica, mobilidade) só entram se o nome dele aparecer **por extenso** (H-06); autores abreviados ("Barreto, L. S.") não contam. Os números dele podem ficar menores que o real nessas tabelas. | Aberta (aceito) | Coordenação |
| P-24 | Aplicar a migração `20261105130000_patentes_producao_tecnica_docentes_e_projetos.sql` (D-27). | **Fechada (04/11):** aplicada com `supabase db push` e conferida em `pg_policies` (RLS ativa nas duas tabelas novas, políticas antigas `*_staff` de patentes e produção técnica substituídas). Dados inalterados: 4 patentes, 2 produções técnicas, 9 projetos, 0 vínculos. | — |
| P-25 | **Patentes e produções técnicas já cadastradas ficam sem vínculo a docente** (só existe o nome em texto em `autores`; hoje são 4 patentes e 2 produções técnicas, sem nenhum vínculo). O docente não as vê até a coordenação vincular os docentes autores no formulário (a tela sugere pelo nome). Nada é preenchido automaticamente por nome. | Aberta | Coordenação |
| P-26 | O docente só vincula **a si mesmo** em patentes e produção técnica (a RLS segue o molde de `publicacoes_docentes`); a coordenação vincula os demais coautores. | Aberta (confirmar) | Coordenação |

## Riscos

| ID | Risco | Situação |
|---|---|---|
| R-01 | Autoavaliação e planejamento fora do sistema reduzem a rastreabilidade. | Aberto. Mitigação: anexar ao menos um resumo. |
| R-02 | Vínculos errados distorcem os indicadores. | Aberto. Atacado por H-01 a H-06. |
| R-03 | Sem data de submissão, as prioridades podem mudar. | **Aceito** (D-13). |
| R-04 | Dados pessoais (CPF) sem requisito de LGPD documentado. | Aberto. Depende de P-07. |
| R-05 | Mudança para A1–A8 exige recalcular toda a produção. | Aberto, depende de P-02. Manter a classificação isolada da lógica de cálculo. |
| R-06 | Item 1.3 obrigatório em 2025–2028 fora do MVP. | **Mitigado** pela D-12 (texto no MVP). Ainda falta a redação. |
| R-07 | Coorientações inflavam ORI/SO/PSA/DP4A e "assumir orientação" não contava nos indicadores. | **Mitigado** (D-19, D-20). Resta P-19 e a conferência dos valores reais (P-12). |

## Divergências entre documentação e código (sessão H-01, H-02, H-03, H-06, H-10 — 2026-11-04)

| # | Documentação | Código | Situação |
|---|---|---|---|
| 1 | `backlog.md` v1.0 diz ter critérios em Given/When/Then por história. | Não havia critérios no arquivo. | Derivados de D-11/D-12 e registrados no backlog v1.1. **Confirmar.** |
| 2 | P-06 / hipótese: docente não consegue se vincular a discente sem orientador. | **Confirmada** em três camadas: `podeEditarRegistro` (frontend), formulário (botão Editar oculto) e RLS `discentes_update` (exige `docente_orientador_id` = docente). | Corrigido: ação "Assumir orientação" + migração (aplicada em 04/11). |
| 3 | `gravar.ts` (~linha 1068) "só define orientador quando não há". | Verdadeiro, mas também definia o orientador **a partir de coorientação** (`flag_orientador_principal = false`). | Corrigido e coberto por teste. Não corrigido: o texto `orientador` usa `docente_identificador`, que pode ser o ID Lattes, quando o nome não é resolvido. |
| 4 | `seguranca-e-perfis.md` §2.2: discentes/egressos "onde é o `docente_orientador_id` ou orientador formal". | `isOrientadorVinculado` nunca é informado nas telas de discentes (só `ProjetosPesquisa` passa `getContextoItem`): o ramo é inativo. Também "disciplinas: integrante da equipe docente" não existe em `podeEditarRegistro`. | Documentação ajustada para discentes; disciplinas não tratado. |
| 5 | `regras-de-negocio-e-modulos.md`: "casamento textual exige ao menos 2 termos do nome". | `matching-docentes.ts` aceitava sobrenome + inicial (até 0,88, pré-selecionado). | Corrigido (H-06). Testes antigos que exigiam esse casamento foram alterados. |
| 6 | Ficha: o item 1.3 é "Planejamento estratégico" (1.3.1 a 1.3.3); políticas afirmativas são o trecho final da descrição, com asterisco. D-12 chama de "item 1.3 (políticas afirmativas)". | Tela e rota usam o rótulo "Políticas afirmativas (item 1.3)". | Nomenclatura seguida conforme D-12. |
| 7 | `modelo-de-dados.md` lista as tabelas. | Nova tabela `ppg_textos` (migração aplicada em 04/11). | Documentação atualizada. |
| 8 | Ficha, itens 2.1.1, 2.1.2, 2.5.1 a 2.5.3: ORI e ATD contam dissertações e teses; SO, PSA e DP4A falam em orientações/titulações do DP. Nenhum menciona coorientação. | `indicadores.ts` somava toda linha de `orientacoes`, inclusive coorientação (a dissertação podia contar duas vezes em ORI). | Corrigido pela D-19. A ficha não decide SO/PSA/DP4A; vale a decisão do PO. |
| 9 | Banco: `orientacoes.flag_orientador_principal` é `NOT NULL DEFAULT false`; a tela de Orientações não grava a flag. | Orientação manual fica com `false`, indistinguível de coorientação só pela flag. | A D-19 usa também o orientador do discente. Ver P-12 e P-19. |
| 10 | Banco real tem a CHECK `discentes_status_check` (ativo, concluido, titulado, desligado). | Nenhuma migração do repositório a cria. | Será recriada pela `20261105120000` (P-21). |
| 11 | Projetos de Pesquisa: o código e a RLS (`projetos_pesquisa_update`) deixavam o **participante** editar. | D-27: participante só visualiza. | Código corrigido; RLS corrigida pela `20261105130000` (aplicada em 04/11). |
| 12 | Impressão (`/imprimir/<módulo>`) lia os serviços direto, sem a visão restrita. | Um docente poderia imprimir a lista completa (inclusive CPF de discentes) e contornar os filtros das telas. | Corrigido: a impressão aplica os mesmos filtros e espera o papel carregar. |
| 13 | Impactos sociais (`impactos_vinculos`) só aceitam escrita da coordenação. | Um docente criando patente ou produção técnica falharia na etapa dos impactos. | Tratado pela `20261105130000` (aplicada em 04/11): política só para registros a que o docente está vinculado. |
