export type CollectionName =
  | "users"
  | "partners"
  | "companies"
  | "employees"
  | "plans"
  | "planAssignments"
  | "usageCounters"
  | "auditLogs"
  | "partnerMembers";

// Flag para desligar o banco local de coleções
const LOCAL_DB_DISABLED = true;

// Namespace permanece para chaves de preferências/sessão
const NS = "validaNr1";

const k = (name: string) => `${NS}:${name}`;

export function nowISO() {
  return new Date().toISOString();
}

export function generateId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
}

// Apenas para preferências/sessão (não coleções)
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
export function writeJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Coleções (DESATIVADAS)
export function getCollection<T = any>(_name: CollectionName): T[] {
  if (LOCAL_DB_DISABLED) {
    if (typeof window !== "undefined") {
      console.warn("[storage] getCollection está desativado. Use o Supabase.");
    }
    return [];
  }
  return [];
}
export function setCollection<T = any>(_name: CollectionName, _data: T[]) {
  if (LOCAL_DB_DISABLED) {
    if (typeof window !== "undefined") {
      console.warn("[storage] setCollection está desativado. Use o Supabase.");
    }
    return;
  }
}
export function getById<T = any>(_name: CollectionName, _id: string): T | undefined {
  if (LOCAL_DB_DISABLED) {
    if (typeof window !== "undefined") {
      console.warn("[storage] getById está desativado. Use o Supabase.");
    }
    return undefined;
  }
  return undefined;
}
export function upsert<T extends { id?: string }>(_name: CollectionName, _item: T, _idPrefix?: string): T {
  if (LOCAL_DB_DISABLED) {
    throw new Error("Local DB desativado. Migre para Supabase nesta tela antes de continuar.");
  }
  const next: any = { ..._item };
  if (!next.id) next.id = generateId(_name.slice(0, 3));
  return next as T;
}
export function removeById(_name: CollectionName, _id: string) {
  if (LOCAL_DB_DISABLED) {
    if (typeof window !== "undefined") {
      console.warn("[storage] removeById está desativado. Use o Supabase.");
    }
    return;
  }
}

// key-value (sessão, configurações, etc.) — permanece habilitado
export function setItem<T>(name: string, value: T) {
  writeJSON(k(name), value);
}
export function getItem<T>(name: string, fallback: T): T {
  return readJSON<T>(k(name), fallback);
}
export function removeItem(name: string) {
  localStorage.removeItem(k(name));
}

// Marcações de seed agora não fazem sentido; mantidas por compatibilidade
export function isSeeded(): boolean {
  return false;
}
export function markSeeded() {
  // no-op
}