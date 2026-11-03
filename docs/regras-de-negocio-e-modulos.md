# Módulos Especializados e Regras de Negócio — Gestão PPG DCEM

Este documento detalha os três módulos centrais de inteligência acadêmica do sistema: o **Painel de Lacunas Cadastrais**, o **Painel de Recondução e Credenciamento Docente** e o **Painel de Indicadores CAPES**.

---

## 1. Módulo de Lacunas Cadastrais (`/lacunas`)

### 1.1 Propósito

O painel de **Lacunas** realiza auditoria automatizada em tempo real sobre os registros do banco de dados, identificando inconsistências, ausência de identificadores internacionais, omissão de vínculos e pendências que prejudicam a nota do programa na avaliação quadrienal da CAPES.

### 1.2 As 34 Regras de Auditoria Ativas (10 Tabelas)

Implementadas em `src/lib/lacunas/regras.ts` (16 críticas e 18 de atenção; o tipo `SeveridadeLacuna` só prevê esses dois níveis):

| Tabela | ID da Regra | Descrição da Lacuna | Severidade | Grupo Temático |
| :-- | :-- | :-- | :--: | :-- |
| **`docentes`** | `docente_sem_scopus_id` | Docente sem Scopus ID | Crítica | Identificadores e Métricas |
|  | `docente_sem_openalex_id` | Docente sem OpenAlex ID | Atenção | Identificadores e Métricas |
|  | `docente_sem_id_lattes` | Docente sem ID Lattes | Crítica | Identificadores e Métricas |
|  | `docente_indice_h_ausente_ou_zero` | Docente com índice-h ausente ou zero | Atenção | Identificadores e Métricas |
|  | `docente_sem_bolsa_cnpq` | Docente sem bolsa CNPq informada | Atenção | Fomento e Bolsas |
|  | `docente_permanente_sem_linha_pesquisa` | Docente permanente sem linha de pesquisa | Crítica | Acadêmico |
|  | `docente_sem_projeto_pesquisa` | Docente sem participação estruturada em projeto | Atenção | Acadêmico |
|  | `docente_jdp_expirado` | Docente marcado como JDP com condição expirada (4 anos como JDP ou doutorado há mais de 10 anos) | Atenção | Identificação Cadastral |
|  | `docente_jdp_sem_categoria_permanente` | Docente marcado como JDP sem categoria Permanente | Crítica | Identificação Cadastral |
| **`discentes`** | `discente_sem_cpf` | Discente sem CPF | Crítica | Identificação Cadastral |
|  | `discente_sem_data_ingresso` | Discente sem data de ingresso | Atenção | Identificação Cadastral |
|  | `discente_sem_link_lattes` | Discente sem link Lattes | Atenção | Identificação Cadastral |
|  | `discente_sem_status` | Discente sem status | Crítica | Situação Acadêmica |
|  | `discente_sem_docente_orientador` | Discente sem orientador vinculado | Crítica | Acadêmico |
|  | `discente_sem_projeto_pesquisa` | Discente sem projeto de pesquisa vinculado | Atenção | Acadêmico |
| **`publicacoes`** | `publicacao_sem_ano` | Publicação sem ano | Crítica | Produção |
|  | `publicacao_sem_doi` | Publicação sem DOI | Atenção | Produção |
|  | `publicacao_sem_periodico` | Publicação sem periódico | Atenção | Produção |
|  | `publicacao_jcr_sem_docente_vinculado` | Publicação JCR ≥ 1,0 sem docente vinculado | Atenção | Produção |
| **`orientacoes`** | `orientacao_sem_docente` | Orientação sem docente vinculado | Crítica | Acadêmico |
|  | `orientacao_sem_discente` | Orientação sem discente vinculado | Crítica | Acadêmico |
|  | `orientacao_sem_periodo` | Orientação sem período de início | Atenção | Acadêmico |
| **`projetos_pesquisa`** | `projeto_sem_coordenador` | Projeto sem coordenador vinculado | Crítica | Acadêmico |
|  | `projeto_sem_periodo` | Projeto sem período de início | Atenção | Acadêmico |
|  | `projeto_financiado_sem_orgao_fomento` | Projeto financiado sem órgão de fomento | Atenção | Acadêmico |
| **`eventos`** | `evento_sem_docente` | Evento sem vinculação de docente | Crítica | Difusão |
|  | `evento_sem_data` | Evento sem local/data informada | Atenção | Difusão |
| **`mobilidade_docente`** | `mobilidade_sem_pessoa` | Mobilidade sem docente/discente vinculado | Crítica | Difusão |
|  | `mobilidade_sem_periodo` | Mobilidade sem período | Atenção | Difusão |
| **`patentes`** | `patente_sem_autores` | Patente sem inventores/vinculação | Crítica | Produção |
|  | `patente_sem_deposito` | Patente sem número de depósito (INPI) | Atenção | Produção |
| **`premiacoes`** | `premiacao_sem_premiado` | Premiação sem premiado vinculado | Crítica | Difusão |
|  | `premiacao_sem_ano` | Premiação sem ano | Atenção | Difusão |
| **`producao_tecnica`** | `producao_tecnica_sem_autores` | Produção técnica sem autores vinculados | Crítica | Produção |

### 1.3 Recursos da Interface de Lacunas

- **Filtros e Agrupamento:** Filtragem por severidade (Crítica, Atenção), por grupo temático ou por busca textual.
- **Ação Rápida de Correção:** Cada card de lacuna dispõe de botão de atalho que abre diretamente o modal de edição do registro afetado ou aciona deep-link para a tela de origem.
- **Relatório Impresso / PDF:** Geração de relatório de pendências acadêmicas formatado para colegiado via `imprimirRelatorioLacunasViaIframe` (gerado em iframe oculto).

---

## 2. Módulo de Recondução e Credenciamento (`/reconducao`)

### 2.1 Propósito e Fundamento Normativo

O painel de **Recondução** implementa o cálculo e a verificação automática dos critérios exigidos pela **Norma Interna do PPG-DCEM (§ 4º)** para a recondução de docentes permanentes no quadriênio **2025–2028**.

### 2.2 Os 4 Critérios Avaliados

1. **Critério I — Orientação de Alunos:** O docente orientou alunos no P²CEM como **orientador principal** no quadriênio (`flag_orientador_principal = true`). Orientação concluída conta pelo ano da defesa/término; orientação em andamento conta se esteve vigente em algum ano de 2025–2028, mesmo iniciada antes; orientação cancelada nunca conta.
2. **Critério II — Docência em Disciplinas:** O docente ministrou disciplinas ofertadas no programa no quadriênio. Consideram-se os docentes de `disciplinas.docente_id` e da tabela N:N `disciplinas_docentes`; disciplina sem ano identificável é aceita como evidência.
3. **Critério III — Projetos Financiados:** O docente participou de projeto de pesquisa com fomento aprovado no quadriênio, como coordenador ou integrante.
4. **Critério IV — Produção Qualificada e Índice PDQ:**
   - **Fórmula:**
     $$\text{PDQ} = \frac{\text{NP}}{\text{MSc} + \text{DSc}}$$
   - **Pré-condição:** O docente deve ter concluído no mínimo 2 titulações no quadriênio ($\text{MSc} + \text{DSc} \ge 2$).
   - **Meta:** $\text{PDQ} \ge 1{,}000$.
   - **NP (Número de Publicações Qualificadas):** Artigos com Fator de Impacto $\text{JCR} \ge 1{,}0$ com **coautoria confirmada** com orientando ou egresso do programa (registrada na tabela `publicacoes_coautores_programa`).

### 2.3 Vereditos do Sistema

Docentes que não são da categoria permanente recebem sempre `NAO_APLICAVEL`. Para permanentes:

- **Reconduzido (`RECONDUZIDO`):** Cumpre os Critérios I, II, III e a meta do Critério IV ($\text{PDQ} \ge 1{,}0$).
- **PDQ insuficiente (`PDQ_INSUFICIENTE`):** Não atinge o mínimo de 2 titulações concluídas no quadriênio, então o PDQ fica indefinido (nunca zero).
- **Não atende (`NAO_ATENDE`):** Tem ao menos 2 titulações, mas descumpre algum critério (I, II, III) ou o PDQ calculado fica abaixo de 1,0.
- **Não aplicável (`NAO_APLICAVEL`):** Docente colaborador, visitante ou sem categoria definida.

Nos cálculos, o casamento textual de autores (usado só quando o docente não tem vínculo em `publicacoes_docentes`) exige ao menos 2 termos do nome, para que um sobrenome comum isolado não atribua a publicação a outro docente.

---

## 3. Módulo de Indicadores CAPES (`/indicadores`)

### 3.1 Propósito

O painel de **Indicadores CAPES** reproduz a Ficha de Avaliação da **Área Engenharias II (Quadriênio 2025–2028)**, consolidando métricas para preenchimento dos relatórios de autoavaliação e Coleta Sucupira.

### 3.2 Indicadores Implementados (`src/lib/capes/indicadores.ts`)

São 20 indicadores. Os pesos (`pesoPercentual`) seguem a configuração do código; ADE, H2 e FOR são de **estoque** (sem anualização) e os demais são calculados **ano a ano** e agregados pela MMA.

| Código | Indicador | Item da ficha | Peso (%) | Fórmula resumida |
| :-- | :-- | :-- | :--: | :-- |
| ADE | Adequação do corpo docente | 1.2.1 | 15 | DP / (DP + DC + DV), em % (estoque) |
| ORI | Titulações por docente permanente | 2.1.1 | 10 | (M + 3D) / (DP − JDP) |
| ATD | Artigos A1–A4 com discente/egresso por titulação | 2.1.2 | 10 | artigos A1–A4 com coautoria / (M + 2D) |
| DPIDE1 | DPI com coautoria de discentes e egressos | 2.2.1 | 10 | fórmula do DPI sobre publicações com coautoria |
| DPTDE1 | DPT com coautoria de discentes e egressos | 2.2.1 | 0 (ver nota) | (periódicos + anais + capítulos com coautoria) / (DP − JDP) |
| DPIDE2 | DPI das publicações nível 2 com discentes | 2.2.2 | 12 | fórmula do DPI sobre nível 2 com coautoria |
| DPI | Produção docente ponderada | 2.4.1 | 6 | [A1 + 0,875·A2 + 0,75·A3 + 0,675·A4 + 0,5·min(B1, DP)] / (DP − JDP) |
| DPT | Produção total dos docentes | 2.4.1 | 2 | (periódicos + anais + capítulos) / (DP − JDP) |
| DPD | Distribuição da produção qualificada | 2.4.2 | 3 | % dos DP com publicação A1–A4 no ano |
| DPI2 | Melhores publicações do programa (nível 2) | 2.4.3 | 6 | fórmula do DPI sobre publicações nível 2 |
| SO | Orientações ativas | 2.5.1 | 2 | % dos DP com orientação ativa no ano |
| PSA | DP sem titulações | 2.5.2 | 2 | % dos DP regulares (sem JDP) sem defesa M/D no ano |
| DP4A | Equilíbrio nas 4 atividades | 2.5.3 | 2 | % dos DP com orientação, aula na pós, projeto e periódico no ano |
| ATI | Disciplinas de pós por docente | 2.5.4 | 2 | disciplinas de pós no ano / DP |
| NICT | IC e IT por docente | 2.5.5 | 1 | (IC + IT no ano) / DP |
| NDISC | DP sem aulas de graduação | 2.5.5 | 1 | % dos DP sem disciplina de graduação no ano |
| DPPn | Patentes nacionais | 3.1.1 | 8 | [licenciadas + 0,6·concedidas + 0,3·depositadas] / (DP − JDP) |
| DPPi | Patentes internacionais | 3.1.1 | 10 | idem, patentes internacionais |
| H2 | Índice H2 do programa | 3.1.1 | 12 | maior h tal que h permanentes tenham índice-h ≥ h (estoque) |
| FOR | DP com bolsa PQ ou DT do CNPq | 3.3.2 | 25 | DP com PQ/DT / DP, em % (estoque; quesito 3.3) |

Notas:

- **DPTDE1:** a ficha dá 10% ao item 2.2.1 sem dividir entre DPIDE1 e DPTDE1; o peso fica no DPIDE1 e o DPTDE1 aparece com peso 0 para não contar duas vezes.
- **FOR:** o item 3.3.2 é qualitativo/comparativo (25% dentro do quesito 3.3, que vale 40%). O FOR é só um dos descritores citados na ficha; separa nível 1 (PQ-SR, 1A–1D, DT 1A–1B) e nível 2 (PQ 2, DT 2) e ignora colaboradores e visitantes.

Regras comuns a todos os cálculos:

- **JDP (`src/lib/capes/jdp.ts`):** categoria permanente com `jdp = true`, no máximo 4 anos civis como JDP (`jdp_desde = 2025` vale de 2025 a 2028 e sai em 2029) e doutorado há menos de 10 anos (`ano_doutorado = 2016` vale até 2025 e sai em 2026). JDP válidos entram no DP e saem do denominador efetivo (DP − JDP). A validade é avaliada **ano a ano** do quadriênio, então quem completa o prazo volta ao denominador naquele ano. A regra de Lacunas `docente_jdp_expirado` usa o mesmo critério.
- **Janela dos egressos (ATD, DPIDE1, DPIDE2, DPTDE1):** a coautoria de egresso só vale se `ano da publicação ≤ ano de titulação + 5`; discente em formação (orientando) sempre vale. Egresso sem `ano_titulacao` continua contando e gera um aviso nos insumos do indicador.
- **Pesos Qualis:** A1 = 1,0; A2 = 0,875; A3 = 0,75; A4 = 0,675; B1 = 0,5 com saturação `min(B1, DP)`; B2 a C = 0.
- **Publicação conta uma única vez** em DPI, DPT, DPIDE1, DPTDE1, DPIDE2 e DPI2, mesmo vinculada a vários docentes permanentes.
- **Patentes:** o ano vem de `patentes.ano_deposito`; sem ele, cai no ano de cadastro (`created_at`), que é só uma aproximação. O âmbito é `ambito` ou, na falta, o prefixo do registro (BR = nacional; PCT/US/EP/WO = internacional). Status fora de Licenciamento, Concessão e Pendente/Depositada não pontua.
- **DP4A:** projeto (coordenador ou participante) só conta nos anos em que está vigente. Disciplinas consideram `docente_id` e a N:N `disciplinas_docentes`.
- **Casamento de autores:** o vínculo estruturado (`publicacoes_docentes`) é preferencial; o casamento textual exige ao menos 2 termos do nome.

### 3.3 Regra de Agregação MMA (Média das Médias Anuais)

Implementada em `src/lib/capes/indicadores.ts`:

- Os indicadores de produção e formação são calculados individualmente para cada ano do quadriênio (**2025**, **2026**, **2027**, **2028**).
- Anos ainda não iniciados ou sem insumos permanecem como status `'indefinido'` e **não entram como zero na média**. "Ainda não iniciado" é todo ano posterior ao ano de referência (`anoReferencia`, por padrão o ano corrente): nesses anos orientações em andamento e projetos sem fim seriam apenas projetados e gerariam 0% artificial (ex.: DP4A em 2028), então o motor os descarta de todos os indicadores anuais, com o motivo "ano ainda não iniciado".
- **Orientação em andamento** (usada em SO e DP4A) é a de status efetivo `em_andamento`: sem data de fim ou com fim futuro. Fim já passado é orientação concluída, independentemente do rótulo gravado (`ativo` ou `em_andamento`). Orientações concluídas entram em ORI, ATD e PSA pelo ano da defesa/término.
- A **MMA** calcula a média aritmética estrita apenas dos anos com insumo calculado até o momento, sinalizando se o quadriênio está completo ($4/4$ anos) ou parcial.
