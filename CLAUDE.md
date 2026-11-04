# CLAUDE.md — Gestão PPG-DCEM

Contexto para o Claude Code neste repositório.

## Produto
- Sistema de coleta, gestão e cálculo de indicadores da avaliação quadrienal CAPES do PPG de Ciência e Engenharia de Materiais (UFS).
- Modalidade: **acadêmica** (D-01). Não usar pesos ou exigências da modalidade profissional.
- Referência normativa: **Ficha de Avaliação 2025, Engenharias II** (D-02). Quadriênio 2025–2028.
- Estágio: **MVP em validação com dados reais**. Nada enviado à CAPES ainda. Os dados de produção são reais, inclusive CPFs de discentes.
- Usuários operacionais: coordenação, docentes e auxiliares. O perfil `capes` é só demonstração (D-04).

## Onde está cada coisa
- Stack: `docs/stack.md`
- Arquitetura: `docs/arquitetura.md`
- Modelo de dados: `docs/modelo-de-dados.md`
- Regras de negócio e módulos: `docs/regras-de-negocio-e-modulos.md`
- Permissões e papéis: `docs/seguranca-e-perfis.md`
- Importação Lattes: `docs/importacao-lattes.md`
- Ficha CAPES: `docs/ficha-avaliacao-capes-engenharias-ii-2025.md`
- Produto e PO: `docs/po/` — decisões (`00-decisoes-e-pendencias.md`) e backlog (`backlog.md`)

## Regras para mudanças
- Antes de alterar uma regra de negócio, leia a decisão correspondente em `docs/po/00-decisoes-e-pendencias.md`. Se a mudança não tiver decisão, registre uma nova (D-xx) antes de implementar.
- Histórias são identificadas por `H-xx`; fluxos de aceite por `F-xx`. Cite o ID no commit, por exemplo `feat(vinculo): docente vincula discente (H-01)`.
- Cada história tem critério de aceite. Implemente com teste automatizado sempre que possível.
- **Estrato de periódico:** manter o atual (Qualis, A1–A4 e B1) até a CAPES confirmar a nova classificação (D-03, P-02). Não migrar para A1–A8 sem nova decisão.
- Coeficiente do A4 = 0,675 e saturação em B1 ≤ DP, conforme a ficha 2025 (D-02). Não usar o 0,625 de planilhas antigas.
- Permissões: docente altera só o que é referente a ele; coautores docentes e coordenação editam registros compartilhados (D-05, D-06).

## Segurança e dados
- O banco contém dados pessoais reais (inclusive CPF). Não rodar scripts que apaguem ou alterem dados de produção sem confirmação explícita.
- Não copiar dados pessoais para logs, testes, fixtures ou documentos. Use dados fictícios.
- Não commitar `.env` nem segredos.

## Comandos
- Testes: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`

## Commits
- Não fazer commit nem push sem pedido explícito.
