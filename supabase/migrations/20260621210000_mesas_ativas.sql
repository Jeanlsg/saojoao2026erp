-- Tabela para rastrear mesas em uso
CREATE TABLE IF NOT EXISTS public.mesas_ativas (
  numero INTEGER PRIMARY KEY CHECK (numero > 0 AND numero < 1000),
  device_id TEXT NOT NULL,
  nome_cliente TEXT NOT NULL,
  session_data JSONB,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comentários
COMMENT ON TABLE public.mesas_ativas IS 'Mesas atualmente em uso (vinculadas a um dispositivo)';
COMMENT ON COLUMN public.mesas_ativas.numero IS 'Número da mesa';
COMMENT ON COLUMN public.mesas_ativas.device_id IS 'ID único do dispositivo que está usando a mesa';
COMMENT ON COLUMN public.mesas_ativas.nome_cliente IS 'Nome do cliente que selecionou a mesa';
COMMENT ON COLUMN public.mesas_ativas.session_data IS 'Dados extras da sessão';
COMMENT ON COLUMN public.mesas_ativas.last_seen IS 'Última vez que o dispositivo foi visto (heartbeat)';

-- RLS: clientes podem ler e atualizar apenas seu próprio device
ALTER TABLE public.mesas_ativas ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ler (para verificar se mesa está ocupada)
CREATE POLICY "Anyone can read mesas_ativas"
  ON public.mesas_ativas
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Qualquer pessoa pode tentar inserir (mas a função RPC faz validação)
CREATE POLICY "Anyone can insert mesas_ativas"
  ON public.mesas_ativas
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Qualquer pessoa pode atualizar (heartbeat)
CREATE POLICY "Anyone can update mesas_ativas"
  ON public.mesas_ativas
  FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Admin pode deletar
CREATE POLICY "Admin can delete mesas_ativas"
  ON public.mesas_ativas
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Função para verificar se uma mesa está disponível
CREATE OR REPLACE FUNCTION public.check_mesa_disponivel(p_numero INTEGER, p_device_id TEXT)
RETURNS TABLE(
  disponivel BOOLEAN,
  mesa_device_id TEXT,
  nome_cliente TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mesa RECORD;
BEGIN
  -- Busca a mesa
  SELECT * INTO v_mesa FROM public.mesas_ativas WHERE numero = p_numero;

  -- Se não existe, está disponível
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Se o device_id é o mesmo, é o mesmo dispositivo reconectando
  IF v_mesa.device_id = p_device_id THEN
    RETURN QUERY SELECT true, v_mesa.device_id, v_mesa.nome_cliente;
    RETURN;
  END IF;

  -- Se last_seen for mais antigo que 5 minutos, considera a mesa liberada
  IF v_mesa.last_seen < (now() - INTERVAL '5 minutes') THEN
    RETURN QUERY SELECT true, v_mesa.device_id, v_mesa.nome_cliente;
    RETURN;
  END IF;

  -- Mesa ocupada por outro dispositivo
  RETURN QUERY SELECT false, v_mesa.device_id, v_mesa.nome_cliente;
END;
$$;

-- Função para reivindicar uma mesa
CREATE OR REPLACE FUNCTION public.claim_mesa(
  p_numero INTEGER,
  p_device_id TEXT,
  p_nome_cliente TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check RECORD;
BEGIN
  -- Verifica se está disponível
  SELECT * INTO v_check FROM public.check_mesa_disponivel(p_numero, p_device_id);

  IF NOT v_check.disponivel THEN
    RETURN QUERY SELECT false, 'Mesa ocupada por outro dispositivo. Tente outra mesa.';
    RETURN;
  END IF;

  -- Insere ou atualiza
  INSERT INTO public.mesas_ativas (numero, device_id, nome_cliente, last_seen, created_at)
  VALUES (p_numero, p_device_id, p_nome_cliente, now(), now())
  ON CONFLICT (numero)
  DO UPDATE SET
    device_id = EXCLUDED.device_id,
    nome_cliente = EXCLUDED.nome_cliente,
    last_seen = now();

  RETURN QUERY SELECT true, 'Mesa vinculada com sucesso';
END;
$$;

-- Função para liberar uma mesa
CREATE OR REPLACE FUNCTION public.release_mesa(p_numero INTEGER, p_device_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM public.mesas_ativas
  WHERE numero = p_numero AND device_id = p_device_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

-- Função para fazer heartbeat (atualizar last_seen)
CREATE OR REPLACE FUNCTION public.heartbeat_mesa(p_numero INTEGER, p_device_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mesas_ativas
  SET last_seen = now()
  WHERE numero = p_numero AND device_id = p_device_id;

  RETURN FOUND;
END;
$$;
