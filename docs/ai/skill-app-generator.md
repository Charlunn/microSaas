# AI Skill: Child App Generator

## Goal
Generate a protocol-compliant child app scaffold automatically, then validate manifest compatibility with SDK rules.

## Inputs
- `slug` (kebab-case)
- `category` (string)
- `version` (semver)
- `access` (`global|category|app`)
- `payment` (`none|checkout`)

## Outputs
- `apps/<slug>/manifest.ts`
- `apps/<slug>/package.json`
- `apps/<slug>/tsconfig.json`

## Implementation Paths
- Skill command: `.claude/commands/generate-child-app.md`
- Generator script: `scripts/generate-child-app.ts`
- Templates: `templates/child-app/*`

## Validation Steps
1. Run generator with requested args.
2. Run `pnpm --filter @factory/<slug> typecheck`.
3. Run `pnpm turbo run typecheck`.
4. Verify app appears via `GET /api/apps` after registration.

## Failure Handling
- If slug/version invalid => fail with `MANIFEST_INVALID`.
- If folder already exists => fail with clear message.
- If generated manifest fails SDK validation => fail before file finalize.

## Checklist
- [ ] Generator creates all 3 required files.
- [ ] Manifest passes `validateManifestOrThrow`.
- [ ] Workspace recognizes new child app package.
- [ ] Generated app is ready for admin registration.
