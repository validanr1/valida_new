import { supabase } from "@/integrations/supabase/client";
import { currentSession } from "@/services/auth"; // Importado corretamente

export type UserDisplay = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  roleProfileId?: string;
  roleProfileName?: string;
  partnerId?: string;
  partnerName?: string;
  createdAt: string;
};

export type Partner = {
  id: string;
  name: string;
};

export type RoleProfile = { id: string; name: string; target: "admin" | "partner"; status: "active" | "inactive" };

type ListUsersResponse = {
  users: UserDisplay[];
  partners: Partner[];
  roleProfiles: RoleProfile[];
};

type CreateUserPayload = {
  email: string;
  password?: string; // Optional for invite, required for direct creation
  firstName?: string;
  lastName?: string;
  roleProfileId: string;
  partnerId?: string;
};

type UpdateUserPayload = {
  userId: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  roleProfileId?: string;
  partnerId?: string;
};

type DeleteUserPayload = {
  userId: string;
};

  // Resolve Functions base URL from env. Prefer VITE_SUPABASE_FUNCTIONS_URL; fallback to VITE_SUPABASE_URL origin.
  const VITE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const VITE_FUNCS = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  const FUNCTIONS_BASE = VITE_FUNCS ?? (VITE_URL ? `${new URL(VITE_URL).origin}/functions/v1` : undefined);
  if (!FUNCTIONS_BASE) {
    // This ensures clearer error if env is missing at runtime
    console.warn("Missing VITE_SUPABASE_FUNCTIONS_URL or VITE_SUPABASE_URL in environment");
  }
  const SUPABASE_EDGE_FUNCTION_BASE_URL = FUNCTIONS_BASE ? `${FUNCTIONS_BASE}/user-management` : undefined as unknown as string;

const invokeEdgeFunction = async <T>(functionPath: string, payload?: object, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'POST'): Promise<T> => {
  if (!SUPABASE_EDGE_FUNCTION_BASE_URL) {
    throw new Error("Missing VITE_SUPABASE_FUNCTIONS_URL or VITE_SUPABASE_URL in environment");
  }
  // Fetch a fresh Supabase session to ensure we have a valid access token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    console.warn('[userManagementService] No valid Supabase session found when calling Edge Function:', sessionError);
    throw new Error("Sessão não encontrada. Faça login novamente.");
  }

  if (!SUPABASE_EDGE_FUNCTION_BASE_URL) {
    throw new Error("Missing VITE_SUPABASE_FUNCTIONS_URL or VITE_SUPABASE_URL in environment");
  }
  const url = `${SUPABASE_EDGE_FUNCTION_BASE_URL}/${functionPath}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  };

  if (payload && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(payload);
  }

  console.log(`[invokeEdgeFunction] Calling URL: ${url}`);
  console.log(`[invokeEdgeFunction] Request options:`, options);

  const response = await fetch(url, options);

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
    console.warn(`[invokeEdgeFunction] Edge Function ${functionPath} returned non-JSON response (Status: ${response.status}):`, data);
    if (!response.ok) {
      throw new Error(`Falha na função Edge: ${functionPath} (Status: ${response.status} ${response.statusText}). Resposta: ${data}`);
    }
    throw new Error(`Falha na função Edge: ${functionPath}. Resposta inesperada (não JSON). Resposta: ${data}`);
  }

  if (!response.ok) {
    console.error(`[invokeEdgeFunction] Edge Function ${functionPath} error response:`, data);
    throw new Error(data?.error || `Falha na função Edge: ${functionPath}`);
  }
  return data as T;
};

export const userManagementService = {
  listUsers: async (): Promise<ListUsersResponse> => {
    return invokeEdgeFunction<ListUsersResponse>("list", undefined, 'GET');
  },

  createUser: async (payload: CreateUserPayload): Promise<{ userId: string; email: string }> => {
    return invokeEdgeFunction<{ userId: string; email: string }>("create", payload, 'POST');
  },

  updateUser: async (payload: UpdateUserPayload): Promise<{ ok: boolean }> => {
    const { userId, ...bodyPayload } = payload;
    return invokeEdgeFunction<{ ok: boolean }>(`update/${userId}`, bodyPayload, 'PATCH');
  },

  deleteUser: async (payload: DeleteUserPayload): Promise<{ ok: boolean }> => {
    return invokeEdgeFunction<{ ok: boolean }>(`delete/${payload.userId}`, undefined, 'DELETE');
  },
};