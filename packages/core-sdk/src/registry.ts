import type { AppManifest } from "./protocol";
import { SDKError } from "./errors";
import { validateManifestOrThrow } from "./protocol";

export type RegistryStatus = "active" | "disabled";

export interface RegisteredManifest {
  manifest: AppManifest;
  status: RegistryStatus;
}

const registry = new Map<string, RegisteredManifest>();

export function clearRegistry() {
  registry.clear();
}

export function upsertManifest(manifest: AppManifest, status: RegistryStatus = "active") {
  validateManifestOrThrow(manifest);

  const existing = registry.get(manifest.slug);
  if (existing && existing.manifest.id !== manifest.id) {
    throw new SDKError("SLUG_CONFLICT", `Manifest slug conflict: ${manifest.slug}`, {
      slug: manifest.slug,
      existingAppId: existing.manifest.id,
      incomingAppId: manifest.id
    });
  }

  registry.set(manifest.slug, { manifest, status });
}

export function registerManifest(manifest: AppManifest, status: RegistryStatus = "active") {
  upsertManifest(manifest, status);
}

export function setManifestStatus(slug: string, status: RegistryStatus) {
  const item = registry.get(slug);
  if (!item) {
    throw new SDKError("MANIFEST_NOT_FOUND", `Manifest not found: ${slug}`, { slug });
  }
  registry.set(slug, { ...item, status });
}

export function syncManifestStatus(slug: string, status: RegistryStatus) {
  setManifestStatus(slug, status);
}

export function removeManifest(slug: string) {
  const existed = registry.delete(slug);
  if (!existed) {
    throw new SDKError("MANIFEST_NOT_FOUND", `Manifest not found: ${slug}`, { slug });
  }
}

export function getManifestBySlug(slug: string) {
  return registry.get(slug);
}

export function requireActiveManifest(slug: string): RegisteredManifest {
  const item = registry.get(slug);
  if (!item) {
    throw new SDKError("MANIFEST_NOT_FOUND", `Manifest not found: ${slug}`, { slug });
  }
  if (item.status !== "active") {
    throw new SDKError("APP_DISABLED", `Manifest is disabled: ${slug}`, { slug });
  }
  return item;
}

export function listManifests(status?: RegistryStatus): RegisteredManifest[] {
  const items = Array.from(registry.values());
  if (!status) return items;
  return items.filter((item) => item.status === status);
}
