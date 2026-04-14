import type { AppManifest } from "@factory/core-sdk";

export const inboxPingManifest: AppManifest = {
  id: "inbox-ping",
  slug: "inbox-ping",
  version: "0.1.0",
  categoryId: "marketing",
  entryPath: "/apps/inbox-ping",
  access: {
    scopeType: "app"
  },
  capabilities: {
    payment: "none"
  }
};
