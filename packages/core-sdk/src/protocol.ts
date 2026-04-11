import type { ScopeType } from "@factory/database";
import { SDKError } from "./errors";

export type AccessRequirement = {
  scopeType: ScopeType;
};

export type PaymentCapability = "none" | "checkout";

export interface AppManifest {
  id: string;
  slug: string;
  version: string;
  categoryId: string;
  entryPath: string;
  access: AccessRequirement;
  capabilities: {
    payment: PaymentCapability;
  };
}

export interface HostContext {
  userId?: string;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function validateManifest(manifest: AppManifest): string[] {
  const errors: string[] = [];

  if (!manifest.id.trim()) errors.push("id is required");
  if (!manifest.slug.trim()) errors.push("slug is required");
  if (!manifest.version.trim()) errors.push("version is required");
  if (!manifest.categoryId.trim()) errors.push("categoryId is required");
  if (!manifest.entryPath.startsWith("/")) errors.push("entryPath must start with '/'");
  if (manifest.entryPath.includes("..")) errors.push("entryPath cannot contain '..'");
  if (!SLUG_PATTERN.test(manifest.slug)) errors.push("slug must be kebab-case lowercase");
  if (!VERSION_PATTERN.test(manifest.version)) errors.push("version must be semver like 1.0.0");
  if (manifest.id.length > 120) errors.push("id must be <= 120 chars");

  if (!["global", "category", "app"].includes(manifest.access.scopeType)) {
    errors.push("access.scopeType must be global|category|app");
  }

  if (!["none", "checkout"].includes(manifest.capabilities.payment)) {
    errors.push("capabilities.payment must be none|checkout");
  }

  return errors;
}

export function validateManifestOrThrow(manifest: AppManifest): void {
  const errors = validateManifest(manifest);
  if (errors.length > 0) {
    throw new SDKError("MANIFEST_INVALID", "Manifest validation failed", {
      slug: manifest.slug,
      errors
    });
  }
}
