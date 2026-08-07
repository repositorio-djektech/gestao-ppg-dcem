# Guia de Configuração — cron-job.org para Keep-Alive do Supabase

Este guia explica como configurar um job no **cron-job.org** para enviar requisições periódicas ao seu projeto Supabase, evitando que ele seja pausado após 7 dias de inatividade (plano gratuito).

> **Atenção:** Esta configuração é **manual** e **externa** ao aplicativo. Ela deve ser realizada pelo usuário diretamente no site cron-job.org.

---

## Pré-requisitos

- Uma conta no [cron-job.org](https://cron-job.org) (gratuita)
- As informações do seu projeto Supabase:
  - **URL REST:** `https://jgavqfzzvjzmeprldpkg.supabase.co/rest/v1/`
  - **Chave anon/publishable:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnYXZxZnp6dmp6bWVwcmxkcGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODI1OTEsImV4cCI6MjA5ODc1ODU5MX0.m7TzUUhZMunFvC7eUwCyVXM179QO7kwrTHNYmHrJS8Y`

---

## Passo a Passo

### Passo 1 — Criar uma conta no cron-job.org

1. Acesse [https://cron-job.org](https://cron-job.org).
2. Clique em **Register** (Registrar).
3. Preencha seu e-mail, defina uma senha e confirme o cadastro.
4. Verifique seu e-mail se necessário e faça login.

### Passo 2 — Criar um novo job

1. No painel principal, clique em **Create Cron Job** (Criar Job).
2. Você será levado a um formulário de configuração.

### Passo 3 — Configurar o título e a descrição

1. **Title (Título):** `Supabase Keep-Alive PPG`
2. **Description (Descrição):** `Ping periódico para evitar pausa do Supabase por inatividade`

### Passo 4 — Configurar a URL e o método

1. **URL:** Insira a URL REST do Supabase seguida de uma query leve em uma tabela existente:
   ```
   https://jgavqfzzvjzmeprldpkg.supabase.co/rest/v1/profiles?select=id&limit=1
   ```
2. **Execution Method (Método):** Selecione **GET**

### Passo 5 — Configurar o intervalo (Schedule)

1. Em **Schedule**, escolha a opção **Every 6 hours** (a cada 6 horas).
   - Alternativamente, se preferir algo mais frequente, você pode configurar a cada **1 hora** ou **3 horas**.
2. O intervalo recomendado é de **6 horas** para equilibrar entre manter o projeto ativo e não exceder limites de requisições.

### Passo 6 — Configurar os cabeçalhos (Headers)

1. Na seção **Headers**, adicione os seguintes cabeçalhos:

   | Header          | Value                                                                                                                                                                                                                     |
   | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `apikey`        | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnYXZxZnp6dmp6bWVwcmxkcGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODI1OTEsImV4cCI6MjA5ODc1ODU5MX0.m7TzUUhZMunFvC7eUwCyVXM179QO7kwrTHNYmHrJS8Y`        |
   | `Authorization` | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnYXZxZnp6dmp6bWVwcmxkcGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODI1OTEsImV4cCI6MjA5ODc1ODU5MX0.m7TzUUhZMunFvC7eUwCyVXM179QO7kwrTHNYmHrJS8Y` |

2. **Notificações:** Opcionalmente, ative notificações por e-mail em caso de falha para monitorar o funcionamento.

### Passo 7 — Salvar e ativar o job

1. Clique em **Save** (Salvar).
2. O job será criado no estado **Enabled** (Ativo).
3. Você pode verificar o status das execuções na aba **History** (Histórico) do job.

---

## Verificação

Para confirmar que o job está funcionando:

1. Vá em **History** dentro do cron-job.org.
2. Você verá as execuções programadas a cada 6 horas.
3. O status deve ser **Success** (Sucesso) com código HTTP **200** ou **206** (quando não há registros, o Supabase pode retornar 200 com array vazio).

---

## Observações

- **Esta configuração é manual** e deve ser feita diretamente no site cron-job.org pelo usuário.
- O aplicativo frontend **também** possui um mecanismo de keep-alive automático que envia pings enquanto o app está aberto no navegador.
- O cron-job.org garante que o projeto permaneça ativo **mesmo quando ninguém está usando o aplicativo**.
- A requisição configurada é **somente leitura** (GET com `select=id&limit=1`) e não altera nenhum dado.
- A chave utilizada é a **chave anon/publishable** do projeto, que já está disponível no frontend e é segura para este uso.
