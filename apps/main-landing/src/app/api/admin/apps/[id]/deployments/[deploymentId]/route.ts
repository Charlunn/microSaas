import { NextRequest, NextResponse } from "next/server";
import { findDeploymentByIdAndApp, findRegisteredAppById } from "@factory/database";
import { enforceAdminScopes } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deploymentId: string }> }
) {
  const authError = await enforceAdminScopes(request, ["deploy:read"]);
  if (authError) {
    return authError;
  }

  try {
    const { id, deploymentId } = await params;

    const app = await findRegisteredAppById(id);
    if (!app) {
      return NextResponse.json({ ok: false, code: "MANIFEST_NOT_FOUND", error: "App not found" }, { status: 404 });
    }

    const deployment = await findDeploymentByIdAndApp(deploymentId, app.id);
    if (!deployment) {
      return NextResponse.json(
        { ok: false, code: "MANIFEST_NOT_FOUND", error: "Deployment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, item: deployment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load deployment";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
