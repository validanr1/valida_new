import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  created_at?: string;
  payload_json?: any;
  user_id?: string;
  partner_id?: string;
};

type Profile = {
  id: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
};

type RecentActivityProps = {
  partnerId?: string;
};

const RecentActivity = ({ partnerId }: RecentActivityProps) => {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const { session } = useSession();

  useEffect(() => {
    if (!session) return;

    let mounted = true;
    (async () => {
      // 1) Tenta buscar atividades reais do audit_logs
      let auditQuery = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);

      if (partnerId) {
        auditQuery = auditQuery.eq("partner_id", partnerId);
      }

      const { data: auditData, error: auditError } = await auditQuery;
      if (auditError) {
        console.error("Error fetching recent activity:", auditError.message);
      }

      let finalItems: AuditLog[] = (auditData as AuditLog[]) ?? [];

      // 2) Fallback: se não houver logs, mostrar eventos relevantes do parceiro
      if ((!finalItems || finalItems.length === 0) && partnerId) {
        const results: AuditLog[] = [];
        const [ass, rep, comps] = await Promise.all([
          supabase
            .from("assessments")
            .select("id,created_at")
            .eq("partner_id", partnerId)
            .order("created_at", { ascending: false })
            .limit(2),
          supabase
            .from("reports")
            .select("id,created_at")
            .eq("partner_id", partnerId)
            .order("created_at", { ascending: false })
            .limit(2),
          supabase
            .from("companies")
            .select("id,created_at")
            .eq("partner_id", partnerId)
            .order("created_at", { ascending: false })
            .limit(2),
        ]);

        const assessments = (ass.data ?? []).map((a: any) => ({
          id: a.id,
          action: "Nova avaliação",
          entity: "Avaliação",
          created_at: a.created_at,
        }));
        const reports = (rep.data ?? []).map((r: any) => ({
          id: r.id,
          action: "Nova denúncia",
          entity: "Denúncia",
          created_at: r.created_at,
        }));
        const companies = (comps.data ?? []).map((c: any) => ({
          id: c.id,
          action: "Nova empresa",
          entity: "Empresa",
          created_at: c.created_at,
        }));

        const merged = [...assessments, ...reports, ...companies];
        merged.sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });
        finalItems = merged.slice(0, 4);
      }

      if (mounted) {
        setItems(finalItems);
        const userIds = Array.from(new Set((finalItems ?? []).map(i => i.user_id).filter(Boolean))) as string[];
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id,first_name,last_name")
            .in("id", userIds);
          if (profilesError) {
            console.error("Error fetching profiles for recent activity:", profilesError.message);
          }
          setProfiles(profilesData as Profile[] ?? []);
        } else {
          setProfiles([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, [partnerId, session]);

  const profilesById = useMemo(() => {
    const map: Record<string, Profile> = {};
    profiles.forEach(p => map[p.id] = p);
    return map;
  }, [profiles]);

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return iso;
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return "Sistema";
    const profile = profilesById[userId];
    if (profile?.first_name && profile?.last_name) return `${profile.first_name} ${profile.last_name}`;
    if (profile?.first_name) return profile.first_name;
    return "Usuário"; // Fallback se não houver nome
  };

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-medium">Atividades recentes</h3>
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">
                {i.action} <span className="text-muted-foreground">• {i.entity}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {getUserName(i.user_id)} • {formatDate(i.created_at)}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Sem atividades registradas.
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecentActivity;