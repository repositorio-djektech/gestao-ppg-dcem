# Importação Lattes — Documentação do Fluxo Completo (Etapa 1)

**Projeto:** Gestão PPG DCEM — Sistema de Gestão para Programas de Pós-Graduação  
**Versão de Referência:** 0.0.42  
**Status da Etapa 1:** 100% implementada e validada em memória (1A parser, 1B pipeline de leitura/filtro/dedupe, 1C interface de upload e tela de revisão, 1D auditoria e testes).  
**Status da Etapa 2:** Pendente da reconexão e restauração da infraestrutura correta do Supabase do PPG-DCEM (a gravação no banco de dados está deliberadamente bloqueada nesta etapa).

---

## 1. Visão Geral

A funcionalidade de **Importação Lattes** foi concebida para acelerar o preenchimento dos módulos de avaliação CAPES (quadriênio corrente) e cadastros institucionais a partir dos currículos Lattes dos docentes vinculados ao PPG-DCEM.

Devido às restrições oficiais do CNPq (apenas o docente autenticado consegue exportar o XML completo do seu próprio currículo, enquanto a busca pública disponibiliza unicamente relatórios em PDF), o fluxo foi desenhado para aceitar arquivos **XML** individuais ou pacotes **ZIP** (formato padrão de exportação direta do Lattes) fornecidos pelos docentes.

### Princípio fundamental da Etapa 1: Processamento em Memória

Na **Etapa 1**, todo o fluxo de descompactação, decodificação, análise sintática, recorte temporal, deduplicação e inspeção tabular opera **100% no cliente (browser) em memória**. **Nenhum dado é gravado no banco de dados neste momento**. O botão "Confirmar e gravar" na tela de revisão permanece visível com indicador visual de bloqueio e tooltip informativo, resguardando a integridade dos dados até que a Etapa 2 seja liberada com a base de dados definitiva.

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
   - Ao clicar em **"Processar arquivos"**, o sistema executa em segundo plano o pipeline de decodificação ISO-8859-1, parse XML, recorte temporal e deduplicação.
   - Um spinner de carregamento indica o andamento da operação.
   - Se algum arquivo apresentar inconformidade (ex.: XML vazio ou sem a tag `<CURRICULO-VITAE>`), o erro é isolado e detalhado em um card de alerta sem travar o processamento dos demais currículos.
4. **Resumo Pós-Processamento:**
   - É exibido o total de currículos lidos, o nome e ID Lattes de cada docente reconhecido, além de uma grade com o quantitativo de itens válidos no quadriênio (2022–2025) por seção e a quantidade de itens ignorados (duplicados ou fora do período).
5. **Abertura da Tela de Revisão:**
   - Clique em **"Revisar registros por tabela"** ou **"Revisar dados"** para abrir o modal em tela cheia de conferência detalhada.
6. **Inspeção e Filtro na Tela de Revisão:**
   - Navegue pelas 9 abas de tabelas: **Docentes**, **Publicações**, **Orientações**, **Bancas**, **Projetos**, **Premiações**, **Produção Técnica**, **Patentes** e **Eventos**.
   - Cada aba conta com um badge dinâmico indicando o número de registros novos para aquela categoria.
   - Controle quais tabelas devem ser consideradas através dos checkboxes individuais de cada aba ou usando os atalhos rápidos **"Marcar todas"** e **"Desmarcar todas"**.
   - Inspecione a tabela de amostra paginada. Para visualizar mais dados, clique em **"Carregar mais 10 registros"** no rodapé.
7. **Botão de Confirmação:**
   - O botão **"Confirmar e gravar"** exibe a contagem de registros selecionados, mas permanece **desabilitado** com ícone de cadeado. Ao posicionar o cursor sobre ele, um tooltip esclarece que a persistência real ocorrerá na Etapa 2 após a reconexão da infraestrutura do Supabase.

---

## 3. Arquitetura e Pipeline Técnico

O pipeline foi modularizado em TypeScript sob `src/lib/lattes/` e componentes React em `src/components/lattes/`:

```
src/
├── components/lattes/
│   ├── ImportarLattesDialog.tsx      # Modal de upload drag-and-drop e status inicial
│   └── RevisaoImportacaoDialog.tsx     # Modal completo de revisão tabular por abas
└── lib/lattes/
    ├── types.ts                     # Interfaces TypeScript de dados Lattes e tabelas
    ├── readFiles.ts                 # Leitura e descompactação JSZip + decodificação ISO-8859-1
    ├── parser.ts                    # Análise do DOM XML (DOMParser) e extração de nós
    ├── quadrienio.ts                # Regras de recorte temporal CAPES (2022-2025)
    ├── dedupe.ts                    # Normalização de texto e deduplicação de registros
    ├── processor.ts                 # Orquestrador do pipeline unificado
    ├── revisao.ts                   # Mapeamento e agrupamento para visão da tela de revisão
    ├── inspect.test.ts              # Suíte de auditoria completa com XML real de homologação
    ├── processor.test.ts            # Testes de integração do orquestrador
    └── revisao.test.ts              # Testes do mapeamento e estados de revisão
```

### 3.1 `readFiles.ts` — Descompactação e Decodificação de Arquivos

- **Tratamento de ZIP:** Utiliza `JSZip` no cliente para ler o buffer binário. Varre recursivamente diretórios e subpastas internas, descartando pastas de sistema (`__MACOSX`, arquivos ocultos) e arquivos de apoio (`.txt`, `.pdf`, imagens).
- **Encoding Obrigatório ISO-8859-1:** O CNPq gera seus arquivos XML com codificação `ISO-8859-1`. Tentar decodificar os bytes como UTF-8 corrompe acentuações e caracteres especiais da língua portuguesa (gerando caracteres como ``ou quebras de parsing). A função`decodificarIso88591`utiliza a API padrão`new TextDecoder('iso-8859-1')`, garantindo integridade ortográfica total (ex.: "Graduação em Química Industrial").

### 3.2 `parser.ts` — Parse Estruturado via DOMParser

- **Arquivo em Linha Única:** O XML exportado pelo Lattes é usualmente estruturado em uma única linha contínua de ~900 KB a múltiplos megabytes sem quebras de linha (`\n`). Portanto, **nunca deve ser lido linha a linha**. O parser utiliza `new DOMParser().parseFromString(xmlContent, 'text/xml')` para construir a árvore DOM completa em memória.
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

### 3.3 `quadrienio.ts` — Recorte Temporal CAPES

- Define as constantes do quadriênio de avaliação: `ANO_INICIO = 2022` e `ANO_FIM = 2025`.
- A função `estaNoQuadrienio(ano)` valida números e strings numéricas contra o intervalo.
- Itens com ano fora da janela 2022–2025 ou sem indicação temporal válida são descartados para a importação corrente e contabilizados no contador de `ignorados` / `totalForaQuadrienio`.

### 3.4 `dedupe.ts` — Deduplicação Idempotente

- No currículo Lattes, o mesmo trabalho com frequência aparece repetido em múltiplos contextos (por exemplo, listado como artigo bibliográfico e simultaneamente referenciado dentro do relatório de um projeto de pesquisa ou duplicação de registro no CNPq). Ao importar vários arquivos ao mesmo tempo ou reprocessar o mesmo currículo, o pipeline não pode duplicar registros.
- **Normalização:** A função `normalizarTitulo()` remove acentos (`normalize('NFD')`), converte para minúsculas, substitui pontuações por espaços e colapsa múltiplos espaços em branco.
- **Chave de Unicidade:** Gera a chave composta `${tituloNormalizado}_${ano}`. Em caso de empate, preserva a primeira ocorrência do registro e move as réplicas para a lista de duplicatas descartadas.

### 3.5 `processor.ts` — Orquestração Resiliente

- Coordena o pipeline completo:
  1. Leitura e descompressão via `readLattesFiles`;
  2. Parse de cada arquivo via `parseLattesXml`;
  3. Filtragem temporal via `filtrarPorQuadrienio`;
  4. Deduplicação via `deduplicarItens`;
  5. Agrupamento de métricas e separação de erros individuais.
- **Resiliência:** O processamento de cada currículo ocorre dentro de bloco `try/catch`. Caso um arquivo esteja corrompido, vazio ou ilegível, o erro é adicionado à lista de incidentes sem interromper o processamento dos demais currículos do lote.

### 3.6 `revisao.ts` e `RevisaoImportacaoDialog.tsx` — Interface de Conferência

- Transforma a saída do processador nas estruturas específicas exigidas pelas 9 tabelas do sistema.
- Gerencia estado reativo de caixas de seleção (todas selecionadas por padrão).
- Fornece paginação sob demanda ("Carregar mais 10 registros") por tabela para otimizar a renderização de grandes volumes de itens.
- Garante total visibilidade do status das ações sem disparar qualquer mutação HTTP ou SQL contra o backend.

---

## 4. Regras de Negócio e Mapeamento de Chaves

1. **Chave Principal de Reimportação (`id_lattes`):**
   - O atributo `NUMERO-IDENTIFICADOR` presente na tag raiz `<CURRICULO-VITAE>` é extraído e utilizado como o `id_lattes` do docente (código de 16 dígitos do CNPq).
   - Esse identificador é a chave estável que permitirá futuras sincronizações, atualizações cadastrais ou consultas automatizadas via Extrator Lattes institucional.
2. **Associação de Coautores e Participantes (`NRO-ID-CNPQ`):**
   - O atributo `NRO-ID-CNPQ` presente em integrantes de projetos, coautores e bancas é preservado para possibilitar o relacionamento automático entre docentes e discentes do próprio programa em etapas futuras.
3. **Detecção de Responsabilidade em Projetos:**
   - Compara o `NRO-ID-CNPQ` do integrante da equipe ou o nome completo normalizado com o docente do currículo para definir a flag `responsavel: true/false` (coordenador vs. colaborador).
4. **Resolução de Anos em Entidades Compostas:**
   - Para **Orientações**: Prioriza o `ano_conclusao`; caso ausente (orientação em andamento), utiliza o `ano_inicio`.
   - Para **Projetos**: Considera ativo no quadriênio se o projeto tiver interseção com o intervalo 2022–2025 (`ano_inicio <= 2025` e `ano_fim >= 2022`) ou se o atributo `SITUACAO` for `"EM_ANDAMENTO"`.
   - Para **Patentes**: Considera como ano de referência o `ano_deposito`, `ano_desenvolvimento` ou `ano_concessao`.

---

## 5. Contagens de Referência para Validação (XML de Homologação)

Para garantir que o parser e o pipeline permaneçam estáveis ao longo de futuras evoluções, foi utilizado como fixture de homologação o currículo real da Profa. **Ledjane Silva Barreto** (ID Lattes: `3104369029830651`), disponível no arquivo `docs/3104369029830651.xml`.

Os testes automatizados em `src/lib/lattes/inspect.test.ts` auditam contra as seguintes métricas exatas:

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

### Resultados no Recorte do Quadriênio CAPES (2022–2025)

Quando aplicado o filtro temporal do quadriênio e o algoritmo de deduplicação, apenas os registros compreendidos no período são listados como prontos para inserção nas 9 tabelas de revisão, enquanto os registros anteriores a 2022 são contabilizados como `ignorados` / `totalForaQuadrienio`. Reprocessar o mesmo XML duplicado resulta exatamente na mesma quantidade de itens inseríveis, confirmando a idempotência do algoritmo.

---

## 6. Cobertura de Testes Automatizados

A estabilidade da Etapa 1 é garantida por testes de unidade e integração no Vitest:

1. **`src/lib/lattes/inspect.test.ts`:**
   - Valida constantes do quadriênio (2022 a 2025);
   - Testa normalização de strings e deduplicação lógica pura;
   - Simula leitura real de arquivo `.xml` avulso e arquivo `.zip` contendo pastas internas e arquivos irrelevantes;
   - Executa o parse completo no XML de Ledjane Silva Barreto com validação de contagens históricas;
   - Comprova a integridade da acentuação em ISO-8859-1;
   - Assegura que o processamento duplicado do mesmo arquivo mantém contagens estáveis (dedupe idempotente).
2. **`src/lib/lattes/processor.test.ts`:**
   - Testa execução assíncrona do orquestrador com arquivos individuais e lotes mistos;
   - Testa resiliência a arquivos inválidos ou com extensões incorretas sem abortar o processamento.
3. **`src/lib/lattes/revisao.test.ts`:**
   - Testa o mapeamento dos resultados brutos para as estruturas visuais das 9 tabelas;
   - Valida cálculo reativo de totais quando o usuário seleciona ou desmarca tabelas específicas.

---

## 7. Estado Atual e Transição para a Etapa 2

### O que está 100% pronto (Etapa 1 — Versão 0.0.42):

- [x] Botão de importação no Dashboard;
- [x] Modal de upload múltiplo com suporte a `.xml` e `.zip` (descompactação recursiva em memória via JSZip);
- [x] Decodificação correta de caracteres em ISO-8859-1;
- [x] Parser DOM completo cobrindo todas as seções acadêmicas e profissionais do Lattes;
- [x] Recorte temporal automático para o quadriênio CAPES 2022–2025;
- [x] Deduplicação automática por título normalizado e ano;
- [x] Tela de revisão completa em abas, com resumo numérico global, contadores por tabela e amostra paginada dos registros;
- [x] Seleção/deseleção granular de tabelas para inclusão;
- [x] Resguardo total: botão de gravação bloqueado com aviso contextual.

### O que será implementado na Etapa 2 (Pendente):

- **Reconexão da Infraestrutura Supabase:** O banco de dados oficial do PPG-DCEM precisa ser restabelecido antes de qualquer operação de gravação.
- **Serviço de Persistência Transacional:**
  - Inserção/atualização de docentes (`upsert` com base em `id_lattes`);
  - Vinculação de chaves estrangeiras (`docente_id`) nos registros de produções, bancas e orientações;
  - Resolução de duplicatas com registros pré-existentes na base remota;
  - Habilitação do botão "Confirmar e gravar" com barra de progresso de salvamento e feedback de sucesso via toast.

---

## 8. Limitações Conhecidas

1. **Dependência de Envio pelo Docente:**
   - Como o CNPq não disponibiliza o XML por consulta pública, o programa depende de solicitar aos docentes o download do seu próprio arquivo XML/ZIP na área logada da Plataforma Lattes.
2. **Eventos Sem Ano Declarado:**
   - Itens que não possuam ano informado no XML não podem ser posicionados no quadriênio CAPES e são automaticamente direcionados para a contagem de ignorados.
3. **Sobrenomes e Citações em Coautoria:**
   - O XML armazena os coautores como strings e nomes de citação. O cruzamento com outros docentes da base exige correspondência por `NRO-ID-CNPQ` ou normalização de texto.
