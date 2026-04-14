import { NextRequest, NextResponse } from "next/server";
import { SDKError, validateManifestOrThrow } from "@factory/core-sdk";
import { DatabaseConflictError, listRegisteredApps, registerApp } from "@factory/database";
import { enforceAdminScopes } from "@/lib/admin-auth";

function sdkErrorToResponse(error: SDKError) {
  if (error.code === "MANIFEST_INVALID") {
    return NextResponse.json(
      { ok: false, code: error.code, error: error.message, details: error.details },
      { status: 400 }
    );
  }

  if (error.code === "FORBIDDEN") {
    return NextResponse.json(
      { ok: false, code: error.code, error: error.message, details: error.details },
      { status: 403 }
    );
  }

  if (error.code === "UNAUTHORIZED") {
    return NextResponse.json(
      { ok: false, code: error.code, error: error.message, details: error.details },
      { status: 401 }
    );
  }

  return NextResponse.json(
    { ok: false, code: error.code, error: error.message, details: error.details },
    { status: 409 }
  );
}

function databaseConflictToResponse(error: DatabaseConflictError) {
  const status = error.code === "VERSION_CONFLICT" ? 409 : 409;
  return NextResponse.json(
    { ok: false, code: error.code, error: error.message, details: error.details },
    { status }
  );
}

export async function GET(request: NextRequest) {
  const authError = await enforceAdminScopes(request, ["apps:read"]);
  if (authError) {
    return authError;
  }

  try {
    const items = await listRegisteredApps();
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list admin apps";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await enforceAdminScopes(request, ["apps:write"]);
  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as {
      appId: string;
      slug: string;
      version: string;
      categoryId: string;
      entryPath: string;
      accessScopeType: "global" | "category" | "app";
      paymentCapability: "none" | "checkout";
      status?: "active" | "disabled";
    };

    if (!body.appId || !body.slug || !body.version || !body.categoryId || !body.entryPath) {
      return NextResponse.json(
        { ok: false, code: "MANIFEST_INVALID", error: "Missing required fields" },
        { status: 400 }
      );
    }

    validateManifestOrThrow({
      id: body.appId,
      slug: body.slug,
      version: body.version,
      categoryId: body.categoryId,
      entryPath: body.entryPath,
      access: { scopeType: body.accessScopeType },
      capabilities: { payment: body.paymentCapability }
    });

    const item = await registerApp(body);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof SDKError) {
      return sdkErrorToResponse(error);
    }

    if (error instanceof DatabaseConflictError) {
      return databaseConflictToResponse(error);
    }

    const message = error instanceof Error ? error.message : "Failed to register app";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
