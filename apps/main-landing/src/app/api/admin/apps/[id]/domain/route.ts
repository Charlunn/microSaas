import { NextRequest, NextResponse } from "next/server";
import {
  assignSubdomain,
  DatabaseConflictError,
  findRegisteredAppById,
  getDomainByAppRegistryId,
  getLatestDeploymentByAppRegistryId
} from "@factory/database";
import { enforceAdminScopes } from "@/lib/admin-auth";

const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;
const RESERVED_SUBDOMAINS = new Set(["www", "api", "admin"]);

function conflictToResponse(error: DatabaseConflictError) {
  return NextResponse.json(
    { ok: false, code: error.code, error: error.message, details: error.details },
    { status: 409 }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await enforceAdminScopes(request, ["apps:read"]);
  if (authError) {
    return authError;
  }

  try {
    const { id } = await params;
    const app = await findRegisteredAppById(id);
    if (!app) {
      return NextResponse.json({ ok: false, code: "MANIFEST_NOT_FOUND", error: "App not found" }, { status: 404 });
    }

    const domain = await getDomainByAppRegistryId(app.id);
    if (!domain) {
      return NextResponse.json({ ok: true, item: null });
    }

    return NextResponse.json({ ok: true, item: domain });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read domain";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await enforceAdminScopes(request, ["domains:write"]);
  if (authError) {
    return authError;
  }

  try {
    const { id } = await params;
    const app = await findRegisteredAppById(id);
    if (!app) {
      return NextResponse.json({ ok: false, code: "MANIFEST_NOT_FOUND", error: "App not found" }, { status: 404 });
    }

    const latestDeployment = await getLatestDeploymentByAppRegistryId(app.id);
    if (!latestDeployment || latestDeployment.status !== "success") {
      return NextResponse.json(
        {
          ok: false,
          code: "DEPLOYMENT_INVALID_STATE",
          error: "App must have a successful deployment before assigning a domain"
        },
        { status: 409 }
      );
    }

    const body = (await request.json()) as { subdomain?: string };
    const subdomain = (body.subdomain ?? "").trim().toLowerCase();

    if (!subdomain) {
      return NextResponse.json(
        { ok: false, code: "MANIFEST_INVALID", error: "subdomain is required" },
        { status: 400 }
      );
    }

    if (!SUBDOMAIN_PATTERN.test(subdomain)) {
      return NextResponse.json(
        { ok: false, code: "MANIFEST_INVALID", error: "subdomain format is invalid" },
        { status: 400 }
      );
    }

    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return NextResponse.json(
        { ok: false, code: "MANIFEST_INVALID", error: "subdomain is reserved" },
        { status: 400 }
      );
    }

    const baseDomain = process.env.APP_BASE_DOMAIN?.trim() || "yourdomain.com";
    const fqdn = `${subdomain}.${baseDomain}`;

    const domain = await assignSubdomain({
      appRegistryId: app.id,
      subdomain,
      fqdn
    });

    return NextResponse.json({ ok: true, item: domain });
  } catch (error) {
    if (error instanceof DatabaseConflictError) {
      return conflictToResponse(error);
    }

    const message = error instanceof Error ? error.message : "Failed to assign domain";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
