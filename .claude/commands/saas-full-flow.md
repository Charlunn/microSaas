---
description: End-to-end generate/register/upload/deploy/domain flow. Supports fully interactive guided input when args are omitted.
argument-hint: [--slug <slug>] [--category <category>] [--version <x.y.z>] [--access <global|category|app>] [--payment <none|checkout>] [--artifact-path <path>] [--domain <subdomain>] [--base-url <url>] [--admin-token <token>] [--create <true|false>]
---

Run the full control-plane flow with one reusable process:
`generate -> register -> typecheck -> upload artifact -> deploy -> poll -> assign domain`.

## Interactive mode (default if args are missing)
If required/important args are missing, DO NOT fail immediately.
Use AskUserQuestion to guide the user step-by-step and collect values interactively.

Ask in this order (with sensible defaults):
1. `slug` (required)
2. `category` (default `general`)
3. `version` (default `0.1.0`)
4. `access` (default `app`)
5. `payment` (default `none`)
6. `create` (default `true`)
7. `base-url` (default `http://localhost:3000`)
8. whether to deploy now (`true/false`, default `true`)
9. if deploy=true: `artifact-path` (optional, auto-package if empty)
10. whether to bind domain (`true/false`)
11. if bind=true: `domain` (subdomain)
12. `admin-token` (optional; fallback env `ADMIN_API_TOKEN`)

After collecting answers, print the resolved command inputs clearly, then execute.

## Inputs
- `--slug` required (prompt user if missing)
- `--category` default `general`
- `--version` default `0.1.0`
- `--access` default `app`
- `--payment` default `none`
- `--artifact-path` optional (if missing, package `apps/<slug>` as `artifacts/<slug>-<version>.tgz`)
- `--domain` optional
- `--base-url` default `http://localhost:3000`
- `--admin-token` optional (fallback `ADMIN_API_TOKEN` env)
- `--create` default `true` (set `false` for existing app)

## Steps
1. Precheck:
   - Ensure `main-landing` is running (`pnpm --filter main-landing dev`).
   - Ensure token exists (`--admin-token` or env `ADMIN_API_TOKEN`) when admin auth is enabled.
2. If `--create true`, run:
   - `pnpm generate:child -- --slug <slug> --category <category> --version <version> --access <access> --payment <payment> --register true --deploy false --base-url <base-url> [--admin-token <token>]`
3. Typecheck:
   - `pnpm --filter @factory/<slug> typecheck`
4. Resolve artifact:
   - If `--artifact-path` provided, use it.
   - Else package default artifact:
     - `mkdir -p artifacts`
     - `tar -czf artifacts/<slug>-<version>.tgz -C apps/<slug> .`
5. Query app registry id:
   - `GET <base-url>/api/admin/apps` with Bearer token.
   - Find item by `slug`, read `id` as `appRegistryId`.
6. Upload artifact:
   - `POST <base-url>/api/admin/apps/<appRegistryId>/artifacts` (multipart)
   - `manifest` JSON should match slug/version/category/access/payment/entryPath
   - `bundle` is artifact file
   - Save returned `artifactId`.
7. Deploy:
   - `POST <base-url>/api/admin/apps/<appRegistryId>/deployments` with `{ "artifactId": "..." }`
   - Save `deploymentId`.
8. Poll status:
   - `GET <base-url>/api/admin/apps/<appRegistryId>/deployments/<deploymentId>`
   - Report final `status`.
9. If `--domain` provided:
   - `POST <base-url>/api/admin/apps/<appRegistryId>/domain` with `{ "subdomain": "<domain>" }`
   - Return `fqdn` and final URL.
10. Return concise summary:
   - app slug, appRegistryId, artifactId, deployment status, domain URL (if any), and next action.

## Error handling
- `UNAUTHORIZED` / `FORBIDDEN`: check token/scope
- `MANIFEST_INVALID`: fix manifest fields/semver/entryPath
- `SLUG_CONFLICT` / `VERSION_CONFLICT`: use new slug/version or keep idempotent payload
- `ARTIFACT_INVALID`: fix file type/size/unsafe paths
- `DEPLOYMENT_INVALID_STATE`: check deploy order
- `SUBDOMAIN_CONFLICT`: change subdomain

## Output requirements
- Keep output concise.
- Always show exact API error code + message when failing.
- Never overwrite existing app directory when `--create true`.
