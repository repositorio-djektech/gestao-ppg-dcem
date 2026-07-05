-- =============================================================
-- Seed sample data for new tables (idempotent)
-- =============================================================

INSERT INTO public.discentes (id, nome, cpf, data_ingresso, status, link_lattes) VALUES
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'João Pedro Alves', '12345678901', '2024-03-01', 'ativo', 'http://lattes.cnpq.br/1234567890123456'),
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'Maria Fernanda Costa', '98765432109', '2023-03-01', 'ativo', 'http://lattes.cnpq.br/9876543210987654')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.egressos (id, nome, ano_titulacao, atuacao_profissional, link_lattes) VALUES
  ('b2000000-0000-0000-0000-000000000001'::uuid, 'Carlos Eduardo Lima', 2024, 'Professor Universitário - UFSC', 'http://lattes.cnpq.br/1111111111111111'),
  ('b2000000-0000-0000-0000-000000000002'::uuid, 'Ana Paula Souza', 2023, 'Pesquisadora - Embrapa', 'http://lattes.cnpq.br/2222222222222222')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bancas (id, titulo_trabalho, data, discente_id, membros, tipo) VALUES
  ('b3000000-0000-0000-0000-000000000001'::uuid, 'Análise de Sistemas Reativos Aplicados à Indústria 4.0', '2025-06-15', 'b1000000-0000-0000-0000-000000000001'::uuid, 'Dr. Carlos Roberto (Presidente), Dra. Aline Mendes, Dr. Pedro Santos', 'Mestrado'),
  ('b3000000-0000-0000-0000-000000000002'::uuid, 'Qualificação: Otimização de Polímeros Biodegradáveis', '2025-04-10', 'b1000000-0000-0000-0000-000000000002'::uuid, 'Dra. Aline Mendes (Presidente), Dr. Carlos Roberto', 'Qualificação')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.orientacoes (id, docente_id, discente_id, tipo, inicio, fim, status) VALUES
  ('b4000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'Mestrado', '2024-03', '', 'ativo'),
  ('b4000000-0000-0000-0000-000000000002'::uuid, 'a1000000-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000002'::uuid, 'Doutorado', '2023-03', '', 'ativo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projetos_pesquisa (id, titulo, descricao, inicio, fim, coordenador_id, financiamento, orgao_fomento) VALUES
  ('b5000000-0000-0000-0000-000000000001'::uuid, 'Sistemas Inteligentes para Indústria 4.0', 'Projeto focado no desenvolvimento de sistemas de controle preditivo para processos industriais.', '2024-01', '2027-12', 'a1000000-0000-0000-0000-000000000001'::uuid, true, 'CNPq'),
  ('b5000000-0000-0000-0000-000000000002'::uuid, 'Materiais Avançados para Energia Renovável', 'Desenvolvimento de polímeros para células solares de alta eficiência.', '2023-06', '2026-06', 'a1000000-0000-0000-0000-000000000002'::uuid, true, 'FAPESP')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.disciplinas (id, nome, codigo, creditos, ano_semestre) VALUES
  ('b6000000-0000-0000-0000-000000000001'::uuid, 'Tópicos em Engenharia de Sistemas', 'ESP-501', 4, '2025/1'),
  ('b6000000-0000-0000-0000-000000000002'::uuid, 'Métodos Numéricos Avançados', 'ESP-502', 4, '2025/1'),
  ('b6000000-0000-0000-0000-000000000003'::uuid, 'Materiais Funcionais', 'ESP-503', 3, '2025/2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.producao_tecnica (id, titulo, ano, autores, tipo, link_comprovacao) VALUES
  ('b7000000-0000-0000-0000-000000000001'::uuid, 'Software de Simulação de Processos Químicos - SimProQ', 2025, 'Carlos Roberto, João Silva', 'Software', 'https://exemplo.com/software'),
  ('b7000000-0000-0000-0000-000000000002'::uuid, 'Relatório Técnico: Análise de Eficiência Energética', 2024, 'Aline Mendes', 'Relatório', 'https://exemplo.com/relatorio')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.impacto_social (id, titulo, descricao, ano, link_comprovacao) VALUES
  ('b8000000-0000-0000-0000-000000000001'::uuid, 'Programa de Extensão: Ciência nas Escolas', 'Atividades de popularização da ciência em escolas públicas da região.', 2025, 'https://exemplo.com/impacto'),
  ('b8000000-0000-0000-0000-000000000002'::uuid, 'Consultoria Técnica para Pequenas Indústrias', 'Assessoria técnica para implementação de processos sustentáveis.', 2024, 'https://exemplo.com/consultoria')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.premiacoes (id, titulo, ano, nome_premiado, instituicao) VALUES
  ('b9000000-0000-0000-0000-000000000001'::uuid, 'Prêmio CAPES de Tese - Engenharias II', 2025, 'Carlos Eduardo Lima', 'CAPES'),
  ('b9000000-0000-0000-0000-000000000002'::uuid, 'Menção Honrosa - Congresso Brasileiro de Engenharia', 2024, 'João Pedro Alves', 'ABCM')
ON CONFLICT (id) DO NOTHING;
