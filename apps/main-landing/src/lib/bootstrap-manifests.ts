import { demoChildManifest } from "@factory/demo-child";
import { clearRegistry, registerManifest } from "@factory/core-sdk";

export function bootstrapManifests() {
  clearRegistry();
  registerManifest(demoChildManifest, "active");
}
