export const manifestTemplate = `import type { AppManifest } from "@factory/core-sdk";

export const manifest: AppManifest = {
  id: "one-click-sample-2",
  slug: "one-click-sample-2",
  version: "0.1.0",
  categoryId: "productivity",
  entryPath: "/apps/one-click-sample-2",
  access: {
    scopeType: "app"
  },
  capabilities: {
    payment: "none"
  }
};
`;
