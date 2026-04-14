import { NextRequest, NextResponse } from "next/server";
import { listPrices } from "@factory/database";
import { enforceAdminScopes } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const authError = await enforceAdminScopes(request, ["catalog:read"]);
  if (authError) {
    return authError;
  }

  try {
    const productId = request.nextUrl.searchParams.get("productId") ?? undefined;
    const items = await listPrices(productId);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list prices";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
