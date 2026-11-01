# Solicitação de acesso às chaves de API Elsevier (Scopus) — PPG-DCEM/UFS

**Assunto:** Solicitação de acesso às chaves de API Elsevier (Scopus) — Projeto de Gestão do PPG em Engenharia e Ciência de Materiais

À coordenação responsável pelo acesso institucional às bases Elsevier (BICEN/UFS),

O Programa de Pós-Graduação em Engenharia e Ciência de Materiais (PPG-DCEM) está implantando um sistema próprio de gestão e avaliação (quadriênio 2025–2028) que consolida dados de produção docente extraídos dos currículos Lattes, complementados por bases bibliométricas. Para a etapa de enriquecimento bibliométrico, solicitamos o uso das **credenciais institucionais da UFS para a Scopus API (Elsevier)**, atualmente vinculadas ao BICEN.

**Especificações técnicas do que solicitamos:**

1. **API Key Scopus** — chave de acesso às APIs Elsevier (https://api.elsevier.com), para uso nos endpoints:
   - **Scopus Search** (`/content/search/scopus`) — localização de documentos por título/DOI/afiliação;
   - **Abstract Retrieval** (`/content/abstract/scopus_id/<id>`) — metadados completos de publicação (título, periódico, DOI, ano, autores, citações);
   - **Author Search** (`/content/search/author`) — resolução dos autores afiliados à UFS e seus **Scopus Author IDs**;
   - **Author Retrieval** (`/content/author/author_id/<id>`) — métricas por autor, incluindo **índice-h**, contagem de documentos e citações (indispensável para o relatório do quadriênio).

2. **InstToken institucional** — token de autenticação institucional vinculado à subscrição UFS, necessário para desbloquear as consultas autorais acima com os dados completos do corpo docente. Sem o InstToken, a API Key isolada opera apenas em modo básico, que limita: o Abstract Retrieval expõe somente o primeiro autor de cada documento, e os endpoints de autor não retornam o índice-h — o que inviabiliza a coleta completa dos indicadores dos 16 docentes do programa.

3. **Configuração de afiliação** — confirmação do **affiliation ID da UFS** na Scopus, para que as consultas restritas à nossa instituição retornem o conjunto correto de documentos.

4. **Volume de uso** — estimativa: algumas centenas de requisições por ciclo de atualização (execuções semanais/mensais dentro dos limites padrão da API para entidades acadêmicas), sem uso em lote comercial.

5. **Uso e responsabilidade** — a chave será utilizada exclusivamente neste sistema de gestão do programa, armazenada de forma segura (cofre de segredos do backend, sem exposição no front-end), sob responsabilidade da coordenação do PPG-DCEM.

Agradecemos desde já o encaminhamento e permanecemos à disposição para fornecer qualquer detalhe técnico adicional (documentação oficial: https://dev.elsevier.com — Elsevier APIs — Overview e Scopus APIs: Authorization, API Keys, InstToken).
