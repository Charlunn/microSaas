create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category_id text not null,
  status text not null check (status in ('live', 'archived', 'sold')),
  launch_date date not null,
  active_users integer not null default 0,
  mrr_usd numeric(12,2) not null default 0,
  hero_image_url text not null,
  headline text not null,
  subheadline text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_registry (
  id uuid primary key default gen_random_uuid(),
  app_id text unique not null,
  slug text unique not null,
  version text not null,
  category_id text not null,
  entry_path text not null,
  access_scope_type text not null check (access_scope_type in ('global', 'category', 'app')),
  payment_capability text not null check (payment_capability in ('none', 'checkout')),
  status text not null check (status in ('active', 'disabled')) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scope_type text not null check (scope_type in ('global', 'category', 'app')),
  scope_id text,
  status text not null check (status in ('active', 'canceled', 'expired')),
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_scope
  on public.subscriptions(user_id, scope_type, scope_id, status);

create index if not exists idx_app_registry_status
  on public.app_registry(status);

create table if not exists public.app_artifacts (
  id uuid primary key default gen_random_uuid(),
  app_registry_id uuid not null references public.app_registry(id) on delete cascade,
  version text not null,
  sha256 text not null,
  size_bytes bigint not null,
  mime_type text not null,
  storage_path text not null,
  manifest_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (app_registry_id, version)
);

create index if not exists idx_app_artifacts_app_registry
  on public.app_artifacts(app_registry_id, created_at desc);

create table if not exists public.app_deployments (
  id uuid primary key default gen_random_uuid(),
  app_registry_id uuid not null references public.app_registry(id) on delete cascade,
  artifact_id uuid references public.app_artifacts(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'success', 'failed')),
  error_message text,
  commit_sha text,
  preview_url text,
  production_url text,
  log text not null default '',
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.app_deployments
  alter column artifact_id drop not null;

alter table public.app_deployments
  add column if not exists commit_sha text,
  add column if not exists preview_url text,
  add column if not exists production_url text,
  add column if not exists log text not null default '',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_app_deployments_app_registry
  on public.app_deployments(app_registry_id, created_at desc);

create index if not exists idx_app_deployments_status
  on public.app_deployments(status);

create table if not exists public.app_domains (
  id uuid primary key default gen_random_uuid(),
  app_registry_id uuid not null references public.app_registry(id) on delete cascade,
  subdomain text not null unique,
  fqdn text not null,
  status text not null check (status in ('active', 'disabled')) default 'active',
  created_at timestamptz not null default now(),
  unique (app_registry_id)
);

create index if not exists idx_app_domains_app_registry
  on public.app_domains(app_registry_id);

create table if not exists public.admin_users (
  id uuid primary key references public.users(id) on delete cascade,
  email text not null,
  scopes text[] not null default array[]::text[],
  status text not null check (status in ('active', 'disabled')) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_admin_users_email on public.admin_users (lower(email));

create table if not exists public.platform_settings (
  key text primary key,
  value_json jsonb not null,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  app_registry_id uuid not null references public.app_registry(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  status text not null check (status in ('active', 'disabled')) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_registry_id, slug)
);

create table if not exists public.prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  amount_cents integer not null,
  currency text not null,
  interval text not null check (interval in ('one_time', 'month', 'year')),
  status text not null check (status in ('active', 'disabled')) default 'active',
  created_at timestamptz not null default now()
);

create index if not exists idx_prices_product on public.prices(product_id, status);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  app_registry_id uuid not null references public.app_registry(id) on delete cascade,
  status text not null check (status in ('pending', 'paid', 'canceled', 'refunded')) default 'pending',
  total_amount_cents integer not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_app on public.orders(app_registry_id, created_at desc);
create index if not exists idx_orders_user on public.orders(user_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  price_id uuid not null references public.prices(id) on delete restrict,
  quantity integer not null default 1,
  unit_amount_cents integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order on public.order_items(order_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text not null,
  amount_cents integer not null,
  currency text not null,
  status text not null check (status in ('requires_action', 'succeeded', 'failed')),
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create index if not exists idx_payments_order on public.payments(order_id, created_at desc);
