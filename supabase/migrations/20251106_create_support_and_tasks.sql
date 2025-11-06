-- Criar tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT,
  
  -- Quem criou o ticket
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_by_email TEXT,
  
  -- Atribuição
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  
  -- Metadados
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Criar tabela de comentários/respostas dos tickets
CREATE TABLE IF NOT EXISTS public.support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  
  -- Autor do comentário
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  is_internal BOOLEAN DEFAULT FALSE, -- Comentário interno (apenas admins veem)
  
  -- Conteúdo
  comment TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar tabela de tarefas
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  type TEXT, -- bug, feature, improvement, maintenance
  
  -- Relacionamento com ticket de suporte (opcional)
  related_ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  
  -- Atribuição
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  
  -- Estimativa e tempo
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2),
  due_date DATE,
  
  -- Metadados
  tags TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Criar tabela de comentários das tarefas
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  
  -- Autor
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  
  -- Conteúdo
  comment TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_partner ON public.support_tickets(created_by_partner_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_ticket ON public.support_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_created_at ON public.support_ticket_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_related_ticket ON public.tasks(related_ticket_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON public.task_comments(created_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_ticket_comments_updated_at ON public.support_ticket_comments;
CREATE TRIGGER update_support_ticket_comments_updated_at
  BEFORE UPDATE ON public.support_ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar número de ticket sequencial
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  ticket_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.support_tickets
  WHERE ticket_number ~ '^TKT[0-9]+$';
  
  ticket_num := 'TKT' || LPAD(next_num::TEXT, 6, '0');
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar número de tarefa sequencial
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  task_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(task_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.tasks
  WHERE task_number ~ '^TASK-[0-9]+$';
  
  task_num := 'TASK-' || LPAD(next_num::TEXT, 5, '0');
  RETURN task_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar ticket_number automaticamente
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ticket_number_trigger ON public.support_tickets;
CREATE TRIGGER set_ticket_number_trigger
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Trigger para gerar task_number automaticamente
CREATE OR REPLACE FUNCTION set_task_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_number IS NULL OR NEW.task_number = '' THEN
    NEW.task_number := generate_task_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_task_number_trigger ON public.tasks;
CREATE TRIGGER set_task_number_trigger
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_number();

-- Habilitar RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para support_tickets
-- Admins podem ver todos os tickets
CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SuperAdmin'
    )
  );

-- Parceiros podem ver apenas seus próprios tickets
CREATE POLICY "Partners can view their own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (created_by_user_id = auth.uid());

-- Usuários autenticados podem criar tickets
CREATE POLICY "Authenticated users can create tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

-- Admins podem atualizar tickets
CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SuperAdmin'
    )
  );

-- Políticas RLS para support_ticket_comments
CREATE POLICY "Users can view comments on their tickets"
  ON public.support_ticket_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_ticket_comments.ticket_id
      AND (
        support_tickets.created_by_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'SuperAdmin'
        )
      )
      AND (NOT is_internal OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'SuperAdmin'
      ))
    )
  );

CREATE POLICY "Users can create comments on their tickets"
  ON public.support_ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_ticket_comments.ticket_id
      AND (
        support_tickets.created_by_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'SuperAdmin'
        )
      )
    )
  );

-- Políticas RLS para tasks (apenas admins)
CREATE POLICY "Admins can manage tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SuperAdmin'
    )
  );

CREATE POLICY "Admins can manage task comments"
  ON public.task_comments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SuperAdmin'
    )
  );

-- Comentários sobre as tabelas
COMMENT ON TABLE public.support_tickets IS 'Tickets de suporte criados por usuários/parceiros';
COMMENT ON TABLE public.support_ticket_comments IS 'Comentários e respostas nos tickets de suporte';
COMMENT ON TABLE public.tasks IS 'Tarefas internas criadas pelos admins';
COMMENT ON TABLE public.task_comments IS 'Comentários nas tarefas internas';
