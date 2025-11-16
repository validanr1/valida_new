import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";
import { useSession } from "@/integrations/supabase/SupabaseProvider";

type TWTask = {
  id: string;
  title: string;
  description?: string | null;
  status: "pending"|"in_progress"|"completed"|"cancelled";
  priority: "low"|"medium"|"high"|"urgent";
  order_index?: number;
  created_by_email?: string | null;
  created_at?: string;
  acknowledged?: boolean;
};

const TasksWagner = () => {
    // Atalho de teclado Ctrl+N para nova tarefa
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
          e.preventDefault();
          openCreate();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);
  const { session } = useSession();
  const email = session?.user?.email ?? "";
  const isAdmin = session?.roleContext === "SuperAdmin";
  const isAllowed = isAdmin || email === "wfss1982@gmail.com";

  const [items, setItems] = useState<TWTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TWTask | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TWTask["status"]>("pending");
  const [priority, setPriority] = useState<TWTask["priority"]>("medium");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  useEffect(() => {
    if (!isAllowed) { setLoading(false); return; }
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("tasks_wagner")
        .select("id,title,description,status,priority,order_index,created_by_email,created_at,acknowledged")
        .order("created_at", { ascending: true });
      if (mounted) {
        setItems((data as TWTask[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isAllowed]);

  const filtered = useMemo(() => {
    let arr = items.filter((t) => (
      (filterStatus === "all" || t.status === filterStatus) && (filterPriority === "all" || t.priority === filterPriority)
    ));
    if (fromDate) {
      const fromTs = new Date(fromDate).getTime();
      arr = arr.filter((t) => (t.created_at ? new Date(t.created_at).getTime() >= fromTs : true));
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23,59,59,999);
      const toTs = end.getTime();
      arr = arr.filter((t) => (t.created_at ? new Date(t.created_at).getTime() <= toTs : true));
    }
    arr = arr.sort((a, b) => {
      const aTs = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTs = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortAsc ? aTs - bTs : bTs - aTs;
    });
    return arr;
  }, [items, filterStatus, filterPriority, fromDate, toDate, sortAsc]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setStatus("pending");
    setPriority("medium");
    setOpen(true);
  };

  const openEdit = (t: TWTask) => {
    setEditing(t);
    setTitle(t.title);
    setDescription(t.description ?? "");
    setStatus(t.status);
    setPriority(t.priority);
    setOpen(true);
  };

  const onSave = async () => {
    if (!title.trim()) return;
    const payload = {
      id: editing?.id,
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      created_by_email: email,
      acknowledged: editing?.acknowledged ?? false,
    } as any;
    const { data, error } = await supabase.from("tasks_wagner").upsert(payload).select("*");
    if (error) return;
    const saved = (data ?? [])[0] as TWTask;
    setItems((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
    });
    setOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("tasks_wagner").delete().eq("id", deleteId);
    if (error) return;
    setItems((prev) => prev.filter((x) => x.id !== deleteId));
    setDeleteOpen(false);
    setDeleteId(null);
  };

  if (!isAllowed) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Acesso restrito.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tasks Wagner</h1>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em progresso</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">De</span>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Até</span>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-40" />
            </div>
          </div>
          <Button variant="outline" onClick={() => setSortAsc((v) => !v)}>
            {sortAsc ? "Crescente (antiga → nova)" : "Decrescente (nova → antiga)"}
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>+ Nova Tarefa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Tarefa" : "Cadastrar Tarefa"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Título</div>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Descrição</div>
                  <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Status</div>
                    <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em progresso</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Prioridade</div>
                    <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={onSave}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead>Título</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Ciente</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[360px] truncate">{t.description ?? "—"}</TableCell>
                <TableCell>{t.status}</TableCell>
                <TableCell>{t.priority}</TableCell>
                <TableCell>
                  {t.acknowledged ? (
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                      <Check className="h-3 w-3" /> Ciente
                    </span>
                  ) : (
                    "Não"
                  )}
                </TableCell>
                <TableCell>{t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => { setDeleteId(t.id); setDeleteOpen(true); }}>Excluir</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Nenhuma tarefa encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-muted-foreground">Esta ação não poderá ser desfeita.</div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TasksWagner;
  const markAcknowledged = async (id: string) => {
    const { data, error } = await supabase.from("tasks_wagner").update({ acknowledged: true }).eq("id", id).select("*");
    if (error) return;
    const saved = (data ?? [])[0] as TWTask;
    setItems((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
  };