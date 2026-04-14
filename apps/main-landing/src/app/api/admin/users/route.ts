import { NextRequest, NextResponse } from "next/server";
import { listUsers } from "@factory/database";
import { enforceAdminScopes } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const authError = await enforceAdminScopes(request, ["users:read"]);
  if (authError) {
    return authError;
  }

  try {
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? 100);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 100;
    const items = await listUsers(limit);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list users";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
