-- Promove o usuário específico para admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('15afa20e-ef0d-496a-b167-5a083c31e3b9', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Cria o profile se não existir
INSERT INTO public.profiles (id, full_name, phone)
VALUES ('15afa20e-ef0d-496a-b167-5a083c31e3b9', 'Admin', null)
ON CONFLICT (id) DO NOTHING;
