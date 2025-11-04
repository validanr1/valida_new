import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS', // Adicionado para ser explícito
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL')!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY || !SITE_URL) {
  throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, or SITE_URL environment variables.');
}

const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

serve(async (req: Request) => {
  console.log("Edge Function user-management invoked."); // Log no início da invocação

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  
  let action: string;
  let userId: string | undefined;

  // Determine action and userId based on path structure
  // Expected paths:
  // /user-management/list
  // /user-management/create
  // /user-management/update/{userId}
  // /user-management/delete/{userId}

  // Check if the path ends with a userId for update/delete operations
  if (pathSegments.length >= 2 && (pathSegments[pathSegments.length - 2] === 'update' || pathSegments[pathSegments.length - 2] === 'delete')) {
    action = pathSegments[pathSegments.length - 2]; // 'update' or 'delete'
    userId = pathSegments[pathSegments.length - 1]; // The actual user ID
  } else {
    action = pathSegments[pathSegments.length - 1]; // 'list' or 'create'
  }

  try {
    // --- Autenticação e Autorização (SuperAdmin) ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("user-management: Missing Authorization header");
      return json({ error: "Unauthorized: Missing Authorization header" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("user-management: Invalid or missing JWT - getUser error:", userError);
      return json({ error: "Unauthorized: Invalid token" }, 401);
    }
    const invokerUserId = user.id;

    // Allow either SuperAdmin (RPC) or permissions-based access via JWT app_metadata
    const { data: isSuperAdmin, error: rpcError } = await sbAdmin.rpc('is_super_admin_by_id', { p_user_id: invokerUserId });
    const appMeta = (user as any)?.app_metadata || {};
    let roleContext = (appMeta?.roleContext as string | undefined) || undefined;
    let permissions = (appMeta?.permissions as string[] | undefined) || [];

    const has = (perm: string) => {
      // Exact match
      if (permissions.includes(perm)) return true;
      // Support wildcard on category (e.g., users:*)
      const parts = perm.split(":");
      if (parts.length === 2) {
        const wildcard2 = `${parts[0]}:*`;
        if (permissions.includes(wildcard2)) return true;
      }
      // Optional scope+domain wildcard (e.g., admin:users:*)
      if (parts.length >= 3) {
        const wildcard3 = `${parts[0]}:${parts[1]}:*`;
        if (permissions.includes(wildcard3)) return true;
      }
      return false;
    };

    const requirePermission = (required: string) => {
      if (isSuperAdmin === true || roleContext === "SuperAdmin") return true;
      return has(required);
    };

    // Pre-check per action minimal permission before executing route logic
    const requiredByAction: Record<string, string> = {
      list: "users:read",
      create: "users:create",
      update: "users:update",
      delete: "users:delete",
    };

    const required = requiredByAction[action] || "users:read";
    if (!requirePermission(required)) {
      console.error("user-management: Forbidden - Missing permission:", required, "- RoleContext:", roleContext, "- Permissions:", permissions);
      return json({ error: "Forbidden: missing permission" }, 403);
    }

    // If app_metadata.permissions is empty, fallback by deriving from DB role_profile
    if ((!permissions || permissions.length === 0) && !isSuperAdmin) {
      try {
        const { data: profileRow, error: profErr } = await sbAdmin
          .from("profiles")
          .select("role_profile_id")
          .eq("id", invokerUserId)
          .maybeSingle();
        if (!profErr && profileRow?.role_profile_id) {
          const { data: roleRow, error: roleErr } = await sbAdmin
            .from("role_profiles")
            .select("name,target,status,permissions")
            .eq("id", profileRow.role_profile_id)
            .maybeSingle();
          if (!roleErr && roleRow && roleRow.target === "admin" && roleRow.status === "active") {
            const permsObj = roleRow.permissions as Record<string, boolean> | null;
            if (permsObj) {
              permissions = Object.keys(permsObj).filter((k) => permsObj[k]);
            }
            roleContext = roleRow.name === "SuperAdmin" ? "SuperAdmin" : "Admin";
          }
        }
      } catch (e) {
        console.warn("user-management: Fallback permission derivation failed:", e);
      }
      if (!requirePermission(required)) {
        console.error("user-management: Forbidden after fallback - Missing permission:", required);
        return json({ error: "Forbidden: missing permission" }, 403);
      }
    }
    // --- Fim Autenticação e Autorização ---

    // --- Rotas da API ---
    switch (action) {
      case 'list': {
        if (req.method !== 'GET') return json({ error: 'Method Not Allowed' }, 405);

        const [
          { data: authUsers, error: authError },
          { data: profiles, error: profilesError },
          { data: partnerMembers, error: pmError },
          { data: allPartners, error: partnersError },
          { data: allRoleProfiles, error: rpError },
        ] = await Promise.all([
          sbAdmin.auth.admin.listUsers(),
          sbAdmin.from("profiles").select("id,first_name,last_name,avatar_url,role_profile_id"),
          sbAdmin.from("partner_members").select("user_id,partner_id,role"),
          sbAdmin.from("partners").select("id,name").order("name", { ascending: true }),
          sbAdmin.from("role_profiles").select("id,name,target,status").order("name", { ascending: true }),
        ]);

        if (authError || profilesError || pmError || partnersError || rpError) {
          console.error("user-management/list: Error fetching data:", authError || profilesError || pmError || partnersError || rpError);
          throw new Error("Failed to fetch all necessary data for user listing.");
        }

        const profilesMap = new Map<string, { id: string; first_name?: string; last_name?: string; avatar_url?: string; role_profile_id?: string }>();
        profiles?.forEach((p) => profilesMap.set(p.id, p as any));

        const partnerMembersMap = new Map<string, { user_id: string; partner_id: string; role: string }>();
        partnerMembers?.forEach((pm) => partnerMembersMap.set(pm.user_id, pm as any));

        const partnersMap = new Map<string, { id: string; name: string }>();
        allPartners?.forEach((p) => partnersMap.set(p.id, p as any));

        const roleProfilesMap = new Map<string, { id: string; name: string; target: "admin" | "partner"; status: "active" | "inactive" }>();
        allRoleProfiles?.forEach((rp) => roleProfilesMap.set(rp.id, rp as any));

        const displayUsers = (authUsers?.users ?? []).map((u: any) => {
          const profile = profilesMap.get(u.id);
          const member = partnerMembersMap.get(u.id);

          let roleProfileId: string | undefined = profile?.role_profile_id;
          let roleProfileName: string | undefined;
          let partnerId: string | undefined;
          let partnerName: string | undefined;

          if (roleProfileId) {
            const rp = roleProfilesMap.get(roleProfileId);
            roleProfileName = rp?.name;
            if (rp?.target === "partner") {
              partnerId = member?.partner_id;
              partnerName = partnerId ? partnersMap.get(partnerId)?.name : undefined;
            }
          } else {
            // Se role_profile_id está faltando em public.profiles, é uma inconsistência.
            // Tentamos inferir com base em partner_members, mas marcamos como inferido.
            if (member) {
                const partnerAdminProfile = Array.from(roleProfilesMap.values()).find(
                    (rp) => rp.name === "PartnerAdmin" && rp.target === "partner",
                );
                roleProfileId = partnerAdminProfile?.id;
                roleProfileName = partnerAdminProfile?.name || "Admin Parceiro (Inferido)";
                partnerId = member?.partner_id;
                partnerName = partnerId ? partnersMap.get(partnerId)?.name : undefined;
            } else {
                // Se não há role_profile_id e nem entrada em partner_members, é um usuário sem perfil definido.
                roleProfileName = "Usuário Sem Perfil";
            }
          }

          return {
            id: u.id,
            email: u.email ?? "N/A",
            firstName: profile?.first_name ?? u.user_metadata?.first_name,
            lastName: profile?.last_name ?? u.user_metadata?.last_name,
            avatarUrl: profile?.avatar_url ?? u.user_metadata?.avatar_url,
            roleProfileId,
            roleProfileName,
            partnerId,
            partnerName,
            createdAt: u.created_at,
          };
        });

        return json({
          users: displayUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
          partners: allPartners,
          roleProfiles: (allRoleProfiles ?? []).filter((rp: any) => rp.status === "active"),
        });
      }

      case 'create': {
        if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
        const body = await req.json();
        const { email, password, firstName, lastName, roleProfileId, partnerId } = body;

        if (!email || !roleProfileId) {
          return json({ error: 'Email and roleProfileId are required' }, 400);
        }

        const { data: roleProfile, error: rpFetchError } = await sbAdmin
          .from("role_profiles")
          .select("name, target")
          .eq("id", roleProfileId)
          .single();

        if (rpFetchError || !roleProfile) {
          throw new Error("Role profile not found or inactive.");
        }

        const userMetadata = {
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          role_profile_id: roleProfileId,
        };

        let authData, authError;
        if (password) {
          ({ data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: userMetadata,
          }));
        } else {
          ({ data: authData, error: authError } = await sbAdmin.auth.admin.inviteUserByEmail(
            email,
            {
              data: userMetadata,
              redirectTo: `${SITE_URL}/auth/callback`,
            }
          ));
        }

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create or invite user.");
        const newUser = authData.user;

        // Insere na tabela partner_members apenas se for um perfil de parceiro
        if (roleProfile.target === "partner") {
          const { error: pmErr } = await sbAdmin.from('partner_members').insert({
            user_id: newUser.id,
            partner_id: partnerId || null, // Permite null
            role: roleProfile.name,
          });
          if (pmErr) {
            await sbAdmin.auth.admin.deleteUser(newUser.id).catch(() => {});
            throw pmErr;
          }
        }

        return json({ userId: newUser.id, email: newUser.email }, 201);
      }

      case 'update': {
        if (req.method !== 'PATCH') return json({ error: 'Method Not Allowed' }, 405);
        // userId já está definido no escopo superior
        const body = await req.json();
        const { email, password, firstName, lastName, roleProfileId, partnerId } = body;

        if (!userId) return json({ error: 'User ID is required' }, 400);
        console.log(`user-management/update: Updating user ${userId} with payload:`, body);

        const updateAuthPayload: { email?: string; password?: string; user_metadata?: any } = {};
        if (email) updateAuthPayload.email = email;
        if (password) updateAuthPayload.password = password;

        const userMetadata: Record<string, any> = {};
        if (firstName !== undefined) userMetadata.first_name = firstName;
        if (lastName !== undefined) userMetadata.last_name = lastName;
        if (roleProfileId !== undefined) userMetadata.role_profile_id = roleProfileId;
        
        if (Object.keys(userMetadata).length > 0) {
          updateAuthPayload.user_metadata = userMetadata;
        }

        if (Object.keys(updateAuthPayload).length > 0) {
          const { error: authUpdateError } = await sbAdmin.auth.admin.updateUserById(userId, updateAuthPayload);
          if (authUpdateError) {
            console.error(`user-management/update: Error updating auth.users for user ${userId}:`, authUpdateError);
            throw authUpdateError;
          }
          console.log(`user-management/update: auth.users updated for user ${userId}`);
        }

        const profilePayload: Record<string, any> = { updated_at: new Date().toISOString() };
        if (firstName !== undefined) profilePayload.first_name = firstName;
        if (lastName !== undefined) profilePayload.last_name = lastName;
        if (roleProfileId !== undefined) profilePayload.role_profile_id = roleProfileId;

        const { error: profileUpdateError } = await sbAdmin.from('profiles').update(profilePayload).eq('id', userId);
        if (profileUpdateError) {
          console.error(`user-management/update: Error updating public.profiles for user ${userId}:`, profileUpdateError);
          throw profileUpdateError;
        }
        console.log(`user-management/update: public.profiles updated for user ${userId}`);

        if (roleProfileId) {
          const { data: roleProfile, error: rpFetchError } = await sbAdmin
            .from("role_profiles")
            .select("name, target")
            .eq("id", roleProfileId)
            .single();

          if (rpFetchError || !roleProfile) {
            console.error(`user-management/update: Role profile ${roleProfileId} not found or inactive:`, rpFetchError);
            throw new Error("Role profile not found or inactive.");
          }

          if (roleProfile.target === "partner") {
            console.log(`user-management/update: Upserting partner_members for user ${userId}, partnerId: ${partnerId}`);
            const { error: pmUpsertError } = await sbAdmin.from('partner_members').upsert({
              user_id: userId,
              partner_id: partnerId || null, // Permite null
              role: roleProfile.name,
            }, { onConflict: 'user_id' });
            if (pmUpsertError) {
              console.error(`user-management/update: Error upserting partner_members for user ${userId}:`, pmUpsertError);
              throw pmUpsertError;
            }
            console.log(`user-management/update: partner_members upserted for user ${userId}`);
          } else {
            console.log(`user-management/update: Deleting partner_members entry for user ${userId} (not a partner role)`);
            const { error: pmDeleteError } = await sbAdmin
              .from('partner_members')
              .delete()
              .eq('user_id', userId);
            if (pmDeleteError) {
              console.warn("Error deleting partner_members for non-partner role:", pmDeleteError);
            }
          }
        } else {
          console.log(`user-management/update: Deleting partner_members entry for user ${userId} (no roleProfileId provided)`);
          const { error: pmDeleteError } = await sbAdmin
            .from('partner_members')
            .delete()
            .eq('user_id', userId);
          if (pmDeleteError) {
            console.warn("Error deleting partner_members for no roleProfileId:", pmDeleteError);
          }
        }

        return json({ ok: true });
      }

      case 'delete': {
        if (req.method !== 'DELETE') return json({ error: 'Method Not Allowed' }, 405);
        // userId já está definido no escopo superior

        if (!userId) return json({ error: 'User ID is required' }, 400);

        console.log(`user-management/delete: Attempting to delete user ${userId}`);

        try {
          // 1. Set responsible_user_id to NULL in companies table
          console.log(`user-management/delete: Clearing responsible_user_id in companies for user ${userId}`);
          const { error: updateCompaniesError } = await sbAdmin
            .from('companies')
            .update({ responsible_user_id: null })
            .eq('responsible_user_id', userId);
          if (updateCompaniesError) {
            console.error(`user-management/delete: Error setting responsible_user_id to NULL for user ${userId}:`, updateCompaniesError);
            throw new Error("Failed to clear user's responsibility in companies.");
          }
          console.log(`user-management/delete: Cleared responsible_user_id in companies for user ${userId}`);

          // 2. Delete from partner_members
          console.log(`user-management/delete: Deleting from partner_members for user ${userId}`);
          const { error: pmDeleteError } = await sbAdmin.from('partner_members').delete().eq('user_id', userId);
          if (pmDeleteError) {
            console.warn(`user-management/delete: Error deleting from partner_members for user ${userId}:`, pmDeleteError);
          }
          console.log(`user-management/delete: Attempted deletion from partner_members for user ${userId}`);
          
          // 3. Delete user from auth.users. This should trigger ON DELETE CASCADE for public.profiles.
          console.log(`user-management/delete: Deleting user ${userId} from auth.users`);
          const { error: uErr } = await sbAdmin.auth.admin.deleteUser(userId);
          if (uErr) {
            console.error(`user-management/delete: Error deleting user ${userId} from auth.users:`, uErr);
            throw uErr;
          }
          console.log(`user-management/delete: User ${userId} successfully deleted from auth.users`);

          return json({ ok: true });
        } catch (deleteProcessError) {
          console.error(`user-management/delete: Error during deletion process for user ${userId}:`, deleteProcessError);
          throw deleteProcessError;
        }
      }

      default:
        return json({ error: 'Not Found' }, 404);
    }
  } catch (err) {
    console.error("user-management: Unhandled error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message ?? 'Internal Server Error' }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});