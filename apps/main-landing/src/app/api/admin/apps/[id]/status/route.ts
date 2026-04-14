import { NextRequest, NextResponse } from "next/server";
import { updateAppStatus } from "@factory/database";
import { enforceAdminScopes } from "@/lib/admin-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await enforceAdminScopes(request, ["apps:write"]);
  if (authError) {
    return authError;
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as { status: "active" | "disabled" };

    if (body.status !== "active" && body.status !== "disabled") {
      return NextResponse.json(
        { ok: false, code: "MANIFEST_INVALID", error: "Invalid status" },
        { status: 400 }
      );
    }

    const item = await updateAppStatus(id, body.status);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update app status";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
