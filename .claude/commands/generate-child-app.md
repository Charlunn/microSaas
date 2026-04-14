---
description: One-click generate + register child app and optionally deploy artifact + assign domain.
argument-hint: --slug <slug> [--category <category>] [--version <x.y.z>] [--access <global|category|app>] [--payment <none|checkout>] [--register <true|false>] [--deploy <true|false>] [--artifact-path <path>] [--domain <subdomain>] [--admin-token <token>] [--base-url <url>]
---

Generate and register a protocol-compliant child app in one run, with optional deploy pipeline.

## Inputs
Use the command arguments exactly:
- `--slug` required
- `--category` optional default `general`
- `--version` optional default `0.1.0`
- `--access` optional default `app`
- `--payment` optional default `none`
- `--register` optional default `true`
- `--deploy` optional default `false`
- `--artifact-path` required when `--deploy true`
- `--domain` optional subdomain to assign after successful deploy
- `--admin-token` optional (falls back to `ADMIN_API_TOKEN` env)
- `--base-url` optional default `http://localhost:3000`

## Steps
1. Run:
`pnpm generate:child -- <all original args>`
2. Run:
`pnpm --filter @factory/<slug> typecheck`
3. Return:
- Registration status (success/fail)
- Deployment status (if `--deploy true`)
- Domain URL (if assigned)
- App link: `<base-url>/apps/<slug>`
- Registry API: `<base-url>/api/apps`
- Access API: `<base-url>/api/apps/<slug>/access`

## Failure Handling
- If API unreachable: tell user to run `pnpm --filter main-landing dev`, then rerun same command.
- If auth fails: tell user to provide `--admin-token` or set `ADMIN_API_TOKEN`.
- If deploy requested without artifact: surface `ARTIFACT_PATH_REQUIRED`.
- If slug/version/domain conflict: surface exact error code/message.

## Rules
- Do not overwrite existing app directories.
- Keep output concise.
