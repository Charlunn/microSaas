# Admin Workflow

## API Surface
- List + register apps: `apps/main-landing/src/app/api/admin/apps/route.ts`
- Toggle status: `apps/main-landing/src/app/api/admin/apps/[id]/status/route.ts`
- Admin UI: `apps/main-landing/src/app/admin/apps/page.tsx`

## Register Flow
1. Open `/admin/apps`.
2. Fill `appId/slug/categoryId/version/entryPath`.
3. Submit `POST /api/admin/apps`.
4. Server validates manifest (`validateManifestOrThrow`).
5. DB upsert to `app_registry`.

## Enable/Disable Flow
1. Click enable/disable in admin UI.
2. Client sends `PATCH /api/admin/apps/:id/status`.
3. DB updates registry status.
4. Host sync applies status next resolve cycle.

## Rollback
- Set status to `disabled` for immediate soft rollback.
- Keep manifest and DB record for audit/history.

## Checklist
- [ ] Register returns `ok: true`.
- [ ] Invalid payload returns `code: MANIFEST_INVALID`.
- [ ] Disable hides app from `/apps/[slug]`.
- [ ] Re-enable restores route availability.
