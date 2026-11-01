# Convenções de UI e Engenharia de Frontend — Gestão PPG DCEM

Este documento detalha as convenções de interface, padrões de formatação e normalização textual, diretrizes de navegação e componentes visuais compartilhados do sistema **Gestão PPG DCEM**.

---

## 1. Normalização de Texto na Renderização

### 1.1 Motivação e Filosofia

Em sistemas acadêmicos, fontes externas de dados (XMLs do Lattes, metadados do Scopus, cadastros manuais antigos) frequentemente apresentam títulos e nomes em caixa alta completa (_ALL CAPS_), acentuações inconsistentes ou conectivos grafados incorretamente.

O sistema adota o princípio de **normalização inteligente na renderização**, centralizada nos módulos `src/lib/normalizacao.ts` e `src/lib/titleCase.ts`.

### 1.2 Nomes Próprios de Pessoas (`normalizarNomePessoa`)

Aplica-se a Docentes, Discentes e Egressos:

- Converte para Title Case (primeira letra maiúscula e restante minúscula).
- Preserva rigorosamente preposições e conectivos em minúsculas: `"de"`, `"da"`, `"das"`, `"do"`, `"dos"`, `"e"`.
- O primeiro termo é sempre capitalizado, mesmo que coincida com conectivo.
- Preserva sufixos de parentesco e numerais romanos em caixa alta: `"Júnior"`, `"Filho"`, `"Neto"`, `"II"`, `"III"`.
- _Exemplo:_ `"LEDJANE DE JESUS SILVA BARRETO"` → `"Ledjane de Jesus Silva Barreto"`.

### 1.3 Títulos Acadêmicos e Artigos (`normalizarTituloAcademico` / `toTitleCase`)

Aplica-se a Títulos de Publicações, Projetos de Pesquisa, Patentes, Eventos e Premiações:

- Converte textos gritados em caixa alta para Title Case acadêmico elegante.
- Conectivos e artigos permanecem em minúsculas (exceto quando iniciam o título ou sucedem dois-pontos / travessão):
  - Português: `"a"`, `"o"`, `"as"`, `"os"`, `"um"`, `"uma"`, `"de"`, `"da"`, `"do"`, `"em"`, `"no"`, `"na"`, `"para"`, `"com"`, `"por"`, `"sobre"`, `"sem"`...
  - Inglês: `"in"`, `"on"`, `"at"`, `"to"`, `"for"`, `"of"`, `"with"`, `"by"`, `"from"`, `"and"`, `"the"`, `"an"`...
- **Preservação de Siglas e Fórmulas:**
  - Siglas consagradas mantêm sua caixa exata via dicionário: `CAPES`, `CNPq`, `UFS`, `PPG-DCEM`, `P²CEM`, `CBECiMat`, `EIDTI`, `FTIR`, `JCR`, `DOI`, `INPI`, `MEC`, `FAPITEC`, `FAPESP`...
  - Fórmulas químicas com algarismos e letras mistas são preservadas intactas: `YF3`, `CaTiO3`, `CO2`, `NiO`, `Er3+`, `CaMoO4`, `Au@Pd`.

---

## 2. Padrão de Moldura de Tabelas Desktop Estilo Supabase

Todas as listagens tabulares da aplicação adotam uma moldura visual contida e robusta para desktops (`md:`), garantindo ergonomia para grandes volumes de registros acadêmicos:

1. **Cabeçalho de Tabela Fixo (Sticky):**
   - Classes: `sticky top-0 bg-slate-100 dark:bg-neutral-800 z-10`.
   - O cabeçalho nunca desaparece durante a rolagem vertical da lista.
2. **Rodapé de Paginação Fixo (`TablePaginationFooter`):**
   - Fixado na base do contêiner da tabela.
   - Mostra a contagem total de registros filtrados e botões de paginação discretos.
3. **Barra de Rolagem Horizontal Permanente (`FrameHorizontalScrollbar`):**
   - Em tabelas com muitas colunas (como Docentes, Publicações e Projetos), a rolagem horizontal nativa do macOS/Windows costuma sumir enquanto o usuário não rola até o final vertical da página.
   - O componente `FrameHorizontalScrollbar` renderiza um trilho fino (6px) e um thumb proporcional arrastável com captura de ponteiro (`setPointerCapture`) e clique direto de reposicionamento.

---

## 3. Deep-Linking com Destaque Suave (`?destaque=<id>`)

Para permitir que diálogos analíticos (como o dossiê de visualização de Docente ou o relatório de Lacunas) conduzam o usuário diretamente ao registro específico em outra tela:

1. A navegação é disparada com o parâmetro de query: `navigate('/publicacoes?destaque=' + pubId)`.
2. O componente `CrudPage` intercepta o parâmetro `destaque`:
   - Limpa eventuais filtros de busca ativos.
   - Localiza a página exata da paginação onde o item se encontra e ativa essa página (`setPage(paginaAlvo)`).
   - Rola suavemente o contêiner até o elemento (`container.scrollTo({ top: ... , behavior: 'smooth' })`).
   - Aplica uma animação visual temporária de realce na linha da tabela (`bg-amber-100/80` ou `ring-2 ring-primary`).
   - Remove o parâmetro `?destaque=` da URL do navegador via `setSearchParams({ replace: true })`, impedindo re-disparos involuntários ao recarregar a página.

---

## 4. Padrões de Ações e Botões de Cabeçalho

Nas páginas analíticas e CRUDs, as ações de cabeçalho seguem a ordem e os padrões consistentes:

1. **Botão "Atualizar":** Recarrega os dados do Supabase com indicador de carregamento (spinner).
2. **Botão "Exportar CSV":** Gera download instantâneo de planilha CSV codificada em UTF-8 com BOM (`\uFEFF`), garantindo abertura correta com acentuação no Microsoft Excel.
3. **Botão "Imprimir / PDF":** Dispara a geração de documento A4 diagramado institucionalmente através de um **iframe oculto isolado**, sem depender de `window.print()` destrutivo que bagunce a visualização da SPA.
4. **Botão de Ação Primária ("Novo Registro" / "Importar Lattes"):** Destaque em tom primário (`Button variant="default"`).

---

## 5. Recorte Temporal Quadrienal Centralizado

Em conformidade com o calendário oficial da Avaliação Quadrienal da CAPES para a área de Engenharias II, todas as rotas e módulos de cálculo utilizam as constantes centralizadas de `src/lib/lattes/quadrienio.ts` e `src/lib/reconducao/types.ts`:

```typescript
export const ANO_INICIO = 2025
export const ANO_FIM = 2028
```

Nenhum cálculo ou filtro no sistema utiliza anos estáticos dispersos; qualquer alteração de quadriênio propaga de maneira uniforme para a Importação Lattes, Recondução e Indicadores CAPES.
