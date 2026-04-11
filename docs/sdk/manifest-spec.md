# Manifest Spec

## Source of Truth
- Protocol type: `packages/core-sdk/src/protocol.ts`
- Validation entry: `validateManifestOrThrow` in `packages/core-sdk/src/protocol.ts`
- Registry behavior: `packages/core-sdk/src/registry.ts`

## Required Fields

```ts
{
  id: string;
  slug: string;
  version: string; // semver, e.g. 1.0.0
  categoryId: string;
  entryPath: string; // must start with "/"
  access: { scopeType: "global" | "category" | "app" };
  capabilities: { payment: "none" | "checkout" };
}
```

## Validation Rules
- `id` / `slug` / `version` / `categoryId` cannot be empty.
- `slug` must be lowercase kebab-case.
- `version` must match semver-like `x.y.z`.
- `entryPath` must start with `/` and cannot contain `..`.
- `access.scopeType` must be one of `global|category|app`.
- `capabilities.payment` must be one of `none|checkout`.

## Valid Example

```ts
export const manifest = {
  id: "invoice-pro",
  slug: "invoice-pro",
  version: "1.2.0",
  categoryId: "finance",
  entryPath: "/apps/invoice-pro",
  access: { scopeType: "app" },
  capabilities: { payment: "checkout" }
};
```

## Invalid Example

```ts
export const manifest = {
  id: "",
  slug: "Invoice_Pro",
  version: "v1",
  categoryId: "",
  entryPath: "apps/invoice-pro",
  access: { scopeType: "tenant" },
  capabilities: { payment: "stripe" }
};
```

Expected errors: `MANIFEST_INVALID` with details.

## Checklist
- [ ] Manifest exports all required fields.
- [ ] `validateManifestOrThrow(manifest)` passes.
- [ ] `slug` matches folder name under `apps/<slug>`.
- [ ] `entryPath` route exists and is reachable.
