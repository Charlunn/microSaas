---
description: Generate a protocol-compliant child app scaffold.
argument-hint: --slug <slug> [--category <category>] [--version <x.y.z>] [--access <global|category|app>] [--payment <none|checkout>]
---

You are generating a new child app scaffold in this monorepo.

## Inputs
Use the command arguments exactly:
- `--slug` required
- `--category` optional default `general`
- `--version` optional default `0.1.0`
- `--access` optional default `app`
- `--payment` optional default `none`

## Steps
1. Run:
`pnpm tsx scripts/generate-child-app.ts <all original args>`
2. If generation succeeds, run:
`pnpm --filter @factory/<slug> typecheck`
3. Return:
- Generated file paths
- Whether typecheck passed
- Next command to register app through admin API/UI

## Rules
- Do not overwrite existing app directories.
- Fail fast and report exact validation error.
- Keep output concise.
