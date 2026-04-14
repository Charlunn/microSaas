# AI Skill: Child App Generator

## Goal
One-click generate a protocol-compliant child app, auto-register it through admin API, and optionally run upload/deploy/domain assignment.

## Inputs
- `slug` (kebab-case)
- `category` (string)
- `version` (semver)
- `access` (`global|category|app`)
- `payment` (`none|checkout`)
- `register` (`true|false`, default `true`)
- `deploy` (`true|false`, default `false`)
- `artifact-path` (required when `deploy=true`, supports `.zip|.tgz|.tar.gz`)
- `domain` (optional subdomain)
- `admin-token` (optional; fallback to `ADMIN_API_TOKEN` env)
- `admin-email` (optional; with `admin-password`, used to obtain Supabase token)
- `admin-password` (optional; with `admin-email`, used to obtain Supabase token)
- `base-url` (default `http://localhost:3000`)

## Outputs
- `apps/<slug>/manifest.ts`
- `apps/<slug>/package.json`
- `apps/<slug>/tsconfig.json`
- Registration result from `POST /api/admin/apps`
- (Optional) Artifact upload result from `POST /api/admin/apps/:id/artifacts`
- (Optional) Deployment result from `POST /api/admin/apps/:id/deployments`
- (Optional) Domain assignment result from `POST /api/admin/apps/:id/domain`
- Links:
  - `<base-url>/apps/<slug>`
  - `<base-url>/api/apps`
  - `<base-url>/api/apps/<slug>/access`

## Implementation Paths
- Skill command: `.claude/commands/generate-child-app.md`
- Generator script: `scripts/generate-child-app.ts`
- Templates: `templates/child-app/*`

## One-Click Commands
Register only:
```bash
pnpm generate:child -- --slug one-click-sample --category productivity --version 0.1.0 --access app --payment none --register true --base-url http://localhost:3000
```

Register + deploy + domain:
```bash
pnpm generate:child -- --slug one-click-sample-2 --category productivity --version 0.1.0 --access app --payment none --register true --deploy true --artifact-path ./dist/one-click-sample-2.zip --domain one-click-sample-2 --base-url http://localhost:3000
```

## Preconditions
- `main-landing` dev server is running:
```bash
pnpm --filter main-landing dev
```
- If admin auth is enabled, provide token via `--admin-token` / `ADMIN_API_TOKEN`, or provide `--admin-email` + `--admin-password` to obtain Supabase token.

## Validation Steps
1. Run one-click command.
2. Run `pnpm --filter @factory/<slug> typecheck`.
3. Verify `GET <base-url>/api/apps` contains the slug.
4. Verify `GET <base-url>/api/apps/<slug>/access` returns structured response.
5. Open `<base-url>/apps/<slug>`.
6. (Deploy flow) verify deployment endpoint returns `deployed` and domain API returns expected fqdn.

## Failure Handling
- API unreachable:
  - Error: cannot reach admin APIs
  - Fix: start `pnpm --filter main-landing dev`, rerun same command.
- Unauthorized:
  - Error code `UNAUTHORIZED` or `FORBIDDEN`
  - Fix: provide valid admin token and required scopes.
- Slug/version conflict:
  - Error code `SLUG_CONFLICT` or `VERSION_CONFLICT`
  - Fix: choose new slug/version or keep payload idempotent.
- Artifact invalid:
  - Error code `ARTIFACT_INVALID`
  - Fix: ensure artifact format, size, and manifest payload are valid.

## Checklist
- [ ] Generator creates all 3 files.
- [ ] Manifest passes `validateManifestOrThrow`.
- [ ] Registration succeeds through admin API.
- [ ] Deploy path succeeds when enabled.
- [ ] Domain assignment succeeds when requested.
- [ ] Returned links are directly usable.
