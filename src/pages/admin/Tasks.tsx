import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Search, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, ListTodo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Task {
  id: string;
  task_number: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
  related_ticket_id?: string;
  created_by_name?: string;
  assigned_to_name?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

interface TaskComment {
  id: string;
  task_id: string;
  author_name: string;
  comment: string;
  created_at: string;
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

const typeLabels = {
  bug: 'Bug',
  feature: 'Funcionalidade',
  improvement: 'Melhoria',
  maintenance: 'Manutenção',
};

export default function Tasks() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    type: 'feature',
    estimated_hours: '',
    due_date: '',
  });

  useEffect(() => {
    loadTasks();
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    if (selectedTask) {
      loadComments(selectedTask.id);
    }
  }, [selectedTask]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar tarefas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar comentários',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Por favor, informe o título da tarefa.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const createdByName = profile
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : 'Administrador';

      const taskData: any = {
        title: newTask.title,
        description: newTask.description || null,
        priority: newTask.priority,
        type: newTask.type || null,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
        due_date: newTask.due_date || null,
        created_by_user_id: (await supabase.auth.getUser()).data.user?.id,
        created_by_name: createdByName,
      };

      const { error } = await supabase.from('tasks').insert(taskData);

      if (error) throw error;

      toast({
        title: 'Tarefa criada',
        description: 'A tarefa foi criada com sucesso.',
      });

      setShowNewTaskDialog(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        type: 'feature',
        estimated_hours: '',
        due_date: '',
      });
      loadTasks();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar tarefa',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };

      if (newStatus === 'in_progress' && !selectedTask?.started_at) {
        updates.started_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'O status da tarefa foi atualizado com sucesso.',
      });

      loadTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus as any });
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addComment = async () => {
    if (!selectedTask || !newComment.trim()) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const authorName = profile
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : 'Administrador';

      const { error } = await supabase.from('task_comments').insert({
        task_id: selectedTask.id,
        author_name: authorName,
        comment: newComment,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Comentário adicionado',
        description: 'Seu comentário foi adicionado à tarefa.',
      });

      setNewComment('');
      loadComments(selectedTask.id);
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar comentário',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie tarefas internas e ajustes</p>
        </div>
        <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Tarefa</DialogTitle>
              <DialogDescription>Adicione uma nova tarefa ao sistema</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Digite o título da tarefa"
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Descreva a tarefa..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={newTask.type}
                    onValueChange={(value) => setNewTask({ ...newTask, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Funcionalidade</SelectItem>
                      <SelectItem value="improvement">Melhoria</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimated_hours">Horas Estimadas</Label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    step="0.5"
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Data de Vencimento</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={createTask}>Criar Tarefa</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Tarefas */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Carregando tarefas...</p>
            </CardContent>
          </Card>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Nenhuma tarefa encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card
              key={task.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedTask(task)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {task.task_number}
                      </span>
                      <Badge className={statusColors[task.status]}>
                        {statusLabels[task.status]}
                      </Badge>
                      <Badge className={priorityColors[task.priority]}>
                        {priorityLabels[task.priority]}
                      </Badge>
                      {task.type && (
                        <Badge variant="outline">
                          {typeLabels[task.type as keyof typeof typeLabels]}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Criado por: {task.created_by_name || 'Desconhecido'}</span>
                      <span>
                        {formatDistanceToNow(new Date(task.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {task.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.estimated_hours}h
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <ListTodo className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de Detalhes da Tarefa */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {selectedTask?.task_number}
              </span>
              {selectedTask?.title}
            </DialogTitle>
            <DialogDescription>
              Criado por {selectedTask?.created_by_name} em{' '}
              {selectedTask && new Date(selectedTask.created_at).toLocaleDateString('pt-BR')}
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              {/* Status e Badges */}
              <div className="flex gap-2 flex-wrap">
                <Select
                  value={selectedTask.status}
                  onValueChange={(value) => updateTaskStatus(selectedTask.id, value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Badge className={priorityColors[selectedTask.priority]}>
                  {priorityLabels[selectedTask.priority]}
                </Badge>
                {selectedTask.type && (
                  <Badge variant="outline">
                    {typeLabels[selectedTask.type as keyof typeof typeLabels]}
                  </Badge>
                )}
              </div>

              {/* Informações */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedTask.estimated_hours && (
                  <div>
                    <span className="text-muted-foreground">Horas Estimadas:</span>{' '}
                    <span className="font-medium">{selectedTask.estimated_hours}h</span>
                  </div>
                )}
                {selectedTask.actual_hours && (
                  <div>
                    <span className="text-muted-foreground">Horas Reais:</span>{' '}
                    <span className="font-medium">{selectedTask.actual_hours}h</span>
                  </div>
                )}
                {selectedTask.due_date && (
                  <div>
                    <span className="text-muted-foreground">Vencimento:</span>{' '}
                    <span className="font-medium">
                      {new Date(selectedTask.due_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {selectedTask.assigned_to_name && (
                  <div>
                    <span className="text-muted-foreground">Atribuído a:</span>{' '}
                    <span className="font-medium">{selectedTask.assigned_to_name}</span>
                  </div>
                )}
              </div>

              {/* Descrição */}
              {selectedTask.description && (
                <div>
                  <h4 className="font-semibold mb-2">Descrição</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {/* Comentários */}
              <div>
                <h4 className="font-semibold mb-2">Comentários</h4>
                <div className="space-y-3 mb-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{comment.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                    </div>
                  ))}
                </div>

                {/* Adicionar Comentário */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Adicionar comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button onClick={addComment} disabled={!newComment.trim()}>
                      Adicionar Comentário
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
