import { createServerSupabaseClient } from "./client";
import type { AppRecord, AppRegistryRecord, RegistryStatus, ScopeType, SubscriptionRecord } from "./types";

export type ManifestProjection = {
  id: string;
  slug: string;
  version: string;
  categoryId: string;
  entryPath: string;
  accessScopeType: ScopeType;
  paymentCapability: "none" | "checkout";
  status: RegistryStatus;
};

export function mapRegistryRecordToManifestProjection(record: AppRegistryRecord): ManifestProjection {
  return {
    id: record.app_id,
    slug: record.slug,
    version: record.version,
    categoryId: record.category_id,
    entryPath: record.entry_path,
    accessScopeType: record.access_scope_type,
    paymentCapability: record.payment_capability,
    status: record.status
  };
}

export async function getLandingApps(limit = 8): Promise<AppRecord[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("apps")
    .select("*")
    .order("launch_date", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch landing apps: ${error.message}`);
  }

  return (data ?? []) as AppRecord[];
}

export async function getTotalMrr(): Promise<number> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.from("apps").select("mrr_usd");

  if (error) {
    throw new Error(`Failed to fetch total MRR: ${error.message}`);
  }

  return (data ?? []).reduce((sum, row) => sum + Number(row.mrr_usd || 0), 0);
}

export async function listRegisteredApps(status?: RegistryStatus): Promise<AppRegistryRecord[]> {
  const supabase = createServerSupabaseClient();

  const query = supabase.from("app_registry").select("*").order("created_at", { ascending: false });
  const scopedQuery = status ? query.eq("status", status) : query;

  const { data, error } = await scopedQuery;

  if (error) {
    throw new Error(`Failed to list registered apps: ${error.message}`);
  }

  return (data ?? []) as AppRegistryRecord[];
}

export async function findRegisteredAppBySlug(slug: string): Promise<AppRegistryRecord | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("app_registry")
    .select("*")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find registered app: ${error.message}`);
  }

  return (data as AppRegistryRecord | null) ?? null;
}

export async function registerApp(input: {
  appId: string;
  slug: string;
  version: string;
  categoryId: string;
  entryPath: string;
  accessScopeType: ScopeType;
  paymentCapability: "none" | "checkout";
  status?: RegistryStatus;
}): Promise<AppRegistryRecord> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("app_registry")
    .upsert(
      {
        app_id: input.appId,
        slug: input.slug,
        version: input.version,
        category_id: input.categoryId,
        entry_path: input.entryPath,
        access_scope_type: input.accessScopeType,
        payment_capability: input.paymentCapability,
        status: input.status ?? "active",
        updated_at: new Date().toISOString()
      },
      { onConflict: "slug" }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to register app: ${error.message}`);
  }

  return data as AppRegistryRecord;
}

export async function updateAppStatus(id: string, status: RegistryStatus): Promise<AppRegistryRecord> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("app_registry")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update app status: ${error.message}`);
  }

  return data as AppRegistryRecord;
}

export async function checkSubscriptionByScope(params: {
  userId: string;
  scopeType: ScopeType;
  scopeId?: string;
}): Promise<boolean> {
  const supabase = createServerSupabaseClient();

  const query = supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", params.userId)
    .eq("scope_type", params.scopeType)
    .eq("status", "active")
    .limit(1);

  const scopedQuery = params.scopeId ? query.eq("scope_id", params.scopeId) : query.is("scope_id", null);

  const { data, error } = await scopedQuery;

  if (error) {
    throw new Error(`Failed to check access: ${error.message}`);
  }

  return (data?.length ?? 0) > 0;
}

export async function listUserSubscriptions(userId: string): Promise<SubscriptionRecord[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list subscriptions: ${error.message}`);
  }

  return (data ?? []) as SubscriptionRecord[];
}
