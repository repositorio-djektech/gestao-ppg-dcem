# Módulos Especializados e Regras de Negócio — Gestão PPG DCEM

Este documento detalha os três módulos centrais de inteligência acadêmica do sistema: o **Painel de Lacunas Cadastrais**, o **Painel de Recondução e Credenciamento Docente** e o **Painel de Indicadores CAPES**.

---

## 1. Módulo de Lacunas Cadastrais (`/lacunas`)

### 1.1 Propósito

O painel de **Lacunas** realiza auditoria automatizada em tempo real sobre os registros do banco de dados, identificando inconsistências, ausência de identificadores internacionais, omissão de vínculos e pendências que prejudicam a nota do programa na avaliação quadrienal da CAPES.

### 1.2 As 26 Regras de Auditoria Ativas (11 Tabelas)

Implementadas em `src/lib/lacunas/regras.ts`:

| Tabela                   | ID da Regra                             | Descrição da Lacuna                                                                   | Severidade  | Grupo Temático             |
| :----------------------- | :-------------------------------------- | :------------------------------------------------------------------------------------ | :---------: | :------------------------- |
| **`docentes`**           | `docente_sem_scopus_id`                 | Docente sem Scopus ID cadastrado                                                      |   Crítica   | Identificadores e Métricas |
|                          | `docente_sem_openalex_id`               | Docente sem OpenAlex ID cadastrado                                                    |   Atenção   | Identificadores e Métricas |
|                          | `docente_sem_id_lattes`                 | Docente sem ID Lattes (16 dígitos)                                                    |   Crítica   | Identificadores e Métricas |
|                          | `docente_indice_h_ausente_ou_zero`      | Docente com índice-h ausente ou zero                                                  |   Atenção   | Identificadores e Métricas |
|                          | `docente_sem_bolsa_cnpq`                | Docente sem informação de bolsa CNPq                                                  |   Atenção   | Fomento e Bolsas           |
|                          | `docente_permanente_sem_linha_pesquisa` | Docente permanente sem linha de pesquisa vinculada                                    |   Crítica   | Acadêmico                  |
|                          | `docente_sem_projeto_pesquisa`          | Docente sem participação ou coordenação de projeto                                    |   Atenção   | Acadêmico                  |
|                          | `docente_jdp_expirado`                  | Docente marcado como JDP com condição expirada (>4 anos JDP ou >10 anos de doutorado) |   Atenção   | Identificação Cadastral    |
|                          | `docente_jdp_sem_categoria_permanente`  | Docente marcado como JDP sem categoria Permanente                                     |   Crítica   | Identificação Cadastral    |
| **`discentes`**          | `discente_sem_cpf`                      | Discente sem CPF informado                                                            |   Crítica   | Identificação Cadastral    |
|                          | `discente_sem_data_ingresso`            | Discente sem data de ingresso                                                         |   Atenção   | Identificação Cadastral    |
|                          | `discente_sem_link_lattes`              | Discente sem link do currículo Lattes                                                 |   Atenção   | Identificação Cadastral    |
|                          | `discente_sem_status`                   | Discente sem status acadêmico definido                                                |   Crítica   | Situação Acadêmica         |
|                          | `discente_sem_docente_orientador`       | Discente sem docente orientador estruturado                                           |   Crítica   | Acadêmico                  |
|                          | `discente_sem_projeto_pesquisa`         | Discente sem projeto de pesquisa vinculado                                            |   Atenção   | Acadêmico                  |
| **`publicacoes`**        | `publicacao_sem_ano`                    | Publicação sem ano de publicação válido                                               |   Crítica   | Produção                   |
|                          | `publicacao_sem_doi`                    | Publicação sem código DOI informado                                                   |   Atenção   | Produção                   |
|                          | `publicacao_sem_periodico`              | Publicação sem nome do periódico/revista                                              |   Atenção   | Produção                   |
|                          | `publicacao_jcr_sem_docente_vinculado`  | Publicação JCR ≥ 1.0 sem docente do PPG vinculado                                     |   Atenção   | Produção                   |
|                          | `publicacao_sem_estrato_qualis`         | Artigo sem estrato Qualis classificado                                                |   Crítica   | Produção                   |
|                          | `publicacao_sem_coautor_programa`       | Publicação sem conferência de coautoria discente/egresso                              |   Atenção   | Produção                   |
| **`orientacoes`**        | `orientacao_sem_discente`               | Orientação sem discente vinculado                                                     |   Crítica   | Acadêmico                  |
|                          | `orientacao_concluida_sem_data_defesa`  | Orientação concluída sem data de defesa                                               |   Atenção   | Acadêmico                  |
| **`projetos_pesquisa`**  | `projeto_sem_coordenador`               | Projeto de pesquisa sem docente coordenador                                           |   Crítica   | Fomento e Bolsas           |
|                          | `projeto_financiado_sem_orgao`          | Projeto marcado como financiado sem órgão de fomento                                  |   Atenção   | Fomento e Bolsas           |
| **`eventos`**            | `evento_sem_docente`                    | Participação em evento sem docente vinculado                                          |   Atenção   | Extensão e Eventos         |
| **`mobilidade_docente`** | `mobilidade_sem_instituicao`            | Registro de mobilidade sem instituição de destino                                     |   Atenção   | Extensão e Eventos         |
| **`patentes`**           | `patente_sem_inpi`                      | Patente sem número de registro INPI                                                   |   Atenção   | Propriedade Intelectual    |
| **`premiacoes`**         | `premiacao_sem_instituicao`             | Premiação sem instituição concedente                                                  | Informativo | Reconhecimento             |
| **`producao_tecnica`**   | `producao_tecnica_sem_ano`              | Produção técnica sem ano informado                                                    |   Crítica   | Produção                   |

### 1.3 Recursos da Interface de Lacunas

- **Filtros e Agrupamento:** Filtragem por severidade (Crítica, Atenção, Informativa), por grupo temático ou por busca textual.
- **Ação Rápida de Correção:** Cada card de lacuna dispõe de botão de atalho que abre diretamente o modal de edição do registro afetado ou aciona deep-link para a tela de origem.
- **Relatório Impresso / PDF:** Geração de relatório de pendências acadêmicas formatado para colegiado via `imprimirRelatorioLacunasViaIframe` (gerado em iframe oculto).

---

## 2. Módulo de Recondução e Credenciamento (`/reconducao`)

### 2.1 Propósito e Fundamento Normativo

O painel de **Recondução** implementa o cálculo e a verificação automática dos critérios exigidos pela **Norma Interna do PPG-DCEM (§ 4º)** para a recondução de docentes permanentes no quadriênio **2025–2028**.

### 2.2 Os 4 Critérios Avaliados

1. **Critério I — Orientação de Alunos:** O docente orientou alunos no P²CEM como **orientador principal** no quadriênio (`flag_orientador_principal = true` e vigência/defesa em 2025–2028).
2. **Critério II — Docência em Disciplinas:** O docente ministrou disciplinas ofertadas no programa no quadriênio.
3. **Critério III — Projetos Financiados:** O docente participou de projeto de pesquisa com fomento aprovado no quadriênio, como coordenador ou integrante.
4. **Critério IV — Produção Qualificada e Índice PDQ:**
   - **Fórmula:**
     $$\text{PDQ} = \frac{\text{NP}}{\text{MSc} + \text{DSc}}$$
   - **Pré-condição:** O docente deve ter concluído no mínimo 2 titulações no quadriênio ($\text{MSc} + \text{DSc} \ge 2$).
   - **Meta:** $\text{PDQ} \ge 1{,}000$.
   - **NP (Número de Publicações Qualificadas):** Artigos com Fator de Impacto $\text{JCR} \ge 1{,}0$ com **coautoria confirmada** com orientando ou egresso do programa (registrada na tabela `publicacoes_coautores_programa`).

### 2.3 Vereditos do Sistema

- **Apto:** Cumpre os Critérios I, II, III e a meta do Critério IV ($\text{PDQ} \ge 1{,}0$).
- **Alerta:** Cumpre a maior parte dos critérios mas possui pendências (ex.: titulações insuficientes para abrir o cômputo do PDQ ou coautorias aguardando homologação).
- **Inapto:** Descumprimento de critérios essenciais de orientação, docência ou financiamento.

---

## 3. Módulo de Indicadores CAPES (`/indicadores`)

### 3.1 Propósito

O painel de **Indicadores CAPES** reproduz a Ficha de Avaliação da **Área Engenharias II (Quadriênio 2025–2028)**, consolidando métricas para preenchimento dos relatórios de autoavaliação e Coleta Sucupira.

### 3.2 Fórmulas e Pesos da Ficha Engenharias II

1. **Quesito 1: Articulação, Gestão e Adequação do Corpo Docente**
   - **ADE (Adequação do Corpo Docente):**
     $$\text{ADE} = \frac{\text{DP}}{\text{DP} + \text{DC} + \text{DV}}$$
   - Onde $\text{DP}$ = Docentes Permanentes, $\text{DC}$ = Colaboradores, $\text{DV}$ = Visitantes.
   - **JDP (Jovens Docentes Permanentes):**
     Regras estritas implementadas em `src/lib/capes/jdp.ts`:
     - O docente deve ser da categoria permanente e possuir a flag `jdp = true`.
     - Limite de vigência de no máximo **4 anos** como JDP ($\text{jdp\_desde} + 4 \ge \text{ano\_referencia}$).
     - Limite de titulação de no máximo **10 anos** de doutorado ($\text{ano\_doutorado} + 10 \ge \text{ano\_referencia}$).
     - Em indicadores onde incide redução de metas, utiliza-se o denominador efetivo $(\text{DP} - \text{JDP})$.

2. **Quesito 2: Formação Discente e Eficiência de Titulação**
   - **TDME (Tempo Médio de Titulação de Mestrado):** Média em meses da matrícula até a defesa.
   - **TDDO (Tempo Médio de Titulação de Doutorado):** Média em meses da matrícula até a defesa.
   - **TMD (Taxa de Titulação por Docente Permanente):**
     $$\text{TMD} = \frac{\text{MSc Concluídos} + \text{DSc Concluídos}}{\text{DP}}$$

3. **Quesito 3: Produção Científica, Tecnológica e Inovação**
   - **DPI (Pontuação de Produção Intelectual do Programa):**
     Calculado anualmente com os pesos oficiais do Qualis e **saturação em B1**:
     - $\text{A1} = 1{,}000$
     - $\text{A2} = 0{,}875$
     - $\text{A3} = 0{,}750$
     - $\text{A4} = 0{,}675$
     - $\text{B1} = 0{,}500$ (com saturação: $\min(\text{B1}, \text{DP})$)
     - $\text{B2}$ a $\text{C} = 0{,}000$
   - **DPIDE1 / DPIDE2:** Produção qualificada com coautoria de discentes ou egressos.
   - **Patentes e Tecnologia:**
     $$\text{Pontos} = \frac{1{,}0 \times \text{Licenciadas} + 0{,}6 \times \text{Concedidas} + 0{,}3 \times \text{Depositadas}}{\text{DP} - \text{JDP}}$$

### 3.3 Regra de Agregação MMA (Média das Médias Anuais)

Implementada em `src/lib/capes/indicadores.ts`:

- Os indicadores de produção e formação são calculados individualmente para cada ano do quadriênio (**2025**, **2026**, **2027**, **2028**).
- Anos ainda não iniciados ou sem insumos permanecem como status `'indefinido'` e **não entram como zero na média**.
- A **MMA** calcula a média aritmética estrita apenas dos anos com insumo calculado até o momento, sinalizando se o quadriênio está completo ($4/4$ anos) ou parcial.
