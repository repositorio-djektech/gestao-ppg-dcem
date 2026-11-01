# Integrações Externas — Gestão PPG DCEM

Este documento detalha o ecossistema de integrações com plataformas científicas internacionais e bases governamentais, a arquitetura de proteção de segredos com Edge Functions e o status de convênios institucionais da Universidade Federal de Sergipe (UFS).

---

## 1. Mapeamento das Integrações

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Aplicação Frontend (React)                      │
│                                                                        │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │   OpenAlex (Busca direta) │      │   Scopus (Via Edge Function)│   │
│   │   api.openalex.org        │      │   invoke('scopus-buscar')   │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  │ HTTPS (Pública)                   │ HTTPS (Supabase JWT)
                  ▼                                   ▼
┌───────────────────────────────┐      ┌─────────────────────────────────┐
│     OpenAlex Open REST API    │      │    Edge Function scopus-buscar  │
│  - Busca de Autores por Nome  │      │     (Deno Runtime no Supabase)  │
│  - O1: Extração de OpenAlex ID│      └──────────────┬──────────────────┘
│  - O2: Métricas de Artigos    │                     │
└───────────────────────────────┘                     │ Lê SCOPUS_API_KEY
                                                      ▼ (do Vault de Secrets)
                                       ┌─────────────────────────────────┐
                                       │     Elsevier / Scopus API       │
                                       │  - Abstract Retrieval           │
                                       │  - Serial Title Metrics (SJR)   │
                                       └─────────────────────────────────┘
```

---

## 2. Integração OpenAlex

### 2.1 Propósito

O **OpenAlex** é um catálogo aberto e gratuito de produção científica global indexando centenas de milhões de trabalhos acadêmicos, autores e instituições. No sistema, é utilizado para:

1. **Identificação e Desambiguação de Docentes (Etapa O1):** Busca de autores por nome, vinculação da URL canônica do OpenAlex (ex.: `https://openalex.org/A5012345678`) e persistência do identificador estável na coluna `docentes.openalex_id`.
2. **Estimativa de Qualis e Coleta de Métricas (Etapa O2):** Extração de métricas de periódicos, contagem de citações e indicadores normalizados para auxiliar na classificação de publicações.

### 2.2 Arquitetura de Comunicação

- **Consumo Direto:** Implementado em `src/lib/openalex/buscar.ts`. Como a API do OpenAlex é aberta e gratuita, as requisições de consulta (`GET https://api.openalex.org/authors?search=...`) são realizadas diretamente pelo navegador sem necessidade de proxy de chave.
- **Normalização de Busca:** A função `normalizarNomeParaBusca` remove títulos acadêmicos (Dr., Dra., Prof.), normaliza acentuações e monta a consulta otimizada priorizando afiliações à `"Universidade Federal de Sergipe"` ou `"UFS"`.

---

## 3. Integração Scopus / Elsevier

### 3.1 Propósito

A base **Scopus** da Elsevier é o principal indexador internacional utilizado pela CAPES na Ficha de Avaliação da Área Engenharias II para cômputo de fatores de impacto, citações e índice-h. No sistema, é utilizada para:

1. Vincular o `scopus_id` do docente no diálogo de detalhes de Docentes.
2. Consultar métricas de periódicos (`SJR - SCImago Journal Rank`, `CiteScore`, `SNIP`) para fundamentar a sugestão automática de estratos Qualis (A1–C) na tela de Publicações.

### 3.2 Arquitetura Segura via Edge Function `scopus-buscar`

- **Proteção da Chave:** A API da Elsevier exige a autenticação via cabeçalho `X-ELS-APIKey`. Sob nenhuma circunstância a chave de API é exposta no código frontend do navegador.
- **Proxy Serverless:** O serviço `src/services/scopus.ts` invoca a Edge Function `scopus-buscar` implantada no Supabase (`supabase.functions.invoke('scopus-buscar', { body: ... })`).
- **Ações Suportadas pela Edge Function:**
  - `buscar-autores`: Busca e desambiguação de autores por nome e afiliação.
  - `consultar-serial`: Consulta de ISSN e título para recuperação de métricas SJR e percentis CiteScore.

### 3.3 Regras de Armazenamento de Segredos (Aviso Crítico de Infraestrutura)

- O comando `set_env` da plataforma gerencia variáveis de ambiente da aplicação cliente (Vite).
- **Atenção:** Variáveis do cliente **NÃO são gravadas no Vault de Edge Functions do Supabase** (onde opera o `Deno.env.get('SCOPUS_API_KEY')`).
- Para provisionar ou atualizar a chave `SCOPUS_API_KEY`, é necessário o procedimento oficial:
  - **Opção A (Dashboard Supabase):** Acessar _Dashboard do Supabase → Edge Functions → Secrets → Adicionar `SCOPUS_API_KEY`_.
  - **Opção B (CLI Supabase):** Executar no terminal local autenticado:
    ```bash
    supabase secrets set SCOPUS_API_KEY="sua_chave_aqui"
    ```

### 3.4 Limitações do Entitlement Básico e InstToken da UFS

- **Entitlement Básico (Chave Pessoal/Desenvolvedor):**
  - O endpoint de `Author Search` e `Author Retrieval` da Elsevier possui restrições severas para chaves sem convênio institucional corporativo.
  - O endpoint de `Abstract Retrieval` na chave básica só expõe metadados detalhados do **primeiro autor** do artigo. Se o docente do PPG for coautor ou último autor (orientador), o retorno da API não lista o seu `auid`.
  - O índice-h oficial do docente não é retornado sob a licença básica gratuita.
- **Decisão do Produto / Workaround (v0.0.72):**
  - O diálogo de Docentes permite colar diretamente o `scopus_id` numérico coletado no perfil do docente em [scopus.com](https://www.scopus.com), gravando-o imediatamente sem exigir validação de abstracts.
  - _Exemplo real de homologação:_ O Scopus ID real da Profa. Ledjane Silva Barreto é **`7005598575`** (UFS, 57 documentos, h-index 21).
- **InstToken Institucional (Pendente):**
  - Para liberação irrestrita de busca de autores, coautores e índice-h automatizado via API, a UFS precisa habilitar o `InstToken` institucional junto à Elsevier. As orientações completas para abertura de chamado estão documentadas em `docs/solicitacao-scopus-ufs.md`.

---

## 4. Integração Extrator Lattes (CNPq)

### 4.1 Propósito

O **Extrator Lattes** é o serviço de webservice oficial mantido pelo CNPq para que instituições de ensino e pesquisa credenciadas acessem diretamente os XMLs curriculares atualizados dos seus pesquisadores.

### 4.2 Status Atual e Restrições Oficiais

- **Restrição de Concessão:** O CNPq fornece credenciais de acesso ao Extrator Lattes **exclusivamente para a entidade educacional/universidade (UFS)** por meio da sua Pró-Reitoria de Pós-Graduação e Pesquisa (POSGRAP), nunca para sistemas ou desenvolvedores terceirizados individuais.
- **Fluxo Operacional Corrente:** Enquanto o convênio e a liberação das chaves da UFS tramitam, o sistema opera plenamente através do pipeline de **Importação Lattes** (Etapas 1 e 2), no qual cada docente baixa o XML/ZIP de seu currículo em sua área logada na Plataforma Lattes e o envia ao sistema.
- **Solicitação Institucional:** O modelo de requerimento, embasamento legal e instruções para o programa solicitar o acesso à POSGRAP/UFS estão detalhados em `docs/solicitacao-extrator-lattes-ufs.md`.

---

## 5. Inventário das Edge Functions Implantadas no Supabase

| Nome da Edge Function      | Rota no Supabase                     | Propósito e Operação                                                                                         |
| :------------------------- | :----------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **`scopus-buscar`**        | `/functions/v1/scopus-buscar`        | Proxy reverso seguro para a API da Elsevier. Consulta métricas de seriais e autores sem vazar credenciais.   |
| **`relatorio-lacunas`**    | `/functions/v1/relatorio-lacunas`    | Consolidação e agregação no servidor dos relatórios de auditoria e pendências cadastrais em lote.            |
| **`avaliacao-reconducao`** | `/functions/v1/avaliacao-reconducao` | Processamento no servidor do cálculo de vereditos de credenciamento e recondução quadrienal (§ 4º).          |
| **`admin-usuarios`**       | `/functions/v1/admin-usuarios`       | Operações privilegiadas de provisionamento de usuários e gestão de perfis no Supabase Auth via Service Role. |
