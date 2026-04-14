import { NextRequest, NextResponse } from "next/server";
import { listProducts } from "@factory/database";
import { enforceAdminScopes } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const authError = await enforceAdminScopes(request, ["catalog:read"]);
  if (authError) {
    return authError;
  }

  try {
    const appId = request.nextUrl.searchParams.get("appRegistryId") ?? undefined;
    const items = await listProducts(appId);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list products";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
