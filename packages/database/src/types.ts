export type ScopeType = "global" | "category" | "app";

export type AppStatus = "live" | "archived" | "sold";

export type RegistryStatus = "active" | "disabled";

export type DeploymentStatus = "queued" | "running" | "success" | "failed";

export interface AppRecord {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  status: AppStatus;
  launch_date: string;
  active_users: number;
  mrr_usd: number;
  hero_image_url: string;
  headline: string;
  subheadline: string;
  created_at: string;
}

export interface AppRegistryRecord {
  id: string;
  app_id: string;
  slug: string;
  version: string;
  category_id: string;
  entry_path: string;
  access_scope_type: ScopeType;
  payment_capability: "none" | "checkout";
  status: RegistryStatus;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  scope_type: ScopeType;
  scope_id: string | null;
  status: "active" | "canceled" | "expired";
  created_at: string;
}

export interface ArtifactRecord {
  id: string;
  app_registry_id: string;
  version: string;
  sha256: string;
  size_bytes: number;
  mime_type: string;
  storage_path: string;
  manifest_json: Record<string, unknown>;
  created_at: string;
}

export interface DeploymentRecord {
  id: string;
  app_registry_id: string;
  artifact_id: string | null;
  status: DeploymentStatus;
  error_message: string | null;
  commit_sha: string | null;
  preview_url: string | null;
  production_url: string | null;
  log: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  created_by: string | null;
  created_at: string;
}

export interface DomainRecord {
  id: string;
  app_registry_id: string;
  subdomain: string;
  fqdn: string;
  status: "active" | "disabled";
  created_at: string;
}

export interface UserRecord {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  scopes: string[];
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
}

export interface PlatformSettingRecord {
  key: string;
  value_json: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

export interface ProductRecord {
  id: string;
  app_registry_id: string;
  slug: string;
  name: string;
  description: string | null;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
}

export interface PriceRecord {
  id: string;
  product_id: string;
  amount_cents: number;
  currency: string;
  interval: "one_time" | "month" | "year";
  status: "active" | "disabled";
  created_at: string;
}

export interface OrderRecord {
  id: string;
  user_id: string;
  app_registry_id: string;
  status: "pending" | "paid" | "canceled" | "refunded";
  total_amount_cents: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  product_id: string;
  price_id: string;
  quantity: number;
  unit_amount_cents: number;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  provider: string;
  provider_payment_id: string;
  amount_cents: number;
  currency: string;
  status: "requires_action" | "succeeded" | "failed";
  created_at: string;
}
