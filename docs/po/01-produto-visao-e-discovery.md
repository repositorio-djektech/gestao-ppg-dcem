# 01 — Visão do produto e discovery

Produto: Gestão PPG-DCEM (coleta, gestão e cálculo de indicadores CAPES)
Programa: Programa de Pós-Graduação em Ciência e Engenharia de Materiais (PPG-DCEM/UFS)
Modalidade: Acadêmica · Área de concentração: Ciência e Tecnologia dos Materiais
Linhas de pesquisa: Biomateriais e Interações Biológicas; Materiais e Análise de Integridade Estrutural; Materiais Funcionais
Quadriênio: 2025–2028 · Fase: MVP em validação com dados reais, sem envio à CAPES
Responsável pelo produto: Denisson Silva (desenvolvedor e PO)

Legenda: **[Fato]** = documento ou código. **[Decisão]** = resposta da coordenação. **[Hipótese]** = a validar.

## 1. Visão (rascunho)
Dar ao PPG uma base única, confiável e atualizada dos dados da avaliação quadrienal, para que a coordenação prepare a submissão com menos retrabalho e cada docente mantenha seus próprios dados corretos.
**[Hipótese]** A visão de longo prazo (informação quantitativa e qualitativa num lugar só, para avaliadores) fica para depois do MVP (D-09).

## 2. Problemas
| # | Problema | Evidência | Tipo |
|---|---|---|---|
| P1 | Dados do Lattes vinculados de forma errada, sobretudo por sobrenome comum. | [Fato] E-mail do Euler (03/11/2026). | Relatado; causa parcialmente confirmada no código |
| P2 | Docentes não corrigem o que foi importado; listas do programa são grandes demais. | [Fato] E-mail do Euler, itens 1c e 3. | Relatado |
| P3 | Coleta dispersa; coordenação e secretaria sem visão única. | [Fato] Texto da cliente. | Fato |
| P4 | Indicadores calculados com vínculos errados não são confiáveis. | [Decisão] Coordenação: corrigir vínculos é prioridade. | Fato |
| P5 | Autoavaliação e planejamento são pontos fracos segundo a CAPES 2021–2024. | [Fato] Comentários da avaliação 2021–2024. | Fato; fora do MVP |

## 3. Usuários e stakeholders
| Papel | Quem | Interesse principal | Papel no sistema |
|---|---|---|---|
| Coordenadora do programa | Ledjane Barreto | Submissão correta | `coordenador` |
| Coordenadora adjunta | Rosane Oliveira | Acompanhar dados e relatórios | `coordenador` |
| Docentes | Ex.: Euler Araujo dos Santos | Corrigir os próprios dados | `docente` |
| Secretaria e auxiliares | Equipe de apoio | Lançar e revisar em volume | `auxiliar` |
| Suporte técnico | Denisson Silva | Sistema estável | `suporte` |
| CAPES | Avaliadores | Dados organizados | `capes` (demonstração, D-04) |

**[Fato]** Iara de Fatima Gimenez e Luis Eduardo Almeida estão em cópia do e-mail do Euler; papel não informado.

## 4. Proposta de valor
- Coordenação: base única que calcula os indicadores da ficha com dados corretos.
- Docentes: controle sobre os próprios dados, sem procurar entre centenas de registros.
- Programa: menos retrabalho na avaliação e mais confiança nos números.
**[Hipótese]** Confirma-se se os cálculos baterem com o manual em casos reais (F-04).

## 5. Concorrência e referências
- **Stela Experta (StelaTek):** plataforma comercial com indicadores de Procedimento 1, análise por CiteScore, JIF e H5, e OpenAlex. **[Fato]** Divulgada por e-mail em 14/10/2026. **[Hipótese]** Não avaliada.
- **SIGAA (UFS):** referência citada pelo Euler para importação com ajuste antes da gravação. **[Fato]** Relatado, não analisado.

## 6. Objetivos do MVP e métricas
| Objetivo | Métrica | Meta | Situação |
|---|---|---|---|
| Vínculos corretos | % de vínculos docente–publicação confirmados | A definir após o primeiro import real | [Hipótese] |
| Cálculo confiável | Indicadores batendo com o cálculo manual | 100% nos casos de F-04 | [Hipótese] |
| Autonomia do docente | Docentes que corrigem os próprios dados sem ajuda | A definir | [Hipótese] |
| Entrega utilizável | Fluxos de aceite funcionando | 5 de 5 | [Decisão] D-08 |

## 7. Fluxos de aceite (D-08)
F-01 a F-05, detalhados em `backlog.md`.

## 8. Discovery: o que sabemos e o que falta
| Pergunta | Estado | Como validar |
|---|---|---|
| O import por sobrenome causa erro de vínculo? | [Fato] relatado; causa no código parcialmente confirmada | Reproduzir com dado real (H-06) |
| O orientador pode ser definido pelo docente? | [Decisão] D-11 | Testar com discente sem orientador (H-01) |
| Docentes querem editar tudo? | [Decisão] editam o que é seu (D-05) | Teste com dois docentes |
| Frequência de uso após o MVP | Desconhecido | Medir após a primeira versão |

## 9. Próximos passos
1. Implementar H-01, H-02, H-03 e H-06 (vínculos).
2. Redigir o texto do item 1.3 (H-10, P-09).
3. Confirmar responsável por backup e acesso ao banco (P-07).
