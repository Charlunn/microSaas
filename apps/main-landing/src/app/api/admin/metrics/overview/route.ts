import { NextRequest, NextResponse } from "next/server";
import { getAdminMetricsOverview } from "@factory/database";
import { enforceAdminScopes } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const authError = await enforceAdminScopes(request, ["metrics:read"]);
  if (authError) {
    return authError;
  }

  try {
    const metrics = await getAdminMetricsOverview();
    return NextResponse.json({ ok: true, item: metrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load overview metrics";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
