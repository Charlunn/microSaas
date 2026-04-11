import {
  SDKError,
  getManifestBySlug,
  listManifests,
  requireActiveManifest,
  upsertManifest,
  type AppManifest
} from "@factory/core-sdk";
import {
  listRegisteredApps,
  mapRegistryRecordToManifestProjection,
  type ManifestProjection
} from "@factory/database";
import { bootstrapManifests } from "./bootstrap-manifests";

function mapManifestProjectionToManifest(record: ManifestProjection): AppManifest {
  return {
    id: record.id,
    slug: record.slug,
    version: record.version,
    categoryId: record.categoryId,
    entryPath: record.entryPath,
    access: {
      scopeType: record.accessScopeType
    },
    capabilities: {
      payment: record.paymentCapability
    }
  };
}

export async function syncHostRegistry() {
  bootstrapManifests();

  const registeredApps = await listRegisteredApps();
  for (const app of registeredApps) {
    const projection = mapRegistryRecordToManifestProjection(app);
    upsertManifest(mapManifestProjectionToManifest(projection), projection.status);
  }

  return listManifests();
}

export async function loadHostRegistry() {
  return syncHostRegistry();
}

export async function resolveHostedApp(slug: string) {
  await syncHostRegistry();
  return getManifestBySlug(slug) ?? null;
}

export async function resolveActiveHostedApp(slug: string) {
  await syncHostRegistry();

  try {
    return requireActiveManifest(slug);
  } catch (error) {
    if (error instanceof SDKError) {
      return null;
    }
    throw error;
  }
}
