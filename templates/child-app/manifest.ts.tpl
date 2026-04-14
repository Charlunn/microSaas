import type { AppManifest } from "@factory/core-sdk";

export const manifest: AppManifest = {
  id: "__APP_ID__",
  slug: "__SLUG__",
  version: "__VERSION__",
  categoryId: "__CATEGORY__",
  entryPath: "/apps/__SLUG__",
  access: {
    scopeType: "__ACCESS__"
  },
  capabilities: {
    payment: "__PAYMENT__"
  }
};
