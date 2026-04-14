import { createServerSupabaseClient } from "./client";
import type {
  AdminUserRecord,
  AppRecord,
  AppRegistryRecord,
  ArtifactRecord,
  DeploymentRecord,
  DeploymentStatus,
  DomainRecord,
  OrderRecord,
  PaymentRecord,
  PlatformSettingRecord,
  PriceRecord,
  ProductRecord,
  RegistryStatus,
  ScopeType,
  SubscriptionRecord,
  UserRecord
} from "./types";

export class DatabaseConflictError extends Error {
  constructor(
    public readonly code:
      | "SLUG_CONFLICT"
      | "VERSION_CONFLICT"
      | "SUBDOMAIN_CONFLICT"
      | "DEPLOYMENT_INVALID_STATE",
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DatabaseConflictError";
  }
}

const DEPLOYMENT_TRANSITIONS: Record<DeploymentStatus, DeploymentStatus[]> = {
  queued: ["running", "failed"],
  running: ["success", "failed"],
  success: [],
  failed: []
};

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

export async function findRegisteredAppById(id: string): Promise<AppRegistryRecord | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("app_registry")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find registered app by id: ${error.message}`);
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

  const { data: bySlug, error: bySlugError } = await supabase
    .from("app_registry")
    .select("*")
    .eq("slug", input.slug)
    .limit(1)
    .maybeSingle();

  if (bySlugError) {
    throw new Error(`Failed to check existing slug: ${bySlugError.message}`);
  }

  const { data: byAppId, error: byAppIdError } = await supabase
    .from("app_registry")
    .select("*")
    .eq("app_id", input.appId)
    .limit(1)
    .maybeSingle();

  if (byAppIdError) {
    throw new Error(`Failed to check existing app id: ${byAppIdError.message}`);
  }

  const slugRecord = (bySlug as AppRegistryRecord | null) ?? null;
  const appIdRecord = (byAppId as AppRegistryRecord | null) ?? null;

  if (slugRecord && slugRecord.app_id !== input.appId) {
    throw new DatabaseConflictError("SLUG_CONFLICT", "slug already belongs to another app", {
      slug: input.slug,
      existingAppId: slugRecord.app_id,
      appId: input.appId
    });
  }

  if (appIdRecord && appIdRecord.slug !== input.slug) {
    throw new DatabaseConflictError("SLUG_CONFLICT", "appId is already bound to a different slug", {
      appId: input.appId,
      existingSlug: appIdRecord.slug,
      slug: input.slug
    });
  }

  const normalized = {
    app_id: input.appId,
    slug: input.slug,
    version: input.version,
    category_id: input.categoryId,
    entry_path: input.entryPath,
    access_scope_type: input.accessScopeType,
    payment_capability: input.paymentCapability,
    status: input.status ?? "active"
  };

  if (slugRecord && slugRecord.version === input.version) {
    const samePayload =
      slugRecord.category_id === normalized.category_id &&
      slugRecord.entry_path === normalized.entry_path &&
      slugRecord.access_scope_type === normalized.access_scope_type &&
      slugRecord.payment_capability === normalized.payment_capability;

    if (!samePayload) {
      throw new DatabaseConflictError("VERSION_CONFLICT", "same version exists with different manifest payload", {
        slug: input.slug,
        version: input.version
      });
    }

    return slugRecord;
  }

  const targetId = slugRecord?.id ?? appIdRecord?.id;
  if (targetId) {
    const { data, error } = await supabase
      .from("app_registry")
      .update({ ...normalized, updated_at: new Date().toISOString() })
      .eq("id", targetId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update registered app: ${error.message}`);
    }

    return data as AppRegistryRecord;
  }

  const { data, error } = await supabase
    .from("app_registry")
    .insert({ ...normalized, updated_at: new Date().toISOString() })
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

export async function createArtifact(input: {
  appRegistryId: string;
  version: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  storagePath: string;
  manifestJson: Record<string, unknown>;
}): Promise<ArtifactRecord> {
  const supabase = createServerSupabaseClient();

  const { data: existing, error: existingError } = await supabase
    .from("app_artifacts")
    .select("*")
    .eq("app_registry_id", input.appRegistryId)
    .eq("version", input.version)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check existing artifact: ${existingError.message}`);
  }

  if (existing) {
    throw new DatabaseConflictError("VERSION_CONFLICT", "artifact version already exists for app", {
      appRegistryId: input.appRegistryId,
      version: input.version
    });
  }

  const { data, error } = await supabase
    .from("app_artifacts")
    .insert({
      app_registry_id: input.appRegistryId,
      version: input.version,
      sha256: input.sha256,
      size_bytes: input.sizeBytes,
      mime_type: input.mimeType,
      storage_path: input.storagePath,
      manifest_json: input.manifestJson
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create artifact: ${error.message}`);
  }

  return data as ArtifactRecord;
}

export async function findArtifactById(id: string): Promise<ArtifactRecord | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("app_artifacts")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find artifact: ${error.message}`);
  }

  return (data as ArtifactRecord | null) ?? null;
}

export async function createDeployment(input: {
  appRegistryId: string;
  artifactId?: string | null;
  createdBy?: string | null;
  commitSha?: string | null;
}): Promise<DeploymentRecord> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("app_deployments")
    .insert({
      app_registry_id: input.appRegistryId,
      artifact_id: input.artifactId ?? null,
      status: "queued",
      commit_sha: input.commitSha ?? null,
      created_by: input.createdBy ?? null,
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create deployment: ${error.message}`);
  }

  return data as DeploymentRecord;
}

export async function findDeploymentByIdAndApp(
  deploymentId: string,
  appRegistryId: string
): Promise<DeploymentRecord | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("app_deployments")
    .select("*")
    .eq("id", deploymentId)
    .eq("app_registry_id", appRegistryId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find deployment: ${error.message}`);
  }

  return (data as DeploymentRecord | null) ?? null;
}

export async function updateDeploymentStatus(input: {
  deploymentId: string;
  nextStatus: DeploymentStatus;
  errorMessage?: string | null;
  logAppend?: string;
  commitSha?: string | null;
  previewUrl?: string | null;
  productionUrl?: string | null;
}): Promise<DeploymentRecord> {
  const supabase = createServerSupabaseClient();

  const { data: current, error: currentError } = await supabase
    .from("app_deployments")
    .select("*")
    .eq("id", input.deploymentId)
    .limit(1)
    .maybeSingle();

  if (currentError) {
    throw new Error(`Failed to load deployment state: ${currentError.message}`);
  }

  if (!current) {
    throw new Error("Deployment not found");
  }

  const record = current as DeploymentRecord;
  const allowed = DEPLOYMENT_TRANSITIONS[record.status];
  if (!allowed.includes(input.nextStatus)) {
    throw new DatabaseConflictError(
      "DEPLOYMENT_INVALID_STATE",
      `invalid deployment transition ${record.status} -> ${input.nextStatus}`,
      {
        deploymentId: input.deploymentId,
        from: record.status,
        to: input.nextStatus
      }
    );
  }

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status: input.nextStatus,
    error_message: input.errorMessage ?? null,
    updated_at: now
  };

  const appended = input.logAppend?.trim();
  if (appended) {
    const nextLog = `${record.log ?? ""}${record.log ? "\n" : ""}${appended}`;
    payload.log = nextLog.slice(-20000);
  }

  if (input.commitSha !== undefined) {
    payload.commit_sha = input.commitSha;
  }

  if (input.previewUrl !== undefined) {
    payload.preview_url = input.previewUrl;
  }

  if (input.productionUrl !== undefined) {
    payload.production_url = input.productionUrl;
  }

  if (input.nextStatus === "running" && !record.started_at) {
    payload.started_at = now;
  }

  if (input.nextStatus === "success" || input.nextStatus === "failed") {
    payload.finished_at = now;
  }

  const { data, error } = await supabase
    .from("app_deployments")
    .update(payload)
    .eq("id", input.deploymentId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update deployment status: ${error.message}`);
  }

  return data as DeploymentRecord;
}

export async function getLatestDeploymentByAppRegistryId(appRegistryId: string): Promise<DeploymentRecord | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("app_deployments")
    .select("*")
    .eq("app_registry_id", appRegistryId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read latest deployment: ${error.message}`);
  }

  return (data as DeploymentRecord | null) ?? null;
}

export async function assignSubdomain(input: {
  appRegistryId: string;
  subdomain: string;
  fqdn: string;
}): Promise<DomainRecord> {
  const supabase = createServerSupabaseClient();

  const { data: taken, error: takenError } = await supabase
    .from("app_domains")
    .select("*")
    .eq("subdomain", input.subdomain)
    .limit(1)
    .maybeSingle();

  if (takenError) {
    throw new Error(`Failed to check subdomain: ${takenError.message}`);
  }

  if (taken && (taken as DomainRecord).app_registry_id !== input.appRegistryId) {
    throw new DatabaseConflictError("SUBDOMAIN_CONFLICT", "subdomain already assigned", {
      subdomain: input.subdomain
    });
  }

  const { data, error } = await supabase
    .from("app_domains")
    .upsert(
      {
        app_registry_id: input.appRegistryId,
        subdomain: input.subdomain,
        fqdn: input.fqdn,
        status: "active"
      },
      { onConflict: "app_registry_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to assign subdomain: ${error.message}`);
  }

  return data as DomainRecord;
}

export async function getDomainByAppRegistryId(appRegistryId: string): Promise<DomainRecord | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("app_domains")
    .select("*")
    .eq("app_registry_id", appRegistryId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get app domain: ${error.message}`);
  }

  return (data as DomainRecord | null) ?? null;
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

export async function getAdminUserByEmail(email: string): Promise<AdminUserRecord | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .ilike("email", email)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read admin user: ${error.message}`);
  }

  return (data as AdminUserRecord | null) ?? null;
}

export async function getAdminMetricsOverview(): Promise<{
  totalMrr: number;
  activeApps: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalOrders: number;
  paidOrders: number;
  grossRevenueCents: number;
}> {
  const supabase = createServerSupabaseClient();

  const [{ data: apps, error: appsError }, { count: totalSubscriptions, error: subsError }, { count: activeSubscriptions, error: activeSubsError }, { count: totalOrders, error: ordersError }, { count: paidOrders, error: paidOrdersError }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from("apps").select("mrr_usd, status"),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("payments").select("amount_cents, status").eq("status", "succeeded")
  ]);

  if (appsError) throw new Error(`Failed to load apps metrics: ${appsError.message}`);
  if (subsError) throw new Error(`Failed to load subscriptions metrics: ${subsError.message}`);
  if (activeSubsError) throw new Error(`Failed to load active subscriptions metrics: ${activeSubsError.message}`);
  if (ordersError) throw new Error(`Failed to load order metrics: ${ordersError.message}`);
  if (paidOrdersError) throw new Error(`Failed to load paid order metrics: ${paidOrdersError.message}`);
  if (paymentsError) throw new Error(`Failed to load payments metrics: ${paymentsError.message}`);

  return {
    totalMrr: (apps ?? []).reduce((sum, row) => sum + Number(row.mrr_usd || 0), 0),
    activeApps: (apps ?? []).filter((row) => row.status === "live").length,
    totalSubscriptions: totalSubscriptions ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    totalOrders: totalOrders ?? 0,
    paidOrders: paidOrders ?? 0,
    grossRevenueCents: (payments ?? []).reduce((sum, row) => sum + Number(row.amount_cents || 0), 0)
  };
}

export async function listAdminAppMetrics(): Promise<Array<{
  id: string;
  slug: string;
  status: RegistryStatus;
  payment_capability: "none" | "checkout";
  deployment_status: DeploymentStatus | null;
  deployment_error: string | null;
  domain: string | null;
  mrr_usd: number;
  order_count: number;
  paid_order_count: number;
}>> {
  const [apps, deployments, domains, orders, appRevenues] = await Promise.all([
    listRegisteredApps(),
    listLatestDeploymentsByApp(),
    listDomainsByApp(),
    listOrderCountsByApp(),
    listRevenueByAppSlug()
  ]);

  const deploymentByApp = new Map<string, DeploymentRecord>();
  deployments.forEach((row) => deploymentByApp.set(row.app_registry_id, row));

  const domainByApp = new Map<string, DomainRecord>();
  domains.forEach((row) => domainByApp.set(row.app_registry_id, row));

  const orderByApp = new Map<string, { total: number; paid: number }>();
  orders.forEach((row) => orderByApp.set(row.app_registry_id, row));

  const revenueBySlug = new Map<string, number>();
  appRevenues.forEach((row) => revenueBySlug.set(row.slug, row.mrr_usd));

  return apps.map((app) => {
    const deployment = deploymentByApp.get(app.id);
    const domain = domainByApp.get(app.id);
    const order = orderByApp.get(app.id);

    return {
      id: app.id,
      slug: app.slug,
      status: app.status,
      payment_capability: app.payment_capability,
      deployment_status: deployment?.status ?? null,
      deployment_error: deployment?.error_message ?? null,
      domain: domain?.fqdn ?? null,
      mrr_usd: revenueBySlug.get(app.slug) ?? 0,
      order_count: order?.total ?? 0,
      paid_order_count: order?.paid ?? 0
    };
  });
}

export async function getPlatformSetting<TValue extends Record<string, unknown>>(key: string): Promise<TValue | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("key", key)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get platform setting: ${error.message}`);
  }

  const row = (data as PlatformSettingRecord | null) ?? null;
  return (row?.value_json as TValue | undefined) ?? null;
}

export async function upsertPlatformSetting<TValue extends Record<string, unknown>>(input: {
  key: string;
  value: TValue;
  updatedBy: string | null;
}): Promise<PlatformSettingRecord> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("platform_settings")
    .upsert(
      {
        key: input.key,
        value_json: input.value,
        updated_by: input.updatedBy,
        updated_at: new Date().toISOString()
      },
      { onConflict: "key" }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to upsert platform setting: ${error.message}`);
  }

  return data as PlatformSettingRecord;
}

export async function listProducts(appRegistryId?: string): Promise<ProductRecord[]> {
  const supabase = createServerSupabaseClient();

  const query = supabase.from("products").select("*").order("created_at", { ascending: false });
  const scoped = appRegistryId ? query.eq("app_registry_id", appRegistryId) : query;

  const { data, error } = await scoped;
  if (error) {
    throw new Error(`Failed to list products: ${error.message}`);
  }

  return (data ?? []) as ProductRecord[];
}

export async function listPrices(productId?: string): Promise<PriceRecord[]> {
  const supabase = createServerSupabaseClient();

  const query = supabase.from("prices").select("*").order("created_at", { ascending: false });
  const scoped = productId ? query.eq("product_id", productId) : query;

  const { data, error } = await scoped;
  if (error) {
    throw new Error(`Failed to list prices: ${error.message}`);
  }

  return (data ?? []) as PriceRecord[];
}

export async function listOrders(options?: {
  appRegistryId?: string;
  userId?: string;
  status?: OrderRecord["status"];
}): Promise<OrderRecord[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (options?.appRegistryId) query = query.eq("app_registry_id", options.appRegistryId);
  if (options?.userId) query = query.eq("user_id", options.userId);
  if (options?.status) query = query.eq("status", options.status);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list orders: ${error.message}`);
  }

  return (data ?? []) as OrderRecord[];
}

export async function listPayments(orderId?: string): Promise<PaymentRecord[]> {
  const supabase = createServerSupabaseClient();

  const query = supabase.from("payments").select("*").order("created_at", { ascending: false });
  const scoped = orderId ? query.eq("order_id", orderId) : query;

  const { data, error } = await scoped;
  if (error) {
    throw new Error(`Failed to list payments: ${error.message}`);
  }

  return (data ?? []) as PaymentRecord[];
}

export async function listUsers(limit = 100): Promise<UserRecord[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  return (data ?? []) as UserRecord[];
}

async function listLatestDeploymentsByApp(): Promise<DeploymentRecord[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("app_deployments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list deployments: ${error.message}`);
  }

  const byApp = new Map<string, DeploymentRecord>();
  for (const row of (data ?? []) as DeploymentRecord[]) {
    if (!byApp.has(row.app_registry_id)) {
      byApp.set(row.app_registry_id, row);
    }
  }

  return Array.from(byApp.values());
}

async function listDomainsByApp(): Promise<DomainRecord[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("app_domains").select("*");
  if (error) {
    throw new Error(`Failed to list domains: ${error.message}`);
  }

  return (data ?? []) as DomainRecord[];
}

async function listOrderCountsByApp(): Promise<Array<{ app_registry_id: string; total: number; paid: number }>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("orders").select("app_registry_id, status");
  if (error) {
    throw new Error(`Failed to list order counts: ${error.message}`);
  }

  const counts = new Map<string, { app_registry_id: string; total: number; paid: number }>();
  for (const row of (data ?? []) as Array<{ app_registry_id: string; status: OrderRecord["status"] }>) {
    const current = counts.get(row.app_registry_id) ?? {
      app_registry_id: row.app_registry_id,
      total: 0,
      paid: 0
    };

    current.total += 1;
    if (row.status === "paid") {
      current.paid += 1;
    }

    counts.set(row.app_registry_id, current);
  }

  return Array.from(counts.values());
}

async function listRevenueByAppSlug(): Promise<Array<{ slug: string; mrr_usd: number }>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("apps").select("slug, mrr_usd");

  if (error) {
    throw new Error(`Failed to list app revenue: ${error.message}`);
  }

  return ((data ?? []) as Array<{ slug: string; mrr_usd: number }>).map((row) => ({
    slug: row.slug,
    mrr_usd: Number(row.mrr_usd || 0)
  }));
}
