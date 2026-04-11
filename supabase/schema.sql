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
