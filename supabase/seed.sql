-- Seed de dados de demonstração para o Moova
-- Execute após rodar as migrations: supabase db push
-- ATENÇÃO: Isso insere dados em um usuário específico.
-- Substitua 'SEU_USER_ID_AQUI' pelo seu ID de usuário (em Settings > API do Supabase Auth).

DO $$
DECLARE
  v_user_id uuid := 'SEU_USER_ID_AQUI'::uuid;  -- substitua aqui
  v_lead1 uuid := gen_random_uuid();
  v_lead2 uuid := gen_random_uuid();
  v_lead3 uuid := gen_random_uuid();
  v_lead4 uuid := gen_random_uuid();
  v_lead5 uuid := gen_random_uuid();
  v_prop1 uuid := gen_random_uuid();
  v_prop2 uuid := gen_random_uuid();
  v_conv1 uuid := gen_random_uuid();
  v_conv2 uuid := gen_random_uuid();
  v_diag uuid := gen_random_uuid();
BEGIN

-- Leads de demonstração
INSERT INTO public.leads (id, user_id, name, phone, status, temperature, estimated_budget, region, next_action, notes)
VALUES
  (v_lead1, v_user_id, 'Carlos Menezes',      '5511991234567', 'em_negociacao', 'QUENTE', 950000, 'Pinheiros, SP',    'Enviar proposta formal', 'Gostou muito do ap 302. Quer fechar essa semana.'),
  (v_lead2, v_user_id, 'Ana Paula Ribeiro',   '5511987654321', 'visita_agendada', 'QUENTE', 750000, 'Moema, SP',      'Confirmar visita amanhã 10h', 'Segunda visita. Muito interessada.'),
  (v_lead3, v_user_id, 'Roberto Oliveira',    '5511976543210', 'qualificado',   'MORNO',  600000, 'Vila Madalena',   'Ligar para alinhar preferências', null),
  (v_lead4, v_user_id, 'Fernanda Costa',      '5511965432109', 'novo',          'FRIO',   400000, 'Santo André, SP', null, 'Veio por indicação da Ana Paula.'),
  (v_lead5, v_user_id, 'Marcos Pereira',      '5511954321098', 'novo',          'INERTE', null,   null,              null, 'Não responde há 5 dias.');

-- Imóveis de demonstração
INSERT INTO public.properties (id, user_id, title, type, price, address, city, state, bedrooms, area_sqm, description, active)
VALUES
  (v_prop1, v_user_id, 'Apartamento 3 dorms com suíte em Pinheiros', 'Apartamento', 920000, 'R. Henrique Schaumann, 302', 'São Paulo', 'SP', 3, 94, 'Reformado, 2 vagas, lazer completo. Aceita financiamento.', true),
  (v_prop2, v_user_id, 'Studio moderno em Moema próximo ao Ibirapuera', 'Studio', 680000, 'Av. Ibirapuera, 1580 — apto 71', 'São Paulo', 'SP', 1, 42, 'Novo, mobiliado, varanda gourmet. Pronto para morar.', true);

-- Conversas de demonstração
INSERT INTO public.conversations (id, user_id, lead_id, is_active, broker_took_over)
VALUES
  (v_conv1, v_user_id, v_lead1, true, false),
  (v_conv2, v_user_id, v_lead2, true, false);

-- Mensagens de demonstração
INSERT INTO public.messages (conversation_id, user_id, content, sender, requires_approval)
VALUES
  (v_conv1, v_user_id, 'Oi! Aqui é a Cora, assistente do corretor pelo Moova. Vi que você demonstrou interesse em imóveis de 3 quartos em Pinheiros. Posso te ajudar?', 'cora', false),
  (v_conv1, v_user_id, 'Oi Cora! Sim, estou procurando algo até R$1M. Pode me mostrar opções?', 'lead', false),
  (v_conv1, v_user_id, 'Perfeito, Carlos! Temos um apartamento incrível na R. Henrique Schaumann — 3 dorms, 94m², 2 vagas, por R$920k. Reformado e com lazer completo. Quer ver mais detalhes?', 'cora', false),
  (v_conv1, v_user_id, 'Sim! Me manda as fotos. Quando tem visita disponível?', 'lead', false),
  (v_conv1, v_user_id, 'Tenho disponibilidade amanhã às 10h ou sexta às 14h. Qual fica melhor pra você?', 'cora', true),
  (v_conv2, v_user_id, 'Oi Ana! Aqui é a Cora. Você agendou uma visita para amanhã às 10h no studio de Moema. Confirmo sua presença?', 'cora', false),
  (v_conv2, v_user_id, 'Sim, estarei lá!', 'lead', false);

-- Visitas de demonstração
INSERT INTO public.visits (user_id, lead_id, scheduled_at, status, address, notes)
VALUES
  (v_user_id, v_lead2, NOW() + interval '1 day' + interval '10 hours', 'confirmada', 'Av. Ibirapuera, 1580 — apto 71, Moema', 'Segunda visita. Levar pasta com documentos do imóvel.'),
  (v_user_id, v_lead1, NOW() - interval '3 days', 'realizada', 'R. Henrique Schaumann, 302, Pinheiros', 'Primeira visita. Cliente adorou, quer proposta.');

-- Diagnóstico Cora 14 dias
INSERT INTO public.diagnostico_cora_14d (id, user_id, started_at, ends_at, leads_attended, leads_contacted, visits_scheduled, estimated_commission)
VALUES
  (v_diag, v_user_id, NOW() - interval '5 days', NOW() + interval '9 days', 5, 5, 1, 55200);

-- Marcos do diagnóstico (dias 3 já passou)
INSERT INTO public.diagnostico_cora_marcos (diagnostico_id, user_id, day_number, sent_at, message_content)
VALUES
  (v_diag, v_user_id, 3, NOW() - interval '2 days',
   'Três dias com a Cora e já tem resultado: 5 leads contatados, 1 visita agendada e o Carlos em negociação. Esse é só o começo.');

END $$;
