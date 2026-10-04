# Integração com o Lattes — Análise de Alternativas

**Projeto:** Gestão PPG DCEM — Sistema de gestão para Programas de Pós-Graduação
**Objetivo:** alimentar a tabela `docentes` (e, no futuro, outras tabelas do sistema) a partir dos currículos Lattes dos docentes do departamento.

## Contexto e restrições reais

- A API oficial do Lattes (**Extrator Lattes** do CNPq) **não é aberta**: atende apenas ICTs, fundações de apoio, agências de fomento, NITs, INCTs e órgãos de pesquisa — ou seja, a instituição (UFS), via Pró-Reitoria, não o PPG nem um particular.
- **Restrição de download:** apenas o próprio docente, logado no Lattes, consegue baixar o **XML** do próprio currículo. Pela busca pública, o assistente administrativo consegue apenas o **PDF**.
- Edge functions do Supabase executam apenas TypeScript/Deno — ferramentas Python (como o MarkItDown) rodam fora do sistema, na máquina do usuário.
- Fonte de verdade dos dados: **XML** (estruturado, gerado pelo CNPq). O PDF é apenas um relatório visual, sem conversor oficial.

## Alternativas, em ordem decrescente de custo-benefício

### 1º — Upload de XML Lattes com parse direto ⭐ recomendado

- **Fluxo:** docente baixa o próprio XML → envia ao assistente → upload no sistema → parse do XML → formulário pré-preenchido → revisão → confirmação.
- **Custo:** baixo (parse de XML padronizado é trivial). **Confiabilidade:** alta (dados rotulados pelo CNPq). **Risco:** praticamente nenhum.
- **Desvantagem:** depende de coordenação para coletar o XML de cada docente (85 pessoas).

### 2º — Upload de PDF convertido em Markdown (MarkItDown)

- **Fluxo:** assistente baixa o PDF pela busca pública → na própria máquina roda `pip install markitdown` e `markitdown curriculo.pdf > curriculo.md` → sobe o `.md` no sistema → extração (heurística gratuita, com IA opcional) → pré-preenchimento → revisão → confirmação.
- **Custo:** moderado (extração por texto, token barato). **Confiabilidade:** média/alta — o markdown preserva as seções do Lattes como âncoras ("DADOS GERAIS", "FORMAÇÃO", "ATUAÇÃO PROFISSIONAL"...); risco principal é o layout de duas colunas embaralhar a ordem do texto extraído.
- **Vantagem:** funciona com o único acesso que o assistente realmente tem (PDF público). Não depende de API do CNPq nem de chave paga.

### 3º — Upload de PDF com extração por agente de IA (document AI)

- **Fluxo:** o PDF (ou o `.md` já gerado) vai para um agente multimodal com um currículo Lattes de referência como contexto, retornando JSON com os campos da tabela `docentes` + indicador de confiança por campo.
- **Custo:** alto por documento (PDFs de 50–100+ páginas consomem muitos tokens) + chave de API externa de provedor de IA no backend (edge function).
- **Confiabilidade:** "muito bom, mas não perfeito" — datas ambíguas, acentuação e títulos longos ainda exigem revisão humana. Regra inegociável: a IA **nunca grava direto na tabela**; sempre passa pela tela de revisão.

### 4º — PDF bruto com parser heurístico interno ❌ descartado

- Reconstruir a estrutura a partir do PDF visual sem IA: funciona ~80% do tempo, falha de formas imprevisíveis (seções fora de ordem, nomes quebrados, datas ambíguas) e exige manutenção constante. Custo alto, benefício menor que as alternativas acima.

### 5º — Integração via Extrator Lattes (API oficial) 🎯 cenário ideal futuro

- A UFS (via Pró-Reitoria de Pesquisa/Pós-Graduação) solicita acesso ao webservice do CNPq (requer formulário assinado por responsável legal e IP fixo). Uma vez liberada, o sistema consulta a API com os `id_lattes` dos docentes e atualiza os dados automaticamente.
- **Não é implementável agora** — depende de trâmite institucional — mas é o destino final. O campo `id_lattes` na tabela `docentes` já prepara o terreno para este cenário.

## Estratégia de redundância (backup entre alternativas)

Implementar as alternativas **1º e 2º** juntas, com a 5º como evolução futura. O mesmo botão "Importar do Lattes" na página de Docentes aceita:

| Entrada aceita      | Tratamento no sistema                                               |
| ------------------- | ------------------------------------------------------------------- |
| `.xml`              | Parse direto, 100% confiável                                        |
| `.md`               | Extração heurística gratuita + indicador de confiança por campo     |
| (futuro) `.pdf`     | Agente de IA com modelo de referência Lattes como contexto          |
| (futuro) automático | Chamada ao Extrator Lattes quando a UFS tiver a chave institucional |

Assim, se o docente conseguir enviar o próprio XML, o assistente usa o caminho preferencial; se não, cai no fluxo MarkItDown sem bloqueio do trabalho. Em ambos os casos, o registro **só é gravado na tabela `docentes` após revisão humana** no formulário pré-preenchido.

Se a alternativa 1º não for executável no momento da construção (ex.: coordenação não consegue coletar os XMLs), o sistema já nasce com a 2º funcionando como backup — e vice-versa. A 3º fica como segunda camada de reserva para os casos em que nem o markdown se mostrar confiável o suficiente.

## Decisão registrada

- **Formato preferido:** XML baixado pelo próprio docente (restrição: só o usuário logado baixa o próprio currículo em XML).
- **Caminho oficial futuro:** Extrator Lattes institucional via UFS.
- **Caminho imediato para o assistente administrativo:** PDF → MarkItDown → `.md`.
- **Sempre:** revisão humana antes de gravar qualquer registro na tabela `docentes`.
