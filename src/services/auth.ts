import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export interface LocalSession {
  user: User;
  profile: {
    id: string;
    first_name: string | null; // Pode ser null
    last_name: string | null;  // Pode ser null
    role_profile_id: string | null;
  };
  roleContext: "SuperAdmin" | "PartnerAdmin" | "User" | "Guest";
  partnerId?: string;
  company_id?: string;
  permissions?: string[];
  partnerPlatformName?: string;
  partnerDescription?: string;
  partnerLogoPrimaryDataUrl?: string;
  partnerLogoNegativeDataUrl?: string;
  partnerSupportWhatsapp?: string;
}

const LOCAL_SESSION_KEY = "local_session";

export const getLocalSession = (): LocalSession | null => {
  try {
    const storedSession = localStorage.getItem(LOCAL_SESSION_KEY);
    return storedSession ? JSON.parse(storedSession) : null;
  } catch (error) {
    console.error("[auth.ts] Error getting local session from localStorage:", error);
    return null;
  }
};

export const currentSession = getLocalSession;

export const setLocalSession = (session: LocalSession | null) => {
  try {
    if (session) {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  } catch (error) {
    console.error("[auth.ts] Error setting local session to localStorage:", error);
  }
};

export const syncAndStoreLocalSession = async (): Promise<LocalSession | null> => {
  console.log("[auth.ts] syncAndStoreLocalSession: Starting session sync process.");

  // 1. Fetch Supabase session
  const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("[auth.ts] syncAndStoreLocalSession: Error fetching Supabase session:", sessionError);
    setLocalSession(null);
    return null;
  }
  if (!supabaseSession) {
    console.log("[auth.ts] syncAndStoreLocalSession: No active Supabase session found.");
    setLocalSession(null);
    return null;
  }
  const user = supabaseSession.user;
  console.log("[auth.ts] syncAndStoreLocalSession: Supabase user found (ID:", user.id, ", Email:", user.email, ").");

  // 2. Fetch user profile from public.profiles
  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role_profile_id")
    .eq("id", user.id)
    .maybeSingle(); // Use maybeSingle to handle no-row case gracefully

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no row found
    console.error("[auth.ts] syncAndStoreLocalSession: Database error fetching profile for user:", user.id, profileError);
    setLocalSession(null);
    return null;
  }

  // If profile doesn't exist, attempt to create a basic one (use upsert to avoid 409 conflicts)
  if (!profile) {
    console.warn("[auth.ts] syncAndStoreLocalSession: Profile not found for user:", user.id, ". Attempting to create a basic profile.");
    const { data: newProfile, error: createProfileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
        role_profile_id: user.user_metadata?.role_profile_id || null,
      }, { onConflict: 'id' })
      .select("id, first_name, last_name, role_profile_id")
      .single();

    if (createProfileError) {
      console.error("[auth.ts] syncAndStoreLocalSession: Error creating basic profile for user:", user.id, createProfileError);
      setLocalSession(null);
      return null;
    }
    console.log("[auth.ts] syncAndStoreLocalSession: Basic profile created for user:", user.id, newProfile);
    profile = newProfile;
  }

  // If profile is still null after creation attempt (shouldn't happen if creation is successful)
  if (!profile) {
    console.error("[auth.ts] syncAndStoreLocalSession: Critical: Profile is null after fetch and create attempts for user:", user.id);
    setLocalSession(null);
    return null;
  }
  console.log("[auth.ts] syncAndStoreLocalSession: User profile loaded:", profile);

  // Initialize session properties
  let roleContext: LocalSession["roleContext"] = "Guest";
  let partnerId: string | undefined = undefined;
  let permissions: string[] = [];
  let partnerPlatformName: string | undefined = undefined;
  let partnerDescription: string | undefined = undefined;
  let partnerLogoPrimaryDataUrl: string | undefined = undefined;
  let partnerLogoNegativeDataUrl: string | undefined = undefined;
  let partnerSupportWhatsapp: string | undefined = undefined;

  // 3. Fetch role profile details if role_profile_id exists
  if (profile.role_profile_id) {
    console.log("[auth.ts] syncAndStoreLocalSession: Fetching role profile details for ID:", profile.role_profile_id);
    const { data: roleProfile, error: roleProfileError } = await supabase
      .from("role_profiles")
      .select("name, permissions, target")
      .eq("id", profile.role_profile_id)
      .maybeSingle();

    if (roleProfileError) {
      console.error("[auth.ts] syncAndStoreLocalSession: Error fetching role profile details for ID:", profile.role_profile_id, roleProfileError);
    } else if (roleProfile) {
      console.log("[auth.ts] syncAndStoreLocalSession: Role profile found (Name:", roleProfile.name, ", Target:", roleProfile.target, ").");
      permissions = roleProfile.permissions || [];

      if (roleProfile.name === "SuperAdmin" && roleProfile.target === "admin") {
        roleContext = "SuperAdmin";
      } else if (roleProfile.name === "PartnerAdmin" && roleProfile.target === "partner") {
        roleContext = "PartnerAdmin";
        
        // 4. Fetch partner_id for PartnerAdmin
        console.log("[auth.ts] syncAndStoreLocalSession: Fetching partner_member for user:", user.id);
        const { data: partnerMember, error: pmError } = await supabase
          .from("partner_members")
          .select("partner_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (pmError) {
          console.error("[auth.ts] syncAndStoreLocalSession: Error fetching partner_member for user:", user.id, pmError);
        } else if (partnerMember?.partner_id) {
          partnerId = partnerMember.partner_id;
          console.log("[auth.ts] syncAndStoreLocalSession: Partner ID found:", partnerId);

          // 5. Fetch partner's white label settings
          console.log("[auth.ts] syncAndStoreLocalSession: Fetching partner data for ID:", partnerId);
          const { data: partnerData, error: partnerDataError } = await supabase
            .from("partners")
            .select("platform_name, description, logo_data_url, logo_negative_data_url, support_whatsapp")
            .eq("id", partnerId)
            .maybeSingle();

          if (partnerDataError) {
            console.error("[auth.ts] syncAndStoreLocalSession: Error fetching partner data for ID:", partnerId, partnerDataError);
          } else if (partnerData) {
            partnerPlatformName = partnerData.platform_name ?? undefined;
            partnerDescription = partnerData.description ?? undefined;
            partnerLogoPrimaryDataUrl = partnerData.logo_data_url ?? undefined;
            partnerLogoNegativeDataUrl = partnerData.logo_negative_data_url ?? undefined;
            partnerSupportWhatsapp = partnerData.support_whatsapp ?? undefined;
            console.log("[auth.ts] syncAndStoreLocalSession: Partner white label data loaded.");
          }
        } else {
          console.warn("[auth.ts] syncAndStoreLocalSession: PartnerAdmin user has no associated partner_member entry.");
          // If a PartnerAdmin has no partner_id, it's an inconsistent state.
          // We might want to force a logout or redirect to a setup page.
          // For now, it will proceed with partnerId as undefined.
        }
      } else {
        roleContext = "User"; // Default for other authenticated roles
      }
    }
  } else {
    console.log("[auth.ts] syncAndStoreLocalSession: No role_profile_id found in profile. Defaulting to Guest role context.");
  }

  // 6. Get selected company_id from local storage
  const storedCompanyId = localStorage.getItem("selected_company_id") || undefined;
  console.log("[auth.ts] syncAndStoreLocalSession: Stored company ID from localStorage:", storedCompanyId);

  const newLocalSession: LocalSession = {
    user: user,
    profile: {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      role_profile_id: profile.role_profile_id,
    },
    roleContext: roleContext,
    partnerId: partnerId,
    company_id: storedCompanyId,
    permissions: permissions,
    partnerPlatformName: partnerPlatformName,
    partnerDescription: partnerDescription,
    partnerLogoPrimaryDataUrl: partnerLogoPrimaryDataUrl,
    partnerLogoNegativeDataUrl: partnerLogoNegativeDataUrl,
    partnerSupportWhatsapp: partnerSupportWhatsapp,
  };

  setLocalSession(newLocalSession);
  console.log("[auth.ts] syncAndStoreLocalSession: Local session synced and stored. Final role context:", newLocalSession.roleContext, "Partner ID:", newLocalSession.partnerId, "Company ID:", newLocalSession.company_id);
  return newLocalSession;
};

export const clearLocalSession = () => {
  console.log("[auth.ts] clearLocalSession: Clearing local session and selected company ID.");
  localStorage.removeItem("selected_company_id"); // Limpa também a empresa selecionada
  setLocalSession(null);
};

export const signOut = async () => {
  console.log("[auth.ts] signOut: Attempting to sign out from Supabase.");
  
  // Always clear local session first to immediately reflect logout in UI
  clearLocalSession();

  // Attempt to sign out from Supabase
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth.ts] signOut: Error signing out from Supabase:", error);
    // Even with an error, the local session is already cleared, so UI should reflect logout.
    // We can throw the error if we want to notify the user about a server-side issue.
    throw error;
  }
  console.log("[auth.ts] signOut: Successfully signed out from Supabase.");
};

// Nova função para definir a empresa selecionada e disparar um evento
export const setCurrentCompany = (companyId: string) => {
  console.log(`[auth.ts] setCurrentCompany: Setting selected company ID to: ${companyId}`);
  if (companyId) {
    localStorage.setItem("selected_company_id", companyId);
  } else {
    localStorage.removeItem("selected_company_id");
  }
  // Persist in DB (profiles.company_id) best-effort without blocking callers
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("[auth.ts] setCurrentCompany: No authenticated user; skipping DB persistence.");
      } else {
        const payload: any = { company_id: companyId || null };
        const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
        if (error) {
          console.error("[auth.ts] setCurrentCompany: Failed to update profiles.company_id:", error);
        } else {
          console.log("[auth.ts] setCurrentCompany: profiles.company_id updated.");
        }
      }
    } catch (e) {
      console.error("[auth.ts] setCurrentCompany: Unexpected error while persisting company_id:", e);
    } finally {
      // Dispara um evento personalizado para que o SupabaseProvider possa reagir
      window.dispatchEvent(new CustomEvent("company_id_changed", { detail: companyId }));
    }
  })();
};