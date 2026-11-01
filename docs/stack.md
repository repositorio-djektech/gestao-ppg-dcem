# Stack Tecnológica — Gestão PPG DCEM

Este documento detalha o conjunto de tecnologias, bibliotecas, ferramentas de compilação, infraestrutura de nuvem e decisões de engenharia que sustentam o sistema **Gestão PPG DCEM**.

---

## 1. Visão Geral da Stack

| Camada                       | Tecnologia / Ferramenta         | Versão / Padrão      | Propósito Principal                                                            |
| :--------------------------- | :------------------------------ | :------------------- | :----------------------------------------------------------------------------- |
| **Linguagem Principal**      | TypeScript                      | `~5.6`               | Tipagem estática em 100% da base de código frontend e edge functions           |
| **Framework SPA**            | React                           | `^18.3.1`            | Biblioteca de interface reativa para a Single Page Application                 |
| **Build & Bundler**          | Vite                            | `^5.4.11`            | Compilador ultrarrápido com Hot Module Replacement (HMR) e bundling otimizado  |
| **Roteamento**               | React Router DOM                | `^6.28.0`            | Roteamento declarativo no cliente com suporte a guards e search params         |
| **Estilização**              | Tailwind CSS + Tailwind Animate | `^3.4.15`            | Framework utilitário de estilização atômica com tema customizado               |
| **Design System**            | shadcn/ui (Radix UI)            | Primitivas completas | Componentes acessíveis, responsivos e customizáveis                            |
| **Ícones**                   | Lucide React                    | `^0.460.0`           | Conjunto consistente de ícones vetoriais em SVG                                |
| **Notificações / Toasts**    | Sonner + shadcn toast           | `^1.7.0`             | Alertas dinâmicos e não-bloqueantes de sucesso, aviso e erro                   |
| **Manipulação de ZIP/XML**   | JSZip                           | `^3.10.1`            | Leitura e descompactação de arquivos `.zip` do Lattes diretamente no browser   |
| **Backend & Banco de Dados** | Supabase (PostgreSQL 15+)       | Hospedado            | Banco relacional com RLS, Auth, Storage e APIs PostgREST geradas               |
| **Cliente de Banco**         | `@supabase/supabase-js`         | `^2.46.2`            | SDK oficial para comunicação com o PostgreSQL, Auth e Edge Functions           |
| **Computação Serverless**    | Supabase Edge Functions         | Deno Runtime         | Execução de rotinas de backend protegidas (Scopus, lacunas, admin de usuários) |
| **Suíte de Testes**          | Vitest                          | `^2.1.8`             | Testes unitários e de integração de lógica de negócio e componentes React      |

---

## 2. Frontend: Arquitetura e Decisões

### 2.1 React 18 e TypeScript Estrito

- Toda a base de código é escrita em TypeScript estrito (`.ts` e `.tsx`).
- O arquivo `src/types/database.ts` espelha as entidades do banco de dados e adiciona tipos compostos utilitários para as regras de negócio acadêmicas.
- O arquivo gerado `src/lib/supabase/types.ts` fornece as definições de tipos geradas a partir do schema PostgreSQL do Supabase, garantindo autocompletação nas queries do cliente.

### 2.2 Tailwind CSS e shadcn/ui

- O projeto adota a convenção de design system do **shadcn/ui**, baseada em primitivas do **Radix UI** desacopladas e estilizadas via classes do **Tailwind CSS**.
- A biblioteca `class-variance-authority` (CVA) e a função utilitária `cn` (combinação de `clsx` e `tailwind-merge` em `src/lib/utils.ts`) são empregadas em todos os componentes para concatenação segura de classes condicionais.
- A paleta de cores centraliza tons de ardósia (`slate`), azul institucional (`blue/indigo`), esmeralda (`emerald`), âmbar (`amber`) e carmesim (`rose`), adaptados para um ambiente acadêmico institucional.

### 2.3 Leitura e Processamento de Arquivos no Cliente

- **JSZip:** Utilizado em `src/lib/lattes/readFiles.ts` para descompactar arquivos `.zip` enviados pelos docentes sem sobrecarregar o servidor nem trafegar binários pesados pela rede.
- **TextDecoder nativo:** O parse utiliza `new TextDecoder('iso-8859-1')` para converter os bytes dos XMLs do Lattes, contornando a falha crônica de corrupção ortográfica em português que ocorreria com decodificação UTF-8 padrão.
- **DOMParser:** Análise sintática do XML em memória no navegador via `new DOMParser().parseFromString(xml, 'text/xml')`.

---

## 3. Backend: Supabase e PostgreSQL

### 3.1 Infraestrutura Hospedada

O backend é provido pela plataforma **Supabase**, utilizando:

1. **PostgreSQL Relacional:** Base central contendo 27 tabelas de domínio acadêmico, integradas por chaves estrangeiras (`FOREIGN KEY`), constraints de unicidade (`UNIQUE`) e índices B-tree para desempenho em consultas frequentes.
2. **Supabase Auth:** Gerenciamento de credenciais de usuários e sessões seguras em JWT, com integração direta à tabela de perfis de domínio `public.profiles`.
3. **Row Level Security (RLS):** Toda e qualquer tabela do schema público possui RLS ativado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`), de modo que usuários só possam consultar ou modificar registros autorizados conforme seu papel autenticado.
4. **Supabase Storage:** Armazenamento de arquivos anexos e comprovantes em PDF (ex.: comprovantes de projetos de pesquisa).

### 3.2 Supabase Edge Functions (Deno Runtime)

Funções executadas em ambiente serverless Deno protegidas por variáveis de ambiente de alta segurança:

- `scopus-buscar`: Proxy reverso que consulta as APIs da Elsevier / Scopus protegendo a `SCOPUS_API_KEY` contra exposição pública no navegador.
- `relatorio-lacunas`: Geração e consolidação pesada de relatórios de auditoria e lacunas cadastrais.
- `avaliacao-reconducao`: Rotina de cálculo e consolidação dos vereditos de credenciamento e recondução docente.
- `admin-usuarios`: Operações administrativas privilegiadas sobre contas de usuários (criação de usuários no Supabase Auth e alteração de papéis).

---

## 4. Ambiente de Desenvolvimento e Testes

- **Vite:** Servidor de desenvolvimento rápido com configuração enxuta e suporte a paths com alias `@/` apontando para `src/`.
- **Vitest:** Motor de testes que executa centenas de asserções unitárias e de integração sem necessidade de transpiladores lentos:
  - Testes do parser e dedupe Lattes: `src/lib/lattes/*.test.ts`
  - Testes das regras de lacunas: `src/lib/lacunas/regras.test.ts`
  - Testes do cálculo de recondução docente: `src/lib/reconducao/calculo.test.ts`
  - Testes dos indicadores CAPES (Ficha Engenharias II): `src/lib/capes/indicadores.test.ts`
  - Testes do sistema de permissões de papéis: `src/services/permissoes.test.ts`
  - Testes de componentes visuais e modais: `src/components/**/*.test.tsx`
