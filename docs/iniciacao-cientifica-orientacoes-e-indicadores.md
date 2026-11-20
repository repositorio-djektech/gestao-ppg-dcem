# Iniciação científica: Orientações, Iniciações e indicadores

Documento para a coordenação do PPG. Reúne a análise de 19/11/2026 sobre o que acontece com os indicadores quando a iniciação científica (IC) está cadastrada nas telas **Orientações** e **Iniciações**, e as decisões que dependem da coordenação.

Decisões relacionadas: D-30 e P-29 a P-31 em [po/00-decisoes-e-pendencias.md](po/00-decisoes-e-pendencias.md).

## 1. Resposta resumida

**Perguntou-se:** dá para tirar os registros de iniciação da tela Orientações sem prejudicar os indicadores?

**Resposta:** hoje, para os indicadores de pontuação da ficha, **sim, não muda nada**. Mas há **um efeito real na Recondução (Critério I)**, e por isso a remoção **não foi feita**. A decisão foi **manter a IC nas duas telas e sincronizá-las** (seção 5).

| Onde | Se tirar a IC de Orientações |
|---|---|
| NICT (alunos de IC/IT por docente) | Nada muda. Ele já lê só a tela Iniciações. |
| ORI, ATD, PSA (titulações de mestrado e doutorado) | Nada muda. Já ignoram IC. |
| SO e DP4A (docentes com orientação em andamento) | Nada muda hoje, porque as 14 IC cadastradas já estão concluídas. Havia um risco para o futuro, já corrigido (seção 4). |
| **Recondução, Critério I** | **Muda** para 2 docentes permanentes (seção 3). |

## 2. O que a ficha CAPES diz

A iniciação científica aparece em **um único item** da ficha: o **NICT**, item 2.5.5, que soma os alunos de IC e de IT e divide pelo número de docentes permanentes (peso 1%).

Os demais indicadores de orientação falam de orientações **do programa**, ou seja, de mestrado e doutorado:
- **ORI e ATD:** dissertações e teses.
- **PSA:** titulações de mestrado ou doutorado.
- **SO e DP4A:** orientações ativas ou em andamento no programa.

Iniciação em extensão (IE) **não** entra no NICT. A ficha cita só IC e IT.

## 3. O efeito na Recondução (Critério I)

O Critério I da Recondução pergunta se o docente "orientou alunos no P²CEM como orientador principal" no quadriênio 2025–2028. O sistema conta qualquer orientação principal vigente no período, **sem separar por tipo**. Portanto, as IC cadastradas em Orientações hoje contam para esse critério.

Das 14 IC cadastradas, 5 docentes permanentes têm IC:
- **3 deles** também têm orientações de mestrado ou doutorado como orientador principal. O Critério I deles não depende da IC.
- **2 deles** (ids 14 e 17) **só têm IC**. Sem a IC em Orientações, o Critério I deles passaria de "atendido" para **"não atendido"**.

> O cálculo por docente foi feito por consulta ao banco, replicando a regra do sistema. Não foi conferido na tela de Recondução.

O texto das regras do sistema diz apenas "orientou alunos no P²CEM". **Não há decisão registrada** sobre se IC (que é de graduação) deve valer para esse critério. Hoje ela conta porque o sistema não separa por tipo.

## 4. O que já foi ajustado no sistema

Para que a IC possa ficar nas duas telas sem distorcer indicadores, três ajustes foram feitos (D-30):

1. **SO e DP4A passam a ignorar IC, IT e IE.** Antes, uma IC em andamento cadastrada em Orientações contaria como "orientação ativa" do docente. A ficha fala de orientações do programa. Nas 14 IC atuais, isso não muda valor algum.
2. **NICT passa a somar só IC e IT.** Antes somava também iniciação em extensão, contra o texto da ficha. Também passa a contar **alunos**: o mesmo aluno em duas iniciações no ano (por exemplo, orientador e coorientador importando o mesmo aluno) vale uma vez.
3. **NICT agora é calculado para 2025**, porque as 14 IC foram copiadas para a tela Iniciações em 19/11. Antes ele aparecia como "indefinido".

Observação: os tipos "TCC / Graduação" e "OUTRA" em Orientações também não são separados em SO e DP4A. Hoje existe 1 registro "OUTRA" e nenhum TCC. Vale a coordenação conferir se esse registro "OUTRA" deve contar como orientação do programa.

## 5. Como a sincronização funciona

IC, IT e IE passam a existir **nas duas telas ao mesmo tempo**. O que se cria, altera ou apaga em uma aparece na outra, automaticamente.

| Tela Orientações | Tela Iniciações |
|---|---|
| Iniciação Científica | IC (Científica) |
| Iniciação Tecnológica | IT (Tecnológica) |
| Iniciação em Extensão | IE (Extensão) |

- **O que se espelha:** o tipo, o discente, o orientador e o **ano** (que é o ano do início da orientação).
- **O que é só de uma tela:** o título do plano e a agência de fomento só existem em Iniciações. Editar um lado **não apaga** o que só existe no outro.
- **Início e término (D-40, 22/11):** Iniciações passou a ter início e término em mês e ano, espelhados com a orientação nos dois sentidos. Criar com início usa o início e o término informados (término em branco = dezembro do ano do início); alterar um lado atualiza o outro; o ano do plano segue o ano do início.
- **IC criada em Iniciações:** gera uma orientação com início em fevereiro e término em dezembro do ano informado (o ano é a vigência do plano), **como orientador não principal**, para não dar crédito automático ao Critério I.
- **IC criada em Orientações** (inclusive pelo import do Lattes): gera o registro em Iniciações com o ano do início.
- **Mudar o tipo** de uma orientação para mestrado ou doutorado remove o espelho em Iniciações. Mudar de volta recria.
- **Importação do Lattes:** a IC do currículo é gravada em Orientações e, por isso, aparece também em Iniciações, sem gravação duplicada. O sistema passou a ler a **IC concluída** do currículo, que antes era descartada. O Lattes **não distingue** iniciação tecnológica nem em extensão: tudo entra como Iniciação Científica, e o tipo pode ser corrigido depois na tela.
- **Apagar de um lado apaga o espelho do outro.** Quem apagar uma IC em Iniciações apaga também a orientação correspondente, e isso pode mudar o Critério I.

## 6. O que a coordenação precisa decidir

1. **IC vale para o Critério I da Recondução?**
   - **Se vale:** o sistema deve passar a considerar as iniciações também nesse critério. Hoje conta só por não haver separação de tipo.
   - **Se não vale:** os docentes ids 14 e 17 ficam com o Critério I "não atendido", e o sistema deve ignorar IC nesse critério. Pode ser o resultado correto.
2. **IC conta para os docentes só quando o orientador for o principal?** As IC importadas do Lattes entram como orientador principal; as criadas em Iniciações entram como não principal. É preciso uniformizar conforme a decisão do item 1.
3. **Manter as duas telas sincronizadas, ou escolher uma só como fonte?** A sincronização foi adotada como solução inicial. A alternativa é passar a cadastrar IC somente em Iniciações e deixar Orientações apenas para mestrado e doutorado.
4. **Quem preenche a bolsa e o projeto das IC copiadas?** Os registros de Orientações não trazem esses dados, então ficaram em branco na tela Iniciações.

## 7. Situação em 19/11/2026

| Item | Situação |
|---|---|
| 14 IC copiadas de Orientações para Iniciações | Feito no banco |
| Ajustes de SO, DP4A e NICT (seção 4) | **Publicado** em 19/11 |
| Os três tipos de iniciação no cadastro de Orientações | **Publicado** em 19/11 |
| Sincronização automática (seção 5) | Escrita e **testada** num banco local descartável (16 verificações nos dois sentidos, reaplicação e importação em lote). **Aplicada ao banco real em 19/11**, depois da publicação do código. Conferido: as 14 IC ligadas às suas orientações, sem duplicatas |
| Decisões da seção 6 | **Pendentes** com a coordenação |

## 8. Referências técnicas

- Ficha: [ficha-avaliacao-capes-engenharias-ii-2025.md](ficha-avaliacao-capes-engenharias-ii-2025.md), item 2.5.5.
- Cálculo dos indicadores: `src/lib/capes/indicadores.ts` (SO, DP4A, NICT) e `src/lib/orientacoes/tipos.ts` (tipos de iniciação).
- Recondução, Critério I: `src/lib/reconducao/calculo.ts`.
- Sincronização: migração `supabase/migrations/20261119130000_sincroniza_iniciacao_orientacao.sql`.
- Testes: `src/lib/capes/indicadores.iniciacao.test.ts` e `src/lib/orientacoes/tipos.test.ts`.
