export const manifestTemplate = `import type { AppManifest } from "@factory/core-sdk";

export const manifest: AppManifest = {
  id: "auto-sample",
  slug: "auto-sample",
  version: "0.1.0",
  categoryId: "productivity",
  entryPath: "/apps/auto-sample",
  access: {
    scopeType: "app"
  },
  capabilities: {
    payment: "none"
  }
};
`;
