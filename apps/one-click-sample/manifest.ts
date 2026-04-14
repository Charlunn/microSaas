export const manifestTemplate = `import type { AppManifest } from "@factory/core-sdk";

export const manifest: AppManifest = {
  id: "one-click-sample",
  slug: "one-click-sample",
  version: "0.1.0",
  categoryId: "productivity",
  entryPath: "/apps/one-click-sample",
  access: {
    scopeType: "app"
  },
  capabilities: {
    payment: "none"
  }
};
`;
