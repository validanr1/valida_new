"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Star } from "lucide-react";

type PlatformRating = {
  id: string;
  partner_id: string;
  user_id: string;
  score: number;
  comment?: string | null;
  created_at: string;
};

type Partner = { id: string; name: string };
type Profile = { id: string; first_name?: string; last_name?: string; email?: string };

const PlatformRatings = () => {
  const { session } = useSession();
  const [ratings, setRatings] = useState<PlatformRating[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerFilter, setPartnerFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: ratingsData, error: ratingsError }, { data: partnersData, error: partnersError }] = await Promise.all([
        supabase.from("platform_ratings").select("*").order("created_at", { ascending: false }),
        supabase.from("partners").select("id,name").order("name", { ascending: true }),
      ]);

      if (ratingsError) console.error("Error fetching platform ratings:", ratingsError);
      if (partnersError) console.error("Error fetching partners:", partnersError);

      if (!mounted) return;

      setRatings((ratingsData as PlatformRating[]) ?? []);
      setPartners((partnersData as Partner[]) ?? []);

      // Fetch profiles for all users who submitted ratings
      const userIds = Array.from(new Set((ratingsData ?? []).map(r => r.user_id)));
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id,first_name,last_name")
          .in("id", userIds);
        
        const { data: authUsersData, error: authUsersError } = await supabase.auth.admin.listUsers({
          ids: userIds,
        });

        if (profilesError) console.error("Error fetching profiles:", profilesError);
        if (authUsersError) console.error("Error fetching auth users:", authUsersError);

        const combinedProfiles: Profile[] = (profilesData ?? []).map(p => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          email: authUsersData?.users.find(u => u.id === p.id)?.email,
        }));
        setProfiles(combinedProfiles);
      } else {
        setProfiles([]);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [session?.user_id]);

  const partnersById = useMemo(() => {
    const map: Record<string, Partner> = {};
    partners.forEach(p => map[p.id] = p);
    return map;
  }, [partners]);

  const profilesById = useMemo(() => {
    const map: Record<string, Profile> = {};
    profiles.forEach(p => map[p.id] = p);
    return map;
  }, [profiles]);

  const filteredRatings = useMemo(() => {
    return ratings.filter(r => {
      if (partnerFilter && r.partner_id !== partnerFilter) return false;
      return true;
    });
  }, [ratings, partnerFilter]);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const renderStars = (score: number) => (
    <div className="flex items-center gap-0.5 text-yellow-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < score ? 'fill-yellow-500' : 'fill-gray-300'}`} />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Carregando avaliações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Avaliações da Plataforma</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize as avaliações e feedbacks recebidos dos parceiros.
          </p>
        </div>
        <Select value={partnerFilter} onValueChange={(v) => setPartnerFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Todos os parceiros" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
              <TableHead className="text-white first:rounded-tl-xl">Data</TableHead>
              <TableHead className="text-white">Parceiro</TableHead>
              <TableHead className="text-white">Avaliador</TableHead>
              <TableHead className="text-white">Score</TableHead>
              <TableHead className="text-white last:rounded-tr-xl">Comentário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRatings.map(r => {
              const partner = partnersById[r.partner_id];
              const userProfile = profilesById[r.user_id];
              const userName = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(" ") || userProfile?.email || "Usuário Desconhecido";

              return (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.created_at)}</TableCell>
                  <TableCell className="font-medium">{partner?.name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="font-medium">{userName}</div>
                    {userProfile?.email && <div className="text-xs text-muted-foreground">{userProfile.email}</div>}
                  </TableCell>
                  <TableCell>{renderStars(r.score)}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">{r.comment ?? "—"}</TableCell>
                </TableRow>
              );
            })}
            {filteredRatings.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhuma avaliação encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default PlatformRatings;