# Host-Child Contract

## Host Responsibilities
- Load static manifests (bootstrap) from `apps/main-landing/src/lib/bootstrap-manifests.ts`.
- Sync DB registry into runtime registry via `syncHostRegistry()` in `apps/main-landing/src/lib/host-runtime.ts`.
- Resolve active app by slug via `resolveActiveHostedApp(slug)`.
- Expose app list API: `GET /api/apps` (`apps/main-landing/src/app/api/apps/route.ts`).

## Child Responsibilities
- Provide valid manifest compatible with `AppManifest`.
- Use unique `id` and `slug`.
- Keep `entryPath` aligned with host route namespace (`/apps/<slug>`).

## Lifecycle
1. Child app manifest created.
2. Admin registers/updates app in `app_registry`.
3. Host syncs `app_registry` to runtime registry.
4. Public route `/apps/[slug]` resolves active manifest and renders entry node.
5. Access API `/api/apps/[slug]/access` checks permissions using `useAuth().checkAccess`.

## Error Semantics
SDK error codes from `packages/core-sdk/src/errors.ts`:
- `MANIFEST_INVALID`
- `SLUG_CONFLICT`
- `MANIFEST_NOT_FOUND`
- `APP_DISABLED`

APIs should return `{ ok: false, code, error }` with appropriate status.

## Checklist
- [ ] Host runtime sync called before resolving app.
- [ ] Disabled apps do not render in `/apps/[slug]`.
- [ ] Access API returns structured error code.
- [ ] Child app manifest path is versioned and committed.
