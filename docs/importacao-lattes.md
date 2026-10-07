# Importação Lattes — Documentação do Fluxo Completo (Etapas 1 e 2 Concluídas)

**Projeto:** Gestão PPG DCEM — Sistema de Gestão para Programas de Pós-Graduação  
**Versão de Referência:** 0.0.53  
**Status da Etapa 1:** 100% implementada e validada em memória (1A parser, 1B pipeline de leitura/filtro/dedupe, 1C interface de upload e tela de revisão, 1D auditoria e testes).  
**Status da Etapa 2:** 100% CONCLUÍDA e validada no banco de dados com dados reais (2A coluna `id_lattes` e serviço `gravar.ts`; 2B integração UI com confirmação e gravação; 2C gravação completa nas 9 tabelas do Supabase, resolução automática de discentes, dedupe idempotente e proteção a dados manuais).

---

## 1. Visão Geral

A funcionalidade de **Importação Lattes** foi concebida para acelerar o preenchimento dos módulos de avaliação CAPES para o recorte quadrienal **2025–2028** e cadastros institucionais a partir dos currículos Lattes dos docentes vinculados ao PPG-DCEM.

Devido às restrições oficiais do CNPq (apenas o docente autenticado consegue exportar o XML completo do seu próprio currículo, enquanto a busca pública disponibiliza unicamente relatórios em PDF), o fluxo foi desenhado para aceitar arquivos **XML** individuais ou pacotes **ZIP** (formato padrão de exportação direta do Lattes) fornecidos pelos docentes.

### Princípio fundamental e divisão de etapas

- **Etapa 1 (Processamento em Memória):** Todo o fluxo de descompactação, decodificação ISO-8859-1, análise sintática (DOMParser), recorte temporal quadrienal (2025–2028), deduplicação (título normalizado + ano) e inspeção tabular opera no cliente (browser) em memória, sem gerar efeitos colaterais no banco antes da validação humana.
- **Etapa 2 (Persistência Idempotente nas 9 Tabelas):** Permite ao usuário revisar por tabela com checkboxes granulares e disparar a gravação nas 9 tabelas do Supabase (`docentes`, `publicacoes`, `orientacoes`, `bancas`, `projetos_pesquisa`, `premiacoes`, `producao_tecnica`, `patentes` e `eventos`), criando automaticamente novos discentes quando necessário, atualizando docentes pelo `id_lattes` estável (com fallback por nome) e preservando integralmente todos os registros inseridos manualmente no sistema.

---

## 2. Como Usar (Passo a Passo do Usuário)

1. **Acesso no Dashboard:**
   - No topo do painel principal (**Dashboard**), ao lado do botão "Atualizar", clique no botão **"Importar Lattes"** (ícone de envio de arquivo).
2. **Seleção de Arquivos (Upload):**
   - Na janela modal _Importar currículos Lattes_, arraste e solte um ou vários arquivos `.xml` e `.zip` para a área pontilhada, ou clique para selecioná-los no explorador de arquivos.
   - O sistema lista todos os arquivos selecionados exibindo o nome, tamanho formatado e ícone representativo (`.xml` ou `.zip`).
   - É possível remover itens individualmente pelo ícone de lixeira ou usar a ação "Limpar todos".
   - O botão **"Processar arquivos"** permanece desabilitado até que ao menos um arquivo válido esteja selecionado.
3. **Processamento em Memória:**
   - Ao clicar em **"Processar arquivos"**, o sistema executa em segundo plano o pipeline de decodificação ISO-8859-1, parse XML, recorte temporal do quadriênio **2025–2028** e deduplicação.
   - Um spinner de carregamento indica o andamento da operação.
   - Se algum arquivo apresentar inconformidade (ex.: XML vazio ou sem a tag `<CURRICULO-VITAE>`), o erro é isolado e detalhado em um card de alerta sem travar o processamento dos demais currículos.
4. **Resumo Pós-Processamento:**
   - É exibido o total de currículos lidos, o nome e ID Lattes de cada docente reconhecido, além de uma grade com o quantitativo de itens válidos no quadriênio (**2025–2028**) por seção e a quantidade de itens ignorados (duplicados ou fora do período).
5. **Abertura da Tela de Revisão:**
   - Clique em **"Revisar registros por tabela"** ou **"Revisar dados"** para abrir o modal em tela cheia de conferência detalhada.
6. **Inspeção e Seleção na Tela de Revisão:**
   - Navegue pelas 9 abas de tabelas: **Docentes**, **Publicações**, **Orientações**, **Bancas**, **Projetos**, **Premiações**, **Produção Técnica**, **Patentes** e **Eventos**.
   - Cada aba conta com um badge dinâmico indicando o número de registros novos para aquela categoria no quadriênio 2025–2028.
   - Controle quais tabelas devem ser gravadas através dos checkboxes individuais de cada aba ou usando os atalhos rápidos **"Marcar todas"** e **"Desmarcar todas"**.
   - Inspecione a tabela de amostra paginada. Para visualizar mais dados, clique em **"Carregar mais 10 registros"** no rodapé.
7. **Confirmação e Gravação no Banco (Etapa 2 Ativa):**
   - O botão **"Confirmar e gravar"** exibe a contagem total de registros selecionados e executa a persistência atômica e resiliente via serviço `gravar.ts`.
   - Ao término, é apresentado um modal com o relatório completo de itens inseridos, atualizados e ignorados/erros por tabela. Ao fechar o relatório, a lista do Dashboard é atualizada automaticamente.

---

## 3. Arquitetura e Pipeline Técnico

O pipeline foi modularizado em TypeScript sob `src/lib/lattes/` e componentes React em `src/components/lattes/`:

```
src/
├── components/lattes/
│   ├── ImportarLattesDialog.tsx      # Modal de upload drag-and-drop e status inicial
│   └── RevisaoImportacaoDialog.tsx   # Modal completo de revisão tabular por abas e disparo da gravação
└── lib/lattes/
    ├── types.ts                     # Interfaces TypeScript de dados Lattes e tabelas
    ├── readFiles.ts                 # Leitura e descompactação JSZip + decodificação ISO-8859-1
    ├── parser.ts                    # Análise do DOM XML (DOMParser) e extração de nós
    ├── quadrienio.ts                # Regras de recorte temporal CAPES centralizado (2025–2028)
    ├── dedupe.ts                    # Normalização de texto e deduplicação de registros
    ├── processor.ts                 # Orquestrador do pipeline unificado
    ├── revisao.ts                   # Mapeamento e agrupamento para visão da tela de revisão
    ├── gravar.ts                    # Serviço de gravação nas 9 tabelas do Supabase com dedupe e discentes
    ├── inspect.test.ts              # Suíte de auditoria completa com XML real de homologação
    ├── processor.test.ts            # Testes de integração do orquestrador
    ├── revisao.test.ts              # Testes do mapeamento e estados de revisão
    ├── gravar.test.ts               # Testes unitários do motor de persistência nas 9 tabelas
    └── integracao-ui.test.ts        # Testes de integração UI / callback de gravação
```

### 3.1 `readFiles.ts` — Descompactação e Decodificação de Arquivos

- **Tratamento de ZIP:** Utiliza `JSZip` no cliente para ler o buffer binário. Varre recursivamente diretórios e subpastas internas, descartando pastas de sistema (`__MACOSX`, arquivos ocultos) e arquivos de apoio (`.txt`, `.pdf`, imagens).
- **Encoding Obrigatório ISO-8859-1:** O CNPq gera seus arquivos XML com codificação `ISO-8859-1`. Tentar decodificar os bytes como UTF-8 corrompe acentuações e caracteres especiais da língua portuguesa. A função `decodificarIso88591` utiliza a API padrão `new TextDecoder('iso-8859-1')`, garantindo integridade ortográfica total (ex.: "Graduação em Química Industrial").

### 3.2 `parser.ts` — Parse Estruturado via DOMParser

- **Arquivo em Linha Única:** O XML exportado pelo Lattes é usualmente estruturado em uma única linha contínua de ~900 KB a múltiplos megabytes sem quebras de linha (`\n`). O parser utiliza `new DOMParser().parseFromString(xmlContent, 'text/xml')` para construir a árvore DOM completa em memória.
- **Tolerância a Campos Vazios:** Atributos vazios, com espaços em branco ou preenchidos com o literal `"NAO_INFORMADO"` / `"NÃO INFORMADO"` são convertidos em `null` via `limparTexto()`.
- **Seções Mapeadas:**
  - `DADOS-GERAIS`: Nome completo, ORCID, citações bibliográficas, e-mail institucional, vínculo/empresa e resumo do CV;
  - `FORMACAO-ACADEMICA-TITULACAO`: Graduação, Mestrado, Doutorado e Pós-Doutorado com curso, instituição, orientador e período;
  - `PRODUCAO-BIBLIOGRAFICA`: Artigos publicados em periódicos (título, ano, DOI, periódico, ISSN, volume, fascículo, páginas, autores), Livros publicados/organizados e Capítulos de livros;
  - `ORIENTACOES-CONCLUIDAS` e `ORIENTACOES-EM-ANDAMENTO`: Mestrado, Doutorado, Pós-Doutorado, Iniciação Científica e TCC com identificação de tipo (orientador principal vs. co-orientador), aluno, instituição e agência de fomento;
  - `DADOS-BASICOS-DE-PARTICIPACAO-EM-BANCA-*`: Mestrado, Doutorado, Exame de Qualificação, Graduação e Comissões Julgadoras com candidato, título, ano e banca;
  - `PROJETO-DE-PESQUISA`: Nome, período, situação, descrição, financiadores, equipe e identificação se o docente é coordenador responsável;
  - `PREMIO-TITULO`: Premiações e títulos honoríficos com entidade promotora e ano;
  - `PRODUCAO-TECNICA`: Trabalhos técnicos, softwares, produtos tecnológicos e processos;
  - `PATENTE`: Título, código de registro INPI, ano de depósito/concessão, categoria e instituição;
  - `EVENTOS`: Trabalhos apresentados em eventos e participação em congressos/encontros.
- **Filtro Temporal Parametrizável:** Suporta parâmetros opcionais `anoInicioFiltro` e `anoFimFiltro` para delimitar o escopo da extração diretamente na fase do parse ou permitir extração irrestrita quando desejado.

### 3.3 `quadrienio.ts` — Recorte Temporal CAPES (2025–2028)

- Define as constantes do quadriênio de avaliação centralizadas: `ANO_INICIO = 2025` e `ANO_FIM = 2028`.
- A função `estaNoQuadrienio(ano)` valida números e strings numéricas contra o intervalo.
- Itens com ano fora da janela **2025–2028** (ou sem indicação temporal válida) são descartados da importação corrente e contabilizados no contador de `ignorados` / `totalForaQuadrienio`.

### 3.4 `dedupe.ts` — Deduplicação Idempotente

- **Normalização:** A função `normalizarTitulo()` remove acentos (`normalize('NFD')`), converte para minúsculas, substitui pontuações por espaços e colapsa múltiplos espaços em branco.
- **Chave de Unicidade:** Gera a chave composta `${tituloNormalizado}_${ano}`. Em caso de repetição no mesmo lote, preserva a primeira ocorrência do registro e descarta réplicas.

### 3.5 `gravar.ts` — Persistência nas 9 Tabelas do Supabase

- Executa as inserções e atualizações com isolamento por seção (`try/catch` individual por categoria).
- **Docentes:** Atualiza via chave primária `id_lattes` estável (16 dígitos); se não existir, tenta correspondência por nome exato e salva o `id_lattes`.
- **Publicações:** Deduplica por título normalizado + ano contra o banco de dados.
- **Orientações:** Vincula ao `docente_id`. Se o orientando não existir na tabela `discentes`, um novo registro é automaticamente cadastrado (status `ativo`, curso derivado do nível do trabalho).
- **Bancas:** Normaliza tipos aceitos pelo banco (`Mestrado`, `Doutorado`, `Qualificação`) e cria discente caso não cadastrado.
- **Projetos de Pesquisa:** Identifica coordenador por `NRO-ID-CNPQ` ou nome do docente, mapeia financiador para `orgao_fomento` e deduplica por título.
- **Premiações, Produção Técnica, Patentes e Eventos:** Persistem conforme constraints da base (tipos válidos, campos de autor e formatação), evitando duplicação.
- **Preservação de Dados Reais:** Não apaga registros pré-existentes inseridos manualmente na base.

---

## 4. Regras de Negócio e Mapeamento de Chaves

1. **Chave Principal de Reimportação (`id_lattes`):**
   - O atributo `NUMERO-IDENTIFICADOR` presente na tag raiz `<CURRICULO-VITAE>` é extraído e utilizado como o `id_lattes` do docente (código de 16 dígitos do CNPq).
   - Esse identificador é a chave estável que permite futuras sincronizações, atualizações cadastrais ou consultas automatizadas via Extrator Lattes institucional.
2. **Associação de Coautores e Participantes (`NRO-ID-CNPQ`):**
   - O atributo `NRO-ID-CNPQ` presente em integrantes de projetos, coautores e bancas é preservado para possibilitar o relacionamento automático entre docentes e discentes do programa.
3. **Detecção de Responsabilidade em Projetos:**
   - Compara o `NRO-ID-CNPQ` do integrante da equipe ou o nome completo normalizado com o docente do currículo para definir se é o coordenador responsável (`coordenador_id`).
4. **Resolução de Anos em Entidades Compostas:**
   - Para **Orientações**: Prioriza o `ano_conclusao`; caso ausente (orientação em andamento), utiliza o `ano_inicio`.
   - Para **Projetos**: Considera ativo no quadriênio se o projeto tiver interseção com o intervalo 2025–2028 (`ano_inicio <= 2028` e `ano_fim >= 2025`) ou se o atributo `SITUACAO` for `"EM_ANDAMENTO"`.
   - Para **Patentes**: Considera como ano de referência o `ano_deposito`, `ano_desenvolvimento` ou `ano_concessao`.

---

## 5. Contagens de Homologação e Validação Real

Para garantir que o parser, o recorte temporal e o motor de gravação permaneçam estáveis ao longo de futuras evoluções, foi utilizado como fixture de homologação o currículo real da Profa. **Ledjane Silva Barreto** (ID Lattes: `3104369029830651`), disponível no arquivo `docs/3104369029830651.xml`.

### 5.1 Tabela A: Acervo Completo do Currículo (Sem Recorte Temporal / Histórico Total)

Estes números representam toda a carreira e acervo histórico contido no XML de homologação (extração irrestrita sem filtro de ano):

| Categoria / Seção Lattes     | Total Bruto Histórico (Sem filtro) | Observações de Validação                                          |
| :--------------------------- | :--------------------------------: | :---------------------------------------------------------------- |
| **Docente Identificado**     |                 1                  | Ledjane Silva Barreto (ID: `3104369029830651`)                    |
| **Artigos Publicados**       |                 68                 | Periódicos indexados com DOI e ISSN                               |
| **Livros Publicados/Org.**   |                 1                  | Livro integral com editora                                        |
| **Capítulos de Livros**      |                 8                  | Capítulos publicados com ISBN                                     |
| **Trabalhos em Eventos**     |                 32                 | Anais de congressos e simpósios                                   |
| **Projetos de Pesquisa**     |                 25                 | Projetos históricos e vigentes                                    |
| **Orientações Concluídas**   |                 90                 | 31 Mestrado, 14 Doutorado, 45 outras                              |
| **Orientações em Andamento** |                 12                 | 3 Mestrado, 5 Doutorado, 4 Iniciação Científica                   |
| **Bancas Julgadoras**        |                121                 | 48 Mestrado, 22 Doutorado, 35 Graduação, 16 outras                |
| **Premiações e Títulos**     |                 4                  | Distinções e menções honrosas                                     |
| **Produção Técnica**         |                 34                 | 18 Trabalhos técnicos, 4 Patentes, 12 demais tipos                |
| **Patentes**                 |                 4                  | Registros e pedidos de depósito de patentes                       |
| **Integridade de Acentos**   |                100%                | Exemplo no resumo: _"Graduação em Química Industrial"_ preservado |

---

### 5.2 Tabela B: Homologação no Recorte Quadrienal 2025–2028 (Validação Oficial)

No recorte quadrienal **2025–2028**, apenas as produções com vigência ou publicação a partir de 2025 entram no cômputo da avaliação CAPES. As contagens pequenas e estritas são o **comportamento correto e esperado** do filtro temporal:

| Tabela Alvo              | Contagem Válida (2025–2028) | Regra de Corte / Detalhamento                                        |
| :----------------------- | :-------------------------: | :------------------------------------------------------------------- |
| **Docentes**             |            **1**            | Ledjane Silva Barreto (`id_lattes`: `3104369029830651`)              |
| **Publicações**          |            **6**            | Artigos com ano de publicação >= 2025                                |
| **Orientações**          |           **12**            | Orientações em andamento / concluídas no quadriênio                  |
| **Bancas**               |            **2**            | Bancas examinadoras realizadas em 2025 ou posteriores                |
| **Projetos de Pesquisa** |            **5**            | Projetos vigentes em 2025 em diante ou com situação `"EM_ANDAMENTO"` |
| **Premiações**           |            **2**            | Distinções acadêmicas obtidas a partir de 2025                       |
| **Produção Técnica**     |            **2**            | Trabalhos e produtos técnicos com ano >= 2025                        |
| **Patentes**             |            **1**            | Patentes depositadas/concedidas no quadriênio                        |
| **Eventos**              |            **1**            | Participação em congressos no período do quadriênio                  |

---

### 5.3 Validação Real Realizada no Banco de Dados (Rota A)

A validação end-to-end com o banco Supabase ao vivo foi realizada com sucesso seguindo o fluxo de teste e reimportação:

1. **1ª Importação (via pacote ZIP):**
   - Upload do ZIP do docente Ledjane Silva Barreto contendo o currículo oficial;
   - O sistema executou a descompactação em memória, parse ISO-8859-1 e recorte 2025–2028;
   - A gravação persistiu com sucesso todos os registros válidos nas 9 tabelas;
   - **Discentes criados automaticamente:** 9 novos registros de discentes foram criados na tabela `discentes` para vincular as orientações sem que houvesse cadastro prévio;
   - **Preservação:** Todos os docentes e dados inseridos previamente de forma manual foram preservados intactos.
2. **2ª Importação (via arquivo XML direto — Teste de Idempotência e Dedupe):**
   - O mesmo currículo da docente foi reimportado a partir do arquivo XML puro;
   - O motor de deduplicação identificou os registros já existentes nas tabelas;
   - Resultado: **0 inserções duplicadas** em todas as tabelas e **apenas 1 registro reportado como "atualizado"** no docente (comportamento esperado do dedupe de atualização cadastral quando há dados adicionais);
   - Zero duplicações de discentes, publicações, projetos ou bancas.

---

## 6. Cobertura de Testes Automatizados

A estabilidade da importação é assegurada por suítes abrangentes no Vitest:

1. **`src/lib/lattes/inspect.test.ts`:**
   - Validação das constantes do quadriênio (`ANO_INICIO = 2025`, `ANO_FIM = 2028`);
   - Teste de normalização de strings e deduplicação lógica pura;
   - Simulação de leitura de arquivo `.xml` avulso e pacote `.zip` recursivo;
   - Auditoria contra o acervo histórico de Ledjane Silva Barreto (68 artigos, 1 livro, 8 capítulos, 32 eventos, 25 projetos);
   - Comprovação da integridade de acentuação em ISO-8859-1;
   - Idempotência: reprocessamento mantém contagens idênticas.
2. **`src/lib/lattes/processor.test.ts`:**
   - Teste assíncrono do orquestrador com múltiplos arquivos e tolerância a falhas.
3. **`src/lib/lattes/revisao.test.ts`:**
   - Mapeamento das estruturas para a interface de revisão tabular e cálculo reativo de totais.
4. **`src/lib/lattes/gravar.test.ts`:**
   - Validação da persistência nas 9 tabelas do Supabase, resolução de `docente_id`, resolução e criação de `discentes`, regras de dedução de banca e isolamento de falhas.
5. **`src/lib/lattes/integracao-ui.test.ts`:**
   - Interação da interface com a chamada do serviço de gravação e callback de sucesso para atualização da tela.

---

## 7. Status Oficial das Etapas

| Etapa                   | Escopo                                                                                                                                                                                        |         Status          |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------: |
| **Etapa 1**             | Leitura ZIP/XML, decodificação ISO-8859-1, parser DOM, recorte quadrienal 2025–2028, dedupe e tela de conferência em memória                                                                  | **CONCLUÍDA** (v0.0.42) |
| **Etapa 2A**            | Coluna `id_lattes` em `docentes`, motor de gravação `gravar.ts` para docentes e publicações com dedupe                                                                                        | **CONCLUÍDA** (v0.0.45) |
| **Etapa 2B**            | Habilitação do botão "Confirmar e gravar" na UI, modal de progresso e relatório final                                                                                                         | **CONCLUÍDA** (v0.0.46) |
| **Etapa 2C**            | Persistência nas 9 tabelas (`orientacoes`, `bancas`, `projetos_pesquisa`, `premiacoes`, `producao_tecnica`, `patentes`, `eventos`), criação automática de discentes e conformidade de schemas | **CONCLUÍDA** (v0.0.47) |
| **Etapa 2 Homologação** | Fechamento oficial da Etapa 2: validação real no banco com docente Ledjane Silva Barreto, idempotência e recorte quadrienal 2025–2028                                                         | **CONCLUÍDA** (v0.0.53) |

---

## 8. Limitações Conhecidas

1. **Dependência de Envio pelo Docente:**
   - Como o CNPq não disponibiliza o XML por consulta pública, o programa depende de solicitar aos docentes o download do seu próprio arquivo XML/ZIP na área logada da Plataforma Lattes.
2. **Eventos Sem Ano Declarado:**
   - Itens que não possuam ano informado no XML não podem ser posicionados no quadriênio CAPES 2025–2028 e são automaticamente direcionados para a contagem de ignorados.
3. **Sobrenomes e Citações em Coautoria:**
   - O XML armazena os coautores como strings e nomes de citação. O cruzamento com outros docentes da base utiliza correspondência por `NRO-ID-CNPQ` ou normalização de texto.
