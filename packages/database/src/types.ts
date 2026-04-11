export type ScopeType = "global" | "category" | "app";

export type AppStatus = "live" | "archived" | "sold";

export type RegistryStatus = "active" | "disabled";

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
