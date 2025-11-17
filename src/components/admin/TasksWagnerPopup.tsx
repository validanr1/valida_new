import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";

type TWItem = { id: string; title: string; description?: string | null; status: string; updated_at?: string };

const TasksWagnerPopup = () => {
  const { session } = useSession();
  const isAdmin = session?.roleContext === "SuperAdmin";
  const isAllowed = Boolean(isAdmin);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TWItem[]>([]);

  useEffect(() => {
    if (!isAllowed) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("tasks_wagner")
        .select("id,title,description,status,updated_at")
        .eq("status", "completed")
        .eq("acknowledged", false)
        .order("updated_at", { ascending: false });
      const rows = (data as TWItem[]) ?? [];
      if (mounted) {
        setItems(rows);
        setOpen(rows.length > 0);
      }
    })();
    return () => { mounted = false; };
  }, [isAllowed, location.pathname]);

  if (!isAllowed) return null;

  const markAcknowledged = async (id: string) => {
    const { error } = await supabase.from("tasks_wagner").update({ acknowledged: true }).eq("id", id);
    if (error) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    setOpen((prev) => {
      const remaining = items.filter((x) => x.id !== id).length;
      return remaining > 0 ? prev : false;
    });
  };

  const dismiss = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[50rem]">
        <DialogHeader>
          <DialogTitle>Tarefas Concluídas</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {items.map((t) => (
            <Card key={t.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{t.title}</div>
                  {t.description && (
                    <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => markAcknowledged(t.id)}>
                  <Check className="mr-1 h-3 w-3" /> Ciente
                </Button>
              </div>
            </Card>
          ))}
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={dismiss}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TasksWagnerPopup;