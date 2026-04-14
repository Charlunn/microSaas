import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import {
  createDeployment,
  DatabaseConflictError,
  findRegisteredAppById,
  getLatestDeploymentByAppRegistryId
} from "@factory/database";
import { enforceAdminScopes } from "@/lib/admin-auth";

function conflictToResponse(error: DatabaseConflictError) {
  return NextResponse.json(
    { ok: false, code: error.code, error: error.message, details: error.details },
    { status: 409 }
  );
}

function resolveRunnerCwd(): string {
  const fromEnv = process.env.DEPLOY_RUNNER_CWD?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return path.resolve(process.cwd(), "..", "..");
}

function triggerLocalDeployRunner(input: {
  deploymentId: string;
  appRegistryId: string;
  slug: string;
}) {
  const cwd = resolveRunnerCwd();
  const child = spawn(
    "pnpm",
    [
      "tsx",
      "scripts/local-deploy-runner.ts",
      "--deploymentId",
      input.deploymentId,
      "--appRegistryId",
      input.appRegistryId,
      "--slug",
      input.slug
    ],
    {
      cwd,
      detached: true,
      stdio: "ignore"
    }
  );

  child.unref();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await enforceAdminScopes(request, ["deploy:read"]);
  if (authError) {
    return authError;
  }

  try {
    const { id } = await params;
    const app = await findRegisteredAppById(id);
    if (!app) {
      return NextResponse.json({ ok: false, code: "MANIFEST_NOT_FOUND", error: "App not found" }, { status: 404 });
    }

    const latest = await getLatestDeploymentByAppRegistryId(app.id);
    return NextResponse.json({ ok: true, item: latest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load deployment";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
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

    const body = (await request.json().catch(() => ({}))) as { artifactId?: string; commitSha?: string };

    const deployment = await createDeployment({
      appRegistryId: app.id,
      artifactId: body.artifactId ?? null,
      commitSha: body.commitSha ?? null,
      createdBy: request.headers.get("x-admin-user") ?? null
    });

    triggerLocalDeployRunner({
      deploymentId: deployment.id,
      appRegistryId: app.id,
      slug: app.slug
    });

    return NextResponse.json({ ok: true, item: deployment }, { status: 202 });
  } catch (error) {
    if (error instanceof DatabaseConflictError) {
      return conflictToResponse(error);
    }

    const message = error instanceof Error ? error.message : "Failed to create deployment";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
