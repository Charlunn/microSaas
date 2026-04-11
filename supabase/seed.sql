insert into public.users (id, email, display_name)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@landing.local', 'Factory Owner')
on conflict (id) do nothing;

insert into public.apps (slug, name, category_id, status, launch_date, active_users, mrr_usd, hero_image_url, headline, subheadline)
values
  ('pdf', 'PDF Tool', 'productivity', 'live', '2026-03-11', 1240, 3900,
   'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200&auto=format&fit=crop',
   'PDF conversion pipeline with production-grade queueing',
   'Upload, batch-convert, and export in under 15 seconds.'),
  ('writer', 'AI Writer', 'ai', 'live', '2026-03-21', 860, 2700,
   'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1200&auto=format&fit=crop',
   'AI drafting engine for landing pages and docs',
   'Generate conversion-focused copy with controlled tone packs.'),
  ('image-zip', 'ImageZip', 'creator', 'sold', '2026-02-09', 430, 0,
   'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?q=80&w=1200&auto=format&fit=crop',
   'Bulk image optimizer and zip delivery endpoint',
   'Compress and distribute visual assets in one click.'),
  ('forms', 'Forms Hub', 'productivity', 'archived', '2026-01-27', 210, 280,
   'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1200&auto=format&fit=crop',
   'Micro form engine with embeddable collectors',
   'Capture leads with low-latency widgets and webhooks.')
on conflict (slug) do nothing;

insert into public.app_registry (app_id, slug, version, category_id, entry_path, access_scope_type, payment_capability, status)
values
  ('app-main-landing', 'main-landing', '0.1.0', 'core', '/overview', 'global', 'none', 'active')
on conflict (slug) do update set
  version = excluded.version,
  category_id = excluded.category_id,
  entry_path = excluded.entry_path,
  access_scope_type = excluded.access_scope_type,
  payment_capability = excluded.payment_capability,
  status = excluded.status,
  updated_at = now();

insert into public.subscriptions (user_id, scope_type, scope_id, status)
values
  ('11111111-1111-1111-1111-111111111111', 'app', 'pdf', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'app', 'writer', 'active')
on conflict do nothing;
