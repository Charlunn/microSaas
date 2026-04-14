import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  createArtifact,
  DatabaseConflictError,
  findRegisteredAppById,
  type AppRegistryRecord
} from "@factory/database";
import { SDKError, validateManifestOrThrow, type AppManifest } from "@factory/core-sdk";
import { enforceAdminScopes } from "@/lib/admin-auth";

const ARTIFACT_MAX_BYTES = Number(process.env.ARTIFACT_MAX_BYTES ?? 50 * 1024 * 1024);

function sdkErrorToResponse(error: SDKError) {
  return NextResponse.json(
    { ok: false, code: error.code, error: error.message, details: error.details },
    { status: error.code === "MANIFEST_INVALID" ? 400 : 409 }
  );
}

function conflictToResponse(error: DatabaseConflictError) {
  return NextResponse.json(
    { ok: false, code: error.code, error: error.message, details: error.details },
    { status: 409 }
  );
}

function toManifest(payload: unknown): AppManifest {
  if (!payload || typeof payload !== "object") {
    throw new SDKError("MANIFEST_INVALID", "manifest payload must be an object");
  }

  const row = payload as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    version: String(row.version ?? ""),
    categoryId: String(row.categoryId ?? ""),
    entryPath: String(row.entryPath ?? ""),
    access: {
      scopeType: row.access && typeof row.access === "object"
        ? String((row.access as Record<string, unknown>).scopeType ?? "") as "global" | "category" | "app"
        : "app"
    },
    capabilities: {
      payment: row.capabilities && typeof row.capabilities === "object"
        ? String((row.capabilities as Record<string, unknown>).payment ?? "") as "none" | "checkout"
        : "none"
    }
  };
}

function validatePaths(manifest: AppManifest, filename: string) {
  if (filename.includes("..") || filename.includes("\\") || filename.startsWith("/")) {
    throw new SDKError("ARTIFACT_INVALID", "bundle filename contains unsafe path characters", {
      filename
    });
  }

  if (manifest.entryPath.includes("..") || manifest.entryPath.includes("\\")) {
    throw new SDKError("ARTIFACT_INVALID", "manifest.entryPath contains unsafe path", {
      entryPath: manifest.entryPath
    });
  }
}

function assertManifestMatchesRegistry(manifest: AppManifest, app: AppRegistryRecord) {
  if (manifest.id !== app.app_id || manifest.slug !== app.slug) {
    throw new SDKError("MANIFEST_INVALID", "manifest identity does not match target app", {
      appId: app.app_id,
      slug: app.slug,
      manifestId: manifest.id,
      manifestSlug: manifest.slug
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await enforceAdminScopes(request, ["deploy:write"]);
  if (authError) {
    return authError;
  }

  try {
    const { id } = await params;
    const app = await findRegisteredAppById(id);
    if (!app) {
      return NextResponse.json({ ok: false, code: "MANIFEST_NOT_FOUND", error: "App not found" }, { status: 404 });
    }

    const form = await request.formData();
    const bundle = form.get("bundle");
    const manifestRaw = form.get("manifest");

    if (!(bundle instanceof File) || typeof manifestRaw !== "string") {
      return NextResponse.json(
        { ok: false, code: "ARTIFACT_INVALID", error: "bundle file and manifest JSON string are required" },
        { status: 400 }
      );
    }

    if (bundle.size <= 0) {
      return NextResponse.json(
        { ok: false, code: "ARTIFACT_INVALID", error: "bundle file is empty" },
        { status: 400 }
      );
    }

    if (bundle.size > ARTIFACT_MAX_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          code: "ARTIFACT_INVALID",
          error: `bundle exceeds max size of ${ARTIFACT_MAX_BYTES} bytes`
        },
        { status: 413 }
      );
    }

    const filename = bundle.name ?? "bundle";
    if (!filename.endsWith(".zip") && !filename.endsWith(".tar.gz") && !filename.endsWith(".tgz")) {
      return NextResponse.json(
        { ok: false, code: "ARTIFACT_INVALID", error: "bundle must be .zip, .tar.gz or .tgz" },
        { status: 400 }
      );
    }

    let manifestPayload: unknown;
    try {
      manifestPayload = JSON.parse(manifestRaw);
    } catch {
      return NextResponse.json(
        { ok: false, code: "MANIFEST_INVALID", error: "manifest must be valid JSON" },
        { status: 400 }
      );
    }

    const manifest = toManifest(manifestPayload);
    validateManifestOrThrow(manifest);
    assertManifestMatchesRegistry(manifest, app);
    validatePaths(manifest, filename);

    const buffer = Buffer.from(await bundle.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const storagePath = `artifacts/${app.slug}/${manifest.version}/${sha256}-${filename}`;

    const artifact = await createArtifact({
      appRegistryId: app.id,
      version: manifest.version,
      sha256,
      sizeBytes: bundle.size,
      mimeType: bundle.type || "application/octet-stream",
      storagePath,
      manifestJson: manifestPayload as Record<string, unknown>
    });

    return NextResponse.json({ ok: true, item: artifact }, { status: 201 });
  } catch (error) {
    if (error instanceof SDKError) {
      return sdkErrorToResponse(error);
    }

    if (error instanceof DatabaseConflictError) {
      return conflictToResponse(error);
    }

    const message = error instanceof Error ? error.message : "Failed to upload artifact";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
