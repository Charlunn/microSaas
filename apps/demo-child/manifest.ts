import type { AppManifest } from "@factory/core-sdk";

export const demoChildManifest: AppManifest = {
  id: "demo-child",
  slug: "demo-child",
  version: "0.1.0",
  categoryId: "demo",
  entryPath: "/apps/demo-child",
  access: {
    scopeType: "app"
  },
  capabilities: {
    payment: "none"
  }
};
